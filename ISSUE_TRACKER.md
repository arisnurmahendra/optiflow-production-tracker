# ISSUE_TRACKER.md - OPTIFLOW GitHub Sync Tracker

> Purpose: tracker lokal untuk memetakan roadmap OPTIFLOW ke GitHub Issues, labels, dan milestones.

## 1. GitHub Sync Rules

- Repository target: `arisnurmahendra/optiflow-production-tracker`.
- Setiap item `OPT-*` dapat dibuat sebagai GitHub Issue.
- Kolom `GitHub Issue` diisi setelah issue dibuat di GitHub.
- Label dan milestone harus mengikuti taxonomy di file ini.
- Status lokal hanya boleh menjadi `Closed` setelah GitHub Issue terkait benar-benar closed.
- Jika issue berubah scope, update dulu dokumen kontrak terkait sebelum update issue.
- Jika ada perubahan schema/proses/security/UI, update `docs/` relevan sebelum coding.

Status:
- `Backlog`: belum mulai.
- `Ready`: requirement cukup jelas.
- `In Progress`: sedang dikerjakan.
- `Blocked`: menunggu keputusan.
- `Review`: implementasi selesai, menunggu verifikasi.
- `Closed`: selesai dan sudah sinkron dengan GitHub.

## 2. Labels

| Label | Warna | Deskripsi |
| :--- | :--- | :--- |
| `type:docs` | `#0075CA` | Perubahan dokumentasi/kontrak. |
| `type:feature` | `#0E8A16` | Fitur baru. |
| `type:bug` | `#D73A4A` | Bug atau regresi. |
| `type:security` | `#B60205` | Security, RBAC, PII, audit, POL.ISMS.001. |
| `type:test` | `#5319E7` | Test runner, smoke test, verification. |
| `area:frontend` | `#1D76DB` | Vue, Vite, UI, state, IndexedDB. |
| `area:backend` | `#0052CC` | Google Apps Script, API, validation. |
| `area:data` | `#006B75` | Sheets schema, recap, event sourcing. |
| `area:process` | `#FBCA04` | SOP, workflow, QCC, pilot rollout. |
| `area:deployment` | `#C5DEF5` | Clasp, Apps Script deployment. |
| `area:ui-ux` | `#D4C5F9` | Visual design, ergonomics, accessibility. |
| `priority:p0` | `#B60205` | Blocking atau risiko besar. |
| `priority:p1` | `#D93F0B` | Penting untuk MVP. |
| `priority:p2` | `#FBCA04` | Penting setelah MVP dasar. |
| `priority:p3` | `#C2E0C6` | Backlog lanjutan. |
| `status:blocked` | `#000000` | Menunggu keputusan atau dependency. |
| `sync:github` | `#7057FF` | Perlu dibuat/disinkronkan dengan GitHub Issue. |

## 3. Milestones

| Milestone | Tujuan | Exit Criteria |
| :--- | :--- | :--- |
| `M0 - Contracts & Planning` | Semua kontrak docs siap sebelum coding. | README, AGENT, docs, UI/UX, schema, process, guardrails, QCC, POL, dan tracker selaras. |
| `M1 - Project Bootstrap` | Struktur Vue/Vite/GAS siap. | Build satu `Index.html`, `.claspignore` aman, dev/prod pipeline jelas. |
| `M2 - Backend Foundation` | Schema sheet, auth, RBAC, validation siap. | Sheet bootstrap, `USER_ROLES`, `ROLE_PERMISSIONS`, validation, audit dasar. |
| `M3 - Operator Mobile MVP` | Operator bisa submit data produksi. | Form mobile, autosave, Zod, server validation, append-only `RAW_LOGS`. |
| `M4 - Offline Sync & Conflict Control` | Offline-tolerant dan conflict flagging berjalan. | IndexedDB queue, `CONFLICT_PENDING`, quarantine, HITL approval. |
| `M5 - Supervisor Control & Recap` | Mandor/Supervisor bisa review, closing, dan recap. | Quarantine UI, closing, adjustment, `MASTER_RECAP`, dashboard operational. |
| `M6 - Security, Testing & Deployment` | Hardening dan deploy siap produksi. | `test_runner.gs`, smoke test, POL checklist, Clasp deployment. |
| `M7 - QCC Report & Rollout` | Pilot dan materi QCC siap. | Pilot 1 line/shift, SOP, QCC Step 1-8, rollout decision. |

## 4. Issue Backlog

| ID | Title | Status | Priority | Labels | Milestone | GitHub Issue |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `OPT-001` | Finalize documentation contract audit | Closed | P0 | `type:docs`, `area:process`, `priority:p0`, `sync:github` | `M0 - Contracts & Planning` | #1 |
| `OPT-002` | Create UI/UX design system contract | Closed | P1 | `type:docs`, `area:ui-ux`, `priority:p1`, `sync:github` | `M0 - Contracts & Planning` | #2 |
| `OPT-003` | Bootstrap Vue 3 + Vite single-file build | Closed | P0 | `type:feature`, `area:frontend`, `area:deployment`, `priority:p0`, `sync:github` | `M1 - Project Bootstrap` | #3 |
| `OPT-004` | Harden `.claspignore` and Clasp deployment flow | Closed | P1 | `type:feature`, `area:deployment`, `priority:p1`, `sync:github` | `M1 - Project Bootstrap` | #4 |
| `OPT-005` | Implement GAS sheet bootstrap and schema health check | Closed | P0 | `type:feature`, `area:backend`, `area:data`, `priority:p0`, `sync:github` | `M2 - Backend Foundation` | #5 |
| `OPT-006` | Implement AUTH_MODE session context and RBAC | Closed | P0 | `type:security`, `area:backend`, `priority:p0`, `sync:github` | `M2 - Backend Foundation` | #6 |
| `OPT-007` | Implement ROLE_PERMISSIONS enforcement | Closed | P0 | `type:security`, `area:backend`, `area:data`, `priority:p0`, `sync:github` | `M2 - Backend Foundation` | #7 |
| `OPT-008` | Implement Input Validation & Sanitization blocks for GAS endpoints | Closed | P0 | `type:security`, `area:backend`, `priority:p0`, `sync:github` | `M2 - Backend Foundation` | #8 |
| `OPT-009` | Build production `apiAdapter.js` and local `mock_gas.js` | Closed | P1 | `type:feature`, `area:frontend`, `priority:p1`, `sync:github` | `M3 - Operator Mobile MVP` | #9 |
| `OPT-010` | Build mobile operator reporting form | Review | P1 | `type:feature`, `area:frontend`, `area:ui-ux`, `priority:p1`, `sync:github` | `M3 - Operator Mobile MVP` | #10 |
| `OPT-011` | Implement Global State and IndexedDB persistence service | Backlog | P1 | `type:feature`, `area:frontend`, `area:data`, `priority:p1`, `sync:github` | `M3 - Operator Mobile MVP` | #11 |
| `OPT-012` | Implement append-only RAW_LOGS submit endpoint | Backlog | P0 | `type:feature`, `area:backend`, `area:data`, `priority:p0`, `sync:github` | `M3 - Operator Mobile MVP` | #12 |
| `OPT-013` | Implement Offline-Tolerant sync queue | Backlog | P1 | `type:feature`, `area:frontend`, `area:data`, `priority:p1`, `sync:github` | `M4 - Offline Sync & Conflict Control` | #13 |
| `OPT-014` | Implement CONFLICT_PENDING detection and quarantine routing | Backlog | P0 | `type:feature`, `area:backend`, `area:data`, `priority:p0`, `sync:github` | `M4 - Offline Sync & Conflict Control` | #14 |
| `OPT-015` | Build Mandor approval inbox and conflict comparison UI | Backlog | P1 | `type:feature`, `area:frontend`, `area:ui-ux`, `area:process`, `priority:p1`, `sync:github` | `M4 - Offline Sync & Conflict Control` | #15 |
| `OPT-016` | Implement defect categories and Pareto-ready reject capture | Backlog | P2 | `type:feature`, `area:data`, `area:frontend`, `priority:p2`, `sync:github` | `M4 - Offline Sync & Conflict Control` | #16 |
| `OPT-017` | Implement daily closing workflow | Backlog | P1 | `type:feature`, `area:backend`, `area:process`, `priority:p1`, `sync:github` | `M5 - Supervisor Control & Recap` | #17 |
| `OPT-018` | Implement adjustment logs after closing | Backlog | P1 | `type:feature`, `area:backend`, `area:data`, `area:process`, `priority:p1`, `sync:github` | `M5 - Supervisor Control & Recap` | #18 |
| `OPT-019` | Implement MASTER_RECAP batch aggregation | Backlog | P1 | `type:feature`, `area:backend`, `area:data`, `priority:p1`, `sync:github` | `M5 - Supervisor Control & Recap` | #19 |
| `OPT-020` | Build desktop supervisor control center | Backlog | P2 | `type:feature`, `area:frontend`, `area:ui-ux`, `priority:p2`, `sync:github` | `M5 - Supervisor Control & Recap` | #20 |
| `OPT-021` | Build management read-only dashboard | Backlog | P2 | `type:feature`, `area:frontend`, `area:ui-ux`, `priority:p2`, `sync:github` | `M5 - Supervisor Control & Recap` | #21 |
| `OPT-022` | Implement GAS `test_runner.gs` | Backlog | P1 | `type:test`, `area:backend`, `priority:p1`, `sync:github` | `M6 - Security, Testing & Deployment` | #22 |
| `OPT-023` | Run security hardening against POL.ISMS.001 | Backlog | P0 | `type:security`, `area:backend`, `area:frontend`, `priority:p0`, `sync:github` | `M6 - Security, Testing & Deployment` | #23 |
| `OPT-024` | Prepare production deployment checklist | Backlog | P1 | `type:docs`, `area:deployment`, `priority:p1`, `sync:github` | `M6 - Security, Testing & Deployment` | #24 |
| `OPT-025` | Execute 1 line / 1 shift pilot rollout | Backlog | P2 | `type:feature`, `area:process`, `priority:p2`, `sync:github` | `M7 - QCC Report & Rollout` | #25 |
| `OPT-026` | Produce QCC Step 1-8 report package | Backlog | P2 | `type:docs`, `area:process`, `priority:p2`, `sync:github` | `M7 - QCC Report & Rollout` | #26 |
| `OPT-027` | Build SuperAdmin hidden maintenance console for safe Script Properties management | Closed | P1 | `type:feature`, `type:security`, `area:backend`, `area:frontend`, `priority:p1`, `sync:github` | `M6 - Security, Testing & Deployment` | #27 |

## 5. Closed Issue Log

| ID | GitHub Issue | Closed At | Verification |
| :--- | :--- | :--- | :--- |
| `OPT-001` | #1 | 2026-08-30 | JSON validation passed; mojibake check passed; contract keyword coverage passed; `docs/DOCUMENTATION_AUDIT.md` added and pushed in commit `a1c9bc4`. |
| `OPT-002` | #2 | 2026-08-30 | JSON validation passed; mojibake check passed; UI/UX contract keyword coverage passed; `docs/UI_UX_CONTRACT.md` finalized and pushed in commit `0c1837b`. |
| `OPT-003` | #3 | 2026-08-30 | `npm audit --audit-level=moderate` passed; `npm run build:verify` passed; only `dist/Index.html` produced; bootstrap pushed in commit `152a6e0`. |
| `OPT-004` | #4 | 2026-08-30 | `npm run prepare:gas` passed; `clasp status` showed only `deploy/appsscript.json`, `deploy/Code.js`, and `deploy/Index.html`; deploy flow pushed in commit `29c0485`. |
| `OPT-005` | #5 | 2026-08-30 | `npm run test:gas:sheets` passed; sheet bootstrap and schema health implemented; modular GAS files pushed in commit `c2cf74c`. |
| `OPT-006` | #6 | 2026-08-30 | `npm run test:gas:auth` passed; `AUTH_MODE` session context, dev role simulation, production role lookup, baseline RBAC, and audit events pushed in commit `ef70a4f`. |
| `OPT-007` | #7 | 2026-08-30 | `npm run test:gas:permissions` passed; exact-match `ROLE_PERMISSIONS` enforcement and RBAC audit events pushed in commit `7297335`. |
| `OPT-008` | #8 | 2026-08-30 | `npm run audit:gas:validation` passed; callable wrapper validation blocks and audit script pushed in commit `531fb77`. |
| `OPT-009` | #9 | 2026-08-30 | `npm test`, `npm run build:verify`, `npm run prepare:gas; clasp status`, and `npm audit --audit-level=moderate` passed; API adapter and mock GAS pushed in commit `3394039`. |
| `OPT-027` | #27 | 2026-08-30 | `npm run test:gas`, `npm run build:verify`, `npm run prepare:gas; clasp status`, and `npm audit --audit-level=moderate` passed; safe Script Properties maintenance pushed in commit `ea83d9a`. |

## 6. Issue Template

Use this body when creating GitHub Issues:

```md
## Objective

Describe the desired outcome.

## Contract References

- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DATA_SCHEMA.md`
- `docs/BUSINESS_PROCESS.md`
- `docs/GUARDRAILS_CONTRACT.md`

## Scope

- Item 1
- Item 2

## Acceptance Criteria

- [ ] Contract docs updated before code if schema/process/security changes.
- [ ] Implementation follows relevant guardrails.
- [ ] Validation, authorization, audit, idempotency, or offline behavior handled where relevant.
- [ ] Relevant test/manual verification completed.
- [ ] ISSUE_TRACKER.md updated with GitHub issue number/status.

## Verification

- Command/test:
- Result:

## Risks / Open Decisions

- None, or list blockers.
```
