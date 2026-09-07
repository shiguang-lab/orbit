package manager

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func writeError(w http.ResponseWriter, err error) {
	status := 400
	if errors.Is(err, ErrNotFound) {
		status = 404
	}
	if errors.Is(err, ErrConflict) {
		status = 409
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
func decode(w http.ResponseWriter, r *http.Request, v any) error {
	return decodeLimit(w, r, v, 1<<20)
}
func decodeLimit(w http.ResponseWriter, r *http.Request, v any, limit int64) error {
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		return errors.New("invalid JSON request")
	}
	if err := d.Decode(new(any)); err != io.EOF {
		return errors.New("request must contain one JSON object")
	}
	return nil
}
func (m *Manager) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /v1/node", func(w http.ResponseWriter, r *http.Request) {
		m.refreshCatalog(r.Context())
		writeJSON(w, 200, m.Snapshot())
	})
	mux.HandleFunc("GET /v1/instances", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, m.Snapshot().Instances) })
	mux.HandleFunc("POST /v1/instances", func(w http.ResponseWriter, r *http.Request) {
		var in CreateInput
		if err := decode(w, r, &in); err != nil {
			writeError(w, err)
			return
		}
		i, err := m.Create(in)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 201, i)
	})
	mux.HandleFunc("PATCH /v1/instances/{id}", func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			AutoStart      *bool `json:"autoStart"`
			ProviderExpose *bool `json:"providerExpose"`
		}
		if err := decode(w, r, &input); err != nil {
			writeError(w, err)
			return
		}
		m.mu.Lock()
		defer m.mu.Unlock()
		instance := m.instances[r.PathValue("id")]
		if instance == nil {
			writeError(w, ErrNotFound)
			return
		}
		updated := *instance
		if input.AutoStart != nil {
			updated.AutoStart = *input.AutoStart
		}
		if input.ProviderExpose != nil {
			updated.ProviderExpose = *input.ProviderExpose
		}
		if err := m.saveInstance(&updated); err != nil {
			writeError(w, err)
			return
		}
		*instance = updated
		writeJSON(w, 200, updated)
	})
	mux.HandleFunc("DELETE /v1/instances/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := m.Delete(r.PathValue("id")); err != nil {
			writeError(w, err)
			return
		}
		w.WriteHeader(204)
	})
	mux.HandleFunc("POST /v1/instances/{id}/actions", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Action  string `json:"action"`
			Version string `json:"version"`
		}
		if err := decode(w, r, &in); err != nil {
			writeError(w, err)
			return
		}
		j, err := m.Submit(r.PathValue("id"), in.Action, in.Version)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 202, j)
	})
	mux.HandleFunc("GET /v1/jobs/{id}", func(w http.ResponseWriter, r *http.Request) {
		j, err := m.Job(r.PathValue("id"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 200, j)
	})
	mux.HandleFunc("GET /v1/instances/{id}/logs", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		m.mu.Lock()
		_, ok := m.instances[id]
		m.mu.Unlock()
		if !ok {
			writeError(w, ErrNotFound)
			return
		}
		data, err := os.ReadFile(filepath.Join(m.dir(id), "process.log"))
		if err != nil && !os.IsNotExist(err) {
			writeError(w, err)
			return
		}
		if len(data) > 65536 {
			data = data[len(data)-65536:]
		}
		writeJSON(w, 200, map[string]string{"text": string(data)})
	})
	mux.HandleFunc("/v1/instances/{id}/management/{path...}", func(w http.ResponseWriter, r *http.Request) { m.proxy(w, r, true) })
	mux.HandleFunc("/v1/instances/{id}/inference/{path...}", func(w http.ResponseWriter, r *http.Request) { m.proxy(w, r, false) })
	mux.HandleFunc("/v1/instances/{id}/credentials/{credential}/inference/{path...}", m.credentialInference)
	return mux
}

func (m *Manager) proxy(w http.ResponseWriter, r *http.Request, management bool) {
	id := r.PathValue("id")
	m.mu.Lock()
	i, ok := m.instances[id]
	if !ok {
		m.mu.Unlock()
		writeError(w, ErrNotFound)
		return
	}
	port, key, apiKey := i.Port, i.ManagementKey, i.APIKey
	running := m.processes[id] != nil
	m.mu.Unlock()
	if !running {
		writeJSON(w, 503, map[string]string{"error": "instance is stopped"})
		return
	}
	suffix := r.PathValue("path")
	for _, part := range strings.Split(suffix, "/") {
		if part == ".." || part == "." {
			writeError(w, errors.New("invalid upstream path"))
			return
		}
	}
	prefix := "/v0/management/"
	if management {
		if suffix == "config" || suffix == "config.yaml" || suffix == "api-keys" {
			writeError(w, errors.New("instance authentication and full configuration are private; use individual settings endpoints"))
			return
		}
	} else {
		prefix = "/"
		if !strings.HasPrefix(suffix, "v1/") && !strings.HasPrefix(suffix, "v1beta/") {
			writeError(w, ErrNotFound)
			return
		}

	}
	target, _ := url.Parse("http://127.0.0.1:" + strconv.Itoa(port))
	proxy := httputil.NewSingleHostReverseProxy(target)
	original := proxy.Director
	proxy.Director = func(req *http.Request) {
		original(req)
		req.URL.Path = prefix + suffix
		req.URL.RawPath = ""
		req.Host = target.Host
		req.Header.Del("Cookie")
		req.Header.Del("X-Management-Key")
		req.Header.Del("X-API-Key")
		req.Header.Del("X-Goog-Api-Key")
		if management {
			req.Header.Set("Authorization", "Bearer "+key)
		} else {
			req.Header.Set("Authorization", "Bearer "+apiKey)
		}
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		writeJSON(w, 502, map[string]string{"error": "instance request failed"})
	}
	proxy.FlushInterval = -1
	r.Body = http.MaxBytesReader(w, r.Body, 16<<20)
	proxy.ServeHTTP(w, r)
}
