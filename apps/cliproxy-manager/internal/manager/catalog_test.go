package manager

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type officialFixtureInstaller struct{ binary string }

func (f officialFixtureInstaller) Install(_ context.Context, root, _ string) (string, string, error) {
	path := filepath.Join(root, "versions", "v7.2.153", "cliproxyapi")
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return "", "", err
	}
	data, err := os.ReadFile(f.binary)
	if err == nil {
		err = atomicWrite(path, data, 0700)
	}
	return "v7.2.153", path, err
}

// Run against the unmodified official binary: two local upstreams share a model,
// but the selected credential must remain exclusive on success, SSE and failure.
func TestOfficialCredentialIsolation(t *testing.T) {
	binary := os.Getenv("CLIPROXY_TEST_BINARY")
	if binary == "" {
		t.Skip("set CLIPROXY_TEST_BINARY to an official v7.2.153 executable")
	}
	var callsA, callsB atomic.Int32
	var failA atomic.Bool
	upstream := func(label string, calls *atomic.Int32) *httptest.Server {
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body["model"] != "grok-4.6" {
				t.Errorf("upstream model = %v", body["model"])
			}
			if label == "a" && failA.Load() {
				w.WriteHeader(429)
				_, _ = w.Write([]byte(`{"error":{"message":"test limit"}}`))
				return
			}
			w.Header().Set("Content-Type", "text/event-stream")
			output := map[string]any{"id": "msg_test", "type": "message", "role": "assistant", "status": "completed", "content": []any{map[string]string{"type": "output_text", "text": label}}}
			response := map[string]any{"id": "resp_test", "object": "response", "model": "grok-4.6", "status": "completed", "output": []any{output}, "usage": map[string]int{"input_tokens": 1, "output_tokens": 1, "total_tokens": 2}}
			events := []map[string]any{
				{"type": "response.created", "response": map[string]any{"id": "resp_test", "model": "grok-4.6", "status": "in_progress", "output": []any{}}},
				{"type": "response.output_item.added", "output_index": 0, "item": map[string]any{"id": "msg_test", "type": "message", "role": "assistant", "content": []any{}}},
				{"type": "response.content_part.added", "item_id": "msg_test", "output_index": 0, "content_index": 0, "part": map[string]string{"type": "output_text", "text": ""}},
				{"type": "response.output_text.delta", "item_id": "msg_test", "output_index": 0, "content_index": 0, "delta": label},
				{"type": "response.output_item.done", "output_index": 0, "item": output},
				{"type": "response.completed", "response": response},
			}
			for _, event := range events {
				data, _ := json.Marshal(event)
				_, _ = w.Write(append(append([]byte("data: "), data...), []byte("\n\n")...))
			}

		}))
	}
	a, b := upstream("a", &callsA), upstream("b", &callsB)
	defer a.Close()
	defer b.Close()
	m, err := NewManager(testConfig(t), officialFixtureInstaller{binary})
	if err != nil {
		t.Fatal(err)
	}
	defer m.Close()
	i := create(t, m, "local")
	action(t, m, i.ID, "install", "v7.2.153")
	path := filepath.Join(m.dir(i.ID), "config.yaml")
	raw, _ := os.ReadFile(path)
	var config map[string]any
	if err = json.Unmarshal(raw, &config); err != nil {
		t.Fatal(err)
	}
	config["request-retry"] = 0
	config["max-retry-interval"] = 0
	config["oauth-model-alias"] = map[string]any{"xai": []any{map[string]string{"name": "grok-4.6", "alias": "shared"}}}
	if err = atomicJSON(path, config); err != nil {
		t.Fatal(err)
	}
	ids := map[string]string{"test-a": "a.json", "test-b": "b.json"}
	for index, server := range []*httptest.Server{a, b} {
		name := []string{"a.json", "b.json"}[index]
		if err = atomicJSON(filepath.Join(m.dir(i.ID), "auth", name), map[string]any{"type": "xai", "access_token": "test-only-token", "email": name + "@example.invalid", "base_url": server.URL + "/v1"}); err != nil {
			t.Fatal(err)
		}
	}
	action(t, m, i.ID, "start", "")
	deadline := time.Now().Add(15 * time.Second)
	for {
		catalog, discoverErr := m.discover(context.Background(), i)
		ready := len(catalog) == 2
		for _, c := range catalog {
			ready = ready && c.Routable
		}
		if ready {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("OAuth prefixes did not register: %v %+v", discoverErr, catalog)
		}
		time.Sleep(200 * time.Millisecond)
	}
	api := httptest.NewServer(m.Handler())
	defer api.Close()
	request := func(id, model string, stream bool) (int, string) {
		data, _ := json.Marshal(map[string]any{"model": model, "stream": stream, "messages": []any{map[string]string{"role": "user", "content": "test"}}})
		response, requestErr := http.Post(api.URL+"/v1/instances/local/credentials/"+id+"/inference/v1/chat/completions", "application/json", strings.NewReader(string(data)))
		if requestErr != nil {
			t.Fatal(requestErr)
		}
		defer response.Body.Close()
		body, _ := io.ReadAll(response.Body)
		return response.StatusCode, string(body)
	}

	if status, body := request(ids["test-a"], "shared", false); status != 200 || !strings.Contains(body, `"content":"a"`) || strings.Contains(body, "orbit-") {
		t.Fatalf("credential A: %d %s", status, body)
	}
	if callsB.Load() != 0 {
		t.Fatal("A request reached B")
	}
	if status, body := request(ids["test-b"], "shared", true); status != 200 || !strings.Contains(body, "[DONE]") || !strings.Contains(body, `"content":"b"`) || strings.Contains(body, "orbit-") {
		t.Fatalf("credential B stream: %d %s", status, body)
	}
	beforeB := callsB.Load()
	failA.Store(true)
	if status, body := request(ids["test-a"], "shared", false); status == 200 {
		t.Fatalf("failed A unexpectedly succeeded: %s", body)
	}
	if callsB.Load() != beforeB {
		t.Fatal("failed A escaped to credential B")
	}
	beforeA := callsA.Load()
	if status, _ := request(ids["test-a"], "other", false); status != 400 {
		t.Fatalf("unknown model status %d", status)
	}
	if status, _ := request("missing", "shared", false); status != 404 {
		t.Fatalf("unknown credential status %d", status)
	}
	if callsA.Load() != beforeA || callsB.Load() != beforeB {
		t.Fatal("rejected request reached upstream")
	}
	if err = m.managementJSON(context.Background(), i, "PATCH", "auth-files/status", map[string]any{"name": "b.json", "disabled": true}, nil); err != nil {
		t.Fatal(err)
	}
	if status, _ := request(ids["test-b"], "shared", false); status != 503 {
		t.Fatalf("disabled credential status %d", status)
	}
	if callsA.Load() != beforeA || callsB.Load() != beforeB {
		t.Fatal("disabled credential reached upstream")
	}
	action(t, m, i.ID, "restart", "")
	catalog, err := m.discover(context.Background(), i)
	if err != nil {
		t.Fatal(err)
	}
	for _, credential := range catalog {
		if credential.ID == "a.json" && !credential.Routable {
			t.Fatal("credential prefix did not survive restart")
		}
		if credential.ID == "b.json" && !credential.Disabled {
			t.Fatal("disabled state did not survive restart")
		}
	}
}
