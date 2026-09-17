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
- UI preference rule: persisted workspace/role in localStorage is UX-only; reconcile with `getSessionContext` before loading protected workspace data.
- Backend rule: `Code.js` stays thin; scalable GAS logic belongs in modular `gas/*.gs` files.
- Security rule: every external GAS input path starts with `Input Validation & Sanitization`.
- Bootstrap rule: `bootstrapSheets()` may bypass session/RBAC only during first-run foundational sheet creation.
- Data rule: operator sync is append-only event sourcing into `RAW_LOGS`; conflicts become `CONFLICT_PENDING`.
- Runtime implementation scope: `OPT-001` through `OPT-036` is present locally; tracker/GitHub closure may still require explicit review and sync for review-stage items.
- Current next roadmap item: GitHub sync/closure review for `OPT-028` through `OPT-033`, then production pilot execution evidence after M6/M7 artifact closure.

## Implemented Runtime Features

- Frontend: Vue 3 production workspaces per role, cross-role Help/Cara Penggunaan, operator form, autosave draft, sync queue controls, SuperAdmin session maintenance cards for Script Properties/diagnostics/local database inspect/clear/reset/reload, Pareto defect preview, ChartJS operator performance charts, SweetAlert2 metric help, Mandor approval inbox UI, Supervisor control center, Management dashboard, HRD access/audit surface, and hidden SuperAdmin maintenance console. All data tables implement global filtering and sorting via `useTableSearchAndSort` reusability.
- Services: API adapter allowlist/timeout/safe response, mock GAS, IndexedDB persistence, operator report store, approval helpers, and defect/Pareto helpers.
- Backend: access gate for expiry, registered-user render access, demo/trial email-gate bypass, audit, auth/session, RBAC permissions, sheet bootstrap/health with additive header migration, spreadsheet admin toolbar with project links, spreadsheet-backed defect category CRUD/seed, `TARGET_MASTER` target scope CRUD/seed, production append-only submit, duplicate detection, conflict quarantine, quarantine approval mutation, pre-closing production review/void/correction, daily closing, adjustment, `MASTER_RECAP`, dashboard APIs, HRD access dashboard API, Script Properties maintenance, native test runner, and validation.
- HRD scope: workspace is rebaselined into four menus: Dashboard, Karyawan, Absensi, and Akses & Audit. The Karyawan directory supports masked/default view plus explicit demo/detail view for allowlisted response data, while normal HRD workspace must not expose encrypted PII, blind index, raw audit metadata, secrets, or Script Properties.
- HRD/user seed: development seed now includes user email, username, encrypted-placeholder name/address/phone, phone blind index, role, active status, and profile base64 in `USER_ROLES`; HRD access dashboard still returns masked/status-only data.
- Spreadsheet menu bootstrap: creates/migrates sheet headers and, when `AUTH_MODE` is not `ON`, fills missing dev dummy master rows for empty/missing master data; production `AUTH_MODE=ON` skips automatic dummy seed.
- Shift reference data: UI wording/payloads use `shift`; runtime shift options come from `SHIFT_MASTER` through `getShiftOptions`, with local fallback only for development/offline resilience.
- Operator reference data: development/demo Operator selectors now prefer Bagian, shift, work category/jenis pekerjaan, and operator from `getOperatorReferenceData` with `BAGIAN_WITH_LEGACY_COMPAT`; legacy line/machine arrays remain compatibility data only.
- Mock GAS state: development mock state persists in IndexedDB `optiflow-demo-gas-state`; default demo seeds are created only when that snapshot is empty.
- Tests: frontend API/approval/defect/M5/operator/state tests, GAS validation/sheets/auth/permissions/production logs/M5/script properties/test-runner/spreadsheet-menu tests, single-file build verification, and GAS deploy preparation.
- Remaining major gaps: target-environment smoke evidence, field pilot execution, and actual QCC benefit validation from pilot data.
- Business process rebaseline active: `OPT-037` makes Bagian-based daily reporting the approved target contract. `OPT-042` starts runtime migration by adding Bagian/work-category selectors and payload fields while keeping `line/shift/machine` as legacy compatibility fields until recap migration `OPT-044`. Daily reporting is Bagian + employee + attendance + output, Mandor records/sets daily targets, Supervisor verifies authoritative `OK + Reject`, employee attendance/status and unit-rate wage targets are required, and Lem output may trace material from multiple Solder employees.
- Employee/attendance model drafted: `OPT-038` documents `EMPLOYEE_MASTER`, `ATTENDANCE_EVENTS`, `ATTENDANCE_DAILY_RECAP`, and `ATTENDANCE_MONTHLY_RECAP`; HRD owns employee master, Operator/Karyawan creates Masuk/Keluar events, Mandor confirms team attendance, Supervisor verifies production impact, Management reads aggregates, and SuperAdmin keeps explicit admin access.
- Role boundary rebaseline drafted: `OPT-043` defines target resource/action boundaries for employee master, multi-role assignments, attendance, production reports, production review, Supervisor verification, targets, defect categories, Bagian/upah, dashboards, audit, Script Properties, and test runner. SuperAdmin remains explicit-permission only; Mandor requests defect changes but does not mutate final defect master.
- Wage policy ownership drafted: `OPT-041` makes Management/SuperAdmin final owner for `unit_rate`, `target_salary`, `monthly_target_unit`, and wage policy; HRD reads payroll-ready context by default, Mandor reads operational target context, Supervisor reads verification context, and Operator does not see full personal wage simulation in MVP.
- Management rebaseline has started: `BAGIAN_MASTER` is now an additive official sheet/permission surface for Bagian CRUD, `unit_rate`, `monthly_target_unit`, and `target_salary`; Management/SuperAdmin can mutate this master policy, while production transactions remain read-only for Management.

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
- Production hardening/deploy/pilot/QCC artifacts: `docs/PRODUCTION_HARDENING_CHECKLIST.md`, `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`, `docs/PILOT_ROLLOUT_PLAN.md`, and `docs/QCC_REPORT_PACKAGE.md`.
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
- OPT-034 / GitHub #28: spreadsheet-backed defect category CRUD and default seed completed locally in commit `80ec100`; GitHub issue closed.

Update this section only after issue closure or meaningful architecture changes.
