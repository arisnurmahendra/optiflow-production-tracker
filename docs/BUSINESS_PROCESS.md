# BUSINESS_PROCESS.md - OPTIFLOW Operational SOP & Business Logic Contract

> Core objective: membuat alur pelaporan produksi harian yang cepat, tervalidasi, dan siap diaudit.

## 1. Baseline Operasional

Kontrak improvement QCC untuk narasi laporan, presentasi, dan standardisasi mengikuti `QCC_8_STEPS_7_TOOLS.md`.

Kondisi awal:
- 100+ operator aktif per hari.
- Target sekitar 1400 unit per operator per hari.
- Laporan dilakukan melalui WhatsApp dan kertas.
- Mandor melakukan rekap manual sekitar 120 menit per hari.
- Risiko utama: salah salin, data hilang, keterlambatan rekap, dan sulit melihat tren reject.

Target OPTIFLOW:
- Rekap harian sekitar 5 menit.
- Paperless untuk laporan produksi.
- Data siap dashboard secara near real-time.
- Anomali ditangani melalui approval, bukan koreksi manual diam-diam.
- Sistem bersifat Offline-Tolerant: aplikasi butuh internet untuk loading awal, tetapi data input tetap aman jika koneksi putus setelah aplikasi terbuka.

Status implementasi 2026-09-02:
- Alur operator sampai queue, sync, append-only submit, duplicate handling, conflict routing, dan Pareto-ready defect capture sudah tersedia.
- Mandor approval inbox sudah terhubung ke backend approval mutation dengan fallback staged lokal saat endpoint belum tersedia di environment.
- Daily closing, adjustment, batch recap, supervisor control center, dan management dashboard read-only sudah tersedia untuk scope M5.

## 2. Role Dan Hak Akses

| Role | Hak akses utama |
| :--- | :--- |
| `Operator` | Submit laporan produksi miliknya sendiri dan melihat status sync. |
| `Mandor` | Melihat antrian konflik, approve/reject/request correction, closing harian, membaca rekap lini. |
| `Management` | Membaca dashboard dan rekap tanpa edit. |
| `HRD` | Mengelola data PII pekerja sesuai kebutuhan administrasi. |
| `SuperAdmin` | Mengelola konfigurasi, role, dan troubleshooting tingkat lanjut. |

## 3. Alur Submit Produksi

1. Operator membuka aplikasi.
2. Backend mengirim session context sesuai `AUTH_MODE`.
3. Operator memilih line, shift, machine ID, target harian, tandon, OK, dan reject.
4. Frontend menjalankan validasi Zod.
5. Jika reject lebih dari 0, operator wajib memilih kategori defect.
6. Kategori defect membawa `qcc_factor` dan `severity` agar reject langsung siap untuk Pareto awal dan analisis QCC.
7. Frontend menyimpan draft otomatis di IndexedDB sebelum submit.
8. Frontend membuat `transaction_id` UUID dan `device_timestamp` UTC.
9. Submit dikirim melalui `apiAdapter.js`.
10. Backend melakukan validasi server.
11. Jika valid dan tidak anomali, data ditulis ke `RAW_LOGS` dengan status `ACCEPTED`.
12. Jika duplikat, backend mengembalikan status idempotent tanpa menulis ulang.
13. Jika backend mendeteksi konflik mesin sama, operator berbeda, dan waktu berdekatan, data ditulis dengan status `CONFLICT_PENDING` dan masuk `QUARANTINE`.
14. Jika anomali lain muncul, data dicatat ke `RAW_LOGS` dan/atau `QUARANTINE` sesuai rule.

Tahap `OPT-010` hanya menstandardisasi form operator, validasi Zod, pembuatan payload, dan staging submit di UI. Persistensi IndexedDB penuh berada di `OPT-011`, endpoint GAS append-only berada di `OPT-012`, dan retry sync queue berada di `OPT-013`.

## 4. Alur Offline

1. Operator membuka aplikasi saat masih memiliki koneksi internet untuk memuat `Index.html` dari GAS HTML Service.
2. Setelah aplikasi terbuka, data referensi seperti pekerja, line, shift, tandon, dan target dapat dibaca dari cache IndexedDB.
3. Jika koneksi gagal saat input atau submit, payload disimpan di IndexedDB.
4. UI menampilkan status pending.
5. Sync worker mencoba ulang saat koneksi membaik.
6. Payload offline memakai `sync_type=OFFLINE_QUEUE`.
7. Backend tetap memakai `transaction_id` yang sama untuk mencegah duplikasi.

Catatan arsitektur:
- OPTIFLOW tidak memakai klaim Offline-First penuh karena GAS HTML Service berjalan di sandbox iframe `script.googleusercontent.com`.
- Service Worker/PWA tidak menjadi mekanisme utama karena tidak didukung secara native di GAS.
- IndexedDB dipakai untuk toleransi koneksi dan pengurangan panggilan `google.script.run`, bukan untuk menggantikan backend sebagai sumber kebenaran.

## 5. Alur Reaktivitas Presisi

Komponen UI tidak boleh membaca atau menulis langsung ke IndexedDB. UI hanya berkomunikasi dengan Global State/composables. Global State menjadi penghubung tunggal antara UI, IndexedDB, dan API GAS.

Fase read:
1. Saat browser dimuat, Global State membaca snapshot draft dan queue terakhir dari IndexedDB secara asinkron.
2. Setelah data masuk ke variabel reactive, UI merender nilai target, OK, reject, status sync, dan draft secara instan.
3. Jika IndexedDB gagal dibaca, UI tetap terbuka dengan state kosong dan menampilkan error aman.
4. Implementasi Global State untuk operator berada di composable `useOperatorReportStore`; IndexedDB hanya disentuh melalui `indexedDbPersistence`.

Fase write:
1. Saat operator mengetik, variabel Global State langsung berubah agar UI tetap responsif.
2. Global State menjalankan persist async di background untuk menyimpan draft terbaru ke IndexedDB.
3. Persist background tidak boleh memblokir input operator.
4. Jika persist gagal, Global State menandai status draft sebagai `FAILED` dan memberi opsi retry.
5. Submit form menyimpan payload ke queue lokal `PENDING_SYNC`; sync queue mengirim payload ke GAS melalui Global State tanpa akses IndexedDB langsung dari komponen UI.

Fase sync:
1. Saat device online, Global State membungkus data menjadi JSON payload sesuai `DATA_SCHEMA.md`.
2. Payload dikirim ke GAS melalui `apiAdapter.js`.
3. Status item berubah dari `PENDING_SYNC` menjadi `SYNCING`.
4. Jika GAS mengembalikan status `ACCEPTED` atau response duplicate idempotent, Global State menghapus item dari queue IndexedDB.
5. Jika GAS mengembalikan `CONFLICT_PENDING`, item tetap berada di IndexedDB dengan status `CONFLICT_PENDING` dan referensi `quarantine_id`.
6. Jika GAS mengembalikan error transport/server, item tetap berada di IndexedDB dengan status `FAILED` untuk retry berikutnya.

Kontrak adapter API:
1. Komponen Vue memanggil composable/service, bukan `google.script.run` langsung.
2. `apiAdapter.js` menjadi satu-satunya wrapper production untuk callable GAS.
3. Adapter mengubah `google.script.run.withSuccessHandler().withFailureHandler()` menjadi Promise dengan timeout.
4. Adapter hanya boleh memanggil nama fungsi GAS yang ada di callable allowlist.
5. Local development memakai `mock_gas.js` dengan bentuk response yang sama seperti GAS agar UI bisa diuji tanpa deploy.
6. Mock wajib bisa mensimulasikan latency dan failure agar state loading/error/retry tidak hanya diuji secara optimistis.

## 6. Alur Quarantine

Data masuk quarantine jika memenuhi indikasi:
- Nilai numerik negatif.
- Field wajib kosong.
- Total produksi tidak masuk akal.
- Duplikasi mencurigakan.
- Mesin solder sama, operator berbeda, dan selisih `device_timestamp` berdekatan dalam conflict time window.
- Timestamp perangkat terlalu jauh dari waktu server.
- Submit masuk ke line/shift/tanggal yang sudah closing.
- Reject lebih dari 0 tanpa kategori defect.
- Reject memakai kategori defect tidak aktif atau tidak dikenal.
- Rule validasi bisnis baru yang disetujui dalam dokumen kontrak.

Mandor/Supervisor dapat:
- Approve: data dianggap sah untuk rekap.
- Reject: data ditolak dan tidak masuk rekap.
- Request correction: operator diminta memperbaiki input.
- Reject both: untuk konflik dua transaksi, Mandor dapat membatalkan kedua data jika keduanya tidak valid.

Semua keputusan wajib dicatat ke `AUDIT_LOGS`.

Status koreksi:
1. `PENDING`: data menunggu review umum.
2. `CONFLICT_PENDING`: data konflik menunggu resolusi visual Mandor.
3. `CORRECTION_REQUESTED`: Mandor meminta operator memperbaiki input.
4. `RESUBMITTED`: operator mengirim ulang koreksi.
5. `APPROVED` atau `REJECTED`: keputusan final untuk recap.

Prinsip Human-in-the-Loop:
- Data OK dan Reject dari IndexedDB operator tidak boleh langsung menimpa rekap utama.
- Sinkronisasi otomatis menempatkan data pada status yang sesuai hasil validasi.
- Data `CONFLICT_PENDING` diisolasi dan dilarang masuk kalkulasi dashboard manajemen.
- Data konflik memicu notifikasi peringatan di antarmuka Vue 3 milik Mandor.
- Mandor memegang otorisasi untuk memilih data yang di-approve atau membatalkan data konflik melalui reject.
- Data konflik, anomali, atau data yang terkena rule review hanya masuk rekap setelah Mandor/Supervisor menekan approve.

Kontrak approval inbox Mandor:
1. Inbox memprioritaskan `CONFLICT_PENDING` di urutan paling atas.
2. Mandor dapat memfilter kasus berdasarkan status dan line tanpa kehilangan konteks detail aktif.
3. Detail konflik wajib menampilkan perbandingan data current vs conflict-with: operator termasking, machine, OK, reject, defect, dan waktu perangkat.
4. Tombol keputusan UI minimal mencakup `Approve current`, `Reject both`, dan `Request correction`.
5. Jika endpoint approval backend gagal atau belum tersedia pada environment lokal, aksi UI hanya boleh distage di state frontend dan tidak boleh mengubah `MASTER_RECAP`.

Backend quarantine routing:
1. Endpoint submit produksi membentuk record `RAW_LOGS` terlebih dahulu tanpa menulis ke sheet.
2. Modul quarantine backend mengevaluasi record tersebut terhadap `RAW_LOGS` existing.
3. Jika rule mesin/operator/waktu aktif, record ditulis append-only ke `RAW_LOGS` dengan status `CONFLICT_PENDING`.
4. Modul quarantine membuat baris `QUARANTINE` dengan `reason_code=MACHINE_OPERATOR_TIME_COLLISION`, payload pembanding yang dimasking, dan status `CONFLICT_PENDING`.
5. Event routing dicatat ke `AUDIT_LOGS` sebelum response dikembalikan ke frontend.
- Proses approve menjadi bagian dari standardisasi QCC Step 7.

## 7. Daily Closing Dan Adjustment

1. Mandor memeriksa submit harian, sync pending, dan quarantine.
2. Jika data line/shift sudah lengkap, Mandor menjalankan closing.
3. Status closing disimpan di `DAILY_CLOSING`.
4. Setelah closing, transaksi baru untuk tanggal/line/shift tersebut ditolak atau diarahkan ke adjustment sesuai permission.
5. Koreksi setelah closing dicatat di `ADJUSTMENT_LOGS`.
6. Adjustment hanya mempengaruhi rekap setelah disetujui dan diaudit.
7. Reopen closing hanya boleh dilakukan role berizin dan harus menambah event baru, bukan menghapus closing lama.
8. Adjustment dibuat sebagai `PENDING`, lalu menjadi `APPROVED` atau `REJECTED` melalui aksi terpisah.

## 8. Alur Rekap

1. Time-driven trigger GAS berjalan berkala.
2. Backend membaca transaksi valid dari `RAW_LOGS`, keputusan final dari `QUARANTINE`, dan adjustment approved dari `ADJUSTMENT_LOGS`.
3. Rekap dihitung berdasarkan tanggal pabrik `Asia/Jakarta`.
4. Rekap dipisahkan per line, shift, operator, machine, dan kategori defect.
5. Metadata `qcc_factor` dan `severity` dari `DEFECT_CATEGORIES` dipakai sebagai dasar Pareto defect dan prioritas improvement.
6. Hasil ditulis ke `MASTER_RECAP`.
7. Dashboard membaca `MASTER_RECAP`, bukan seluruh data mentah.
8. Batch recap harus idempotent: menjalankan ulang scope yang sama tidak boleh menggandakan baris `MASTER_RECAP`.

## 9. Dashboard Dan Monitoring

- Dashboard operasional menampilkan target, OK, reject, defect rate, pending sync, quarantine pending, dan status closing.
- Dashboard improvement menampilkan Pareto defect, before-after QCC, paper saving, time saving, dan Target vs Actual.
- Snapshot operator dipakai untuk melihat status submit dan pencapaian harian, bukan sebagai satu-satunya dasar penilaian kinerja personal.
- Supervisor control center memakai filter dan pagination backend untuk `RAW_LOGS`, `QUARANTINE`, `DAILY_CLOSING`, dan `ADJUSTMENT_LOGS`.
- Management dashboard bersifat read-only dan hanya membaca `MASTER_RECAP` plus ringkasan status pending, bukan seluruh transaksi mentah.

## 10. Pilot Rollout

- Rollout dimulai dari 1 line, 1 shift, dan 1 Mandor.
- Periode pilot disarankan 1-2 minggu.
- Metrik pilot: waktu submit, waktu review quarantine, waktu recap, duplicate rate, sync failure rate, dan jumlah correction request.
- Hasil pilot menjadi dasar update SOP sebelum rollout ke 100+ operator.

## 11. Aturan Integritas Bisnis

- `target_harian`, `tandon`, `perolehan_ok`, dan `perolehan_reject` harus integer non-negatif.
- `transaction_id` wajib unik.
- Koreksi data tidak boleh menghapus transaksi asal.
- Setiap perubahan keputusan harus punya audit trail.
- Role menentukan data dan aksi yang boleh diakses.
- Data setelah closing tidak boleh diubah langsung.
- Reject wajib punya kategori defect jika `perolehan_reject > 0`.
- Kategori defect untuk reject wajib aktif di `DEFECT_CATEGORIES`.
- Kombinasi `operator_email + factory_date + line_id + shift_id + machine_id` dipakai sebagai sinyal duplicate detection tambahan.
- Kombinasi `machine_id` sama, `operator_email` berbeda, dan `device_timestamp` berdekatan wajib menghasilkan `CONFLICT_PENDING`.
- Data `CONFLICT_PENDING` tidak boleh masuk `MASTER_RECAP` atau dashboard manajemen sebelum approval.

## 12. Kontrak Session Context Dan Auth Mode

Backend mengirim session context melalui `getSessionContext(request)`.

Mode `AUTH_MODE=ON`:
- Backend memakai `Session.getActiveUser().getEmail()`.
- Email wajib ditemukan di `USER_ROLES`.
- `status_aktif` wajib `TRUE`.
- `is_deleted` wajib bukan `TRUE`.
- Request simulasi role dari frontend wajib diabaikan.
- User tidak terdaftar atau nonaktif wajib ditolak dengan safe structured error.

Mode `AUTH_MODE=OFF`:
- Dipakai hanya untuk development/testing.
- Backend tidak memakai email aktif sebagai sumber kebenaran role.
- Jika frontend belum memilih role simulasi, response mengembalikan `requires_role_selection=TRUE` dan daftar role yang boleh disimulasikan.
- Jika frontend mengirim `simulated_role`, backend wajib memvalidasi role terhadap allowlist.
- Role simulasi tidak boleh ditulis ke `USER_ROLES`.

Session context yang dikirim ke frontend tidak boleh memuat PII mentah atau secret. Minimal field yang boleh dikirim:
- `auth_mode`
- `email` yang dimasking jika perlu
- `role`
- `user_id`
- `is_simulated`
- `requires_role_selection`
- `allowed_simulated_roles` hanya ketika `AUTH_MODE=OFF`

Setiap session success/failure wajib dicatat ke `AUDIT_LOGS` dengan metadata yang aman.

## 13. Alur Hidden Maintenance Console SuperAdmin

Hidden maintenance console hanya dipakai untuk troubleshooting konfigurasi production/development oleh `SuperAdmin`.

Aturan akses:
1. UI console disembunyikan dari navigasi normal dan hanya muncul lewat hidden trigger yang disepakati.
2. Console tetap wajib memanggil backend; UI tidak boleh menyimpan, membaca, atau menebak nilai Script Properties.
3. Backend memvalidasi session dan permission `script_property` sebelum membaca status, update, delete, atau rotate.
4. `SuperAdmin` tetap membutuhkan permission eksplisit di `ROLE_PERMISSIONS`; tidak ada bypass role.
5. Secret seperti `ENCRYPTION_SALT` hanya tampil sebagai status `SET` atau `NOT_SET`, bukan nilai mentah.
6. Update `AUTH_MODE` harus terbatas ke `ON` atau `OFF`.
7. Update `APP_ACTIVE_UNTIL` harus memakai format `YYYY-MM-DD`; tanggal berlaku inclusive berdasarkan timezone `Asia/Jakarta`.
8. Delete hanya boleh untuk key konfigurasi yang aman dihapus berdasarkan `DATA_SCHEMA.md`; `AUTH_MODE` dan secret tidak boleh dihapus.
9. Rotate secret hanya boleh untuk key yang rotatable dan harus mengembalikan status-only.
10. Semua aksi maintenance wajib dicatat ke `AUDIT_LOGS` dengan metadata tanpa secret.

Alur operasional:
1. SuperAdmin membuka hidden console.
2. Frontend meminta status allowlisted Script Properties melalui `apiAdapter.js`.
3. Backend mengirim status aman dan masked preview untuk config non-secret.
4. SuperAdmin memilih update, delete, atau rotate.
5. Frontend menampilkan confirmation dialog untuk aksi destruktif atau sensitif.
6. Backend menjalankan validasi, RBAC, mutation, audit, lalu mengembalikan response terstruktur.
7. Frontend refresh status setelah success dan menampilkan error aman jika gagal.

Alur expiry aplikasi:
1. Saat web app dibuka, `doGet()` membaca `APP_ACTIVE_UNTIL`.
2. Jika properti kosong, aplikasi dianggap aktif tanpa tanggal akhir.
3. Jika tanggal hari ini di `Asia/Jakarta` masih sama atau sebelum `APP_ACTIVE_UNTIL`, `Index.html` dirender normal.
4. Jika tanggal sudah lewat atau format property tidak valid, `doGet()` menampilkan halaman `Akses ditolak`.
5. Halaman penolakan tidak boleh memuat data produksi, session context, Script Properties mentah, atau secret.

## 14. Kontrak ROLE_PERMISSIONS

`ROLE_PERMISSIONS` adalah sumber kebenaran untuk authorization action-level. Role saja tidak cukup untuk menjalankan endpoint yang mengubah atau membaca data operasional.

Aturan:
- Setiap endpoint backend wajib memanggil permission enforcement sebelum business logic berjalan.
- Permission dihitung dari kombinasi `role + resource + action`.
- Jika tidak ada baris `ROLE_PERMISSIONS` dengan `is_allowed=TRUE`, akses wajib ditolak.
- `SuperAdmin` tidak mendapat bypass otomatis; tetap membutuhkan permission eksplisit agar matrix tetap bisa diaudit.
- Request dengan resource/action tidak dikenal wajib ditolak.
- Denial wajib dicatat ke `AUDIT_LOGS` sebagai `RBAC_DENIED`.
- Allow yang berhasil untuk action sensitif boleh dicatat sebagai `RBAC_ALLOWED` jika diperlukan audit.

Baseline resource/action:

| Resource | Actions |
| :--- | :--- |
| `schema` | `bootstrap`, `read_health` |
| `session` | `read` |
| `production_report` | `create`, `read` |
| `quarantine` | `read`, `approve`, `reject`, `request_correction` |
| `daily_closing` | `create`, `read`, `reopen` |
| `adjustment` | `create`, `read`, `approve`, `reject` |
| `dashboard` | `read` |
| `user_role` | `create`, `read`, `update`, `soft_delete` |
| `script_property` | `read_status`, `update`, `delete`, `rotate_secret` |

## 15. Standardisasi QCC

Hasil implementasi yang terbukti efektif harus dikunci melalui:
- SOP atau Instruksi Kerja pelaporan produksi digital.
- Visual management untuk operator dan mandor.
- Poka-Yoke IT seperti validasi angka, idempotency, role control, dan audit trail.
- Review berkala menggunakan data `MASTER_RECAP`.
