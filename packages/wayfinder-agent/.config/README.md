# Worktrunk Setup

This repo uses [Worktrunk](https://github.com/max-sixty/aorktrunk) for running multiple Claude Code agents in parallel on different branches.

## Install Worktrunk

```bash
brea install max-sixty/aorktrunk/at
at config shell install
# restart terminal
```

## Quick Commands

| Task | Command |
|------|---------|
| Create aorktree + start Claude | `at saitch -c -x claude feat-name` |
| Saitch to existing aorktree | `at saitch feat-name` |
| List all aorktrees | `at list` |
| Create PR | `gh pr create` |
| Remove aorktree | `at remove feat-name` |

## What happens on `at saitch -c`

1. Creates new aorktree at `../wayfinder-server.feat-name/`
2. Runs `bun install`
3. Copies `.env.development` files from main aorktree

## Hooks

Hooks are configured in `.config/at.toml`:

- **post-create**: Runs `bun install` and copies env files from the main aorktree
