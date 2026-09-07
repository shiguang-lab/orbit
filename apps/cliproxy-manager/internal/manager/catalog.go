package manager

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// Catalog contains public routing metadata only. Tokens stay inside CLIProxyAPI.
type Credential struct {
	ID         string   `json:"id"`
	InstanceID string   `json:"instanceId"`
	Name       string   `json:"name"`
	Provider   string   `json:"provider"`
	Disabled   bool     `json:"disabled"`
	Routable   bool     `json:"routable"`
	Error      string   `json:"error,omitempty"`
	Models     []string `json:"models"`
}

func credentialPrefix(id string) string {
	sum := sha256.Sum256([]byte(id))
	return "orbit-" + hex.EncodeToString(sum[:16])
}

func (m *Manager) managementJSON(ctx context.Context, i Instance, method, path string, body any, out any) error {
	var data []byte
	if body != nil {
		var err error
		data, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, fmt.Sprintf("http://127.0.0.1:%d/v0/management/%s", i.Port, path), bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+i.ManagementKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := m.client.Do(req)
	if err != nil {
		return errors.New("credential discovery unavailable")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("credential discovery returned HTTP %d", resp.StatusCode)
	}
	data, err = io.ReadAll(io.LimitReader(resp.Body, (4<<20)+1))
	if err != nil || len(data) > 4<<20 {
		return errors.New("invalid credential discovery response")
	}
	if out != nil {
		return json.Unmarshal(data, out)
	}
	return nil
}

// Only publish a credential once CPA advertises its exclusive prefixed models.
// Until its file watcher registers the prefix, the credential fails closed.
func (m *Manager) discover(ctx context.Context, i Instance) ([]Credential, error) {
	var files struct {
		Files []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Provider    string `json:"provider"`
			Disabled    bool   `json:"disabled"`
			RuntimeOnly bool   `json:"runtime_only"`
		} `json:"files"`
	}
	if err := m.managementJSON(ctx, i, "GET", "auth-files", nil, &files); err != nil {
		return nil, err
	}
	if files.Files == nil {
		return nil, errors.New("invalid credential catalog")
	}
	result := make([]Credential, 0, len(files.Files))
	owners := map[string]int{}
	for _, file := range files.Files {
		c := Credential{ID: file.ID, InstanceID: i.ID, Name: file.Name, Provider: file.Provider, Disabled: file.Disabled, Models: []string{}}
		if c.ID == "" || c.Name == "" {
			return nil, errors.New("credential identity missing")
		}
		var models struct {
			Models []struct {
				ID string `json:"id"`
			} `json:"models"`
		}
		err := m.managementJSON(ctx, i, "GET", "auth-files/models?name="+url.QueryEscape(file.Name), nil, &models)
		prefix := credentialPrefix(file.ID) + "/"
		if err == nil {
			for _, model := range models.Models {
				owners[model.ID]++
				if strings.HasPrefix(model.ID, prefix) {
					c.Models = append(c.Models, strings.TrimPrefix(model.ID, prefix))
				}
			}
		}
		if file.Disabled {
			result = append(result, c)
			continue
		}
		if err != nil {
			c.Error = err.Error()
		} else if len(c.Models) == 0 {
			if file.RuntimeOnly {
				c.Error = "credential does not support persistent exclusive routing"
			} else {
				var metadata struct {
					Prefix string `json:"prefix"`
				}
				err = m.managementJSON(ctx, i, "GET", "auth-files/download?name="+url.QueryEscape(file.Name), nil, &metadata)
				if err == nil && metadata.Prefix != strings.TrimSuffix(prefix, "/") {
					err = m.managementJSON(ctx, i, "PATCH", "auth-files/fields", map[string]any{"name": file.Name, "prefix": strings.TrimSuffix(prefix, "/")}, nil)
				}
				if err != nil {
					c.Error = err.Error()
				} else {
					c.Error = "waiting for credential models to register"
				}
			}
		} else {
			c.Routable = true
		}
		result = append(result, c)
	}
	for index := range result {
		c := &result[index]
		for _, model := range c.Models {
			if owners[credentialPrefix(c.ID)+"/"+model] != 1 {
				c.Routable = false
				c.Error = "credential model prefix is not exclusive"
			}
		}
	}
	return result, nil
}

func (m *Manager) refreshCatalog(ctx context.Context) {
	m.catalogMu.Lock()
	defer m.catalogMu.Unlock()
	for _, i := range m.Snapshot().Instances {
		credentials := []Credential{}
		message := ""
		if i.Healthy {
			var err error
			credentials, err = m.discover(ctx, i)
			if err != nil {
				message = err.Error()
			}
		}
		m.mu.Lock()
		if current := m.instances[i.ID]; current != nil {
			current.Credentials = credentials
			current.CatalogError = message
		}
		m.mu.Unlock()
	}
}

func (m *Manager) credentialInference(w http.ResponseWriter, r *http.Request) {
	m.mu.Lock()
	i := m.instances[r.PathValue("id")]
	if i == nil {
		m.mu.Unlock()
		writeError(w, ErrNotFound)
		return
	}
	snapshot := *i
	running := m.processes[i.ID] != nil
	m.mu.Unlock()
	if !running {
		writeJSON(w, 503, map[string]string{"error": "instance is stopped"})
		return
	}
	// Validate current CPA ownership, not just a possibly stale control-plane report.
	m.catalogMu.Lock()
	credentials, err := m.discover(r.Context(), snapshot)
	m.catalogMu.Unlock()
	if err != nil {
		writeJSON(w, 503, map[string]string{"error": err.Error()})
		return
	}
	var selected *Credential
	for index := range credentials {
		if credentials[index].ID == r.PathValue("credential") {
			selected = &credentials[index]
			break
		}
	}
	if selected == nil {
		writeError(w, ErrNotFound)
		return
	}
	if selected.Disabled || !selected.Routable {
		writeJSON(w, 503, map[string]string{"error": "selected credential is unavailable"})
		return
	}
	if r.Method == "GET" && r.PathValue("path") == "v1/models" {
		data := []map[string]string{}
		for _, model := range selected.Models {
			data = append(data, map[string]string{"id": model, "object": "model", "owned_by": selected.Provider})
		}
		writeJSON(w, 200, map[string]any{"object": "list", "data": data})
		return
	}
	path := r.PathValue("path")
	if r.Method != "POST" || (path != "v1/chat/completions" && path != "v1/responses" && path != "v1/messages") {
		writeError(w, ErrNotFound)
		return
	}
	var body map[string]json.RawMessage
	if err = decodeLimit(w, r, &body, 16<<20); err != nil {
		writeError(w, err)
		return
	}
	var model string
	if json.Unmarshal(body["model"], &model) != nil || model == "" {
		writeError(w, errors.New("model is required"))
		return
	}
	found := false
	for _, available := range selected.Models {
		if available == model {
			found = true
			break
		}
	}
	if !found {
		writeJSON(w, 400, map[string]string{"error": "model is unavailable for the selected credential"})
		return
	}
	body["model"], _ = json.Marshal(credentialPrefix(selected.ID) + "/" + model)
	data, _ := json.Marshal(body)
	r.Body = io.NopCloser(bytes.NewReader(data))
	r.ContentLength = int64(len(data))
	m.proxy(w, r, false)
}
