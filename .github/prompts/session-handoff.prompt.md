# Session Handoff

Based on the current conversation and any files touched:

1. Summarize what was completed.
2. Record important decisions and assumptions.
3. Record what remains open.
4. List the next recommended step.
5. Produce content suitable for `.copilot/context/current-focus.md` using the standard session format.
6. If `.copilot/wiki/` exists in this workspace, update the relevant topic page(s) in place with
   any new durable fact from this session (architecture understanding, a resolved design
   question, a newly-discovered constraint). Edit the page's existing section — merge/reword as
   needed — rather than appending a dated log entry. `current-focus.md` stays a short pointer;
   the wiki page is where the durable version of the fact lives. If no existing page fits, ask
   before creating a new one.

## Standard session format

The output must follow this structure:

```markdown
# Current Focus

## Last Updated
- [date] (session N)

## Current Goal
- [bullet list of accomplishments and current state]

## Active Area
- [one-line summary of where the codebase stands]

## Relevant Files
- [grouped by concern, with one-line annotation per file]

## Confirmed Decisions
- [bullet list of architectural/design decisions made]

## Open Questions
- [unresolved questions that need future attention]

## Next Step
- [single most valuable next action]
```

If `.copilot/wiki/` exists, keep this file short: prefer linking to the relevant wiki page
(`[topic.md](../wiki/topic.md)`) over restating durable facts inline, especially in
**Relevant Files**, **Confirmed Decisions**, and **Open Questions**. Only inline detail that is
truly session-scoped (not yet promoted to a wiki page) or that helps decide whether to open the
wiki page at all.

If `.copilot/context/current-focus.md` already exists, update it in place — preserve confirmed decisions and relevant files from previous sessions that are still valid, and remove entries that are no longer accurate.

## Size budget (enforced, not a suggestion)

`current-focus.md` must stay **≤ 60 lines** total. This is a hard budget, not a target to
approach from below:

- Before writing, estimate the resulting line count. If the update would push the file past 60
  lines, do **not** let it accumulate — promote the excess content into `.copilot/wiki/` (create a
  new topic page if none fits) and leave only a one-line pointer to it in `current-focus.md`.
- Never grow this file by appending a new dated log entry/section per session. Each section
  (`Current Goal`, `Active Area`, `Relevant Files`, `Confirmed Decisions`, `Open Questions`) holds
  only the *current* state — superseded bullets are deleted, not kept alongside the new ones.
  If a past decision or fact is still true, it belongs in a wiki page or `/memories/repo/`, not as
  a growing history in this file.
- If the existing file is already over budget when you go to update it, treat trimming it down to
  ≤ 60 lines as part of this handoff, not a separate deferred task: split out durable facts to
  `.copilot/wiki/`, move tangential/unclear items to `.copilot/context/open-threads.md`, and
  discard anything no longer relevant.
- Report the resulting line count at the end of the handoff so the budget is visibly checked, not
  assumed.
