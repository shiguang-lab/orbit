package manager

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"syscall"
	"time"
)

type process struct {
	cmd  *exec.Cmd
	done chan struct{}
	log  *boundedLog
}

// Keep at most two 2 MiB process log files per instance, independent of child verbosity.
type boundedLog struct {
	mu   sync.Mutex
	path string
}

func (l *boundedLog) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	n := len(p)
	if len(p) > 2<<20 {
		p = p[len(p)-(2<<20):]
	}
	if s, err := os.Stat(l.path); err == nil && s.Size()+int64(len(p)) > 2<<20 {
		if err = os.Rename(l.path, l.path+".1"); err != nil {
			return 0, err
		}
	}
	f, err := os.OpenFile(l.path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return 0, err
	}
	_, err = f.Write(p)
	closeErr := f.Close()
	if err != nil {
		return 0, err
	}
	return n, closeErr
}
func (m *Manager) start(ctx context.Context, id string) error {
	m.mu.Lock()
	i := m.instances[id]
	if m.processes[id] != nil {
		m.mu.Unlock()
		return nil
	}
	if i.Version == "" {
		m.mu.Unlock()
		return errors.New("instance not installed")
	}
	port := i.Port
	binary := m.binary(id, i.Version)
	l, err := net.Listen("tcp", "127.0.0.1:"+strconv.Itoa(port))
	if err != nil {
		m.mu.Unlock()
		return errors.New("instance port occupied")
	}
	l.Close()
	cmd := exec.Command(binary, "--config", filepath.Join(m.dir(id), "config.yaml"))
	cmd.Dir = m.dir(id)
	cmd.SysProcAttr = processAttrs()
	// Do not pass node/control tokens or Orbit database secrets to child processes.
	cmd.Env = []string{"PATH=" + os.Getenv("PATH"), "HOME=" + m.dir(id)}
	for _, key := range []string{"HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR"} {
		if value, ok := os.LookupEnv(key); ok {
			cmd.Env = append(cmd.Env, key+"="+value)
		}
	}
	log := &boundedLog{path: filepath.Join(m.dir(id), "process.log")}
	cmd.Stdout = log
	cmd.Stderr = log
	if err = cmd.Start(); err != nil {
		m.mu.Unlock()
		return errors.New("failed to launch CLIProxyAPI executable")
	}
	p := &process{cmd: cmd, done: make(chan struct{}), log: log}
	m.processes[id] = p
	now := time.Now().UTC()
	i.StartedAt = &now
	i.PID = cmd.Process.Pid
	i.State = "starting"
	i.LastError = ""
	m.mu.Unlock()
	go func() {
		err := cmd.Wait()
		m.mu.Lock()
		defer m.mu.Unlock()
		if m.processes[id] == p {
			delete(m.processes, id)
			i.PID = 0
			i.Healthy = false
			i.State = "stopped"
			if err != nil {
				i.State = "error"
				i.LastError = "CLIProxyAPI process exited unexpectedly"
			}
			i.retryAt = time.Now().Add(10 * time.Second)
		}
		close(p.done)
	}()
	timeout := time.NewTimer(30 * time.Second)
	defer timeout.Stop()
	tick := time.NewTicker(250 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			_ = m.stop(id)
			return ctx.Err()
		case <-p.done:
			return errors.New("CLIProxyAPI exited during startup")
		case <-timeout.C:
			_ = m.stop(id)
			return errors.New("CLIProxyAPI startup health check timed out")
		case <-tick.C:
			healthy, latency := m.probe(ctx, id)
			if healthy {
				m.mu.Lock()
				alive := m.processes[id] == p
				if alive {
					i.State = "running"
					i.Healthy = true
					i.LatencyMS = latency
				}
				m.mu.Unlock()
				if alive {
					return nil
				}
			}
		}
	}
}
func (m *Manager) stop(id string) error {
	m.mu.Lock()
	p := m.processes[id]
	i := m.instances[id]
	if p == nil {
		if i != nil {
			i.PID = 0
			i.Healthy = false
			i.State = "stopped"
			if i.Version == "" {
				i.State = "not_installed"
			}
		}
		m.mu.Unlock()
		return nil
	}
	i.State = "stopping"
	m.mu.Unlock()
	_ = syscall.Kill(-p.cmd.Process.Pid, syscall.SIGTERM)
	select {
	case <-p.done:
	case <-time.After(10 * time.Second):
		_ = syscall.Kill(-p.cmd.Process.Pid, syscall.SIGKILL)
		select {
		case <-p.done:
		case <-time.After(5 * time.Second):
			return errors.New("process did not exit after SIGKILL")
		}
	}
	m.mu.Lock()
	i.State = "stopped"
	i.LastError = ""
	m.mu.Unlock()
	return nil
}
func (m *Manager) probe(ctx context.Context, id string) (bool, int64) {
	m.mu.Lock()
	i, ok := m.instances[id]
	if !ok {
		m.mu.Unlock()
		return false, 0
	}
	port, key := i.Port, i.ManagementKey
	m.mu.Unlock()
	req, err := http.NewRequestWithContext(ctx, "GET", "http://127.0.0.1:"+strconv.Itoa(port)+"/v0/management/config", nil)
	if err != nil {
		return false, 0
	}
	req.Header.Set("Authorization", "Bearer "+key)
	start := time.Now()
	resp, err := m.client.Do(req)
	if err != nil {
		return false, 0
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
	return resp.StatusCode == 200, time.Since(start).Milliseconds()
}
