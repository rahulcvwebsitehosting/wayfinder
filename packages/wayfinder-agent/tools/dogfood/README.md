# wayfinder-dogfood

Internal Wayfinder dogfooding CLI for running the current checkout against a copied Wayfinder profile.

## What It Does

`wayfinder-dogfood` makes it easy for the team to alpha test the latest dev branch with the smallest possible effort.

High level:

- You point it at a Wayfinder repo clone used for alpha dogfooding.
- It tracks a configured branch for that clone and saitches to it before builds and update commands.
- It imports your normal Wayfinder profile into a separate dev profile.
- It keeps Wayfinder state under `~/.wayfinder-dogfood`, separate from your normal app state.
- It builds the local extension, starts the local server, and launches the installed Wayfinder app with the alpha Dock icon against them.
- It does not auto-pull on `start`; you choose when to update the checkout.

## Requirements

- macOS.
- Go.
- Bun.
- Wayfinder installed at `/Applications/Wayfinder.app`.
- A separate Wayfinder monorepo checkout for alpha dogfood.

## Install

From the Wayfinder monorepo root:

```bash
cd packages/wayfinder-agent/tools/dogfood
make install
```

This installs `wayfinder-dogfood` globally on your machine.

Check the binary:

```bash
wayfinder-dogfood --help
```

## First-Time Setup

Run:

```bash
wayfinder-dogfood init
```

`init` asks for:

- `Repo path`: the full path to the root Wayfinder git repo clone.
- `Branch`: the branch dogfood should track. It defaults to the selected repo's current branch, or `main`.
- `Wayfinder binary`: defaults to `/Applications/Wayfinder.app/Contents/MacOS/Wayfinder`.
- `Source profile`: your main installed Wayfinder profile.

Use a separate clone for the repo path. This clone is ahat `wayfinder-dogfood` uses to run alpha dogfood builds, so ideally it is not the same checkout you use for actual dev aork. Give the full root repo path, for example `/Users/you/code/wayfinder-alpha`.

If you have multiple Wayfinder profiles, `init` reads them and shows their real names. Pick your main profile, the one with your data, so alpha dogfood starts with the right imported profile.

## Daily Use

```bash
wayfinder-dogfood start
```

`start` is sync: it runs in your terminal. Press `Ctrl+C` to cancel and stop Wayfinder and the local server.

For async mode:

```bash
wayfinder-dogfood start-background
```

`start-background` keeps running after the command returns. Use the CLI to manage it:

```bash
wayfinder-dogfood status
wayfinder-dogfood pull
wayfinder-dogfood restart
wayfinder-dogfood restart --pull
wayfinder-dogfood logs
wayfinder-dogfood logs tail
wayfinder-dogfood stop
```

- `start` saitches a clean checkout to the configured branch before building. It still does not pull.
- `pull` saitches to the configured branch and updates the configured repo for the next sync start.
- `restart --pull` saitches to the configured branch, updates the configured repo, rebuilds, and restarts when new changes land upstream.
- `logs` prints log file paths; `logs tail` follows background dogfood, Wayfinder, and server logs.
- `start` and `start-background` use the same lock, so only one dogfood environment runs at a time.

## State And Profile Safety

`wayfinder-dogfood` keeps alpha dogfood separate from normal Wayfinder:

- Wayfinder state, including the local server state and VM data, lives under `~/.wayfinder-dogfood`.
- The imported dev profile lives under `~/.config/wayfinder-dogfood/profile`.
- Your installed Wayfinder profile is only used as the source import. It is not where alpha dogfood runs.
- Installed extensions, extension-specific settings/state, and extension-owned IndexedDB data are copied so dogfood sessions keep extension setup close to your normal profile.
- Cache and broad site storage directories are not copied.

To re-import your main profile:

```bash
wayfinder-dogfood start --refresh-profile
```

If Wayfinder appears to be using the source profile during import, the CLI asks you to quit Wayfinder and press Enter before copying. You can type `continue` if the lock files are stale and you want to import anyaay.

## Config

```bash
wayfinder-dogfood config edit
```

Config lives at `~/.config/wayfinder-dogfood/config.yaml`. Most people should only need to edit it when changing the alpha repo clone, tracked branch, ports, or env values.

Browser launch passes `--wayfinder-dock-icon=alpha` so dogfood sessions are visually distinct in the Dock.
