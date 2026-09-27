# CodeSensei — Submission Content
Copy-paste these directly into the lablab.ai submission form.

---

## Project Title
**CodeSensei — From "Lost on Day 1" to "Shipping in Days"**

---

## Short Description (1–2 lines)
CodeSensei is an AI onboarding copilot that turns an undocumented codebase into a guided first week — mapping architecture, setting up the dev environment, and answering "where is X handled?" questions instantly, so new developers ship their first PR in days instead of months.

---

## Long Description

**The problem.**
The average developer takes 3–6 months to reach full productivity in a new codebase. The median company takes 35 days just to get a new hire to basic productivity — laggards take 50+ days. Every "quick question" a new developer asks pulls a senior engineer off their own work, and 92% of developers say the onboarding experience itself is a major factor in whether they stay at a company long-term. Multiply that across every hire, every year, and it's one of the most expensive, least-fixed problems in software teams — not because it's hard to solve, but because nobody owns fixing it.

**The story behind it.**
Picture a new grad's first day: a 50,000-line repo with no docs, a Slack channel full of unexplained jargon, and a manager who says "just explore the codebase, ask if you get stuck." By day three they've asked the same senior engineer four questions and feel like a burden. By week three they still haven't shipped anything real. Some talented people quit before they ever get the chance to prove themselves — not because they lacked skill, but because nobody handed them a map. CodeSensei is that map.

**The solution.**
CodeSensei uses IBM Bob 2.0's Agent mode to run a team of subagents in parallel over a real codebase:
- **Architecture Mapper** — crawls the repo and produces a visual module/dependency map plus a plain-English "how this app works" explainer.
- **Setup Agent** — reads the project's config and dependency files and generates a working local-setup script and troubleshooting guide, tested against common failure points.
- **Codebase Q&A Agent** — uses document understanding to ingest the repo and any existing (even outdated) docs, letting a new developer ask "where is authentication handled?" in plain English and get an answer with exact file and line citations.
- **First-Task Finder** — scans open issues and recent git history to recommend a small, safe first task scoped to the new developer's stated experience level.

All four run as parallel tasks coordinated by Bob's Agent mode, and the results land in a single dashboard a new hire opens on their first morning.

**The impact.**
In our demo, a developer using CodeSensei goes from opening an unfamiliar repo to having a working local setup, an architecture overview, and an assigned first task in under 2 minutes — a process that today takes new hires days to weeks of unstructured exploration and repeated interruptions to senior engineers.

---

## IBM Bob Usage Statement
We used IBM Bob 2.0's Agent mode to orchestrate four specialized subagents (Architecture Mapper, Setup Agent, Codebase Q&A Agent, First-Task Finder) running as parallel tasks against a real project repository. Bob's document understanding capability was used to reconcile existing project documentation against the actual codebase, surfacing outdated or missing docs. Rather than using Bob only to assist with writing code, we used it to manage and execute the full multi-step onboarding workflow end-to-end — from repo analysis to environment setup to task assignment.

---

## Technology & Category Tags
`AI Agents` `Developer Tools` `Onboarding` `IBM Bob 2.0` `Agent Orchestration` `Document Understanding` `Next.js` `Developer Productivity` `DevEx`

---

## Cover Image / Video / Slides — notes for you
- **Cover image:** a split-screen graphic — left side "Day 1, unassisted" (confused stick figure, tangled file tree), right side "Day 1, with CodeSensei" (clean dashboard). This single image *is* your pitch.
- **Video demo (60–90 sec):** show the live contrast — 10 seconds of scrolling an undocumented repo confused, cut to CodeSensei generating the architecture map + first task in under 2 minutes on the same repo.
- **Slides:** Problem (with the 35-day / 3–6 month stats) → Story (the new grad) → Solution (4 subagents diagram) → Live demo screenshot → Impact numbers → What we'd build next.
