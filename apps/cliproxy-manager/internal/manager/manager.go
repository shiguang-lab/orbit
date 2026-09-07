package manager

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"
)

func NewManager(cfg Config, installer Installer) (*Manager, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	abs, err := filepath.Abs(cfg.DataDir)
	if err != nil {
		return nil, err
	}
	cfg.DataDir = abs
	for _, p := range []string{cfg.DataDir, filepath.Join(cfg.DataDir, "instances"), filepath.Join(cfg.DataDir, "jobs")} {
		if err := os.MkdirAll(p, 0700); err != nil {
			return nil, err
		}
	}
	lock, err := os.OpenFile(filepath.Join(cfg.DataDir, "manager.lock"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		lock.Close()
		return nil, errors.New("data directory already owned by another agent")
	}
	ctx, cancel := context.WithCancel(context.Background())
	m := &Manager{cfg: cfg, instances: map[string]*Instance{}, jobs: map[string]*Job{}, processes: map[string]*process{}, installer: installer, client: &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, started: time.Now(), ctx: ctx, cancel: cancel, lock: lock}
	if err = m.load(); err != nil {
		cancel()
		lock.Close()
		return nil, err
	}
	return m, nil
}
func (m *Manager) load() error {
	files, err := filepath.Glob(filepath.Join(m.cfg.DataDir, "instances", "*", "instance.json"))
	if err != nil {
		return err
	}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		var d instanceDisk
		if err = json.Unmarshal(data, &d); err != nil {
			return err
		}
		if !validID.MatchString(d.ID) || filepath.Base(filepath.Dir(file)) != d.ID || d.Port < 1024 || d.Port > 65535 || len(d.APIKey) < 16 || len(d.ManagementKey) < 32 || (d.Version != "" && !validVersion.MatchString(d.Version)) {
			return errors.New("invalid persisted instance")
		}
		for _, i := range m.instances {
			if i.Port == d.Port {
				return errors.New("duplicate persisted instance port")
			}
		}
		i := d.Instance
		i.APIKey = d.APIKey
		i.ManagementKey = d.ManagementKey
		if !i.AutoStart {
			i.DesiredState = "stopped"
		}
		i.PID = 0
		i.Healthy = false
		i.State = "stopped"
		if i.Version == "" {
			i.State = "not_installed"
		}
		if err := m.restoreCheckpoint(&i); err != nil {
			return err
		}
		m.instances[i.ID] = &i
	}
	files, err = filepath.Glob(filepath.Join(m.cfg.DataDir, "jobs", "*.json"))
	if err != nil {
		return err
	}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		var j Job
		if err = json.Unmarshal(data, &j); err != nil {
			return err
		}
		if !validID.MatchString(j.ID) {
			return errors.New("invalid job ID")
		}
		if j.Status == "running" {
			j.Status = "failed"
			j.Error = "agent restarted before operation completed"
			now := time.Now().UTC()
			j.FinishedAt = &now
			if err = m.saveJob(&j); err != nil {
				return err
			}
		}
		m.jobs[j.ID] = &j
	}
	return nil
}

type CreateInput struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Port int    `json:"port"`
}

func (m *Manager) Create(in CreateInput) (Instance, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.closing {
		return Instance{}, ErrConflict
	}
	if len(m.instances) >= 500 {
		return Instance{}, errors.New("node instance limit reached (500)")
	}
	if in.ID == "" {
		in.ID = randomID()
	}
	if !validID.MatchString(in.ID) || strings.TrimSpace(in.Name) == "" || len(in.Name) > 128 || in.Port < 1024 || in.Port > 65535 {
		return Instance{}, errors.New("invalid ID, name, or port (1024–65535)")
	}
	if _, ok := m.instances[in.ID]; ok {
		return Instance{}, ErrConflict
	}
	for _, i := range m.instances {
		if i.Port == in.Port {
			return Instance{}, errors.New("instance port already assigned")
		}
	}
	l, err := net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(in.Port)))
	if err != nil {
		return Instance{}, errors.New("instance port already in use")
	}
	l.Close()
	dir := m.dir(in.ID)
	if err = os.Mkdir(dir, 0700); err != nil {
		return Instance{}, err
	}
	cleanup := true
	defer func() {
		if cleanup {
			os.RemoveAll(dir)
		}
	}()
	if err = os.Mkdir(filepath.Join(dir, "auth"), 0700); err != nil {
		return Instance{}, err
	}
	i := &Instance{AutoStart: true, ProviderExpose: true, ID: in.ID, Name: strings.TrimSpace(in.Name), Port: in.Port, APIKey: randomID() + randomID(), ManagementKey: randomID() + randomID(), State: "not_installed", DesiredState: "stopped"}
	// JSON is a YAML subset. CLIProxyAPI may subsequently persist this as YAML.
	config := map[string]any{"host": "127.0.0.1", "port": in.Port, "auth-dir": filepath.Join(dir, "auth"), "api-keys": []string{i.APIKey}, "remote-management": map[string]any{"allow-remote": false, "secret-key": i.ManagementKey, "disable-control-panel": true}, "force-model-prefix": true, "logging-to-file": true, "logs-max-total-size-mb": 20, "error-logs-max-files": 10}
	if err = atomicJSON(filepath.Join(dir, "config.yaml"), config); err != nil {
		return Instance{}, err
	}
	if err = m.saveInstance(i); err != nil {
		return Instance{}, err
	}
	m.instances[i.ID] = i
	cleanup = false
	return *i, nil
}
func (m *Manager) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	i, ok := m.instances[id]
	if !ok {
		return ErrNotFound
	}
	if i.busy || m.processes[id] != nil || i.DesiredState == "running" {
		return errors.New("stop the instance before deleting it")
	}
	// Deletion only removes the registered instance; credentials remain in a recoverable archive.
	archive := filepath.Join(m.cfg.DataDir, "retired")
	if err := os.MkdirAll(archive, 0700); err != nil {
		return err
	}
	if err := os.Rename(m.dir(id), filepath.Join(archive, id+"-"+randomID())); err != nil {
		return err
	}
	delete(m.instances, id)
	return nil
}
func (m *Manager) Submit(id, action, version string) (Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	i, ok := m.instances[id]
	if !ok {
		return Job{}, ErrNotFound
	}
	if i.busy || m.closing {
		return Job{}, ErrConflict
	}
	switch action {
	case "install", "upgrade", "start", "stop", "restart":
	default:
		return Job{}, errors.New("unsupported action")
	}
	if action == "install" && i.Version != "" {
		return Job{}, errors.New("instance already installed; use upgrade")
	}
	if action != "install" && i.Version == "" && action != "stop" {
		return Job{}, errors.New("install the instance first")
	}
	if version == "" {
		version = "latest"
	}
	if version != "latest" && !validVersion.MatchString(version) {
		return Job{}, errors.New("invalid version")
	}
	j := &Job{ID: randomID(), InstanceID: id, Action: action, Version: version, Status: "running", CreatedAt: time.Now().UTC()}
	if err := m.saveJob(j); err != nil {
		return Job{}, err
	}
	m.jobs[j.ID] = j
	i.busy = true
	m.wg.Add(1)
	go func() { defer m.wg.Done(); m.execute(j) }()
	return *j, nil
}
func (m *Manager) execute(j *Job) {
	ctx, cancel := context.WithTimeout(m.ctx, 10*time.Minute)
	defer cancel()
	var err error
	switch j.Action {
	case "install", "upgrade":
		err = m.install(ctx, j.InstanceID, j.Version)
	case "start", "restart":
		m.mu.Lock()
		i := m.instances[j.InstanceID]
		i.DesiredState = "running"
		err = m.saveInstance(i)
		m.mu.Unlock()
		if err == nil && j.Action == "restart" {
			err = m.stop(j.InstanceID)
		}
		if err == nil {
			err = m.start(ctx, j.InstanceID)
		}
	case "stop":
		m.mu.Lock()
		i := m.instances[j.InstanceID]
		i.DesiredState = "stopped"
		err = m.saveInstance(i)
		m.mu.Unlock()
		if err == nil {
			err = m.stop(j.InstanceID)
		}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	i := m.instances[j.InstanceID]
	i.busy = false
	now := time.Now().UTC()
	j.FinishedAt = &now
	j.Status = "succeeded"
	if err != nil {
		j.Status = "failed"
		j.Error = err.Error()
		i.LastError = err.Error()
		i.retryAt = time.Now().Add(30 * time.Second)
	}
	if saveErr := m.saveInstance(i); saveErr != nil {
		j.Status = "failed"
		j.Error = "persist instance: " + saveErr.Error()
	}
	if saveErr := m.saveJob(j); saveErr != nil {
		j.Status = "failed"
		j.Error = "persist job: " + saveErr.Error()
	}
}
func (m *Manager) install(ctx context.Context, id, version string) error {
	// Download and verify while the old version continues serving.
	target, _, err := m.installer.Install(ctx, m.dir(id), version)
	if err != nil {
		return err
	}
	m.mu.Lock()
	i := m.instances[id]
	old := i.Version
	running := i.DesiredState == "running"
	m.mu.Unlock()
	if target == old {
		return nil
	}
	if err = m.stop(id); err != nil {
		return err
	}
	if err = m.checkpoint(id, old); err != nil {
		if running {
			_ = m.start(ctx, id)
		}
		return err
	}
	m.mu.Lock()
	i.Version = target
	i.State = "stopped"
	err = m.saveInstance(i)
	if err != nil {
		i.Version = old
	}
	m.mu.Unlock()
	if err == nil {
		err = m.start(ctx, id)
	} // Validate even when upgrading a stopped instance.
	if err != nil {
		stopErr := m.stop(id)
		if stopErr != nil {
			return fmt.Errorf("upgrade failed: %v; rollback stop failed: %w", err, stopErr)
		}
		m.mu.Lock()
		i.Version = old
		i.State = "stopped"
		if old == "" {
			i.State = "not_installed"
		}
		restoreErr := m.restoreCheckpoint(i)
		m.mu.Unlock()
		if restoreErr != nil {
			return fmt.Errorf("upgrade failed: %v; rollback persistence failed: %w", err, restoreErr)
		}
		if old != "" && running {
			if rollbackErr := m.start(ctx, id); rollbackErr != nil {
				return fmt.Errorf("upgrade failed: %v; rollback start failed: %w", err, rollbackErr)
			}
		}
		return fmt.Errorf("version activation failed; previous version restored: %w", err)
	}
	if err = m.commitUpgrade(id); err != nil {
		return err
	}
	if !running {
		return m.stop(id)
	}
	return nil
}
func (m *Manager) Snapshot() Snapshot {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := Snapshot{Metrics: metrics(m.cfg.DataDir), NodeID: m.cfg.NodeID, Name: m.cfg.NodeName, OS: runtime.GOOS, Arch: runtime.GOARCH, ManagerVersion: "0.2.0", UptimeSeconds: int64(time.Since(m.started).Seconds()), ObservedAt: time.Now().UTC(), Instances: []Instance{}, Jobs: []Job{}, ReportError: m.reportError}
	for _, i := range m.instances {
		s.Instances = append(s.Instances, *i)
	}
	sort.Slice(s.Instances, func(a, b int) bool { return s.Instances[a].ID < s.Instances[b].ID })
	for _, j := range m.jobs {
		s.Jobs = append(s.Jobs, *j)
	}
	sort.Slice(s.Jobs, func(a, b int) bool { return s.Jobs[a].CreatedAt.After(s.Jobs[b].CreatedAt) })
	if len(s.Jobs) > 50 {
		s.Jobs = s.Jobs[:50]
	}
	return s
}
func (m *Manager) Job(id string) (Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	j, ok := m.jobs[id]
	if !ok {
		return Job{}, ErrNotFound
	}
	return *j, nil
}
func (m *Manager) Close() {
	m.mu.Lock()
	m.closing = true
	m.mu.Unlock()
	m.cancel()
	m.wg.Wait()
	for _, i := range m.Snapshot().Instances {
		_ = m.stop(i.ID)
	}
	_ = syscall.Flock(int(m.lock.Fd()), syscall.LOCK_UN)
	_ = m.lock.Close()
}
