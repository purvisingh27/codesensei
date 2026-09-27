# AGENTS.md — Plan mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious architectural constraints

- **The dashboard has no server component** — all agent results must be materialised as static JSON files
  before the dashboard is opened. There is no WebSocket, no polling, no backend.

- **Four agents are independent at generation time** — none of their outputs depend on another agent's output,
  so all four can and should run in parallel. Do not introduce sequential dependencies.

- **`_meta.status` is the only handshake mechanism** between agents and the dashboard.
  Any phased or incremental update strategy must be expressed through this field.

- **The Q&A agent has a dual lifecycle** — it writes `output/qa-context.json` once at init (pre-seeded answers),
  then enters interactive mode responding to live user questions. Planning must account for both phases.

- **Adding a fifth agent** requires: a new `agents/<name>.md`, a new `output/<name>.json` contract file,
  and a new panel wired into `index.html` via `data-panel` attribute. All three must move together.

- **File path scope**: output JSON `path` fields refer to the **target repo under analysis**, not this project.
  Any orchestrator must pass the target repo root to each subagent explicitly.
