# Code Review Graph

This project uses [code-review-graph](https://github.com/tirth8205/code-review-graph) to build a persistent knowledge graph of the codebase for AI-assisted reviews and context-aware development.

## Setup

```bash
# Install (already done)
pip install code-review-graph

# Build the graph (initial build)
code-review-graph build

# Or incremental update
code-review-graph update
```

## Daemon Mode (OpenCode / Cursor)

Since OpenCode doesn't support hooks, use the daemon for automatic graph updates:

```bash
# Register this repo
crg-daemon add /home/agi/Work/Personal/Repo/mini-me --alias mini-me

# Start the daemon
crg-daemon start

# Check status
crg-daemon status

# View logs
crg-daemon logs --repo mini-me -f
```

The daemon watches `~/.code-review-graph/watch.toml` and auto-rebuilds the graph on file changes.

## Configuration

Graph data is stored in `.code-review-graph/graph.db` (SQLite). To exclude paths, create `.code-review-graphignore`:

```
generated/**
*.generated.ts
node_modules/**
dist/**
```

Since this is a git repo, only tracked files are indexed automatically.
