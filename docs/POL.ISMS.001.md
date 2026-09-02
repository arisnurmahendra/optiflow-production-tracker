# POL.ISMS.001.md - OPTIFLOW Security Baseline Control

> Purpose: baseline keamanan minimum untuk desain, implementasi, logging, dan deployment OPTIFLOW.

## 1. Scope

Dokumen ini menerapkan prinsip POL.ISMS.001 ke konteks OPTIFLOW. Karena OPTIFLOW memakai Google Apps Script dan Google Workspace identity, kontrol password lokal berlaku hanya jika sistem nanti menambahkan autentikasi password sendiri.

## 2. Authentication And Access Control

Required controls:
- Terapkan RBAC dengan prinsip least privilege.
- Setiap user memiliki `user_id` unik.
- Role dan status aktif dibaca dari `USER_ROLES`.
- Permission eksplisit dibaca dari `ROLE_PERMISSIONS`.
- User tidak aktif atau soft-deleted tidak boleh mengakses sistem.
- Administrator dan SuperAdmin wajib memakai kontrol MFA dari Google Workspace bila tersedia.
- Setiap endpoint backend melakukan authorization berdasarkan role dan resource.

Conditional controls for future custom password auth:
- Password default wajib diganti saat initial login.
- Password user biasa minimal 8 karakter.
- Password privileged/admin minimal 14 karakter.
- Password wajib berisi huruf besar, huruf kecil, angka, dan karakter khusus.
- Account lockout setelah 10 percobaan login gagal.
- Password wajib disimpan dengan salted password hashing yang kuat.
- Password tidak boleh dikirim atau disimpan dalam clear text.

## 3. Cryptography And Data Protection

- Secret server disimpan di `PropertiesService.getScriptProperties()`.
- `ENCRYPTION_SALT` tidak boleh keluar dari backend.
- PII disimpan dalam bentuk terenkripsi bila tidak perlu dibaca langsung.
- Pencarian PII menggunakan blind index, bukan dekripsi massal.
- Data sensitif tidak boleh dikirim dalam clear text melalui channel non-terenkripsi.
- Deployment produksi wajib memakai HTTPS/TLS dari Google.

## 4. Logging And Monitoring

Audit log wajib mencatat:
- User ID atau email pelaku.
- Role pelaku.
- Waktu aksi dalam ISO 8601 UTC.
- Login sukses/gagal bila tersedia dari kontrol aplikasi.
- Perubahan konfigurasi.
- Approval, rejection, dan correction request.
- Entity terdampak.

Audit log wajib memfilter:
- Password.
- PIN.
- OTP.
- MFA secret.
- Recovery code.
- Token.
- Credential.
- Nomor telepon mentah.
- PII mentah.

## 5. API And Secure Coding

- Terapkan input validation di client dan server.
- Backend tidak boleh mempercayai payload client.
- Gunakan allowlist field untuk payload.
- Error response aman, ringkas, dan machine-readable.
- Jangan tampilkan stack trace, internal path, raw exception, atau detail storage kepada user.
- Semua mutation penting harus idempotent bila ada risiko retry.
- Endpoint list data wajib memakai server-side filtering dan pagination.
- Upload file, jika ditambahkan, wajib divalidasi berdasarkan size, extension, MIME, dan signature bila tersedia.

## 6. Data Integrity

- Dilarang hard-delete untuk data operasional, master user, dan audit.
- Soft-delete menggunakan `is_deleted=TRUE` dan `deleted_at` ISO 8601 UTC.
- `RAW_LOGS` append-only.
- Koreksi transaksi dilakukan dengan transaksi baru atau workflow approval, bukan overwrite diam-diam.
- Batch recap harus bisa dijalankan ulang tanpa menggandakan hasil.

## 7. Production Readiness Checklist

- `AUTH_MODE=ON`.
- `ENCRYPTION_SALT` tersedia di Script Properties.
- Tidak ada secret di source, frontend bundle, log, screenshot, atau dokumentasi publik.
- RBAC diuji untuk role `Operator`, `Mandor`, `Management`, `HRD`, dan `SuperAdmin`.
- Audit log masking diuji.
- Payload invalid ditolak server.
- Duplicate `transaction_id` tidak menggandakan data.
- Dashboard membaca `MASTER_RECAP`, bukan seluruh `RAW_LOGS`.
- Build frontend menghasilkan satu `Index.html` tanpa file `.js` atau `.css` terpisah di `/dist`.

## 8. Current Control Implementation Status

Implemented and locally tested:
- `AUTH_MODE` session flow for development simulation and production Google identity lookup.
- `ROLE_PERMISSIONS` exact-match authorization with fail-closed behavior.
- Safe structured response and safe frontend error normalization.
- Callable wrapper validation audit before backend business logic.
- Append-only production submit with duplicate `transaction_id` protection.
- Conflict quarantine for machine/operator/time collision.
- Active defect category validation for reject submissions.
- Script Properties maintenance allowlist with secret masking and audit events.
- `APP_ACTIVE_UNTIL` access gate for expired or invalid application period.
- Single-file frontend build verification.
- Backend quarantine approval mutation, daily closing, adjustment approval, idempotent `MASTER_RECAP`, supervisor control center, and management read-only dashboard.

Still required before production rollout:
- Set production Script Properties in the target Apps Script project.
- Run role/RBAC smoke tests with real Google Workspace accounts.
- Run native `test_runner.gs` in the target Apps Script project after deployment and record the Pass/Fail summary.
- Fill production evidence in `docs/PRODUCTION_HARDENING_CHECKLIST.md`, `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`, `docs/PILOT_ROLLOUT_PLAN.md`, and `docs/QCC_REPORT_PACKAGE.md` before full rollout.
