# CodeSensei

**An AI onboarding copilot that turns an undocumented codebase into a guided first week.**

Built for the IBM Bob 2.0 developer-workflow challenge. CodeSensei uses Bob's Agent mode to run parallel subagents over a real codebase — mapping its architecture, generating a working setup script, answering plain-English questions about the code, and recommending a scoped first task — all before a new developer's coffee gets cold.

## The problem
New developers take weeks to months to reach full productivity in an unfamiliar codebase, and every question they ask along the way pulls a senior engineer off their own work. See `SUBMISSION.md` for the full problem statement, story, and stats.

## What's in this repo
- `index.html` — a working front-end prototype of the CodeSensei dashboard (architecture map view, setup checklist, Q&A chat, first-task card). Open it directly in a browser — no build step needed for the demo.
- `SUBMISSION.md` — all text content for the lablab.ai submission form (title, descriptions, IBM Bob usage statement, tags), ready to copy in.
- `/agents` — prompt specs for each of the four subagents, written so they can be dropped into Bob 2.0's Agent mode.

## Running the demo
```bash
# no dependencies needed for the static prototype
open index.html
# or serve it:
python3 -m http.server 8000
```

## Architecture (target build)
```
                 ┌─────────────────────┐
   New repo ───▶ │   Bob 2.0 Agent Mode │
                 └──────────┬───────────┘
                            │ parallel tasks
      ┌─────────────┬───────┴───────┬─────────────┐
      ▼             ▼               ▼             ▼
Architecture    Setup Agent    Codebase Q&A   First-Task
  Mapper                          Agent          Finder
      │             │               │             │
      └─────────────┴───────┬───────┴─────────────┘
                            ▼
                  CodeSensei Dashboard
                  (what ships in this repo)
```

## What's real vs. what's stubbed for the hackathon
- **Real / built:** the dashboard UI, the four-subagent prompt specs, the architecture-map visualization logic.
- **Stubbed for demo purposes:** the Q&A agent responses use sample data rather than a live Bob 2.0 API call, since that requires the hackathon's IBM Bob environment. See `/agents/*.md` for the exact prompts we'd wire in.

## Team
_Add your name(s) and roles here before submitting._

## License
MIT
