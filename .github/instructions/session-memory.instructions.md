---
applyTo: "**"
---

# Session Memory Instructions

## Purpose

- Use the session-memory workflow to keep ongoing architectural decisions and next steps discoverable across Copilot sessions.
- Treat `.copilot/context/current-focus.md` as the canonical handoff snapshot for the current state of work.
- Treat `.copilot/wiki/*.md` as the durable knowledge base — git-tracked, topic-organized pages
  (one page per subject: RECADV pipeline, RETANN, reception screen, Soft1 schema facts, etc.),
  edited in place and never appended-to as a chronological log. This is where facts that should
  survive indefinitely belong. See `.copilot/wiki/README.md` for the page index.

## How the three layers relate

- `.copilot/wiki/*.md` — durable, curated, git-tracked. The "what is true about this system"
  layer. Update in place when a fact changes; never just append a dated entry.
- `.copilot/context/current-focus.md` — short, current, operational snapshot. Says what's being
  worked on *right now* and links out to the relevant wiki page(s) instead of restating durable
  facts inline. Rewritten/trimmed each session, not a growing log.
- `.copilot/context/open-threads.md` — backlog of tangential/unclear threads surfaced during
  session analysis. Keep entries short (status, priority, one-line summary, next action) and
  link into the corresponding wiki page for full detail instead of inlining long paragraphs.
- `.copilot/context/CHANGELOG.md` — archive of `current-focus.md`'s pre-2026-08-24 chronological
  history, kept for reversibility. Not maintained going forward.

## When To Update

- Update the handoff snapshot when a session changes the current architecture understanding, working decisions, or next recommended step.
- Prefer updating the handoff snapshot after meaningful progress, not after every small edit.
- When a session establishes a new durable fact (not just session-scoped progress), update the
  relevant `.copilot/wiki/*.md` page in place rather than only recording it in `current-focus.md`.

## What To Record

- Record only the current goal, active area, relevant files, confirmed decisions, open questions, and next step.
- Keep the snapshot short and operational; avoid long narrative logs.
- Put durable, cross-session facts in the wiki (`.copilot/wiki/*.md`), not in the handoff snapshot.
  Repo memory (`/memories/repo/*.md`) remains scratch space for a single session/investigation —
  promote the valuable parts to the wiki (see `memory-promote` workflow) rather than letting them
  live only in tool-local memory.

## Workflow

- At the start of a new session, read `.copilot/context/current-focus.md` before making architectural assumptions.
- At the start of a new session, scan `.copilot/context/open-threads.md` for tangential threads worth picking up.
- Follow links from `current-focus.md`/`open-threads.md` into `.copilot/wiki/*.md` pages when you need full detail rather than expecting it to be repeated inline.
- When the session ends with a new stable understanding, update the handoff snapshot so the next session can resume without reconstructing context from scratch.
- If the new understanding is a durable fact (not just "what to do next"), also update the relevant wiki page in place.
- After session analysis (`session-analysis.prompt.md`), append any tangential or unclear open threads to `.copilot/context/open-threads.md`. Do not duplicate threads that already exist there.
