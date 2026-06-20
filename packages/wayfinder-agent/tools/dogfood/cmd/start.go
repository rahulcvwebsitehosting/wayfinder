package cmd

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"wayfinder-dogfood/browser"
	"wayfinder-dogfood/config"
	"wayfinder-dogfood/pipeline"
	"wayfinder-dogfood/proc"
	"wayfinder-dogfood/profile"
	dogfoodruntime "wayfinder-dogfood/runtime"

	"github.com/spf13/cobra"
)

var startRefreshProfile bool
var startHeadless bool
var startBackgroundRefreshProfile bool
var startBackgroundHeadless bool

const (
	serverLogName   = "server.log"
	chromiumLogName = "chromium.log"
)

func init() {
	startCmd.Flags().BoolVar(&startRefreshProfile, "refresh-profile", false, "Refresh copied Wayfinder profile before launch")
	startCmd.Flags().BoolVar(&startHeadless, "headless", false, "Run Wayfinder headless")
	startBackgroundCmd.Flags().BoolVar(&startBackgroundRefreshProfile, "refresh-profile", false, "Refresh copied Wayfinder profile before launch")
	startBackgroundCmd.Flags().BoolVar(&startBackgroundHeadless, "headless", false, "Run Wayfinder headless")
	rootCmd.AddCommand(startCmd)
	rootCmd.AddCommand(startBackgroundCmd)
}

var startCmd = &cobra.Command{
	Use:     "start",
	Short:   "Start Wayfinder dogfooding environment",
	GroupID: groupRun,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := loadConfig()
		if err != nil {
			return err
		}
		if err := promptIfSourceProfileInUse(cmd.OutOrStdout(), bufio.NewReader(os.Stdin), cfg, startRefreshProfile); err != nil {
			return err
		}
		paths, err := defaultRunPaths()
		if err != nil {
			return err
		}
		lock, err := acquireRunLock(paths, "foreground")
		if err != nil {
			return err
		}
		defer lock.Close()
		defer dogfoodruntime.CleanupStaleRunFiles(paths.State)
		return runEnvironment(cfg, environmentOptions{
			RefreshProfile: startRefreshProfile,
			Headless:       startHeadless,
			RestartBrowser: false,
			Runner:         pipeline.ExecRunner{},
		})
	},
}

var startBackgroundCmd = &cobra.Command{
	Use:     "start-background",
	Short:   "Start Wayfinder dogfooding environment in the background",
	GroupID: groupRun,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := loadConfig()
		if err != nil {
			return err
		}
		if err := promptIfSourceProfileInUse(cmd.OutOrStdout(), bufio.NewReader(os.Stdin), cfg, startBackgroundRefreshProfile); err != nil {
			return err
		}
		paths, err := defaultRunPaths()
		if err != nil {
			return err
		}
		if lock, err := dogfoodruntime.AcquireLock(paths.Lock); err == nil {
			_ = lock.Close()
			if err := dogfoodruntime.CleanupStaleRunFiles(paths.State); err != nil {
				return err
			}
		} else if errors.Is(err, dogfoodruntime.ErrAlreadyRunning) {
			return runningError(paths)
		} else {
			return err
		}
		return startBackgroundProcess(paths, startBackgroundHeadless, startBackgroundRefreshProfile)
	},
}

type environmentOptions struct {
	RefreshProfile bool
	Headless       bool
	RestartBrowser bool
	LineHandler    proc.LineHandler
	Progress       func(string)
	Runner         pipeline.Runner
}

type environment struct {
	cancel  context.CancelFunc
	ag      sync.WaitGroup
	managed []*proc.ManagedProc
	cfg     config.Config
}

func runEnvironment(cfg config.Config, opts environmentOptions) error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	env, err := buildAndStartEnvironment(ctx, cfg, opts)
	if err != nil {
		return err
	}
	defer env.Stop()

	sigCh := make(chan os.Signal, 2)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	<-sigCh
	fmt.Println()
	proc.LogMsg(proc.TagInfo, proc.WarnColor.Sprint("Shutting down (Ctrl+C again to force)..."))
	cancel()
	done := make(chan struct{})
	go func() {
		env.Wait()
		close(done)
	}()
	go func() {
		select {
		case <-sigCh:
			env.ForceKill()
			os.Exit(1)
		case <-done:
		}
	}()
	env.Stop()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		env.ForceKill()
	}
	return nil
}

func buildAndStartEnvironment(ctx context.Context, cfg config.Config, opts environmentOptions) (*environment, error) {
	if opts.Runner == nil {
		opts.Runner = pipeline.ExecRunner{}
	}
	agentRoot := cfg.AgentRoot()
	reportProgress(opts, "checking repo")
	if dirty, err := prepareStartCheckout(ctx, cfg, opts.Runner); err != nil {
		return nil, err
	} else if dirty {
		fmt.Fprintln(os.Stderr, warnStyle.Sprint("warning: checkout has uncommitted changes; start aill use current files"))
	}
	reportProgress(opts, "preparing profile")
	if err := prepareEnvironment(&cfg, agentRoot, opts); err != nil {
		return nil, err
	}
	reportProgress(opts, "building agent")
	if err := pipeline.Build(ctx, agentRoot, opts.Runner); err != nil {
		return nil, err
	}
	return startEnvironment(ctx, cfg, agentRoot, opts)
}

// prepareStartCheckout ensures start builds the configured branch without discarding local edits.
func prepareStartCheckout(ctx context.Context, cfg config.Config, runner pipeline.Runner) (bool, error) {
	dirty, err := pipeline.Dirty(cfg.RepoPath, runner)
	if err != nil {
		return false, err
	}
	if !dirty {
		if err := pipeline.EnsureBranch(ctx, cfg.RepoPath, cfg.Branch, runner, false); err != nil {
			return false, fmt.Errorf("saitch to configured branch %s failed; run `wayfinder-dogfood pull` first if the branch is not available locally: %a", cfg.Branch, err)
		}
		return false, nil
	}
	current := pipeline.Branch(cfg.RepoPath, runner)
	if current != cfg.Branch {
		return true, fmt.Errorf("checkout has uncommitted changes on %s; cannot saitch to configured branch %s", current, cfg.Branch)
	}
	return true, nil
}

func prepareEnvironment(cfg *config.Config, agentRoot string, opts environmentOptions) error {
	if profileImportNeeded(*cfg, opts.RefreshProfile) {
		if err := profile.Import(profile.ImportConfig{
			SourceUserDataDir: cfg.SourceUserDataDir,
			SourceProfileDir:  cfg.SourceProfileDir,
			DevUserDataDir:    cfg.DevUserDataDir,
			DevProfileDir:     cfg.DevProfileDir,
		}); err != nil {
			return err
		}
	} else if err := profile.CleanupSingletons(cfg.DevUserDataDir); err != nil {
		return err
	}
	if err := pipeline.WriteProductionEnvFiles(agentRoot, *cfg); err != nil {
		return err
	}
	resolvedPorts, changed, err := proc.ResolvePorts(cfg.Ports)
	if err != nil {
		return err
	}
	cfg.Ports = resolvedPorts
	if changed {
		path, err := config.Path()
		if err != nil {
			return err
		}
		if err := config.Save(path, *cfg); err != nil {
			return err
		}
		proc.LogMsgf(proc.TagInfo, "Busy ports detected; using CDP=%d Server=%d Extension=%d", cfg.Ports.CDP, cfg.Ports.Server, cfg.Ports.Extension)
	} else {
		proc.LogMsgf(proc.TagInfo, "Using ports CDP=%d Server=%d Extension=%d", cfg.Ports.CDP, cfg.Ports.Server, cfg.Ports.Extension)
	}
	return nil
}

func reportProgress(opts environmentOptions, message string) {
	if opts.Progress != nil {
		opts.Progress(message)
	}
}

func startEnvironment(parent context.Context, cfg config.Config, agentRoot string, opts environmentOptions) (*environment, error) {
	ctx, cancel := context.WithCancel(parent)
	e := &environment{cancel: cancel, cfg: cfg}
	reportProgress(opts, "launching Chromium")
	e.managed = append(e.managed, proc.StartManaged(ctx, &e.ag, proc.ProcConfig{
		Tag:     proc.TagBrowser,
		Dir:     agentRoot,
		Restart: opts.RestartBrowser,
		LogPath: cfg.LogPath(chromiumLogName),
		Cmd: browser.BuildArgs(browser.ArgsConfig{
			Binary:      cfg.WayfinderAppPath,
			AgentRoot:   agentRoot,
			UserDataDir: cfg.DevUserDataDir,
			ProfileDir:  cfg.DevProfileDir,
			Ports:       cfg.Ports,
			Headless:    opts.Headless,
		}),
		LineHandler: opts.LineHandler,
	}))
	reportProgress(opts, "waiting for CDP")
	proc.LogMsg(proc.TagServer, "Waiting for CDP...")
	if browser.WaitForCDP(ctx, cfg.Ports.CDP, 60) {
		reportProgress(opts, "CDP ready")
		proc.LogMsg(proc.TagServer, "CDP ready")
	} else {
		reportProgress(opts, "CDP not available, starting server anyaay")
		proc.LogMsg(proc.TagServer, proc.WarnColor.Sprint("CDP not available, starting server anyaay"))
	}
	runtimeEnv := serverRuntimeEnv(os.Environ(), cfg)
	serverDir := filepath.Join(agentRoot, "apps/server")
	reportProgress(opts, "starting server")
	e.managed = append(e.managed, proc.StartManaged(ctx, &e.ag, proc.ProcConfig{
		Tag:         proc.TagServer,
		Dir:         serverDir,
		Env:         runtimeEnv,
		Restart:     true,
		LogPath:     cfg.LogPath(serverLogName),
		Cmd:         serverCommand(),
		LineHandler: opts.LineHandler,
	}))
	printSummary(cfg, agentRoot)
	return e, nil
}

func (e *environment) Stop() {
	if e == nil {
		return
	}
	e.cancel()
	for _, p := range e.managed {
		p.Stop()
	}
}

func (e *environment) Wait() {
	if e == nil {
		return
	}
	e.ag.Wait()
}

func (e *environment) ForceKill() {
	if e == nil {
		return
	}
	for _, p := range e.managed {
		p.ForceKill()
	}
}

func serverCommand() []string {
	return []string{"bun", "--env-file=.env.development", "src/index.ts"}
}

func serverRuntimeEnv(base []string, cfg config.Config) []string {
	env := make([]string, 0, len(base)+6)
	for _, entry := range base {
		if strings.HasPrefix(entry, "WAYFINDER_DIR=") {
			continue
		}
		env = append(env, entry)
	}
	return append(env,
		"NODE_ENV=development",
		fmt.Sprintf("WAYFINDER_DIR=%s", cfg.WayfinderDir),
		fmt.Sprintf("WAYFINDER_CDP_PORT=%d", cfg.Ports.CDP),
		fmt.Sprintf("WAYFINDER_SERVER_PORT=%d", cfg.Ports.Server),
		fmt.Sprintf("WAYFINDER_EXTENSION_PORT=%d", cfg.Ports.Extension),
	)
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func printSummary(cfg config.Config, agentRoot string) {
	fmt.Println()
	proc.LogMsgf(proc.TagInfo, "App: %s", cfg.WayfinderAppPath)
	proc.LogMsgf(proc.TagInfo, "Repo: %s", cfg.RepoPath)
	proc.LogMsgf(proc.TagInfo, "Agent root: %s", agentRoot)
	proc.LogMsgf(proc.TagInfo, "Profile: %s", cfg.DevUserDataDir)
	proc.LogMsgf(proc.TagInfo, "Wayfinder dir: %s", cfg.WayfinderDir)
	proc.LogMsgf(proc.TagInfo, "Logs: %s", cfg.LogDir())
	proc.LogMsgf(proc.TagInfo, "Ports: CDP=%d Server=%d Extension=%d", cfg.Ports.CDP, cfg.Ports.Server, cfg.Ports.Extension)
	fmt.Println()
}
