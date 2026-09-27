# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project type
Zero-dependency static site. No package manager, no build step, no test runner.
The only runnable command is: `python3 -m http.server 8000` (or just open `index.html` directly).

## Agent → dashboard contract
Agents write results to `output/*.json`. The dashboard reads them via `fetch()` at load time.
Four files, one per agent — schema defined in each file:
- `output/architecture.json` — Architecture panel
- `output/setup.json` — Setup panel
- `output/qa-context.json` — Ask panel seed data
- `output/first-task.json` — First Task panel

**`_meta.status` controls dashboard rendering:**
- `"sample"` → show current hardcoded data (demo mode)
- `"pending"` → show loading skeleton
- `"ready"` → render live data from the JSON

## Agent prompt files
`agents/*.md` — the triple-backtick block inside each file is the verbatim Bob subagent task description.
All four agents run in parallel (no inter-agent dependencies at generation time).

## Dashboard extension pattern
Adding a new panel requires **both**:
1. `<button class="navbtn" data-panel="<id>">` in `<nav>`
2. `<div class="panel" id="<id>">` in `<main>`

The nav JS in `index.html` is purely attribute-driven — no other wiring needed.

## Q&A answer shape
The `sendChat()` function matches user input against `sampleAnswers` via regex `.test()`.
Each entry: `{ q: /regex/i, a: "plain text", cite: "file:lineRange" }`.
`output/qa-context.json#knownAnswers` uses the same logical shape but as structured JSON.

## File path convention
All `path` values in output JSON files must be relative to the **target repo being analysed**,
not relative to this (`codesensei-scaffold/`) project directory.
