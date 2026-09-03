# OPTIFLOW
> Operational Process Tracking & Integrated Floor-Workflow

OPTIFLOW adalah aplikasi pelaporan produksi harian berbasis web untuk menghilangkan pencatatan kertas, laporan WhatsApp yang tercecer, dan pekerjaan rekap manual di lini produksi manufaktur.

Sistem ini dirancang dengan pendekatan zero-cost infrastructure menggunakan Google Apps Script, Google Sheets, dan frontend Vue 3 yang dibundel menjadi satu `Index.html` untuk Google Apps Script HTML Service.

## Masalah Yang Diselesaikan

Pada proses berjalan, 100+ operator melaporkan hasil kerja harian seperti Tandon, Target, OK, dan Reject melalui chat atau kertas. Mandor harus menyalin ulang data tersebut ke buku statistik, memakan waktu sekitar 120 menit per hari dan membuka risiko salah input pada volume produksi 140.000+ unit per hari.

OPTIFLOW menargetkan:
- Rekap harian turun dari 120 menit menjadi sekitar 5 menit.
- Pengurangan kertas sekitar 54.000 lembar per tahun.
- Validasi Poka-Yoke agar `perolehan_ok + perolehan_reject` konsisten dengan total perolehan.
- Dashboard real-time untuk mandor, supervisor, dan manajemen.

## Stack Utama

- Backend: Google Apps Script V8.
- Frontend: Vue 3 Composition API.
- Build: Vite dengan `vite-plugin-singlefile`, menghasilkan satu `Index.html` tanpa file `.js` atau `.css` terpisah di `/dist`.
- Database: Google Sheets multi-sheet.
- Offline mode: IndexedDB queue di sisi client.
- Validasi client: Zod.
- Integrasi BI: Looker Studio atau dashboard internal HTML.

Catatan offline: OPTIFLOW bersifat Offline-Tolerant, bukan Offline-First penuh. Aplikasi membutuhkan koneksi untuk loading awal dari Google Apps Script HTML Service, lalu IndexedDB menjaga draft, cache referensi, dan queue sinkronisasi jika koneksi operator terputus saat input.

## Ruang Lingkup MVP

MVP difokuskan pada alur produksi inti:
1. Operator mengirim laporan harian dari UI mobile-friendly.
2. Backend memvalidasi payload, memastikan idempotency, lalu menulis ke `RAW_LOGS`.
3. Data anomali atau konflik masuk ke `QUARANTINE`.
4. Mandor/Supervisor melakukan verifikasi.
5. Proses batch membentuk `MASTER_RECAP`.
6. Manajemen membaca dashboard tanpa akses edit.

Upgrade proses setelah MVP:
- Pelaporan berbasis line dan shift.
- Draft autosave dan status sync per transaksi.
- Kategori defect untuk Pareto reject.
- Correction workflow sebelum approval final.
- Daily closing per line/shift.
- Adjustment log untuk koreksi setelah closing.
- Dashboard operasional dan dashboard improvement yang dipisahkan.
- Pilot rollout 1 line dan 1 shift sebelum skala penuh.

## Prinsip Arsitektur

- Documentation-Driven Development: kontrak markdown diperbarui sebelum kode.
- Defense in Depth: validasi terjadi di client dan server.
- Append-only event sourcing: transaksi masuk tidak diubah langsung.
- Soft-delete: tidak ada hard-delete untuk data master dan transaksi.
- PII isolation: enkripsi/dekripsi PII hanya di backend GAS.
- Blind indexing: pencarian PII memakai hash bayangan, bukan loop dekripsi.
- Server-side pagination: frontend tidak menarik seluruh dataset mentah.
- Conflict flagging: data offline yang berpotensi bentrok masuk `CONFLICT_PENDING` dan diselesaikan Mandor sebelum masuk dashboard manajemen.

## Dokumen Kontrak

- [AGENT.md](AGENT.md): aturan kerja agen dan batasan implementasi.
- [AGENT_STATE.md](AGENT_STATE.md): konteks ringkas agent untuk mode hemat token dan routing dokumen.
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): roadmap teknis dan urutan eksekusi.
- [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md): kontrak Google Sheets dan payload JSON.
- [docs/BUSINESS_PROCESS.md](docs/BUSINESS_PROCESS.md): SOP proses bisnis, role, dan alur approval.
- [docs/GUARDRAILS_CONTRACT.md](docs/GUARDRAILS_CONTRACT.md): aturan keamanan, performa, dan larangan teknis.
- [docs/KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md): latar belakang, metrik baseline, dan keputusan arsitektur.
- [docs/DOCUMENTATION_AUDIT.md](docs/DOCUMENTATION_AUDIT.md): audit konsistensi kontrak dokumentasi.
- [docs/UI_UX_CONTRACT.md](docs/UI_UX_CONTRACT.md): kontrak gaya Industrial Soft UI untuk mobile dan desktop.
- [docs/QCC_8_STEPS_7_TOOLS.md](docs/QCC_8_STEPS_7_TOOLS.md): kontrak narasi improvement QCC/Lean Six Sigma.
- [docs/POL.ISMS.001.md](docs/POL.ISMS.001.md): baseline kontrol keamanan untuk auth, PII, audit, API, dan deployment.
- [docs/SYSTEM_PROMPT.md](docs/SYSTEM_PROMPT.md): instruksi perilaku agen untuk pengembangan lanjutan.
- [ISSUE_TRACKER.md](ISSUE_TRACKER.md): backlog sinkronisasi GitHub Issues, labels, dan milestones.
- [ISSUE_TRACKER.json](ISSUE_TRACKER.json): versi machine-readable untuk otomasi sinkronisasi issue.

## Status Saat Ini

Repo sudah melewati implementasi `OPT-001` sampai `OPT-027`. Fondasi kontrak, frontend, backend GAS modular, auth/RBAC, offline-tolerant queue, conflict quarantine, approval inbox, defect capture Pareto-ready, daily closing, adjustment, recap, dashboard, hidden SuperAdmin maintenance console, native GAS test runner, dan artefak production readiness sudah tersedia.

Yang sudah terimplementasi:
- Vue 3 operator UI dengan Industrial Soft UI, form produksi mobile-friendly, autosave draft, queue status, dan preview Pareto defect.
- Vite single-file build dengan `vite-plugin-singlefile`; `/dist` hanya boleh menghasilkan `Index.html`.
- `apiAdapter.js` sebagai satu-satunya jalur frontend ke GAS, dengan allowlist callable, timeout, safe structured response, dan safe error.
- `mock_gas.js` untuk development lokal dengan latency, failure simulation, idempotency, dan conflict simulation.
- Global State/composable untuk hydrate draft, autosave background, enqueue submit, dan sync queue.
- IndexedDB persistence untuk `drafts` dan `queue`; UI tidak membaca/menulis IndexedDB langsung.
- GAS modular di `gas/*.gs` dengan `Code.js` sebagai entrypoint tipis.
- Bootstrap dan health check semua sheet kontrak, termasuk seed awal `DEFECT_CATEGORIES`.
- Toolbar spreadsheet `OPTIFLOW Admin` untuk bootstrap sheet, default Script Properties, dummy master data dev, schema health, dan GAS smoke test.
- `AUTH_MODE` session context, role simulation untuk development, dan production lookup via Google account.
- RBAC exact match berbasis `ROLE_PERMISSIONS`; tidak ada implicit allow untuk `SuperAdmin`.
- Input Validation & Sanitization pada callable wrapper sebelum auth, sheet access, atau business logic.
- Append-only submit endpoint ke `RAW_LOGS` dengan idempotency `transaction_id`.
- Conflict flagging mesin/operator/waktu menjadi `CONFLICT_PENDING` dan routing ke `QUARANTINE`.
- Mandor approval inbox UI untuk membandingkan konflik dan staging keputusan.
- Hidden SuperAdmin maintenance console untuk Script Properties allowlisted, termasuk `APP_ACTIVE_UNTIL`.
- Expiry gate `APP_ACTIVE_UNTIL`; aplikasi expired/invalid menampilkan halaman akses ditolak.
- Backend approval mutation untuk quarantine, daily closing, adjustment workflow, batch `MASTER_RECAP`, supervisor control center, dan management read-only dashboard.
- Test scripts untuk frontend adapter, operator form, IndexedDB, GAS sheet, auth, permission, production logs, Script Properties, dan native GAS test runner.
- Production hardening checklist, deployment checklist, pilot rollout plan, dan QCC report package.

Yang belum menjadi implementasi penuh:
- Eksekusi pilot aktual di line/shift production.
- Pengisian hasil QCC aktual setelah data pilot tersedia.

Langkah berikutnya mengikuti [Implementation Plan](docs/IMPLEMENTATION_PLAN.md), mulai dari eksekusi smoke test di GAS target dan pilot rollout.

## Rule Logika Aplikasi

- UI hanya berbicara dengan Global State/composable; IndexedDB hanya diakses oleh persistence service.
- Frontend tidak boleh memanggil `google.script.run` langsung; semua call melewati `apiAdapter.js`.
- Setiap payload submit membawa `transaction_id` UUID, `device_timestamp` UTC dari device, `client_version`, dan data produksi sesuai schema.
- `perolehan_ok + perolehan_reject` tidak boleh melebihi `target_harian + tandon`.
- Jika `perolehan_reject > 0`, `defect_category_id` wajib ada dan harus aktif di `DEFECT_CATEGORIES`.
- Submit ke GAS bersifat append-only ke `RAW_LOGS`; retry dengan `transaction_id` sama tidak boleh menggandakan data.
- Queue IndexedDB hanya dihapus setelah response GAS success yang tervalidasi.
- Data `CONFLICT_PENDING` tidak boleh masuk `MASTER_RECAP` atau dashboard final sebelum Human-in-the-Loop.
- Role truth berasal dari `USER_ROLES`; permission truth berasal dari `ROLE_PERMISSIONS`.
- `AUTH_MODE=ON` memakai `Session.getActiveUser().getEmail()`, sedangkan `AUTH_MODE=OFF` hanya untuk simulasi role development.
- Script Properties hanya boleh dimutasi melalui endpoint maintenance allowlisted dan permission eksplisit.
- `APP_ACTIVE_UNTIL` memakai format `YYYY-MM-DD` dan berlaku inclusive berdasarkan timezone `Asia/Jakarta`.

## Hambatan Dan Tantangan

- Google Apps Script memiliki quota, timeout, dan concurrent execution limit; IndexedDB queue dan caching dipakai untuk mengurangi beban call.
- GAS HTML Service berjalan dalam sandbox iframe, sehingga aplikasi ini Offline-Tolerant, bukan PWA Offline-First penuh.
- Semua aset frontend harus dibundel ke satu `Index.html`; ini memperbesar file hasil build, tetapi wajib untuk kompatibilitas HTML Service.
- Google Sheets bukan database relasional; integritas dijaga lewat schema contract, append-only logs, RBAC, audit trail, dan batch recap.
- Konflik akibat input offline tidak boleh otomatis menimpa data resmi; Mandor harus menjadi Human-in-the-Loop.
- PII dan Script Properties berisiko bocor jika dikirim ke frontend; backend wajib masking dan tidak pernah mengirim secret mentah.
- Dokumentasi mudah tertinggal saat coding cepat; proyek ini memakai Documentation-Driven Development dan issue tracker sebagai rem pengaman.

## Optimasi Performa

- Single-file frontend menghindari asset loading terpisah di GAS HTML Service.
- IndexedDB menyimpan draft dan queue sehingga input operator tetap responsif ketika koneksi tidak stabil.
- Autosave berjalan di background dengan debounce agar input angka tidak lag.
- Dashboard lanjutan wajib membaca `MASTER_RECAP`, bukan menarik seluruh `RAW_LOGS`.
- API adapter memakai timeout agar UI tidak menggantung saat GAS lambat.

## Deployment Ke Google Apps Script

Clasp memakai `.clasp.json` lokal dengan `"rootDir": "deploy"`. Folder `deploy/` adalah artifact lokal dan tidak di-commit ke Git.

Initial setup di Apps Script:

1. Set `SPREADSHEET_ID` di Script Properties jika project GAS standalone.
2. Jalankan `bootstrapSheets()` sekali untuk membuat sheet/header awal. Pemanggilan pertama boleh berjalan walaupun `AUTH_MODE`, `USER_ROLES`, `ROLE_PERMISSIONS`, dan `AUDIT_LOGS` belum siap.
3. Isi minimal `USER_ROLES` dan `ROLE_PERMISSIONS`, termasuk permission `schema:bootstrap` untuk admin yang berwenang.
4. Set `AUTH_MODE` ke `OFF` untuk development atau `ON` untuk production.
5. Set `APP_ACTIVE_UNTIL` bila aplikasi perlu masa aktif terbatas.

Setelah sheet foundational tersedia, `bootstrapSheets()` kembali wajib melewati auth/RBAC.

Menu spreadsheet:
- Saat project terhubung ke Google Sheets, `onOpen()` menambahkan menu `OPTIFLOW Admin`.
- Menu ini bisa dipakai untuk bootstrap sheet, set default Script Properties yang masih kosong, seed dummy master data dev, schema health, GAS smoke test, dan shortcut link proyek.
- Dummy master data ditolak saat `AUTH_MODE=ON`, dan default Script Properties tidak menimpa nilai yang sudah ada.

Alur push yang aman:

```powershell
npm run push:gas
```

Perintah tersebut menjalankan build single-file, membuat ulang `deploy/`, lalu menjalankan `clasp push --force`. Isi `deploy/` hanya boleh berisi runtime Apps Script:

```txt
deploy/appsscript.json
deploy/Code.js
deploy/Index.html
deploy/gas/*.gs
```

Gunakan `.clasp.example.json` sebagai template aman untuk setup lokal. File `.clasp.json` asli tetap di-ignore karena memuat `scriptId`.

## Struktur Backend GAS

Backend dibuat modular agar mudah diskalakan. Modul aktif saat ini:

```txt
Code.js
gas/
|-- accessGate.gs
|-- adjustments.gs
|-- audit.gs
|-- auth.gs
|-- config.gs
|-- dailyClosing.gs
|-- dashboard.gs
|-- health.gs
|-- permissions.gs
|-- productionLogs.gs
|-- quarantine.gs
|-- recap.gs
|-- response.gs
|-- scriptProperties.gs
|-- sheets.gs
|-- spreadsheetMenu.gs
|-- test_runner.gs
`-- validation.gs
```

`Code.js` hanya berperan sebagai entrypoint untuk `doGet()` dan wrapper fungsi yang dipanggil frontend. Business logic backend ditempatkan di modul `gas/*.gs` dengan namespace object agar aman di global scope Google Apps Script.

Script Properties maintenance tersedia sebagai hidden SuperAdmin console dan endpoint GAS allowlisted. Secret seperti `ENCRYPTION_SALT` hanya dikembalikan sebagai status, bukan nilai mentah. `APP_ACTIVE_UNTIL` dapat dipakai untuk menentukan masa aktif aplikasi; jika expired, Apps Script menampilkan halaman akses ditolak.

Validasi backend:

```powershell
npm run test:gas
```

Command tersebut menjalankan audit `Input Validation & Sanitization` untuk callable wrapper di `Code.js`, test bootstrap sheet, test auth/session, test permission matrix, test production logs/quarantine, test Script Properties, test native GAS runner, dan test spreadsheet toolbar menu.

Native runner untuk Apps Script target:

```javascript
runGasTestRunner({ session: { simulated_role: 'SuperAdmin' }, mode: 'SMOKE' })
```

Di production `AUTH_MODE=ON`, jalankan dengan akun SuperAdmin yang terdaftar dan memiliki permission `test_runner:run`.

## Frontend API Adapter

Frontend tidak memanggil `google.script.run` langsung. Semua interaksi GAS lewat `src/services/apiAdapter.js`, sedangkan development lokal memakai `src/services/mock_gas.js` untuk meniru response Apps Script dengan latency dan failure simulation.

## Verifikasi Lokal

```powershell
npm test
npm run build:verify
npm run prepare:gas
npm audit --audit-level=moderate
```

## Dokumen Produksi Dan Rollout

- [docs/PRODUCTION_HARDENING_CHECKLIST.md](docs/PRODUCTION_HARDENING_CHECKLIST.md): gate keamanan sebelum production.
- [docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md](docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md): urutan build, prepare, push, smoke, dan rollback.
- [docs/PILOT_ROLLOUT_PLAN.md](docs/PILOT_ROLLOUT_PLAN.md): pilot 1 line / 1 shift.
- [docs/QCC_REPORT_PACKAGE.md](docs/QCC_REPORT_PACKAGE.md): template paket laporan QCC Step 1-8.

Expected:
- Semua test frontend dan GAS helper lulus.
- `dist/Index.html` adalah satu-satunya output runtime frontend.
- `deploy/` berisi artifact siap push ke GAS.
- Audit dependency tidak menemukan vulnerability moderate atau lebih tinggi.

## Author

Aris Nur Mahendra  
Digital Transformation Specialist & Workflow Hacker
