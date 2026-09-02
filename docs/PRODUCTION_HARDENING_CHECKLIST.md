# PRODUCTION_HARDENING_CHECKLIST.md - OPTIFLOW Security Hardening

Purpose: checklist ringkas sebelum OPTIFLOW dipakai produksi.

## 1. Required Gate

Semua item P0 wajib selesai sebelum production rollout:

| Area | Check | Evidence | Status |
| :--- | :--- | :--- | :--- |
| Script Properties | `AUTH_MODE=ON`, `APP_ACTIVE_UNTIL` valid, `SPREADSHEET_ID` target benar, `ENCRYPTION_SALT` `SET`. | Hidden SuperAdmin console atau Apps Script properties. | Pending production setup |
| RBAC | Role `Operator`, `Mandor`, `Management`, `HRD`, dan `SuperAdmin` diuji dengan akun Google Workspace asli. | Smoke test manual. | Pending production account |
| Validation | Semua callable wrapper punya blok `Input Validation & Sanitization`. | `npm run audit:gas:validation`. | Ready |
| Secrets | Tidak ada secret di frontend, docs publik, logs, atau Git. | `npm audit --audit-level=moderate` dan review diff. | Ready |
| API Boundary | Vue tidak memanggil `google.script.run` langsung. | Direct-access scan. | Ready |
| Data Integrity | Submit append-only, idempotency UUID, quarantine, closing, adjustment, dan recap diuji. | `npm test`. | Ready |
| GAS Smoke | Native runner menghasilkan `PASS` di project GAS target. | `runGasTestRunner`. | Pending deployed GAS |

## 2. Production Smoke Sequence

1. Jalankan `npm test`.
2. Jalankan `npm run build:verify`.
3. Jalankan `npm run prepare:gas`.
4. Push dengan `npm run push:gas` hanya dari konfigurasi `.clasp.json` lokal yang memakai `"rootDir": "deploy"`.
5. Di Apps Script editor, jalankan `runGasTestRunner({ session: { simulated_role: 'SuperAdmin' }, mode: 'SMOKE' })` hanya ketika `AUTH_MODE=OFF`; untuk production `AUTH_MODE=ON`, jalankan wrapper dengan akun SuperAdmin yang terdaftar.
6. Catat ringkasan Pass/Fail, bukan full log.

## 3. Rollback Gate

Rollback atau tahan rollout jika salah satu terjadi:

- `runGasTestRunner` menghasilkan `FAIL`.
- Dashboard membaca data selain `MASTER_RECAP`.
- Ada user production tanpa permission eksplisit.
- `APP_ACTIVE_UNTIL` expired/invalid saat go-live.
- Build menghasilkan file `.js` atau `.css` terpisah di `/dist`.

