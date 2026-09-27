# AGENTS.md — Agent mode (coding)

This file provides guidance to agents when working with code in this repository.

## Non-obvious coding rules

- **Never write project-specific sample values into `output/*.json`.**
  Those files are neutral schema contracts. Real values come only from live agent analysis of a target repo.

- **`_meta.status` must be set correctly** when writing output files:
  `"ready"` only after all fields are fully populated; use `"pending"` while in-progress.

- **`output/qa-context.json#knownAnswers[]` is the only place** to add pre-seeded Q&A pairs.
  Do not modify the `sampleAnswers` array in `index.html` — that array exists solely for the offline demo fallback.

- **`index.html` has no external dependencies** — do not introduce `<script src="">`, CDN links,
  or `import` statements. All JS must remain inline in the single file.

- **The four `agents/*.md` prompt specs are consumed verbatim** — the content inside the triple-backtick
  block is passed directly as a Bob subagent description. Preserve that block delimiter exactly.
