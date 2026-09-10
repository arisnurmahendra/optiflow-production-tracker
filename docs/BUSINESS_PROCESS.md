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

Status implementasi 2026-09-09:
- Alur operator sampai queue, sync, append-only submit, duplicate handling, conflict routing, dan Pareto-ready defect capture sudah tersedia.
- Mandor approval inbox sudah terhubung ke backend approval mutation dengan fallback staged lokal saat environment deploy belum memuat endpoint terbaru.
- Daily closing, adjustment, batch recap, supervisor control center, management dashboard read-only, ChartJS Operator dashboard, Help/Cara penggunaan per role, spreadsheet-backed defect CRUD/seed, dan HRD read-only access dashboard sudah tersedia untuk scope runtime lokal.
- Native GAS test runner, checklist deployment, checklist hardening, pilot plan, dan template paket QCC sudah tersedia sebagai artefak M6/M7.

## 2. Role Dan Hak Akses

| Role | Hak akses utama |
| :--- | :--- |
| `Operator` | Submit laporan produksi miliknya sendiri, membaca target aktif, dan melihat status sync. |
| `Mandor` | Melihat antrian konflik, approve/reject/request correction, closing harian, membaca rekap lini, dan mengatur target harian dalam scope line/shift yang menjadi tanggung jawabnya. |
| `Management` | Membaca dashboard, target, dan rekap tanpa edit. |
| `HRD` | Membaca kesiapan akses user, role, dan audit secara privacy-first; pengelolaan detail PII penuh menunggu workflow terpisah yang disahkan kontrak. |
| `SuperAdmin` | Mengelola konfigurasi, role, target lintas scope, dan troubleshooting tingkat lanjut. |

## 3. Alur Submit Produksi

1. Operator membuka aplikasi.
2. Backend mengirim session context sesuai `AUTH_MODE`.
3. Operator memilih line, shift, machine ID, operator demo, tandon, OK, dan reject. Target harian dibaca otomatis dari `TARGET_MASTER`; field target manual hanya menjadi fallback warning jika target aktif belum ditemukan.
   Dalam mode development/demo, pilihan line, shift, mesin, dan operator wajib berasal dari dataset referensi backend/mock yang meniru struktur spreadsheet.
4. Frontend menjalankan validasi Zod.
5. Jika reject lebih dari 0, operator wajib memilih kategori defect.
6. Kategori defect berasal dari sheet `DEFECT_CATEGORIES` melalui backend GAS, dengan fallback cache/default hanya untuk development/offline.
7. Kategori defect membawa `qcc_factor` dan `severity` agar reject langsung siap untuk Pareto awal dan analisis QCC.
8. Frontend menyimpan draft otomatis di IndexedDB sebelum submit.
9. Frontend membuat `transaction_id` UUID dan `device_timestamp` UTC.
10. Submit dikirim melalui `apiAdapter.js`.
10. Backend melakukan validasi server.
11. Jika valid dan tidak anomali, data ditulis ke `RAW_LOGS` dengan status `ACCEPTED`.
12. Jika duplikat, backend mengembalikan status idempotent tanpa menulis ulang.
13. Jika backend mendeteksi konflik mesin sama, operator berbeda, dan waktu berdekatan, data ditulis dengan status `CONFLICT_PENDING` dan masuk `QUARANTINE`.
14. Jika anomali lain muncul, data dicatat ke `RAW_LOGS` dan/atau `QUARANTINE` sesuai rule.

Tahap `OPT-010` hanya menstandardisasi form operator, validasi Zod, pembuatan payload, dan staging submit di UI. Persistensi IndexedDB penuh berada di `OPT-011`, endpoint GAS append-only berada di `OPT-012`, dan retry sync queue berada di `OPT-013`.

## 4. Alur Offline

1. Operator membuka aplikasi saat masih memiliki koneksi internet untuk memuat `Index.html` dari GAS HTML Service.
2. Setelah aplikasi terbuka, data referensi seperti pekerja, line, shift, mesin, dan target dapat dibaca dari cache IndexedDB atau response GAS/mock GAS.
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

## 9A. Kontrak Workspace Per Role

UI production tidak boleh menumpuk semua fitur dalam satu halaman per role. Setiap role wajib memakai pola `Overview -> Work Queue -> Detail/Action` agar user melihat pekerjaan yang relevan dengan proses bisnisnya.

- `Operator`: fokus pada input produksi cepat, draft lokal, status sync, dan submit terakhir. Operator tidak boleh melihat approval, management recap, atau maintenance backend.
- Navigasi utama menampilkan menu fitur untuk workspace yang sedang aktif, bukan daftar role. Pemilihan workspace dilakukan melalui trigger/dropdown di area nav.
- Semua workspace default ke menu `Dashboard` saat pertama dipilih.
- Untuk `Operator`, navigasi fitur berisi `Dashboard`, `Input`, `Riwayat`, `Defect`, `Status`, dan `Help`.
- Semua role wajib memiliki menu `Help` yang menjelaskan cara penggunaan aplikasi, urutan proses bisnis role aktif, dan troubleshooting operasional. Help harus mengikuti workspace aktif dan tidak boleh bercampur dengan panel kerja utama ketika sedang dibuka, kecuali konteks shift Operator yang memang wajib selalu tampil.
- Dashboard Operator menampilkan statistik performa pekerjaan hari ini vs kemarin untuk `Target`, `Tandon`, `OK`, dan `Reject`, komposisi ChartJS doughnut `OK vs Reject` untuk `Hari ini` dan `Kemarin`, serta ChartJS trend detail `Target`, `Realisasi`, `OK`, dan `Reject` dengan pilihan `Daily`, `Weekly`, dan `Monthly`. Angka tengah doughnut berarti capaian `Realisasi / Target`; `Realisasi` pada chart berarti `OK + Reject`; `Tandon` tidak dihitung dalam chart, tetapi tetap ditampilkan sebagai informasi cadangan. Default periode adalah `Daily` dengan 7 hari terakhir. Di development lokal, data ini boleh berasal dari `mock_gas.js` selama response meniru kontrak callable `getOperatorDashboard`.
- Riwayat Operator menampilkan `recent_submissions` dari response `getOperatorDashboard` ditambah antrean lokal IndexedDB bila ada, sehingga user dapat melihat contoh data lengkap tanpa upload ke GAS.
- Status Operator menampilkan status draft, queue, sync lokal, dan ringkasan mock/backend tanpa membuka approval atau data manajemen.
- Header shift aktif Operator berisi line, shift, mesin, dan operator; header ini wajib tampil di semua menu fitur Operator.
- Penyebutan `shift` harus seragam di UI, dokumen, payload, dan sheet. Opsi shift wajib diambil dari `SHIFT_MASTER` melalui backend ketika tersedia; opsi lokal hanya boleh menjadi fallback development/offline.
- Menu `Defect` menjadi permukaan khusus untuk kategori reject, QCC factor, severity, dan Pareto mini agar informasi cacat tidak bercampur dengan form input.
- `Mandor`: fokus pada pending approval, conflict queue, dan daily closing. Default Mandor harus menonjolkan item yang membutuhkan keputusan Human-in-the-Loop.
- `Supervisor`: fokus pada alert-first control center: conflict, closing terbuka, raw log anomali, dan adjustment. Data berat tetap lazy-load saat view dibuka.
- `Management`: fokus pada read-only insight dari `MASTER_RECAP`, Pareto defect, trend/KPI, dan export/report. Tidak boleh ada aksi mutasi produksi.
- `HRD`: fokus pada user access readiness, role audit, dan PII masking. HRD tidak boleh membuka secret atau Script Properties dari workspace normal.
- HRD tahap MVP bersifat read-only untuk akses user: melihat user aktif/nonaktif, role distribution, permission readiness, dan ringkasan audit akses. HRD tidak boleh menerima email mentah, nama/alamat/telepon terenkripsi, blind index, profile base64, metadata audit mentah, secret, atau Script Properties dari workspace normal.
- Seed dummy HRD/admin boleh mengisi `USER_ROLES` dengan email, username, role, status, placeholder terenkripsi untuk nama/alamat/telepon, blind index, dan `profile_base64`. Data ini hanya untuk development/staging saat `AUTH_MODE=OFF`; production wajib memakai data HRD resmi dan enkripsi backend.
- `SuperAdmin`: tetap memakai hidden maintenance console terpisah dari 5 menu utama.

## 10. Pilot Rollout

- Rollout dimulai dari 1 line, 1 shift, dan 1 Mandor.
- Periode pilot disarankan 1-2 minggu.
- Metrik pilot: waktu submit, waktu review quarantine, waktu recap, duplicate rate, sync failure rate, dan jumlah correction request.
- Hasil pilot menjadi dasar update SOP sebelum rollout ke 100+ operator.

## 11. Aturan Integritas Bisnis

- `target_harian`, `tandon`, `perolehan_ok`, dan `perolehan_reject` harus integer non-negatif.
- Target hanya dibandingkan dengan `perolehan_ok + perolehan_reject`. Reject tetap dihitung sebagai realisasi produksi, sedangkan `tandon` adalah konteks buffer/sisa dan tidak boleh mengubah status capaian target.
- `transaction_id` wajib unik.
- Koreksi data tidak boleh menghapus transaksi asal.
- Setiap perubahan keputusan harus punya audit trail.
- Role menentukan data dan aksi yang boleh diakses.
- Data setelah closing tidak boleh diubah langsung.
- Target harian bukan angka bebas operator. Operator hanya membaca target aktif; penggantian target dilakukan oleh Mandor atau role di atasnya sesuai permission dan scope.
- Penggantian target harus memilih scope eksplisit: semua operator dalam line/shift/mesin, satu operator tertentu, satu line/shift, atau satu machine scope.
- Bulk update target semua operator tidak boleh memakai asumsi implisit; UI/backend wajib menampilkan dan memvalidasi scope sebelum perubahan disimpan.
- Update target untuk satu operator tidak boleh mengubah target operator lain.
- Perubahan target setelah submit tidak boleh menimpa `RAW_LOGS.target_harian` historis karena kolom tersebut adalah snapshot target saat transaksi dibuat.
- Reject wajib punya kategori defect jika `perolehan_reject > 0`.
- Kategori defect untuk reject wajib aktif di `DEFECT_CATEGORIES`.
- Tambah/ubah/nonaktif kategori defect dilakukan di master spreadsheet atau endpoint SuperAdmin/Mandor, harus tervalidasi, audit-log, dan tidak mengubah transaksi historis.
- Pembagian otoritas master defect:
  - Operator hanya melihat/memakai kategori defect aktif. Jika menemukan defect baru, proses production-ready adalah mengusulkan ke Mandor/Supervisor, bukan menulis langsung ke master.
  - Mandor boleh mengelola kategori defect operasional (`create`, `update`, `soft_delete`) karena bertanggung jawab pada validasi lapangan dan closing harian.
  - Supervisor, bila dibuat sebagai role resmi backend, boleh mengelola kategori defect lintas line dengan hak setara Mandor kecuali `seed`.
  - Management tetap read-only agar KPI, Pareto, dan laporan improvement tidak bisa dipengaruhi oleh perubahan reference data dari pihak pembaca laporan.
  - SuperAdmin memegang `seed` dan administrasi sistem karena seed adalah bootstrap/configuration action.
- Kombinasi `operator_email + factory_date + line_id + shift_id + machine_id` dipakai sebagai sinyal duplicate detection tambahan.
- Kombinasi `machine_id` sama, `operator_email` berbeda, dan `device_timestamp` berdekatan wajib menghasilkan `CONFLICT_PENDING`.
- Data `CONFLICT_PENDING` tidak boleh masuk `MASTER_RECAP` atau dashboard manajemen sebelum approval.

Kontrak target harian:
1. `Operator` membaca target aktif dan memakai fallback input manual hanya jika master target belum tersedia.
2. `Mandor` boleh membuat/mengubah target untuk scope line/shift/mesin yang menjadi tanggung jawabnya.
3. `Supervisor` boleh mengatur target lintas line/shift sesuai permission resmi.
4. `Management` default read-only agar KPI tidak dipengaruhi oleh pihak pembaca laporan, kecuali perusahaan memberi permission planning eksplisit.
5. `SuperAdmin` boleh mengatur target lintas scope untuk bootstrap, koreksi administratif, atau troubleshooting.
6. Jika beberapa target cocok, prioritas resolusi wajib dari paling spesifik: `OPERATOR_ONLY`, `MACHINE_SCOPE`, `LINE_SHIFT`, lalu `ALL_USERS`.
7. Setiap perubahan target wajib diaudit dengan pembuat/pengubah, waktu, nilai lama/baru, dan scope.

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
- Frontend boleh menyediakan `Try Role` pada pengaturan user untuk memilih role simulasi tanpa berganti email. Pilihan ini hanya boleh dipakai sebagai payload `simulated_role` ketika `AUTH_MODE=OFF`.

Session context yang dikirim ke frontend tidak boleh memuat PII mentah atau secret. Minimal field yang boleh dikirim:
- `auth_mode`
- `email` yang dimasking jika perlu
- `role`
- `user_id`
- `is_simulated`
- `requires_role_selection`
- `allowed_simulated_roles` hanya ketika `AUTH_MODE=OFF`

Setiap session success/failure wajib dicatat ke `AUDIT_LOGS` dengan metadata yang aman.

Alur pengaturan user:
1. User membuka view Pengaturan.
2. Frontend memanggil `getSessionContext` melalui `apiAdapter.js`.
3. Jika `AUTH_MODE=OFF`, user boleh memilih role dari allowlist `Operator`, `Mandor`, `Management`, `HRD`, atau `SuperAdmin`.
4. Role button boleh multi-select untuk menentukan workflow menu yang dirender pada app shell.
5. Satu role terpilih tetap menjadi `selectedRole` untuk payload session saat ini.
6. Role pilihan dan visible-role preference boleh disimpan lokal sebagai preferensi demo/trial, tetapi tidak boleh ditulis ke Sheet atau Script Properties.
7. Semua aksi frontend berikutnya mengirim `session.simulated_role` sesuai `selectedRole`.
8. Jika role aktif adalah `SuperAdmin`, Pengaturan sesi boleh menyediakan card maintenance untuk membuka console Script Properties allowlisted, melihat pengingat bootstrap/diagnostics, melihat snapshot data lokal, mengosongkan draft/queue IndexedDB, reset/delete database IndexedDB, reload aplikasi, dan menjalankan reset semua data lokal termasuk preferensi Try Role pada browser/device tersebut.
9. Local-device maintenance SuperAdmin tidak boleh mengubah data Google Sheets, Script Properties, audit backend, atau master data. Viewer localStorage hanya boleh membuka key namespace aplikasi `optiflow.*`.
10. Jika `AUTH_MODE=ON`, backend mengabaikan simulated role dan tetap memakai email Google aktif.

## 13. Alur Hidden Maintenance Console SuperAdmin

Hidden maintenance console hanya dipakai untuk troubleshooting konfigurasi production/development oleh `SuperAdmin`.

Aturan akses:
1. UI console tidak tampil di navigasi operasional normal dan hanya muncul lewat card SuperAdmin di Pengaturan sesi atau hidden trigger yang disepakati.
2. Console tetap wajib memanggil backend; UI tidak boleh menyimpan, membaca, atau menebak nilai Script Properties.
3. Backend memvalidasi session dan permission `script_property` sebelum membaca status, update, delete, atau rotate.
4. `SuperAdmin` tetap membutuhkan permission eksplisit di `ROLE_PERMISSIONS`; tidak ada bypass role.
5. Secret seperti `ENCRYPTION_SALT` hanya tampil sebagai status `SET` atau `NOT_SET`, bukan nilai mentah.
6. Update `AUTH_MODE` harus terbatas ke `ON` atau `OFF`.
7. Update `APP_ACTIVE_UNTIL` harus memakai format `YYYY-MM-DD`; tanggal berlaku inclusive berdasarkan timezone `Asia/Jakarta`.
8. Update `REQUIRE_REGISTERED_EMAIL_LOGIN` harus terbatas ke `TRUE` atau `FALSE`; `FALSE` hanya boleh untuk demo/trial/development terkontrol.
9. Delete hanya boleh untuk key konfigurasi yang aman dihapus berdasarkan `DATA_SCHEMA.md`; `AUTH_MODE` dan secret tidak boleh dihapus.
10. Rotate secret hanya boleh untuk key yang rotatable dan harus mengembalikan status-only.
11. Semua aksi maintenance wajib dicatat ke `AUDIT_LOGS` dengan metadata tanpa secret.

Alur operasional:
1. SuperAdmin membuka maintenance console dari card SuperAdmin di Pengaturan sesi atau hidden trigger emergency.
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

Alur akses user:
1. Setelah expiry gate lolos, `doGet()` mengecek render access.
2. Jika `REQUIRE_REGISTERED_EMAIL_LOGIN=FALSE`, aplikasi boleh render untuk demo/trial tanpa registered-email render gate.
3. Jika `AUTH_MODE=OFF`, aplikasi boleh render dan frontend meminta role simulation.
4. Jika `AUTH_MODE=ON` dan `REQUIRE_REGISTERED_EMAIL_LOGIN` kosong/`TRUE`, email dari `Session.getActiveUser().getEmail()` wajib ditemukan aktif di `USER_ROLES`.
5. Jika email kosong, tidak terdaftar, nonaktif, soft-deleted, atau `AUTH_MODE` invalid, `doGet()` wajib menampilkan halaman `Akses ditolak` tanpa merender `Index.html`.
6. Halaman penolakan hanya boleh menampilkan alasan aman, bukan email mentah, PII, role matrix, atau detail internal.
7. Halaman penolakan boleh menyediakan tombol untuk ganti akun Google, membuka halaman pengelolaan izin Google, dan mencoba reload aplikasi. Apps Script tidak boleh menghapus permission Google secara programatik dari halaman ini.

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
| `audit_log` | `read` |
| `script_property` | `read_status`, `update`, `delete`, `rotate_secret` |
| `test_runner` | `run` |

Catatan bootstrap pertama:
- `bootstrapSheets()` boleh berjalan tanpa session/RBAC hanya ketika sheet foundational `USER_ROLES`, `ROLE_PERMISSIONS`, atau `AUDIT_LOGS` belum ada.
- Tujuannya hanya membuat sheet/header awal agar auth, RBAC, dan audit bisa mulai bekerja.
- Setelah sheet foundational ada, pemanggilan berikutnya wajib memiliki permission `schema:bootstrap`.

## 15. Standardisasi QCC

Hasil implementasi yang terbukti efektif harus dikunci melalui:
- SOP atau Instruksi Kerja pelaporan produksi digital.
- Visual management untuk operator dan mandor.
- Poka-Yoke IT seperti validasi angka, idempotency, role control, dan audit trail.
- Review berkala menggunakan data `MASTER_RECAP`.

## 16. Production Readiness, Pilot, Dan QCC Package

Urutan stabilisasi produksi:
1. `test_runner.gs` dijalankan oleh `SuperAdmin` untuk smoke test schema, RBAC, validasi, idempotency, quarantine, closing, adjustment, recap, access gate, dan Script Properties status tanpa membocorkan secret.
2. Hardening mengikuti `docs/PRODUCTION_HARDENING_CHECKLIST.md` dan baseline `POL.ISMS.001.md` sebelum deploy production.
3. Deployment production mengikuti `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`; push GAS wajib lewat `npm run push:gas`.
4. Pilot memakai `docs/PILOT_ROLLOUT_PLAN.md` untuk 1 line, 1 shift, dan 1 Mandor sebelum rollout lebih luas.
5. Paket laporan QCC memakai `docs/QCC_REPORT_PACKAGE.md`; hasil pilot menjadi sumber aktual Step 5 dan Step 6.

## 17. Spreadsheet Admin Toolbar

Spreadsheet-bound Apps Script boleh menambahkan menu toolbar `⚙️ OPTIFLOW Admin` untuk setup dan smoke check awal.

Menu yang tersedia:
- `🏗️ Bootstrap Sheets`: membuat sheet/header default secara non-destruktif, menambahkan kolom schema baru yang hilang di ujung header, dan boleh otomatis mengisi dummy master data saat sheet master masih kosong serta `AUTH_MODE` bukan `ON`.
- `🔐 Set Default Script Properties`: mengisi property yang masih kosong saja, termasuk `AUTH_MODE=OFF`, `REQUIRE_REGISTERED_EMAIL_LOGIN=FALSE` untuk setup demo/trial, `SPREADSHEET_ID` dari active spreadsheet, `APP_ACTIVE_UNTIL`, dan `ENCRYPTION_SALT`.
- `🧪 Seed Dummy Master Data (Dev Only)`: membuat master role, permission, line, shift, dan user dummy lintas role hanya ketika `AUTH_MODE` bukan `ON`; seed `USER_ROLES` mencakup username, placeholder nama/alamat/telepon terenkripsi, blind index, status aktif/nonaktif, dan profile base64.
- Dummy master data tidak boleh dibuat otomatis ketika `AUTH_MODE=ON`. Production wajib memakai data master resmi dari HRD/admin, bukan seed development.
- `✅ Run GAS Smoke Test`: menjalankan native test runner dan menampilkan ringkasan aman.
- `📋 Show Schema Health`: menampilkan status health schema.
- `🔗 Open Project Links`: membuka dialog berisi link allowlisted ke Apps Script editor, web app dev, web app production, dan folder Drive proyek.

Aturan:
- Menu toolbar tidak boleh menghapus data produksi.
- Default Script Properties tidak boleh menimpa nilai yang sudah ada.
- Dummy data wajib ditolak jika `AUTH_MODE=ON`.
- Secret tidak boleh ditampilkan di alert, log, atau response menu.
- Link eksternal toolbar wajib hardcoded/allowlisted di source dan ditampilkan sebagai tautan eksplisit; jangan membaca URL dari input user atau Script Properties.
