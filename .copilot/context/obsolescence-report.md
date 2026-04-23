# Obsolescence Report

## Last Reviewed
- April 17, 2026

## Obsolescence Map

| Tool | Native overlap | Switching cost | Verdict |
|------|---------------|----------------|---------|
| `session-resume` | partial | med | **MONITOR** |
| `session-handoff` | partial | high | **KEEP** |
| `session-analysis` | none | low | **KEEP** |
| `session-compress` | none | low | **KEEP** |
| `session-scaffold` | none | low | **MONITOR** |
| `session-obsolete` | none | low | **KEEP** |
| `session-memory.instructions.md` | partial | high | **KEEP** |
| `current-focus.md` | partial | high | **KEEP** |
| `open-threads.md` | partial | med | **MONITOR** |
| `compression-report.md` | none | low | **KEEP** |

### Rationale

**`session-resume` — MONITOR.**
Native `/memories/repo/` persists facts across sessions. The instruction file already tells the agent to read `current-focus.md` on session start. The prompt's added value is the structured 5-step output (summarize, blockers, files, next step, constraints). If the instruction file is followed reliably, the prompt becomes a convenience rather than a necessity.

**`session-handoff` — KEEP.**
Repo memory stores flat key-value notes. The handoff prompt enforces a specific template (Goal, Active Area, Relevant Files, Decisions, Open Questions, Next Step) that repo memory cannot replicate. The structured snapshot is the core value; nothing native produces it.

**`session-analysis` — KEEP.**
No native session quality analysis exists. Trajectory analysis, signal/noise ratio, deviation classification, piloting burden metrics — none of this is built in. Unique capability.

**`session-compress` — KEEP.**
No native "did we add unnecessary complexity?" audit. The compression report has already proven load-bearing (identified 16 dead constructs in session 3).

**`session-scaffold` — MONITOR.**
One-time use per repo. Creates 3-5 files. Could be done manually in under 5 minutes. The maintenance cost of keeping the prompt current may exceed the cost of manual setup, especially as the system's file inventory stabilizes.

**`session-obsolete` — KEEP.**
The system needs a self-destruct mechanism. Without periodic self-audit, tools persist past usefulness. No native equivalent exists.

**`session-memory.instructions.md` — KEEP.**
This is the always-on glue. It makes the agent read `current-focus.md` and update handoff state without being prompted. Native memory instructions exist but don't know about the custom workflow files. Removing this breaks passive behavior — the user would need to manually reference context files every session.

**`current-focus.md` — KEEP.**
Repo memory (`/memories/repo/`) is local-only, unstructured, and invisible to the team. `current-focus.md` is version-controlled, structured, and serves as the canonical handoff artifact. Different category entirely.

**`open-threads.md` — MONITOR.**
The structured YAML thread format and cross-prompt workflow (analysis feeds it, resume reads it) add value. But repo memory could absorb this if it supported structured lists with status tracking. Currently 2 active threads — the file is earning its existence, but barely.

**`compression-report.md` — KEEP.**
Output artifact of `session-compress`. Lives and dies with the prompt. No independent maintenance cost.

## Trigger Conditions

| Tool | Trigger to DEPRECATE |
|------|---------------------|
| `session-resume` | Copilot natively auto-loads previous session context and proposes structured next steps without a prompt. OR the instruction file alone consistently produces equivalent resume behavior. |
| `session-scaffold` | The system stabilizes to ≤3 workspace files. OR Copilot supports reusable workspace templates that can bootstrap file sets from a manifest. |
| `open-threads.md` | `/memories/repo/` gains support for structured lists with status fields and cross-prompt read/write conventions. OR thread count stays at 0-1 for 3+ consecutive sessions (the backlog concept isn't earning its keep). |

## Recommended Review Cadence

**Quarterly.**

The Copilot ecosystem is evolving rapidly — memory system, instruction scoping, context handling, and native session continuity are all active development areas. A 3-month cadence balances signal (real capability changes) against noise (minor updates that don't shift the map).

Next scheduled review: **July 2026**.
