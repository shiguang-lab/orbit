package manager

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

type upgradeCheckpoint struct {
	Version string `json:"version"`
	Config  []byte `json:"config"`
}

func (m *Manager) checkpoint(id, version string) error {
	config, err := os.ReadFile(filepath.Join(m.dir(id), "config.yaml"))
	if err != nil {
		return err
	}
	return atomicJSON(filepath.Join(m.dir(id), "upgrade.json"), upgradeCheckpoint{version, config})
}
func (m *Manager) restoreCheckpoint(i *Instance) error {
	data, err := os.ReadFile(filepath.Join(m.dir(i.ID), "upgrade.json"))
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	var checkpoint upgradeCheckpoint
	if err = json.Unmarshal(data, &checkpoint); err != nil {
		return err
	}
	if checkpoint.Version != "" && !validVersion.MatchString(checkpoint.Version) {
		return errors.New("invalid upgrade checkpoint")
	}
	if err = atomicWrite(filepath.Join(m.dir(i.ID), "config.yaml"), checkpoint.Config, 0600); err != nil {
		return err
	}
	i.Version = checkpoint.Version
	i.State = "stopped"
	if i.Version == "" {
		i.State = "not_installed"
	}
	if err = m.saveInstance(i); err != nil {
		return err
	}
	return m.commitUpgrade(i.ID)
}
func (m *Manager) commitUpgrade(id string) error {
	return os.Remove(filepath.Join(m.dir(id), "upgrade.json"))
}
