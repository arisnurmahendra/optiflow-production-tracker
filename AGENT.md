# AGENT.md - OPTIFLOW Agent Guide

> Project: OPTIFLOW (Operational Process Tracking & Integrated Floor-Workflow)  
> Stack: Google Apps Script V8, Vue 3, Vite, IndexedDB, Google Sheets  
> Operating rule: update the contract first, then write code

## 1. Mission

The agent helps design and implement OPTIFLOW as a secure production-reporting system for the factory floor. Work must stay aligned with the business improvement narrative, the data contract, and the security baseline.

Before code changes, read the relevant docs:
- `README.md`
- `ISSUE_TRACKER.md`
- `ISSUE_TRACKER.json`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DATA_SCHEMA.md`
- `docs/BUSINESS_PROCESS.md`
- `docs/GUARDRAILS_CONTRACT.md`
- `docs/KNOWLEDGE_BASE.md`
- `docs/DOCUMENTATION_AUDIT.md`
- `docs/UI_UX_CONTRACT.md`
- `docs/QCC_8_STEPS_7_TOOLS.md`
- `docs/POL.ISMS.001.md`

## 2. Core Principles

- Documentation-Driven Development: schema, process, and guardrails are the source of truth.
- Defense in Depth: client validation improves UX, server validation protects the system.
- Least privilege: every backend action checks role and permission.
- Append-only operations: production transactions are never silently overwritten.
- Auditability: important business and security events are written to `AUDIT_LOGS`.
- No secrets in frontend: Script Properties and server secrets stay in Google Apps Script.

## 3. Stack Boundaries

- Frontend uses Vue 3 Composition API.
- UI follows `docs/UI_UX_CONTRACT.md`: Industrial Soft UI with controlled Neumorphism/Claymorphism accents.
- Primary actions must use solid high-contrast buttons; critical statuses need color, text, and icon treatment.
- State is handled with composables, not Vuex or Pinia.
- UI components must not read from or write to IndexedDB directly.
- Global State/composables are the only interface between UI, IndexedDB, and API sync.
- IndexedDB access belongs in a persistence service called by Global State.
- The frontend contract is Offline-Tolerant, not Offline-First.
- Do not rely on Service Workers/PWA as a required runtime mechanism because GAS HTML Service runs inside the `script.googleusercontent.com` sandbox iframe.
- IndexedDB caches reference data and transaction queues to reduce `google.script.run` calls and protect user input during connection loss after initial load.
- Frontend compilation must use Vite with `vite-plugin-singlefile`.
- Production build must output one deployable `Index.html` only.
- The `/dist` directory must not contain separate `.js` or `.css` files.
- Vue 3 components, styling, and base64 assets must be bundled into `Index.html` for Google Apps Script HTML Service.
- Backend runs on Google Apps Script V8.
- Data storage uses Google Sheets multi-sheet architecture.
- Frontend calls backend only through `apiAdapter.js`.
- Local development uses `mock_gas.js` with latency and failure simulation.
- Hidden maintenance console actions must still call GAS endpoints through `apiAdapter.js`; the hidden trigger is not a security boundary.
- `Code.js` must stay thin as the public entrypoint for `doGet()` and externally callable wrappers.
- Scalable backend logic belongs in modular `.gs` files under `gas/`.
- GAS modules share global scope; use namespace objects such as `OptiflowHealth`, `OptiflowResponse`, and future `OptiflowValidation` instead of unscoped helper function names.
- Keep module boundaries clear: config/constants, response helpers, validation, auth/RBAC, sheet access, audit, production logs, quarantine, recap, and test runner.

## 4. Required Server Configuration

Server configuration is stored in `PropertiesService.getScriptProperties()`.

Required properties:
- `SPREADSHEET_ID`: required when the Apps Script project is standalone; optional when the script is container-bound to the target Google Sheet.
- `AUTH_MODE`: `ON` for production Google account validation, `OFF` for local role simulation.
- `ENCRYPTION_SALT`: server-only secret for encryption or blind indexing operations.

Rules:
- Never expose Script Properties to Vue.
- Never store role lists in Script Properties.
- Never log secrets, tokens, credentials, OTP, PIN, MFA data, or raw PII.
- Manage Script Properties only through allowlisted SuperAdmin maintenance endpoints.
- Secret properties such as `ENCRYPTION_SALT` must be status-only in frontend responses; direct read/update/delete is forbidden.

## 5. Data Contract

The required sheets are:
- `USER_ROLES`
- `ROLE_PERMISSIONS`
- `LINE_MASTER`
- `SHIFT_MASTER`
- `DEFECT_CATEGORIES`
- `RAW_LOGS`
- `QUARANTINE`
- `MASTER_RECAP`
- `DAILY_CLOSING`
- `ADJUSTMENT_LOGS`
- `AUDIT_LOGS`

Any column, enum, payload, or validation change must start in `docs/DATA_SCHEMA.md`.

Every GAS function that receives external input must start with an `Input Validation & Sanitization` block. The block validates allowlisted fields, types, enums, date formats, numeric boundaries, and data relationships against `docs/DATA_SCHEMA.md`. Invalid input must be rejected before business logic runs; Vue validation is never considered sufficient protection.

Offline sync uses event sourcing. Data from IndexedDB must append a new `RAW_LOGS` row with UUID `transaction_id` and device-side `device_timestamp`; it must never overwrite existing Google Sheets cells. Machine/operator/time collisions must become `CONFLICT_PENDING` and wait for Human-in-the-Loop approval.

## 6. Business Process Contract

The MVP supports this flow:
1. Operator submits daily production data.
2. Backend validates and writes to `RAW_LOGS`.
3. Suspicious or conflicting data goes to `QUARANTINE`.
4. Mandor or Supervisor reviews the case.
5. Mandor closes the daily line/shift after review.
6. Post-closing corrections go through `ADJUSTMENT_LOGS`.
7. Batch processing writes clean aggregates to `MASTER_RECAP`.
8. Management reads dashboard data without edit access.

Any process, approval, or role behavior change must start in `docs/BUSINESS_PROCESS.md`.

## 7. QCC And Lean Six Sigma Contract

When producing improvement narratives, reports, slide content, or business justification, follow `docs/QCC_8_STEPS_7_TOOLS.md`.

Important constraints:
- Step 1 identifies the problem using Check Sheet, Stratification, Pareto, and SIPOC.
- Step 2 sets SMART targets and must not mention the solution or software.
- Step 3 root causes must connect to the target gap.
- Step 4 countermeasures must answer Step 3 root causes using ECRS, Cost vs Benefit, and 5W2H.
- Step 5 proves implementation with Before vs After and PICA when deviations appear.
- Step 6 compares actual results against Step 2 targets and closes root causes.
- Step 7 standardizes the winning process through SOP, visual management, and IT Poka-Yoke.
- Step 8 chooses the next vertical or horizontal improvement theme.

## 8. POL.ISMS.001 Security Baseline

`docs/POL.ISMS.001.md` is the minimum security baseline. OPTIFLOW uses Google Workspace identity through Apps Script, so password hashing, default-password rotation, and brute-force login controls are mandatory only if a custom password-based auth module is introduced later.

For the current Google identity model:
- Use RBAC from `USER_ROLES`.
- Enforce least privilege on every backend endpoint.
- Require stronger administrator controls through Google Workspace policy when available.
- Use secure transport provided by Google deployment.
- Mask sensitive data in logs and UI responses.
- Return safe structured errors without stack traces.
- `AUTH_MODE` in Script Properties is only an environment toggle: `ON` validates `Session.getActiveUser().getEmail()`, while `OFF` enables role simulation for development. Role truth still comes from `USER_ROLES`.

## 9. Implementation Protocol

Follow this sequence:
1. Read the existing code and docs.
2. Apply the Pre-Code Rule: update and align `DATA_SCHEMA.md` and `BUSINESS_PROCESS.md` before code when logic, parameters, variables, or workflow change.
3. Implement the smallest coherent change.
4. Pause for Auto-Sync Protocol: update relevant md, json, and project documentation before continuing if the feature changes contracts.
5. Add or update tests for behavior, security, and schema changes.
6. Run relevant verification commands.
7. Report changed files, verification results, and remaining risks.

Knowledge base maintenance is mandatory. Each iteration must be cross-checked against `docs/KNOWLEDGE_BASE.md` and QCC innovation references so the implementation does not drift from the original improvement vision.

When work maps to roadmap execution, update `ISSUE_TRACKER.md` before and after implementation. Local status must not be `Closed` until the corresponding GitHub Issue is closed or the user explicitly marks the item as local-only.

### Clasp Push Protocol

When the user instructs `clasp push` or asks to upload to Google Apps Script, never run raw `clasp push --force` from the source tree. The project uses `.clasp.json` with `"rootDir": "deploy"`, so the deploy directory must be generated first.

Required sequence:
1. Run `npm run build:verify` to produce and validate the single-file Vite bundle.
2. Run `npm run prepare:gas` to regenerate `deploy/` from runtime files only:
   - `appsscript.json`
   - `Code.js`
   - `dist/Index.html` copied as `deploy/Index.html`
   - root `.gs` files and `gas/**/*.gs` when present.
3. Run `clasp push --force` only after `deploy/` has been regenerated.
4. Do not upload source files, docs, package files, `.gitignore`, `.claspignore`, `.clasp.json`, `src/`, `dist/`, `node_modules/`, or local secrets to Google Apps Script.
5. Prefer `npm run push:gas` for the full safe sequence.

### GitHub Issue Closure Protocol

When closing any `OPT-*` item linked to GitHub, follow this exact sequence:
1. Complete the implementation and verification first.
2. Update the GitHub Issue body before closing:
   - Set tracker status to `Closed`.
   - Change every completed Acceptance Criteria checkbox from `[ ]` to `[x]`.
   - Replace `TBD` verification fields with the actual commands, checks, and results.
   - Record implementation notes, changed files, and any remaining risks or explicitly state that none remain.
3. Add a GitHub Issue closure comment summarizing the work, verification, and commit hash.
4. Close the GitHub Issue with reason `completed`.
5. Verify the GitHub Issue state is `CLOSED` and `stateReason` is `COMPLETED`.
6. Only after the GitHub Issue is confirmed closed, update local trackers:
   - Set the matching row in `ISSUE_TRACKER.md` to `Closed`.
   - Add or update a closed issue log entry with date, issue number, verification summary, and commit hash.
   - Set the matching object in `ISSUE_TRACKER.json` to `Closed` and include `closed_at` plus verification evidence.
7. Validate `ISSUE_TRACKER.json`, check local tracker references, commit the tracker update, and push when the work is part of GitHub-synced roadmap execution.

## 10. Definition Of Done

Work is done only when:
- Requirement and business rule are clear.
- Schema, process, and guardrail docs are aligned.
- Authorization and validation are implemented where relevant.
- Idempotency and concurrency risks are handled where relevant.
- Errors are safe and machine-readable.
- Audit requirements are satisfied.
- Relevant tests or manual verification pass.
- Linked GitHub Issue Acceptance Criteria are checked, verification is filled, and the issue is closed when roadmap work is complete.
- `ISSUE_TRACKER.md` and `ISSUE_TRACKER.json` match the final GitHub Issue status.
- GAS backend changes include or update `test_runner.gs` coverage when behavior risk requires it.
- No new secret, debug artifact, skipped test, or placeholder replaces required implementation.
