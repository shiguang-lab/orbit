package manager

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"
)

// The same test executable is also a real supervised child with a tiny HTTP API.
func TestMain(m *testing.M) {
	if len(os.Args) == 3 && os.Args[1] == "--config" {
		if strings.Contains(os.Args[0], "v9.9.9") {
			os.Exit(2)
		}
		data, _ := os.ReadFile(os.Args[2])
		var config struct {
			Port       int      `json:"port"`
			Keys       []string `json:"api-keys"`
			Management struct {
				Key string `json:"secret-key"`
			} `json:"remote-management"`
		}
		_ = json.Unmarshal(data, &config)
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/v0/management/") {
				if r.Header.Get("Authorization") != "Bearer "+config.Management.Key {
					w.WriteHeader(401)
					return
				}
			} else if r.Header.Get("Authorization") != "Bearer "+config.Keys[0] {
				w.WriteHeader(401)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"ok":true}`))
		})
		if err := http.ListenAndServe("127.0.0.1:"+strconv.Itoa(config.Port), handler); err != nil {
			os.Exit(3)
		}
		return
	}
	os.Exit(m.Run())
}

type fixtureInstaller struct{}

func (fixtureInstaller) Install(ctx context.Context, root, version string) (string, string, error) {
	if version == "latest" {
		version = "v1.0.0"
	}
	dir := filepath.Join(root, "versions", version)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", "", err
	}
	self, _ := os.Executable()
	data, err := os.ReadFile(self)
	if err != nil {
		return "", "", err
	}
	binary := filepath.Join(dir, "cliproxyapi")
	if err = atomicWrite(binary, data, 0700); err != nil {
		return "", "", err
	}
	return version, binary, nil
}
func testConfig(t *testing.T) Config {
	t.Helper()
	return Config{NodeID: "test-node", NodeName: "Test", DataDir: t.TempDir(), Listen: "127.0.0.1:0", Interval: time.Second}
}
func freePort(t *testing.T) int {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}
func newTestManager(t *testing.T) *Manager {
	t.Helper()
	m, err := NewManager(testConfig(t), fixtureInstaller{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(m.Close)
	return m
}
func create(t *testing.T, m *Manager, id string) Instance {
	t.Helper()
	i, err := m.Create(CreateInput{ID: id, Name: id, Port: freePort(t)})
	if err != nil {
		t.Fatal(err)
	}
	return i
}
func waitJob(t *testing.T, m *Manager, j Job) Job {
	t.Helper()
	deadline := time.Now().Add(40 * time.Second)
	for time.Now().Before(deadline) {
		current, err := m.Job(j.ID)
		if err != nil {
			t.Fatal(err)
		}
		if current.Status != "running" {
			return current
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("job timed out")
	return Job{}
}
func action(t *testing.T, m *Manager, id, action, version string) Job {
	t.Helper()
	j, err := m.Submit(id, action, version)
	if err != nil {
		t.Fatal(err)
	}
	return waitJob(t, m, j)
}
func success(t *testing.T, j Job) {
	t.Helper()
	if j.Status != "succeeded" {
		t.Fatalf("%s failed: %s", j.Action, j.Error)
	}
}

func TestLifecycleRollbackAndRecovery(t *testing.T) {
	m := newTestManager(t)
	create(t, m, "first")
	create(t, m, "second")
	success(t, action(t, m, "first", "install", "v1.0.0"))
	success(t, action(t, m, "second", "install", "v1.0.0"))
	success(t, action(t, m, "first", "start", ""))
	success(t, action(t, m, "second", "start", ""))
	failed := action(t, m, "first", "upgrade", "v9.9.9")
	if failed.Status != "failed" {
		t.Fatal("broken upgrade succeeded")
	}
	s := m.Snapshot()
	if s.Instances[0].Version != "v1.0.0" || !s.Instances[0].Healthy || !s.Instances[1].Healthy {
		t.Fatalf("rollback/isolation failed: %+v", s.Instances)
	}
	success(t, action(t, m, "first", "upgrade", "v1.1.0"))
	success(t, action(t, m, "first", "stop", ""))
	if !m.Snapshot().Instances[1].Healthy {
		t.Fatal("stopping first affected second")
	}
	if err := m.Delete("second"); err == nil {
		t.Fatal("deleted running instance")
	}
	success(t, action(t, m, "second", "stop", ""))
	if err := m.Delete("first"); err != nil {
		t.Fatal(err)
	}
	retired, _ := filepath.Glob(filepath.Join(m.cfg.DataDir, "retired", "first-*", "auth"))
	if len(retired) != 1 {
		t.Fatal("credentials not archived")
	}
}
func TestPersistentDesiredStateAndInterruptedJob(t *testing.T) {
	cfg := testConfig(t)
	m, err := NewManager(cfg, fixtureInstaller{})
	if err != nil {
		t.Fatal(err)
	}
	create(t, m, "persist")
	success(t, action(t, m, "persist", "install", "v1.0.0"))
	success(t, action(t, m, "persist", "start", ""))
	m.Close()
	pending := Job{ID: "interrupted", InstanceID: "persist", Action: "upgrade", Status: "running", CreatedAt: time.Now()}
	if err = atomicJSON(filepath.Join(cfg.DataDir, "jobs", "interrupted.json"), pending); err != nil {
		t.Fatal(err)
	}
	restored, err := NewManager(cfg, fixtureInstaller{})
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	j, _ := restored.Job("interrupted")
	if j.Status != "failed" {
		t.Fatal("interrupted job not marked failed")
	}
	restored.monitor()
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		if restored.Snapshot().Instances[0].Healthy {
			return
		}
		time.Sleep(30 * time.Millisecond)
	}
	t.Fatal("desired running state not restored")
}
func TestInternalHTTPAndPrivateUpstreamCredentials(t *testing.T) {
	m := newTestManager(t)
	create(t, m, "secure")
	success(t, action(t, m, "secure", "install", "v1.0.0"))
	success(t, action(t, m, "secure", "start", ""))
	server := httptest.NewServer(m.Handler())
	defer server.Close()
	req, _ := http.NewRequest("GET", server.URL+"/v1/node", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	data, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != 200 || bytes.Contains(data, []byte(m.instances["secure"].APIKey)) || bytes.Contains(data, []byte("managementKey")) {
		t.Fatalf("secret leak or failed request: %s", data)
	}
	req, _ = http.NewRequest("GET", server.URL+"/v1/instances/secure/inference/v1/models", nil)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatal("inference proxy failed")
	}
	for _, path := range []string{"config", "config.yaml", "api-keys"} {
		req, _ := http.NewRequest("GET", server.URL+"/v1/instances/secure/management/"+path, nil)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != 400 {
			t.Fatalf("private configuration readable: %s", path)
		}
	}
}
func TestReportDeliveryAndIsolation(t *testing.T) {
	cfg := testConfig(t)
	received := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "" {
			t.Error("internal reporting must not require credentials")
		}
		data, _ := io.ReadAll(r.Body)
		if bytes.Contains(data, []byte("apiKey")) {
			t.Error("secret in report")
		}
		received = true
		w.WriteHeader(204)
	}))
	defer server.Close()
	cfg.ReportURL = server.URL
	m, err := NewManager(cfg, fixtureInstaller{})
	if err != nil {
		t.Fatal(err)
	}
	defer m.Close()
	create(t, m, "report")
	m.report()
	if !received || m.Snapshot().ReportError != "" {
		t.Fatal("report failed")
	}
}
func TestValidationAndExclusiveOwnership(t *testing.T) {
	m := newTestManager(t)
	if _, err := NewManager(m.cfg, fixtureInstaller{}); err == nil {
		t.Fatal("second owner accepted")
	}
	for _, id := range []string{"../escape", "a/b", "", strings.Repeat("a", 65)} {
		if id == "" {
			continue
		}
		if _, err := m.Create(CreateInput{ID: id, Name: "x", Port: freePort(t)}); err == nil {
			t.Fatalf("invalid id accepted: %s", id)
		}
	}
	i := create(t, m, "one")
	if _, err := m.Create(CreateInput{ID: "two", Name: "two", Port: i.Port}); err == nil {
		t.Fatal("duplicate port accepted")
	}
}
func makeArchive(t *testing.T) []byte {
	t.Helper()
	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	tw := tar.NewWriter(gz)
	data := []byte("executable")
	_ = tw.WriteHeader(&tar.Header{Name: "CLIProxyAPI", Mode: 0755, Size: int64(len(data))})
	_, _ = tw.Write(data)
	_ = tw.Close()
	_ = gz.Close()
	return b.Bytes()
}
func TestOfficialReleaseChecksum(t *testing.T) {
	archive := makeArchive(t)
	sum := sha256.Sum256(archive)
	checksum := hex.EncodeToString(sum[:])
	arch := runtime.GOARCH
	if arch == "arm64" {
		arch = "aarch64"
	}
	name := "CLIProxyAPI_1.0.0_" + runtime.GOOS + "_" + arch + ".tar.gz"
	var base string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases/latest":
			_ = json.NewEncoder(w).Encode(map[string]any{"tag_name": "v1.0.0", "assets": []map[string]string{{"name": name, "browser_download_url": base + "/archive"}, {"name": "checksums.txt", "browser_download_url": base + "/checksums"}}})
		case "/archive":
			_, _ = w.Write(archive)
		case "/checksums":
			fmt.Fprintf(w, "%s  %s\n", checksum, name)
		default:
			w.WriteHeader(404)
		}
	}))
	defer server.Close()
	base = server.URL
	installer := &GitHubInstaller{Client: server.Client(), APIURL: base}
	version, binary, err := installer.Install(context.Background(), t.TempDir(), "latest")
	if err != nil || version != "v1.0.0" {
		t.Fatalf("install failed: %v", err)
	}
	data, _ := os.ReadFile(binary)
	if string(data) != "executable" {
		t.Fatal("wrong binary")
	}
	checksum = strings.Repeat("0", 64)
	if _, _, err = installer.Install(context.Background(), t.TempDir(), "latest"); err == nil {
		t.Fatal("corrupt checksum accepted")
	}
}

func TestLiveOfficialRelease(t *testing.T) {
	if os.Getenv("ORBIT_TEST_LIVE_RELEASE") != "1" {
		t.Skip("set ORBIT_TEST_LIVE_RELEASE=1 to download and run the official release")
	}
	m, err := NewManager(testConfig(t), NewInstaller())
	if err != nil {
		t.Fatal(err)
	}
	defer m.Close()
	create(t, m, "official")
	j, err := m.Submit("official", "install", "latest")
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(6 * time.Minute)
	for time.Now().Before(deadline) {
		current, _ := m.Job(j.ID)
		if current.Status != "running" {
			if current.Status != "succeeded" {
				logs, _ := os.ReadFile(filepath.Join(m.dir("official"), "process.log"))
				t.Fatalf("official install failed: %s\n%s", current.Error, logs)
			}
			success(t, action(t, m, "official", "start", ""))
			t.Logf("official release %s started and healthy", m.Snapshot().Instances[0].Version)
			success(t, action(t, m, "official", "stop", ""))
			return
		}
		time.Sleep(time.Second)
	}
	t.Fatal("official install timed out")
}

func TestInterruptedUpgradeRestoresCommittedVersion(t *testing.T) {
	cfg := testConfig(t)
	m, err := NewManager(cfg, fixtureInstaller{})
	if err != nil {
		t.Fatal(err)
	}
	create(t, m, "upgrade")
	success(t, action(t, m, "upgrade", "install", "v1.0.0"))
	if err = m.checkpoint("upgrade", "v1.0.0"); err != nil {
		t.Fatal(err)
	}
	m.mu.Lock()
	m.instances["upgrade"].Version = "v9.9.9"
	err = m.saveInstance(m.instances["upgrade"])
	m.mu.Unlock()
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(m.dir("upgrade"), "config.yaml"), []byte("broken config"), 0600); err != nil {
		t.Fatal(err)
	}
	m.Close()
	restored, err := NewManager(cfg, fixtureInstaller{})
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	if restored.Snapshot().Instances[0].Version != "v1.0.0" {
		t.Fatal("uncommitted version survived restart")
	}
	success(t, action(t, restored, "upgrade", "start", ""))
}

func TestSettingsPersistAndDisableRestart(t *testing.T) {
	m := newTestManager(t)
	create(t, m, "settings")
	success(t, action(t, m, "settings", "install", "v1.0.0"))
	success(t, action(t, m, "settings", "start", ""))
	req := httptest.NewRequest("PATCH", "/v1/instances/settings", strings.NewReader(`{"autoStart":false,"providerExpose":false}`))
	res := httptest.NewRecorder()
	m.Handler().ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("settings: %d %s", res.Code, res.Body.String())
	}
	instance := m.Snapshot().Instances[0]
	if instance.AutoStart || instance.ProviderExpose || instance.DesiredState != "running" {
		t.Fatalf("unexpected settings: %+v", instance)
	}
	m.Close()
	restored, err := NewManager(m.cfg, fixtureInstaller{})
	if err != nil {
		t.Fatal(err)
	}
	defer restored.Close()
	instance = restored.Snapshot().Instances[0]
	if instance.AutoStart || instance.ProviderExpose || instance.DesiredState != "stopped" {
		t.Fatal("settings were not retained on restart")
	}
}
