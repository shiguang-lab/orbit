package manager

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sync"
	"time"
)

var validID = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$`)
var validVersion = regexp.MustCompile(`^v?[0-9]+\.[0-9]+\.[0-9]+(?:[-.][a-zA-Z0-9.]+)?$`)

var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("instance has an active operation")

type Config struct {
	Listen    string
	DataDir   string
	NodeID    string
	NodeName  string
	ReportURL string
	Interval  time.Duration
}

func (c Config) Validate() error {
	if !validID.MatchString(c.NodeID) {
		return errors.New("CLIPROXY_MANAGER_ID must be an identifier")
	}
	if c.DataDir == "" || c.Listen == "" || c.Interval < time.Second {
		return errors.New("invalid data directory, listen address or monitor interval")
	}
	if c.ReportURL != "" {
		u, err := url.Parse(c.ReportURL)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return errors.New("node URLs must be absolute HTTP(S) URLs without credentials, query or fragment")
		}
	}
	return nil
}

type Instance struct {
	AutoStart      bool         `json:"autoStart"`
	ProviderExpose bool         `json:"providerExpose"`
	Credentials    []Credential `json:"credentials"`
	CatalogError   string       `json:"catalogError,omitempty"`
	ID             string       `json:"id"`
	Name           string       `json:"name"`
	Port           int          `json:"port"`
	Version        string       `json:"version"`
	DesiredState   string       `json:"desiredState"`
	State          string       `json:"state"`
	Healthy        bool         `json:"healthy"`
	LatencyMS      int64        `json:"latencyMs"`
	PID            int          `json:"pid"`
	RestartCount   int          `json:"restartCount"`
	LastError      string       `json:"lastError,omitempty"`
	StartedAt      *time.Time   `json:"startedAt,omitempty"`
	CheckedAt      *time.Time   `json:"checkedAt,omitempty"`
	APIKey         string       `json:"-"`
	ManagementKey  string       `json:"-"`
	busy           bool
	retryAt        time.Time
}

type instanceDisk struct {
	Instance
	APIKey        string `json:"apiKey"`
	ManagementKey string `json:"managementKey"`
}

type Job struct {
	ID         string     `json:"id"`
	InstanceID string     `json:"instanceId"`
	Action     string     `json:"action"`
	Version    string     `json:"version,omitempty"`
	Status     string     `json:"status"`
	Error      string     `json:"error,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	FinishedAt *time.Time `json:"finishedAt,omitempty"`
}

type Snapshot struct {
	Metrics        Metrics    `json:"metrics"`
	NodeID         string     `json:"nodeId"`
	Name           string     `json:"name"`
	OS             string     `json:"os"`
	Arch           string     `json:"arch"`
	ManagerVersion string     `json:"managerVersion"`
	UptimeSeconds  int64      `json:"uptimeSeconds"`
	ObservedAt     time.Time  `json:"observedAt"`
	Instances      []Instance `json:"instances"`
	Jobs           []Job      `json:"jobs"`
	ReportError    string     `json:"reportError,omitempty"`
}

type Installer interface {
	Install(context.Context, string, string) (string, string, error)
}

type Manager struct {
	catalogMu   sync.Mutex
	mu          sync.Mutex
	cfg         Config
	instances   map[string]*Instance
	jobs        map[string]*Job
	processes   map[string]*process
	installer   Installer
	client      *http.Client
	started     time.Time
	reportError string
	ctx         context.Context
	cancel      context.CancelFunc
	wg          sync.WaitGroup
	lock        *os.File
	closing     bool
}

func randomID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func atomicJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return atomicWrite(path, data, 0600)
}
func atomicWrite(path string, data []byte, mode os.FileMode) error {
	f, err := os.CreateTemp(filepath.Dir(path), ".write-*")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if err = f.Chmod(mode); err == nil {
		_, err = f.Write(data)
	}
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	return os.Rename(f.Name(), path)
}
func (m *Manager) dir(id string) string { return filepath.Join(m.cfg.DataDir, "instances", id) }
func (m *Manager) saveInstance(i *Instance) error {
	return atomicJSON(filepath.Join(m.dir(i.ID), "instance.json"), instanceDisk{*i, i.APIKey, i.ManagementKey})
}
func (m *Manager) saveJob(j *Job) error {
	return atomicJSON(filepath.Join(m.cfg.DataDir, "jobs", j.ID+".json"), j)
}
func (m *Manager) binary(id, version string) string {
	return filepath.Join(m.dir(id), "versions", version, "cliproxyapi")
}
