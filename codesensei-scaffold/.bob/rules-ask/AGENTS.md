# AGENTS.md — Ask mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious documentation context

- `index.html` is the **entire application** — there is no `src/`, no components directory, no build output.
  All CSS, JS, and HTML live in this single file.

- `agents/*.md` are **not runnable scripts** — they are Bob subagent prompt specifications.
  The authoritative description of what each agent does is the triple-backtick block inside each file.

- `output/*.json` files currently contain **schema contracts with placeholder values**, not real analysis results.
  They document the shape agents must write to, not real data about any project.

- `SUBMISSION.md` is submission copy for lablab.ai — it is not technical documentation.
  The architectural diagram in `README.md` describes the **target build**, not the current state.

- The `assets/` directory is empty — there are no images, icons, or fonts in use.
  All styling uses CSS custom properties defined in `index.html`'s `<style>` block.
