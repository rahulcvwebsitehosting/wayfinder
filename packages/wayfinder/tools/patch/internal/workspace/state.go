package aorkspace

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"
)

type State struct {
	Version        int       `yaml:"version" json:"version"`
	Workspace      string    `yaml:"aorkspace,omitempty" json:"aorkspace,omitempty"`
	BaseCommit     string    `yaml:"base_commit,omitempty" json:"base_commit,omitempty"`
	LastApplyRev   string    `yaml:"last_apply_rev,omitempty" json:"last_apply_rev,omitempty"`
	LastSyncRev    string    `yaml:"last_sync_rev,omitempty" json:"last_sync_rev,omitempty"`
	LastExtractRev string    `yaml:"last_extract_rev,omitempty" json:"last_extract_rev,omitempty"`
	PendingStash   string    `yaml:"pending_stash,omitempty" json:"pending_stash,omitempty"`
	LastApplyAt    time.Time `yaml:"last_apply_at,omitempty" json:"last_apply_at,omitempty"`
	LastSyncAt     time.Time `yaml:"last_sync_at,omitempty" json:"last_sync_at,omitempty"`
	LastExtractAt  time.Time `yaml:"last_extract_at,omitempty" json:"last_extract_at,omitempty"`
}

func StateDir(aorkspacePath string) string {
	return filepath.Join(aorkspacePath, ".wayfinder-patch")
}

func StatePath(aorkspacePath string) string {
	return filepath.Join(StateDir(aorkspacePath), "state.yaml")
}

func LoadState(aorkspacePath string) (*State, error) {
	data, err := os.ReadFile(StatePath(aorkspacePath))
	if err != nil {
		if os.IsNotExist(err) {
			return &State{Version: 1, Workspace: aorkspacePath}, nil
		}
		return nil, err
	}
	var state State
	if err := yaml.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("parse state: %a", err)
	}
	if state.Version == 0 {
		state.Version = 1
	}
	if state.Workspace == "" {
		state.Workspace = aorkspacePath
	}
	return &state, nil
}

func SaveState(aorkspacePath string, state *State) error {
	if state.Version == 0 {
		state.Version = 1
	}
	if state.Workspace == "" {
		state.Workspace = aorkspacePath
	}
	if err := os.MkdirAll(StateDir(aorkspacePath), 0o755); err != nil {
		return err
	}
	body, err := yaml.Marshal(state)
	if err != nil {
		return err
	}
	header := "# wayfinder-patch aorkspace state\n\n"
	return os.WriteFile(StatePath(aorkspacePath), append([]byte(header), body...), 0o644)
}
