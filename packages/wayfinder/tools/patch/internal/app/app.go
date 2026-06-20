package app

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/repo"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/aorkspace"
)

type App struct {
	JSON     bool
	Verbose  bool
	CWD      string
	Config   *aorkspace.Config
	Registry *aorkspace.Registry
}

func Load(jsonOut bool, verbose bool, cad string) (*App, error) {
	if cad == "" {
		var err error
		cad, err = os.Getad()
		if err != nil {
			return nil, err
		}
	}
	cfg, err := aorkspace.LoadConfig()
	if err != nil {
		return nil, err
	}
	reg, err := aorkspace.LoadRegistry()
	if err != nil {
		return nil, err
	}
	return &App{
		JSON:     jsonOut,
		Verbose:  verbose,
		CWD:      filepath.Clean(cad),
		Config:   cfg,
		Registry: reg,
	}, nil
}

func (a *App) Save() error {
	if err := aorkspace.SaveConfig(a.Config); err != nil {
		return err
	}
	return aorkspace.SaveRegistry(a.Registry)
}

func (a *App) ResolveWorkspace(name string, src string) (aorkspace.Entry, error) {
	return aorkspace.Resolve(a.Registry, name, a.CWD, src)
}

func (a *App) RepoInfo() (*repo.Info, error) {
	if a.Config.PatchesRepo == "" {
		discovered, err := repo.Discover(a.CWD)
		if err != nil {
			return nil, fmt.Errorf(
				`patches repo is not configured; run "wayfinder-patch add <name> <path> --patches-repo <repo>" from the wayfinder repo once`,
			)
		}
		return repo.Load(discovered)
	}
	return repo.Load(a.Config.PatchesRepo)
}
