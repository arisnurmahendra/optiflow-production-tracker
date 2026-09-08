# PRODUCTION_DEPLOYMENT_CHECKLIST.md - OPTIFLOW Deployment

Purpose: menjaga push GAS tetap bersih, repeatable, dan bisa di-rollback.

## 1. Pre-Deploy

| Check | Command / Evidence | Status |
| :--- | :--- | :--- |
| Working tree dipahami. | `git status --short`. | Required |
| Test lokal pass. | `npm test`. | Required |
| Single-file build pass. | `npm run build:verify`. | Required |
| Deploy staging dibuat ulang. | `npm run prepare:gas`. | Required |
| Dependency audit aman. | `npm audit --audit-level=moderate`. | Required |
| Production seed aman. | Pastikan `AUTH_MODE=ON` sebelum memakai sheet production agar dummy master data tidak dibuat otomatis. | Required |

## 2. Deploy

Gunakan:

```powershell
npm run push:gas
```

Jangan menjalankan `clasp push --force` dari source tree mentah. Runtime yang boleh naik ke GAS hanya:

```txt
deploy/appsscript.json
deploy/Code.js
deploy/Index.html
deploy/gas/*.gs
```

## 3. Post-Deploy

1. Buka web app sebagai `SuperAdmin`, `Mandor`, `Operator`, `Management`, dan `HRD`.
2. Jalankan smoke test `runGasTestRunner`.
3. Cek hidden Script Properties console status-only.
4. Submit satu data dummy pilot bila memakai sheet staging.
5. Jalankan closing, adjustment, recap, dashboard read-only, defect category read, dan HRD access dashboard di scope pilot/staging.

## 4. Rollback

Rollback memakai versi deployment Apps Script terakhir yang stabil. Jangan menghapus data Google Sheets untuk rollback aplikasi; data produksi tetap append-only dan koreksi dilakukan lewat `ADJUSTMENT_LOGS`.
