# AGENT_STATE.md - OPTIFLOW Compact Agent Context

Purpose: token-light handoff for AI agents. Read this file before opening broad project documentation.

This file does not replace the contracts. It tells the agent which contract to read next.

## Current Project Snapshot

- Project: OPTIFLOW, a production reporting app for factory floor operations.
- Runtime: Google Apps Script V8 backend, Vue 3 Composition API frontend, Google Sheets storage.
- Build: Vite with `vite-plugin-singlefile`; production output is one `Index.html`.
- Deployment: `.clasp.json` uses `"rootDir": "deploy"`; use `npm run push:gas` instead of raw `clasp push --force`.
- Offline model: Offline-Tolerant, not Offline-First; IndexedDB protects drafts, cache, and sync queue after initial app load.
- State rule: UI talks to Global State/composables only; UI must not read or write IndexedDB directly.
- Backend rule: `Code.js` stays thin; scalable GAS logic belongs in modular `gas/*.gs` files.
- Security rule: every external GAS input path starts with `Input Validation & Sanitization`.
- Data rule: operator sync is append-only event sourcing into `RAW_LOGS`; conflicts become `CONFLICT_PENDING`.
- Implemented scope: `OPT-001` through `OPT-027`.
- Current next roadmap item: production pilot execution evidence after M6/M7 artifact closure.

## Implemented Runtime Features

- Frontend: Vue 3 operator form, autosave draft, sync queue controls, Pareto defect preview, Mandor approval inbox UI, and hidden SuperAdmin maintenance console.
- Services: API adapter allowlist/timeout/safe response, mock GAS, IndexedDB persistence, operator report store, approval helpers, and defect/Pareto helpers.
- Backend: access gate, audit, auth/session, RBAC permissions, sheet bootstrap/health, production append-only submit, duplicate detection, conflict quarantine, quarantine approval mutation, daily closing, adjustment, `MASTER_RECAP`, dashboard APIs, Script Properties maintenance, native test runner, and validation.
- Tests: frontend API/approval/defect/M5/operator/state tests, GAS validation/sheets/auth/permissions/production logs/M5/script properties/test-runner tests, single-file build verification, and GAS deploy preparation.
- Remaining major gaps: target-environment smoke evidence, field pilot execution, and actual QCC benefit validation from pilot data.

## Context Routing Matrix

Use targeted reading. Start with `AGENT.md`, this file, the current user request or GitHub issue body, and `git status --short`.

Read only the contracts that match the work:

- Schema, payload, enum, column, timestamp, validation boundary: `docs/DATA_SCHEMA.md`.
- Workflow, role behavior, approval, closing, conflict resolution: `docs/BUSINESS_PROCESS.md`.
- Security, RBAC, PII, audit, Script Properties, IndexedDB/API guardrails: `docs/GUARDRAILS_CONTRACT.md` and `docs/POL.ISMS.001.md`.
- UI layout, mobile/desktop behavior, visual style, accessibility: `docs/UI_UX_CONTRACT.md`.
- Roadmap, phases, deployment assumptions, CLASP process: `docs/IMPLEMENTATION_PLAN.md` and `README.md`.
- Issue lifecycle, labels, milestone, GitHub sync: `ISSUE_TRACKER.md` and `ISSUE_TRACKER.json`.
- QCC or improvement narrative: `docs/QCC_8_STEPS_7_TOOLS.md` and `docs/KNOWLEDGE_BASE.md`.
- Documentation consistency audit only: `docs/DOCUMENTATION_AUDIT.md`.

Escalate to a full documentation sweep only when the change is cross-cutting, a contract conflict appears, or the routed files do not answer the requirement.

## Low-Token Workflow

1. Read `AGENT.md`, `AGENT_STATE.md`, the active issue/request, and `git status --short`.
2. Use the routing matrix to open only relevant docs and source files.
3. Prefer `rg` queries over pasting large file contents into the conversation.
4. Summarize command output; do not paste full logs unless the user explicitly asks.
5. Before code changes, update only the contracts touched by the requested behavior.
6. After code changes, update `AGENT_STATE.md` only when project shape, closure process, deployment, or active issue state changes.

## GitHub Issue Closure Minimal Evidence

When closing an issue, keep the body and comment concise:

- Acceptance criteria are checked with `[x]`.
- Verification records command plus result, not full terminal output.
- Changed files are listed as paths only.
- Remaining risk is one short sentence or `None`.
- Commit hash is recorded after the implementation commit.
- Local trackers are updated only after the GitHub issue is confirmed closed.

Do not paste full diffs, build logs, test logs, or contract documents into GitHub issue comments.

## Deprecated Snapshot Workflow

`chatgpt_snapshot.py` and `chatgpt_snapshot/` are deprecated for agent-mode work. They may still be useful for one-time onboarding in a web chat, but an agent should use this compact state file, targeted `rg`, and routed contract reads instead.

Keep snapshot artifacts ignored by Git unless the user explicitly asks to revive that workflow.

## Recent Closed Work

- OPT-001 / GitHub #1: documentation contract audit completed.
- OPT-002 / GitHub #2: UI/UX design system contract completed.
- OPT-027: hidden SuperAdmin Script Properties maintenance console completed.
- OPT-009 / GitHub #9: API adapter and mock GAS behavior completed.
- OPT-010 / GitHub #10: operator report form validation completed.
- OPT-011 / GitHub #11: operator global state persistence completed.
- OPT-012 / GitHub #12: append-only RAW_LOGS submit endpoint completed.
- OPT-013 / GitHub #13: Offline-Tolerant sync queue completed.
- OPT-014 / GitHub #14: CONFLICT_PENDING detection and quarantine routing completed.
- OPT-015 / GitHub #15: Mandor approval inbox and conflict comparison UI completed.
- OPT-016 / GitHub #16: defect categories and Pareto-ready reject capture completed.
- OPT-017 / GitHub #17: daily closing workflow completed.
- OPT-018 / GitHub #18: adjustment logs after closing completed.
- OPT-019 / GitHub #19: MASTER_RECAP batch aggregation completed.
- OPT-020 / GitHub #20: desktop supervisor control center completed.
- OPT-021 / GitHub #21: management read-only dashboard completed.
- OPT-022 / GitHub #22: native GAS test runner completed.
- OPT-023 / GitHub #23: production security hardening checklist completed.
- OPT-024 / GitHub #24: production deployment checklist completed.
- OPT-025 / GitHub #25: pilot rollout plan completed; field evidence remains external.
- OPT-026 / GitHub #26: QCC Step 1-8 report package template completed.

Update this section only after issue closure or meaningful architecture changes.
