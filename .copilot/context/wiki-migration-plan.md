# LLM Wiki migration — execution checklist

Meta-task, orthogonal to the RECADV/business work in `current-focus.md`. Goal: replace the
growing chronological log pattern with a Karpathy-style "LLM Wiki" — topic pages edited in
place instead of appended to forever. Tracked here (not in `current-focus.md`) because it's a
separate workstream; see `open-threads.md` entry `llm-wiki-migration` for the one-line pointer.

**Execution model**: fragmented across multiple clean-context sessions on purpose (agreed with
user 2026-08-24) — most of the work is transcription of already-gathered facts, not new
reasoning, so a fresh session with just this checklist performs as well as a long-lived one,
without the risk of this planning conversation's own context bloat corrupting the transcription.

**How to resume**: read this file in full, do the next unchecked batch, check items off
(`[ ]` -> `[x]`) as you finish them, don't re-litigate the confirmed decisions below.

## Confirmed decisions (do not re-ask)

1. Full migration now, not a pilot.
2. New location: `.copilot/wiki/` (a sibling of `.copilot/context/`), not inside `documentatie/`.
3. Global user-level prompts (in `VSCODE_USER_PROMPTS_FOLDER`) also get updated to target the
   new wiki structure — user explicitly accepted this affects ALL their workspaces, not just
   this repo.

## What "LLM Wiki" means here

- `.copilot/wiki/*.md` = topic pages, each a single durable "current truth" document. Edited
  in place when facts change (like a wiki article), never appended to as a log.
- `.copilot/context/current-focus.md` stays as the short, current, operational snapshot
  (Current Goal / Active Area / Next Step) — but instead of embedding full historical detail
  inline, it links out to the relevant wiki page(s).
- `.copilot/context/open-threads.md` keeps being the tangential/unclear backlog, but entries
  with heavy inline paragraphs get trimmed to link to a wiki page instead.
- `/memories/repo/*.md` (opaque, tool-local, not git-tracked) stays as scratch/working notes an
  agent jots down mid-session; the wiki is the promoted, curated, git-tracked destination.

## Batch 1 — direct-promotion wiki pages (source already fully read this session)

Mostly transcription from `/memories/repo/*.md` into `.copilot/wiki/*.md`. Light editing only
(fix known errors, trim tool-call narration, keep the facts).

- [x] `.copilot/wiki/README.md` — index page, one-line description + link per topic page.
      Write/refresh this LAST once the other pages exist (or first as a skeleton, then update).
- [x] `.copilot/wiki/recadv-xml-format.md` — from `/memories/repo/edi-recadv-real-format.md`,
      near-verbatim (already excellent wiki-quality content: transport, per-retailer header
      diffs, resolution rule, business rules, measured clean rates, portal-read-flag incident).
- [x] `.copilot/wiki/retann.md` — from `/memories/repo/edi-retann-real-format.md`, near-verbatim
      (covers XML format AND business return-flow rules AND the dormant staging tables AND the
      RO-7627 blocker already — single coherent page, don't split).
- [x] `.copilot/wiki/reception-screen.md` — from `/memories/repo/recadv-reception-screen-todo.md`
      (largest file, ~30KB). Covers: model-change implementation (session N+19, `omittedFromReceipt`),
      the extensionless-filename ingestion bug fix (session N+17), buttons A ("Trimite")/B
      ("Facturează")/C (invoice-identity column) specs, and session N+20's button-B analysis
      (SALFPRMS series, `CreateObj('SALDOC;EF')`, hooks `preiaDateAviz`/`exportXML1`/
      `exportXMLDedeman`/`ON_AFTERPOST`->`CCCFINDOCPOST`, `CCCDOCUMENTES1MAPPINGS` reuse
      recommendation). This is a LIVING page — button B is still mid-design, so keep an
      "Open questions" section rather than presenting it as finished.
- [x] `.copilot/wiki/soft1-schema-facts.md` — from `/memories/repo/soft1-schema-facts.md`,
      near-verbatim (pallet-only advices, FINDOCS/MTRLINESS vs FINDOCL/MTRLINESL semantics,
      FULLYTRANSF/QTY1COV, TFPRMS=103 invoiced predicate, CCCDOCUMENTES1MAPPINGS audit,
      CCCS1DXTRDRMTRL schema, product-matching rules, Soft1 WS API notes).
- [x] `.copilot/wiki/security-secrets.md` — from `/memories/repo/secrets-and-git-hygiene.md`,
      near-verbatim. Keep the "rotation NOT done" warning prominent (still true as of
      2026-08-24) and cross-link to open-threads `rotate-soft1-password-and-rsa-key`.
- [x] `.copilot/wiki/onboard-new-docprocess-retailer.md` — from
      `/memories/repo/onboard-new-docprocess-retailer.md`, near-verbatim runbook (5-step
      onboarding + the "never auto-add a GLN without business confirmation" rule).
- [x] `.copilot/wiki/soft1-text-encoding-mojibake.md` — from
      `/memories/repo/soft1-text-encoding-mojibake.md`, near-verbatim, small.
- [x] `.copilot/wiki/spa-routing.md` — from `/memories/repo/spa-routing.md`, near-verbatim, tiny.
- [x] `.copilot/wiki/documentatie-folder-map.md` — from `/memories/repo/documentatie-folder.md`.
      **Re-read that file fresh first** (its full content wasn't re-dumped in the planning
      conversation, only summarized). **Apply this correction while promoting it**: only
      `documentatie/infinite_samples/{recadv,retann}/` are gitignored — verified directly
      against `.gitignore` — NOT the whole `documentatie/` folder. If the old note claims the
      whole folder is ignored, fix it; don't just copy it verbatim.

**Batch 1 completed 2026-08-24 (session B). All 10 pages created under `.copilot/wiki/`.**

## Batch 2 — pages needing fresh synthesis (not pure promotion)

**Batch 2 completed 2026-08-24. All 4 pages created under `.copilot/wiki/`, README index updated.**

- [x] `.copilot/wiki/edi-pipeline-architecture.md` — general EDI pipeline architecture: scanner/
      providers/transports/DO storage/status machine (`NEW -> PROCESSING -> SENT|ERROR`),
      guard-chain pattern, DocProcess shared-inbox routing, resolved incidents (APERAK DO-retry,
      legacy cutover), testing-fixture conventions (folded in from `edi-aperak-do-retry.md` and
      `edi-test-fixtures.md` as sub-sections, no separate tiny pages created).
- [x] `.copilot/wiki/recadv-pipeline.md` — RECADV feature architecture & status: the F1-F7
      implementation arc condensed to current-state prose, live status, config flag
      `EDI_ENABLE_RECADV`, resolved incidents (portal read-flag, extensionless-filename bug,
      shared-directory guard), the still-open duplicate-document-number-family pattern and
      multi-file temporal risk, code pointers. Cross-links to `reception-screen.md` (UI side) and
      `recadv-xml-format.md` (data-format side) instead of duplicating either.
- [x] `.copilot/wiki/legacy-tables-cleanup.md` — NEW page: 92 legacy tables inventoried
      (~284 MB), cutover dates (Auchan stopped 2026-06-05, Dedeman 2026-06-09), do-not-touch
      list, deletion procedure (rename to `ZZ_DEL_*`, wait a month, then drop), awaiting
      beneficiary approval. Cross-links to `retann.md`'s existing dormant-staging-tables section
      instead of duplicating it.
- [x] `.copilot/wiki/frontend-architecture.md` — **verified before promoting, as planned**: listed
      `frontend/src/` (components/, pages/, routing/, services/, state/, styles/, light-element.js,
      main.js) and confirmed the old vanilla-JS Bulma SPA (`client.js`, `retailers.js`,
      `invoiceTable.js`, `orderTable.js`, `retailer_file_manager.html`) is gone from the repo,
      fully superseded by a Lit 3 + Vite + Tabler + @vaadin/router SPA rendering to light DOM.
      Rewrote the page around the current architecture with a short "Superseded" section instead
      of presenting both as current.

## After wiki pages exist

**Completed 2026-08-24 (session C).**

- [x] Trim `.copilot/context/current-focus.md` to a short pointer: Current Goal / Active Area /
      Next Step + "Vezi și" links to the new wiki pages. Moved the removed chronological
      "Last Updated" history verbatim into `.copilot/context/CHANGELOG.md` (copied via `Copy-Item`
      before trimming, so nothing was lost or retyped) with a short archive-notice header.
- [x] Update `.copilot/context/open-threads.md`: threads with heavy inline paragraphs now link to
      the corresponding wiki page instead of repeating the content. Affected threads:
      `recadv-compare-base-is-advice`, `reception-screen-invoice-and-send-buttons`,
      `edinet-duplicate-document-number-families`, `retann-comanda-number-missing`,
      `dormant-retann-recadv-staging-tables`, `legacy-tables-cleanup-approval`,
      `retann-advice-selection-rule-unclear`. `llm-wiki-migration` itself stays **open** — Batch D
      (global prompts + repo instructions file) is still unchecked below.

## Global prompt updates (cross-workspace impact, user approved)

**Completed 2026-08-24 (session D).**

Location: `VSCODE_USER_PROMPTS_FOLDER` (`c:\Users\Cosmin\AppData\Roaming\Code - Insiders\User\prompts`).

- [x] `memory-promote.prompt.md` — Step 4 now checks for `.copilot/wiki/` first: identifies the
      matching topic page by subject (not source file name), edits it in place (merging, not
      appending), and only falls back to the old flat `verified-findings.md` convention if no
      wiki exists in the workspace.
- [x] `session-handoff.prompt.md` — added step 6: if `.copilot/wiki/` exists, update the relevant
      page(s) in place with new durable facts; `current-focus.md`'s standard format section now
      says to link to wiki pages rather than restate durable facts inline (Relevant Files,
      Confirmed Decisions, Open Questions).
- [x] `session-analysis.prompt.md` — the open-threads YAML-append step (step 5) now links to the
      relevant wiki page when the thread's topic is already covered there, keeping `context`
      short instead of inlining long paragraphs.
- [x] `.github/instructions/session-memory.instructions.md` (repo-local, applyTo `**`) updated
      with a "How the three layers relate" section describing `.copilot/wiki/*.md` vs
      `current-focus.md` vs `open-threads.md` vs `CHANGELOG.md`.

**Migration complete.** All batches (A/B/C/D) done. `open-threads.md`'s `llm-wiki-migration`
entry can now be marked `status: closed`.

## Suggested session split

- Session A: Batch 1 (mechanical promotion, ~10 pages).
- Session B: Batch 2 (needs re-reading current-focus.md in full + frontend verification).
- Session C: Trim current-focus.md + create CHANGELOG.md archive + update open-threads.md links.
- Session D: Update the 3 global prompts + repo instructions file.
