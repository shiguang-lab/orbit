package manager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func (m *Manager) Run() {
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		tick := time.NewTicker(m.cfg.Interval)
		defer tick.Stop()
		for {
			m.monitor()
			m.refreshCatalog(m.ctx)
			m.report()
			select {
			case <-m.ctx.Done():
				return
			case <-tick.C:
			}
		}
	}()
}
func (m *Manager) monitor() {
	for _, snapshot := range m.Snapshot().Instances {
		if m.ctx.Err() != nil {
			return
		}
		m.mu.Lock()
		i, ok := m.instances[snapshot.ID]
		if !ok {
			m.mu.Unlock()
			continue
		}
		restart := i.DesiredState == "running" && i.Version != "" && m.processes[i.ID] == nil && !i.busy && !time.Now().Before(i.retryAt)
		m.mu.Unlock()
		if restart {
			if _, err := m.Submit(snapshot.ID, "start", ""); err == nil {
				m.mu.Lock()
				if current := m.instances[snapshot.ID]; current != nil {
					current.RestartCount++
				}
				m.mu.Unlock()
			}
			continue
		}
		healthy, latency := m.probe(m.ctx, snapshot.ID)
		m.mu.Lock()
		if i = m.instances[snapshot.ID]; i != nil {
			now := time.Now().UTC()
			i.CheckedAt = &now
			i.Healthy = healthy
			i.LatencyMS = latency
			if m.processes[i.ID] != nil && !i.busy {
				if healthy {
					i.State = "running"
				} else {
					i.State = "unhealthy"
				}
			}
		}
		m.mu.Unlock()
	}
	// Bound persisted operation history to 200 completed jobs.
	m.mu.Lock()
	defer m.mu.Unlock()
	completed := 0
	for _, j := range m.jobs {
		if j.Status != "running" {
			completed++
		}
	}
	for completed > 200 {
		var oldest *Job
		for _, j := range m.jobs {
			if j.Status != "running" && (oldest == nil || j.CreatedAt.Before(oldest.CreatedAt)) {
				oldest = j
			}
		}
		if oldest == nil {
			break
		}
		if err := os.Remove(filepath.Join(m.cfg.DataDir, "jobs", oldest.ID+".json")); err != nil {
			break
		}
		delete(m.jobs, oldest.ID)
		completed--
	}
}
func (m *Manager) report() {
	if m.cfg.ReportURL == "" || m.ctx.Err() != nil {
		return
	}
	data, err := json.Marshal(m.Snapshot())
	if err != nil {
		return
	}
	req, err := http.NewRequestWithContext(m.ctx, "POST", m.cfg.ReportURL, bytes.NewReader(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := m.client.Do(req)
	message := ""
	if err != nil {
		message = "node report delivery failed"
	} else {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 65536))
		resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			message = fmt.Sprintf("node report returned HTTP %d", resp.StatusCode)
		}
	}
	m.mu.Lock()
	m.reportError = message
	m.mu.Unlock()
}
