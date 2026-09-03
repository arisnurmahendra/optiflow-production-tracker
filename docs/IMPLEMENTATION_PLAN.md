# IMPLEMENTATION_PLAN.md - OPTIFLOW Technical Roadmap

> Objective: mengubah kontrak OPTIFLOW menjadi aplikasi Google Apps Script + Vue 3 yang bisa dipakai bertahap di lantai produksi.

## 1. Prinsip Eksekusi

- Dokumentasi adalah sumber kebenaran pertama.
- Roadmap execution dilacak di `ISSUE_TRACKER.md` dan disiapkan untuk sinkronisasi GitHub Issues.
- MVP harus menyelesaikan alur produksi harian sebelum fitur tambahan.
- Data produksi ditulis append-only ke `RAW_LOGS`.
- PII diproses hanya di backend.
- Frontend tidak boleh memanggil `google.script.run` langsung.
- Narasi improvement mengikuti `QCC_8_STEPS_7_TOOLS.md`.
- Baseline keamanan mengikuti `POL.ISMS.001.md`.
- UI/UX mengikuti `UI_UX_CONTRACT.md`.
- Setiap fase harus punya kriteria selesai yang bisa diverifikasi.

## 1A. Snapshot Implementasi Saat Ini

Status per 2026-09-03:
- Selesai: `OPT-001` sampai `OPT-027`.
- Fondasi selesai: kontrak docs, Vue/Vite single-file, deploy staging `deploy/`, GAS modular, sheet bootstrap, schema health, auth/session, RBAC, validation audit, API adapter, mock GAS, operator form, IndexedDB draft/queue, append-only `RAW_LOGS`, offline sync queue, conflict quarantine, approval inbox UI, defect catalog Pareto-ready, hidden Script Properties console, expiry gate, registered-email/demo render gate, native GAS test runner, hardening checklist, deployment checklist, pilot plan, dan QCC package template.
- M5 selesai: backend quarantine approval mutation, daily closing, adjustment, recap, supervisor control center, dan management dashboard.
- Setelah M6/M7 artifact closure, sisa pekerjaan utama adalah eksekusi smoke test di GAS target, pilot lapangan, dan validasi benefit QCC aktual dari data pilot.

## 2. Fase 0 - Baseline Repository

Tujuan:
- Menyiapkan struktur proyek yang jelas untuk Apps Script dan frontend.
- Memastikan Clasp hanya mengunggah file yang diperlukan.
- Menyiapkan tracker lokal yang siap disinkronkan ke GitHub Issues.

Deliverables:
- Struktur folder `src/` untuk Vue 3.
- Struktur folder `gas/` untuk backend modular, dengan `Code.js` sebagai entrypoint tipis.
- `package.json`, Vite config, dan `vite-plugin-singlefile`.
- Konfigurasi Vite memastikan Vue 3, styling, dan aset base64 ter-bundle ke satu `Index.html`.
- `.claspignore` berisi ignore rule untuk node modules, source lokal, test artifact, dan dokumen yang tidak perlu di-deploy.
- `.clasp.json` lokal memakai `"rootDir": "deploy"` agar `clasp push --force` hanya membaca artifact runtime hasil build.
- Script `prepare:gas` membuat ulang folder `deploy/` dari `appsscript.json`, `Code.js`, root `.gs`/`gas/**/*.gs`, dan `dist/Index.html` sebagai `deploy/Index.html`.
- Kontrak deployment memisahkan environment development dan production melalui Clasp deployment/versioning.
- `ISSUE_TRACKER.md` berisi issue ID, labels, milestone, priority, status, dan GitHub issue number placeholder.
- Modul GAS awal minimal:
  - `gas/config.gs` untuk konstanta aplikasi dan sheet wajib.
  - `gas/response.gs` untuk safe structured response.
  - `gas/health.gs` untuk health check bootstrap.
  - `gas/permissions.gs` untuk enforcement `ROLE_PERMISSIONS`.

Kriteria selesai:
- Build frontend menghasilkan satu `Index.html`.
- Direktori `/dist` tidak menghasilkan file `.js` atau `.css` terpisah.
- `Index.html` dapat dipakai oleh Google Apps Script HTML Service tanpa asset eksternal.
- Clasp push tidak membawa file development yang tidak relevan.
- `clasp status` hanya menampilkan file dari `deploy/` yang siap dikirim ke GAS.
- `.claspignore` mencegah `node_modules`, source Vue mentah, test artifact, env lokal, dan file non-deploy ikut terkirim ke Apps Script.
- Setiap item roadmap utama memiliki issue lokal dengan label dan milestone.
- `Code.js` tidak berisi business logic besar; logic backend masuk ke namespace module di `gas/*.gs`.

## 3. Fase 1 - Database Contract Dan Bootstrap Sheet

Tujuan:
- Membuat Google Sheets siap sebagai database multi-sheet.

Deliverables:
- Fungsi backend untuk membuat dan memvalidasi sheet wajib:
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
- Header sheet mengikuti `DATA_SCHEMA.md`.
- Fungsi health check schema.
- Modul lanjutan dipisah sesuai concern: validation, auth/RBAC, sheet repository, audit, production logs, quarantine, recap, dan `test_runner.gs`.
- `SPREADSHEET_ID` dibaca dari Script Properties untuk Apps Script standalone; container-bound script boleh memakai active spreadsheet.

Kriteria selesai:
- Backend dapat mendeteksi sheet hilang atau kolom tidak cocok.
- Tidak ada formula di `RAW_LOGS`.
- Backend dapat membuat sheet wajib dan header awal tanpa menghapus data yang sudah ada.
- `bootstrapSheets()` memutus circular dependency first-run: jika sheet foundational auth/RBAC/audit belum ada, schema bootstrap boleh berjalan tanpa session; setelah foundational sheet ada, endpoint kembali wajib RBAC `schema:bootstrap`.

## 4. Fase 2 - Auth, RBAC, Dan Session Bootstrap

Tujuan:
- Menentukan identitas dan role pengguna secara aman.

Deliverables:
- `getSessionContext()` di GAS.
- Lookup role dari `USER_ROLES`.
- Lookup permission dari `ROLE_PERMISSIONS`.
- Mode `AUTH_MODE=ON` untuk produksi.
- Mode `AUTH_MODE=OFF` untuk role switcher development.
- Masking PII berdasarkan role.
- Baseline RBAC helper untuk memastikan endpoint hanya berjalan setelah session tervalidasi.
- Audit dasar untuk session success/failure ke `AUDIT_LOGS`.
- Enforcement `ROLE_PERMISSIONS` berbasis exact match `role + resource + action`.
- Endpoint bootstrap/schema health hanya boleh berjalan jika permission eksplisit tersedia.

Kriteria selesai:
- User tidak terdaftar ditolak saat auth aktif.
- Endpoint menolak aksi tanpa permission eksplisit.
- Operator tidak menerima PII mentah.
- HRD dan SuperAdmin dapat membaca field PII sesuai kebutuhan role.
- Fungsi GAS yang menerima input eksternal memiliki blok awal `Input Validation & Sanitization`.
- `AUTH_MODE=OFF` mengembalikan daftar role simulasi dan memvalidasi role yang dipilih.
- `AUTH_MODE=ON` mengabaikan request simulasi role dan memakai `Session.getActiveUser().getEmail()`.
- `REQUIRE_REGISTERED_EMAIL_LOGIN=TRUE` menolak render app untuk email tidak terdaftar; `FALSE` hanya untuk demo/trial terkontrol.
- Endpoint tanpa permission eksplisit ditolak dan mencatat audit `RBAC_DENIED`.
- Callable wrapper di `Code.js` lolos audit `npm run audit:gas:validation`.

## 5. Fase 3 - Operator Reporting MVP

Tujuan:
- Operator dapat submit laporan produksi harian secara cepat dari mobile.

Deliverables:
- UI mobile operator mengikuti Industrial Soft UI dengan tombol aksi solid dan target sentuh minimal 44px.
- `apiAdapter.js` production wrapper untuk semua callable GAS yang dipakai frontend.
- `mock_gas.js` local development adapter dengan latency dan failure simulation.
- Form input: line, shift, machine ID, target harian, tandon, OK, reject, dan kategori defect jika reject lebih dari 0.
- Katalog defect MVP membawa `qcc_factor` dan `severity` untuk preview Pareto dan QCC Step 1 sejak input operator.
- Validasi form operator memakai Zod dan menghasilkan error inline aman sebelum payload dibuat.
- Submit pada tahap form membuat payload draft/queue lokal; persistensi IndexedDB dan endpoint GAS append-only tetap mengikuti issue lanjutan.
- Autosave draft lokal sebelum submit.
- Global State/composables sebagai satu-satunya interface UI untuk membaca/menulis draft.
- Persistence service IndexedDB yang hanya dipanggil oleh Global State.
- IndexedDB object store minimal: `drafts` untuk draft operator dan `queue` untuk transaksi pending sync.
- Global State melakukan hydrate startup, autosave background, enqueue submit, dan status error persistence yang aman.
- Validasi Zod di client.
- Validasi server di GAS melalui blok awal `Input Validation & Sanitization`.
- Payload mengikuti kontrak JSON.
- Idempotency memakai `transaction_id`.
- Append ke `RAW_LOGS`.

Kriteria selesai:
- Tidak ada komponen Vue yang memanggil `google.script.run` langsung.
- Adapter menolak callable yang tidak di-allowlist.
- Local mock mengembalikan response shape sama seperti GAS dan bisa mensimulasikan failure.
- Submit valid tersimpan satu kali.
- Submit duplikat tidak menggandakan data.
- Payload tidak valid ditolak dengan error terstruktur.
- Payload yang melanggar `DATA_SCHEMA.md` ditolak sebelum business logic berjalan.
- Form mobile dapat membentuk payload dengan `transaction_id`, `device_timestamp`, metadata client, dan field payload sesuai kontrak.
- Draft tidak hilang saat browser reload sebelum submit.
- Queue transaksi tersimpan di IndexedDB sebagai `PENDING_SYNC` dan tidak dihapus sebelum success GAS pada issue sync berikutnya.
- Reject dengan nilai lebih dari 0 meminta kategori defect.
- Submit reject divalidasi terhadap kategori aktif `DEFECT_CATEGORIES` di frontend dan backend.
- Komponen UI tidak memiliki direct access ke IndexedDB.

## 6. Fase 4 - Offline Queue Dan Sync

Tujuan:
- Laporan tetap bisa dibuat saat koneksi tidak stabil setelah aplikasi berhasil dimuat.

Deliverables:
- Kontrak frontend sebagai `Offline-Tolerant`, bukan `Offline-First`.
- Catatan bahwa Service Worker/PWA tidak menjadi dependency karena GAS HTML Service berjalan di sandbox iframe `script.googleusercontent.com`.
- Cache IndexedDB untuk data referensi pekerja, line, shift, tandon, target, dan queue transaksi.
- IndexedDB queue.
- Retry sync dengan status per transaksi.
- Sync status per item: `DRAFT`, `PENDING_SYNC`, `SYNCING`, `SYNCED`, `FAILED`, `CONFLICT`, `CONFLICT_PENDING`.
- `sync_type` bernilai `LIVE` atau `OFFLINE_QUEUE`.
- Alur reaktivitas `Global State -> UI -> IndexedDB -> Sync` terdokumentasi dan diuji manual.
- Failure injection di `mock_gas.js`.
- Event sourcing offline: setiap sync dari IndexedDB ke GAS menambah baris baru di `RAW_LOGS`, bukan update cell/baris lama.

Kriteria selesai:
- Aplikasi membutuhkan koneksi untuk loading awal, tetapi data input tidak hilang saat koneksi terputus setelah aplikasi terbuka.
- Data offline tersimpan lokal.
- Data terkirim otomatis saat koneksi kembali.
- Konflik atau kegagalan tidak menghilangkan data user.
- Queue IndexedDB hanya dihapus setelah GAS success tervalidasi.
- Input operator tetap responsif saat persist IndexedDB berjalan di background.
- Sync queue frontend hanya memproses status `PENDING_SYNC` dan `FAILED`; status `CONFLICT_PENDING` tetap tersimpan sampai Human-in-the-Loop menyelesaikan kasus.
- Payload offline menyertakan UUID `transaction_id` dan `device_timestamp` aktual dari perangkat operator.

## 7. Fase 5 - Quarantine Dan Approval

Tujuan:
- Mandor/Supervisor punya kontrol atas data konflik dan anomali.

Deliverables:
- UI Mandor memakai approval inbox dengan treatment visual kuat untuk `CONFLICT_PENDING`.
- Rule anomali awal:
  - nilai negatif
  - target kosong
  - reject tidak wajar
  - duplikasi mencurigakan
  - mesin solder sama, operator berbeda, dan selisih waktu berdekatan
  - timestamp perangkat terlalu jauh dari server
- UI daftar `QUARANTINE`.
- Notifikasi Mandor untuk data `CONFLICT_PENDING`.
- Action approve, reject, dan request correction.
- Alur status `PENDING -> CORRECTION_REQUESTED -> RESUBMITTED -> APPROVED/REJECTED`.
- Alur konflik `CONFLICT_PENDING -> APPROVED/REJECTED`.
- Human-in-the-Loop memastikan data sync dari IndexedDB tidak langsung mengunci rekap utama ketika ada konflik, reject rule, atau anomali.
- Backend conflict detection dan quarantine routing dipisah ke modul GAS khusus agar rule anomali berikutnya bisa ditambahkan tanpa membesarkan entrypoint submit.
- Audit trail untuk keputusan approval.

Kriteria selesai:
- Data konflik tidak langsung masuk recap.
- Data `CONFLICT_PENDING` tidak masuk `MASTER_RECAP` atau dashboard manajemen.
- Keputusan supervisor terekam di `AUDIT_LOGS`.
- Data yang butuh review hanya masuk rekap setelah Mandor/Supervisor melakukan approve.

## 8. Fase 6 - Batch Recap Dan Dashboard

Tujuan:
- Data bersih dapat direkap untuk dashboard operasional.

Deliverables:
- UI desktop mengikuti control center: filter, table server-side pagination, detail drawer, dan status badge kontras.
- Time-driven trigger untuk agregasi ke `MASTER_RECAP`.
- Anchor timezone `Asia/Jakarta`.
- Ringkasan per tanggal, operator, machine, dan kategori.
- Ringkasan per line dan shift.
- Dashboard Pareto defect dari `DEFECT_CATEGORIES`.
- Pareto memakai agregasi `reject_total` per kategori defect aktif, dilengkapi `qcc_factor`, `severity`, dan persentase kontribusi.
- Snapshot performa operator untuk target, OK, reject, defect rate, dan status submit.
- Dashboard internal read-only atau sumber data Looker Studio.

Kriteria selesai:
- Rekap harian memakai batas hari pabrik, bukan timezone perangkat.
- Dashboard tidak menarik seluruh `RAW_LOGS` ke frontend.
- Dashboard operasional dan dashboard improvement dipisahkan.

## 9. Fase 7 - Daily Closing Dan Adjustment Control

Tujuan:
- Mengunci data harian setelah diverifikasi agar rekap resmi tidak berubah tanpa jejak.

Deliverables:
- `DAILY_CLOSING` per `factory_date + line_id + shift_id`.
- Tombol closing untuk Mandor/Supervisor sesuai permission.
- Blokir submit/koreksi langsung setelah status `CLOSED`.
- `ADJUSTMENT_LOGS` untuk koreksi setelah closing.
- Approval adjustment sebelum masuk recap.
- Endpoint M5: `closeDailyClosing`, `reopenDailyClosing`, `createAdjustment`, `approveAdjustment`, `rejectAdjustment`, `runMasterRecap`, `getSupervisorControlCenter`, dan `getManagementDashboard`.
- Supervisor control center dan management dashboard memakai pagination/filter dari backend.

Kriteria selesai:
- Data tanggal/line/shift yang sudah closed tidak bisa diubah langsung.
- Koreksi setelah closing selalu append-only dan teraudit.
- Batch recap memperhitungkan adjustment yang sudah approved.

## 10. Fase 8 - Security Hardening Dan Deployment

Tujuan:
- Menyiapkan aplikasi untuk pemakaian produksi.

Deliverables:
- Review guardrails.
- Review checklist `POL.ISMS.001.md`.
- `test_runner.gs` untuk test backend GAS.
- Smoke test frontend.
- Dokumentasi deploy via Clasp.
- Checklist Script Properties.
- Hidden maintenance console SuperAdmin untuk status/update/delete/rotate Script Properties berbasis allowlist.
- Spreadsheet toolbar admin untuk bootstrap sheet, default Script Properties, dummy master data dev, schema health, dan GAS smoke test.
- Expiry gate berbasis `APP_ACTIVE_UNTIL` yang menampilkan halaman akses ditolak saat aplikasi sudah melewati masa aktif.
- Demo/trial render gate berbasis `REQUIRE_REGISTERED_EMAIL_LOGIN` dan halaman akses ditolak dengan aksi ganti akun, kelola izin Google, dan reload.
- Production API wrapper memakai `google.script.run.withSuccessHandler().withFailureHandler()`.
- Artefak checklist:
  - `docs/PRODUCTION_HARDENING_CHECKLIST.md`.
  - `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`.

Kriteria selesai:
- Tidak ada secret di frontend.
- Tidak ada direct call `google.script.run` di komponen Vue.
- Tidak ada hard-delete.
- Tidak ada pagination client-side untuk dataset besar.
- Tidak ada file `.js` atau `.css` terpisah di `/dist` setelah build produksi.
- RBAC, audit masking, dan safe error response memenuhi baseline POL.ISMS.001.
- Script Properties maintenance menolak key non-allowlist, tidak membocorkan secret, dan mencatat audit.
- `doGet()` memblokir akses ketika `APP_ACTIVE_UNTIL` expired atau invalid tanpa merender aplikasi utama.
- `doGet()` memblokir user tidak terdaftar ketika registered-email login aktif, serta hanya bypass untuk demo/trial jika `REQUIRE_REGISTERED_EMAIL_LOGIN=FALSE`.
- Test runner GAS menghasilkan log Pass/Fail untuk CRUD, validation, idempotency, RBAC, quarantine, closing, adjustment, dan recap.
- Checklist hardening dan deployment memiliki langkah, bukti verifikasi, dan rollback gate ringkas.

## 11. Fase 9 - Pilot Rollout Dan Process Stabilization

Tujuan:
- Menguji OPTIFLOW pada skala kecil sebelum rollout 100+ operator.

Deliverables:
- Pilot 1 line, 1 shift, dan 1 Mandor selama 1-2 minggu.
- Checklist onboarding operator.
- SOP closing harian.
- Pengukuran waktu submit, waktu review quarantine, waktu recap, duplicate rate, dan sync failure rate.
- Log improvement untuk penyempurnaan rule anomali.
- Artefak pilot: `docs/PILOT_ROLLOUT_PLAN.md`.

Kriteria selesai:
- Pilot mencapai target proses atau gap-nya terdokumentasi.
- Mandor menyetujui SOP harian.
- Risiko rollout sudah dicatat dengan corrective action.
- Keputusan lanjut rollout atau ulang pilot dicatat berdasarkan metrik pilot.

## 12. Fase 10 - QCC Report Dan Standardisasi

Tujuan:
- Menyusun materi improvement yang siap dipakai untuk presentasi QCC dan standardisasi kerja.

Deliverables:
- Narasi Step 1 sampai Step 8 sesuai `QCC_8_STEPS_7_TOOLS.md`.
- Tabel Pareto/SIPOC, Target SMART, Fishbone, Cost vs Benefit, 5W2H, PICA, Target vs Actual, dan Root Cause Closure.
- Draft SOP/IK/WI untuk proses pelaporan produksi digital.
- Artefak final: `docs/QCC_REPORT_PACKAGE.md`.

Kriteria selesai:
- Step 2 tidak menyebut solusi digital.
- Root cause Step 3 dijawab oleh countermeasure Step 4.
- Evaluasi Step 6 membandingkan aktual terhadap target Step 2.
- Standardisasi Step 7 memasukkan SOP, visual management, dan IT Poka-Yoke.
- Knowledge base dan dokumen inovasi/QCC diperbarui jika hasil pilot mengubah narasi improvement.
- Paket QCC jelas membedakan data yang sudah aktual dari placeholder yang menunggu hasil pilot.

## 13. Backlog Setelah MVP

- Predictive defect trend.
- Import master operator dari HRD.
- Export laporan PDF periodik.
- Notifikasi approval tertunda.
- Dashboard OEE sederhana.
- Horizontal expansion ke lini produksi lain.
- Integrasi notifikasi email/Chat untuk pending quarantine dan closing terlambat.
- Template laporan QCC otomatis dari data Pareto dan Target vs Actual.
