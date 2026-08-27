# Session Resume

Read `.copilot/context/current-focus.md` first.
Then scan `.copilot/context/open-threads.md` for tangential threads worth picking up.

Then:

1. Summarize what was last worked on.
2. List unresolved questions or blockers.
3. Identify the files most likely relevant for the current session.
4. Propose the smallest meaningful next step.
5. Call out architectural constraints that must be respected.
6. If `.copilot/wiki/` exists, report which pages are flagged as stale (see below).
7. If `graphify-out/` exists, report how far behind the knowledge graph is (see below).

## Staleness signal

Pages nobody touches rot silently, and those are the dangerous ones — you read them with
confidence precisely *because* they are in the wiki. Surfacing them here costs nothing: this
prompt already runs at the start of every session, right before you start trusting those pages.

- Run `npm run wiki:stale` if that script exists in `package.json`; otherwise, if the wiki is small,
  compare `git log -1 --format=%cs -- <source>` against each page's `verified` date by hand.
- Report the flagged pages as a short list, and say explicitly if any of them covers the area this
  session is about to touch — that is the only case where it should influence the next step.
- **This is a signal, not a task.** Do not start fixing pages here: resolving the debt is the
  `wiki-gc` prompt's job, one page per run, on a cheap model. A page whose `verified` date is
  older than its sources is only *possibly* wrong; whether it is actually wrong takes reading code.
- `kind: decision` pages are never flagged by a source commit — rationale does not rot when the
  code changes, only when the decision itself is revisited.

## Graph freshness signal

The knowledge graph has the opposite problem of the wiki: it is trusted *more* and watched *less*.
It is the first thing consulted about the codebase, so a stale graph answers confidently from a
snapshot of the past — the worst failure mode there is.

- Run `npm run graph:stale` if that script exists in `package.json`.
- **Code changes need no action.** Where a graphify post-commit hook is installed, AST extraction
  re-runs on every commit, for free and with no LLM. Report the count, then move on.
- **Text changes are the manual part.** Docs, papers, and images require `graphify . --update`,
  which costs tokens. Mention it only if this session is about to rely on those areas; do not run
  it unprompted just because the counter is non-zero.
- `graphify-out/wiki/` is generated from the graph and is *not* `.copilot/wiki/`. It is regenerated
  by `tools/graphify-wiki-gen.py`, and it matters for whoever reads those pages by hand instead of
  querying the graph.
- **Signal, not task** — same rule as the wiki. A graph a few days behind on documentation is
  usually fine; one that is behind in the exact area you are about to change is not.
