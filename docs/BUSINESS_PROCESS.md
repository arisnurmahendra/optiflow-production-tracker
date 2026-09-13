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

## 1A. Informasi Proses Bisnis Baru - Pending Rebaseline

Informasi lapangan terbaru menunjukkan kontrak lama berbasis `line`, `machine`, dan input mandiri Operator belum sepenuhnya sesuai dengan proses berjalan. Sampai rebaseline selesai, perubahan kode baru harus ditahan atau dibatasi ke dokumentasi/issue planning.

Fakta baru:
- Struktur laporan harian sementara lebih tepat disebut `Bagian`; `Solder` dan `Lem` hanya sebagian contoh dari proses produksi yang lebih luas, bukan daftar proses final.
- Mandor menerima hasil dari karyawan/operator dan menetapkan target harian operator.
- Supervisor menjalankan fungsi QC/verifikasi dan menentukan/menilai jumlah pekerjaan sah berupa `OK + Reject`.
- Laporan harian Bagian memuat jumlah karyawan hadir, jumlah hasil kerja, jumlah absen, statistik, serta pengesahan `Petugas Pencatat` yaitu Mandor dan `Verifikator` yaitu Supervisor.
- Karyawan memiliki nomor karyawan, nama, status aktif/resign, dan dapat diperluas dengan alamat, nomor telepon, email, dan data HRD lain.
- Satu email/ID karyawan dapat memiliki lebih dari satu role, misalnya `Management + Supervisor`; sistem tidak boleh lagi mengunci desain ke pola `1 user = 1 role`.
- Absensi harian dibutuhkan untuk status hadir/tidak hadir serta rekap bulanan kehadiran.
- Kolom keterangan dipakai untuk informasi tidak hadir atau catatan harian.
- `Tandon` diperlakukan sebagai angka operasional saja sampai definisi final disahkan; tandon tidak boleh masuk perhitungan target/upah tanpa keputusan bisnis eksplisit.
- Input Bagian Lem tidak selalu satu-ke-satu dengan Solder; satu transaksi Lem dapat menerima bahan dari lebih dari satu operator Solder dan relasi sumber bahan ini perlu dicatat.
- Ada model upah per unit dan target bulanan: Solder/Las `94 rupiah/unit` dengan target sekitar `37.234 unit/bulan`; Lem `83 rupiah/unit` dengan target sekitar `42.169 unit/bulan`; target harian berubah menurut jumlah hari masuk.

Keputusan awal yang disarankan:
- `Management` menetapkan kebijakan target gaji, harga satuan, dan formula target bulanan.
- `HRD` mengelola data karyawan, status aktif/resign, dan rekap absensi/payroll-ready.
- `Mandor` menetapkan target harian operasional per karyawan berdasarkan kebijakan yang berlaku dan mencatat/menerima hasil kerja.
- `Supervisor` memegang fungsi QC: memverifikasi nilai output sah `OK + Reject`, mengesahkan laporan harian Bagian, memonitor kinerja, dan menjadi escalation owner jika target/upah/proses tidak konsisten.
- `SuperAdmin` tetap memiliki akses penuh untuk konfigurasi dan emergency maintenance.

Kontrak awal Management:
- Management bersifat read-only untuk data transaksi harian, tetapi menjadi owner kebijakan `BAGIAN_MASTER`: nama Bagian, status aktif, target gaji bulanan/UMR, harga satuan/upah per item, target unit bulanan, gap unit, dan proyeksi capaian.
- Management boleh CRUD master Bagian dan upah per item melalui workflow khusus yang diaudit. Perubahan ini hanya memengaruhi kebijakan dan opsi baru; transaksi historis tetap append-only dan tidak boleh diubah diam-diam.
- Kondisi UMR bulanan dihitung dari `hasil unit tervalidasi Supervisor x harga satuan`; fungsi QC melekat pada Supervisor, bukan role terpisah.
- Jika proyeksi gaji bulanan di bawah UMR/target gaji, UI Management wajib menampilkan status warning dan gap unit yang perlu dikejar.
- Jika proyeksi gaji bulanan memenuhi atau melebihi UMR/target gaji, UI Management menampilkan status aman/success.
- Jika bagian belum memiliki harga satuan atau target gaji resmi, UI wajib menampilkan status `POLICY_PENDING`, bukan menghitung asumsi diam-diam.

Open decision:
- Apakah HRD hanya membaca kebijakan upah untuk payroll-ready recap atau juga boleh mengusulkan perubahan draft yang tetap disahkan Management.
- Fungsi QC berada pada role `Supervisor`; tidak dibuat role `Quality` atau `QC` terpisah sampai ada keputusan bisnis baru.
- Apakah absensi dicatat oleh Mandor, HRD, atau hasil integrasi dari sistem absensi eksternal.

Kontrak awal absensi:
- Karyawan menekan tombol `Masuk` dan `Keluar` sebagai event absensi harian.
- Mandor melakukan `check` per karyawan atau `check all` untuk konfirmasi kehadiran dalam scope Bagian/tanggal.
- Mandor boleh menetapkan status pengecualian seperti `Izin`, `Sakit`, atau `Alpha` dengan keterangan.
- Rekap harian Bagian menampilkan jumlah hadir, absen, izin, sakit, alpha, hasil kerja, dan statistik produktivitas.
- Rekap bulanan kehadiran harus bisa dibaca HRD/Management sesuai permission dan masking data.

## 2. Role Dan Hak Akses

| Role | Hak akses utama |
| :--- | :--- |
| `Operator` | Submit laporan produksi miliknya sendiri, membaca target aktif, dan melihat status sync. |
| `Mandor` | Review submit normal sebelum closing, menangani konflik, menjalankan `VOID`/`REQUEST_CORRECTION`/`PRE_CLOSING_CORRECTION`, closing harian, membaca rekap lini, mengatur target harian sesuai scope, dan membuat request/draft defect baru. |
| `Supervisor` | Menjalankan fungsi QC/verifikator: memvalidasi nilai sah produksi `OK + Reject`, mengesahkan laporan harian Bagian, mengelola standar defect final, menangani closing/koreksi level area, serta membaca performa tim sesuai scope. |
| `Management` | Membaca KPI eksekutif, produksi, absensi, risiko, Pareto, dan mengelola master kebijakan Bagian/upah sesuai permission. |
| `HRD` | Mengelola registrasi user dan role bersama SuperAdmin, serta membaca kesiapan akses user dan audit secara privacy-first. |
| `SuperAdmin` | Mengelola konfigurasi, role, master operasional, target lintas scope, dan troubleshooting tingkat lanjut. |

## 2A. Proses Pelaporan Perolehan Harian

1. HRD dan SuperAdmin mendaftarkan seluruh user dari Operator sampai Supervisor sesuai kebutuhan akses.
2. Supervisor dan SuperAdmin mengatur master operasional: jenis pekerjaan dan Bagian.
3. Jenis pekerjaan mempengaruhi target, kategori defect yang tersedia, dan field/form Operator bila proses kerja membutuhkan input berbeda.
4. Mandor mengatur target harian operator dalam scope timnya; Supervisor boleh meninjau dan mengoreksi target lintas Bagian sesuai permission resmi.
5. Supervisor dan SuperAdmin menjadi owner utama `DEFECT_CATEGORIES`. Mandor boleh membuat request/draft defect baru dari temuan lapangan, tetapi tidak langsung mengubah master final tanpa approval owner.
6. Operator menginput hasil kerja harian.
7. Submit normal otomatis `ACCEPTED` dan langsung menjadi kandidat rekap harian.
8. Sebelum daily closing, Mandor boleh melakukan review terhadap submit normal dan menjalankan `VOID`, `REQUEST_CORRECTION`, atau `PRE_CLOSING_CORRECTION`. Mandor tidak boleh mengedit angka transaksi asal secara langsung.
9. Setelah daily closing, data terkunci; perubahan setelah closing wajib lewat `ADJUSTMENT_LOGS` append-only.
10. Supervisor memverifikasi hasil harian, mingguan, dan bulanan sebagai fungsi QC/verifikator sebelum data menjadi referensi final.
11. Statistik performa operator mencakup Target vs Realisasi, OK rate, Reject rate, konsistensi harian, jumlah correction/request dari Mandor, dan ranking antar operator.
12. Pareto defect tersedia sesuai filter dan batas akses role.
13. Relasi Mandor-Operator wajib eksplisit: satu Mandor boleh membawahi banyak Operator, tetapi satu line tidak otomatis berarti semua Operator di line tersebut berada di bawah Mandor yang sama.

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
6. State mock GAS development disimpan ke IndexedDB sebagai snapshot demo; seed awal hanya dibuat ketika snapshot kosong agar perubahan target, master, submit, dan status demo tidak reset setelah reload.
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
6. Setelah Mandor menekan `Approve`, `Reject`, atau `Request correction`, kasus wajib keluar dari `Work Queue` aktif. Status `APPROVED` menjadi kandidat rekap bersih, `REJECTED` dikecualikan dari rekap, dan `CORRECTION_REQUESTED` berpindah ke follow-up koreksi sampai operator melakukan resubmit.
7. `Work Queue` Mandor hanya menampilkan status actionable: `PENDING` dan `CONFLICT_PENDING`. Status final atau follow-up tetap tersimpan untuk audit/riwayat, tetapi tidak boleh tetap terlihat sebagai pekerjaan approval aktif.
8. Submit operator berstatus `ACCEPTED` tidak masuk Approval Inbox karena tidak membutuhkan keputusan HITL; data tersebut wajib terlihat di Dashboard Mandor sebagai monitoring submit terbaru atau raw-log scoped view.
9. Dalam mode demo/mock, perpindahan Operator ke Mandor wajib mengambil data dari state mock GAS/IndexedDB yang sama, sehingga hasil retry sync dapat terlihat tanpa upload ke GAS selama filter tanggal, line, dan shift cocok.

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

### 7A. Pre-Closing Review, Void, dan Correction

1. Submit normal Operator masuk `RAW_LOGS` dengan status `ACCEPTED` dan langsung boleh masuk rekap harian sementara.
2. Sebelum `DAILY_CLOSING:CLOSED`, Mandor/Supervisor boleh membuat event review append-only untuk transaksi dalam scope timnya.
3. `VOID` mengeluarkan transaksi dari `MASTER_RECAP` tanpa mengubah baris asal `RAW_LOGS`.
4. `REQUEST_CORRECTION` mengeluarkan transaksi dari perhitungan sementara dan memberi sinyal agar Operator membuat submit koreksi baru.
5. `PRE_CLOSING_CORRECTION` menambah/mengurangi delta OK/Reject sebelum closing dan diterapkan saat recap berikutnya.
6. Setelah closing, jalur pre-closing review ditutup; perubahan berikutnya wajib memakai adjustment pasca-closing.

## 8. Alur Rekap

1. Time-driven trigger GAS berjalan berkala.
2. Backend membaca transaksi valid dari `RAW_LOGS`, keputusan final dari `QUARANTINE`, pre-closing review latest, dan adjustment approved dari `ADJUSTMENT_LOGS`.
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
- Supervisor workspace memakai menu bisnis `Dashboard`, `Verifikasi QC`, `Defect & Pareto`, `Closing & Koreksi`, `Target & Tim`, `Detail Data`, dan `Help`. Sumber teknis seperti `RAW_LOGS`, `QUARANTINE`, `DAILY_CLOSING`, dan `ADJUSTMENT_LOGS` tetap dipakai di backend, tetapi tidak menjadi nama menu utama.
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
- `Mandor`: fokus pada kerja lapangan harian melalui `Dashboard`, `Absensi Tim`, `Target Harian`, `Hasil Operator`, `Approval & Koreksi`, `Closing Harian`, `Defect Request`, dan `Help`.
- `Dashboard` Mandor menampilkan kesiapan tim hari ini: karyawan hadir/belum dikonfirmasi, target yang sudah/belum ditetapkan, output masuk, antrean koreksi, conflict/actionable queue, dan status closing.
- `Absensi Tim` menjadi tempat Mandor melakukan `check`, `check all`, dan menetapkan pengecualian `Izin`, `Sakit`, atau `Alpha` dengan keterangan. Karyawan resign/nonaktif tidak boleh ikut terkonfirmasi otomatis.
- `Target Harian` menjadi tempat Mandor menetapkan target per operator/tim sesuai Bagian, tanggal, dan jenis pekerjaan. Target dapat dibuat untuk satu operator atau semua operator dalam scope, tetapi wajib ada preview dampak multi-user sebelum simpan.
- `Hasil Operator` menampilkan submit normal `ACCEPTED` dan hasil terbaru operator dalam scope Mandor. Tabel wajib menampilkan konteks karyawan, Bagian, waktu, OK, Reject, Tandon, dan status; UUID tidak boleh menjadi satu-satunya informasi.
- `Approval & Koreksi` menggabungkan conflict queue, pending review, `VOID`, `REQUEST_CORRECTION`, dan `PRE_CLOSING_CORRECTION`. Hanya status actionable `PENDING` dan `CONFLICT_PENDING` yang tampil sebagai pekerjaan aktif.
- `Closing Harian` dipakai untuk memeriksa kelengkapan absensi, target, output, correction queue, dan verifikasi sebelum laporan harian dikunci atau dikirim ke Supervisor.
- `Defect Request` dipakai Mandor untuk mengusulkan kategori defect baru dari temuan lapangan. Request ini tidak langsung menjadi master final sampai disetujui Supervisor atau SuperAdmin.
- `Supervisor`: fokus pada workflow QC/verifikator melalui `Dashboard`, `Verifikasi QC`, `Defect & Pareto`, `Closing & Koreksi`, `Target & Tim`, `Detail Data`, dan `Help`. Alert teknis dirangkum sebagai pekerjaan yang perlu diverifikasi, bukan menu mentah.
- `Dashboard` Supervisor menampilkan ringkasan output tervalidasi, output menunggu verifikasi, closing terbuka, defect dominan, risiko target, dan performa tim.
- `Verifikasi QC` menjadi permukaan utama untuk memvalidasi nilai sah produksi `OK + Reject` per Bagian, karyawan, tanggal, dan transaksi. Aksi verifikasi harus append-only dan tidak menimpa transaksi asal.
- `Defect & Pareto` menjadi tempat Supervisor mengelola kategori defect final, menyetujui/menolak draft defect dari Mandor, melihat Pareto defect, severity, dan `qcc_factor`.
- `Closing & Koreksi` menampung closing harian, void, request correction, pre-closing correction, dan adjustment dengan bahasa proses bisnis.
- `Target & Tim` menampilkan target per operator/tim, kapasitas berbasis absensi, gap target vs realisasi, dan ranking tim sesuai scope Supervisor.
- `Detail Data` menggantikan tampilan `Raw Logs` sebagai drilldown aman untuk investigasi; data teknis berat wajib lazy-load, termasking sesuai permission, dan tidak menjadi layar default.
- `Management`: fokus pada keputusan eksekutif melalui `Dashboard`, `Bagian & Upah`, `Produksi`, `Absensi`, `Risiko & Pareto`, `Risiko & Pending`, dan `Help`. Management tidak boleh melakukan mutasi transaksi produksi; pengecualian yang disahkan adalah CRUD master kebijakan Bagian/upah.
- Menu `Produksi` Management wajib terpisah dari Dashboard agar analisis performa output tidak bercampur dengan ringkasan eksekutif.
- Menu `Risiko & Pending` wajib memakai bahasa bisnis yang menjelaskan hambatan pelaporan terpercaya, bukan hanya status teknis backend.
- `Laporan/Export` masih opsi backlog sampai kebutuhan format laporan, masking, audit, dan permission disahkan.
- `HRD`: fokus pada empat workflow utama: Dashboard tenaga kerja, Karyawan, Absensi, dan Akses & Audit. HRD tidak boleh membuka secret atau Script Properties dari workspace normal.
- Menu HRD lama `Dashboard PII`, `User Masked`, `Roles RBAC`, `Audit Logs`, dan `Privacy Safe` harus digabung menjadi empat menu production-ready: `Dashboard`, `Karyawan`, `Absensi`, dan `Akses & Audit`.
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
- Dashboard Operator wajib memperlakukan target harian sebagai target per operator/scope per hari, bukan target per transaksi. Jika operator melakukan beberapa submit pada hari yang sama, `OK` dan `Reject` dijumlahkan, tetapi `target_harian` hanya dihitung satu kali untuk hari tersebut.
- Progress Realisasi Operator wajib memakai target aktif dari `TARGET_MASTER` yang ditetapkan Mandor/role di atasnya bila tersedia. Snapshot target pada transaksi lama tidak boleh mengalahkan target aktif untuk tampilan progress hari berjalan.
- `transaction_id` wajib unik.
- Koreksi data tidak boleh menghapus transaksi asal.
- Setiap perubahan keputusan harus punya audit trail.
- Role menentukan data dan aksi yang boleh diakses.
- Data setelah closing tidak boleh diubah langsung.
- Sebelum closing, koreksi Mandor terhadap submit Operator wajib memakai event terkontrol `VOID`, `REQUEST_CORRECTION`, atau `PRE_CLOSING_CORRECTION`; angka transaksi asal tidak boleh diedit langsung.
- Submit normal `ACCEPTED` boleh masuk rekap sementara, tetapi masih berada dalam review window sampai daily closing selesai.
- Target harian bukan angka bebas operator. Operator hanya membaca target aktif; penggantian target dilakukan oleh Mandor atau role di atasnya sesuai permission dan scope.
- Penggantian target harus memilih scope eksplisit: semua operator dalam line/shift/mesin, satu operator tertentu, satu line/shift, atau satu machine scope.
- Bulk update target semua operator tidak boleh memakai asumsi implisit; UI/backend wajib menampilkan dan memvalidasi scope sebelum perubahan disimpan.
- Update target untuk satu operator tidak boleh mengubah target operator lain.
- Perubahan target setelah submit tidak boleh menimpa `RAW_LOGS.target_harian` historis karena kolom tersebut adalah snapshot target saat transaksi dibuat.
- Reject wajib punya kategori defect jika `perolehan_reject > 0`.
- Kategori defect untuk reject wajib aktif di `DEFECT_CATEGORIES`.
- Tambah/ubah/nonaktif kategori defect final dilakukan oleh Supervisor atau SuperAdmin, harus tervalidasi, audit-log, dan tidak mengubah transaksi historis.
- Pembagian otoritas master defect:
  - Operator hanya melihat/memakai kategori defect aktif. Jika menemukan defect baru, proses production-ready adalah mengusulkan ke Mandor/Supervisor, bukan menulis langsung ke master.
  - Mandor boleh membuat request/draft defect baru dari temuan lapangan, tetapi tidak boleh langsung mengubah master final.
  - Supervisor boleh mengelola kategori defect lintas line.
  - Supervisor boleh approve/reject dan mengelola kategori defect final agar Pareto dan standar kualitas tetap konsisten.
  - Management tetap read-only agar KPI, Pareto, dan laporan improvement tidak bisa dipengaruhi oleh perubahan reference data dari pihak pembaca laporan.
  - SuperAdmin memegang `seed` dan administrasi sistem karena seed adalah bootstrap/configuration action.
- Statistik performa Operator dibatasi role: Operator hanya melihat performa dirinya sendiri, sedangkan Mandor dan Supervisor boleh melihat ranking tim sesuai scope tanggung jawab.
- Progress header tiap role wajib berbeda sumber data: Operator memakai target dan realisasi personal, Mandor memakai agregasi Operator di bawah tanggung jawabnya, Supervisor memakai agregasi lintas area, dan Management memakai agregat final tanpa PII.
- Target tim Mandor dihitung dari target harian masing-masing Operator dalam scope Mandor, bukan dari satu angka Operator yang sedang aktif di device.
- Pareto defect mengikuti filter user dan batas akses role: Operator hanya data sendiri, Mandor sesuai Bagian/tim, Supervisor untuk verifikasi kualitas dan standar defect lintas area, dan Management hanya agregat tanpa PII.
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
8. Tabel Target Planning Mandor wajib mendukung edit, aktifkan, nonaktifkan, dan hapus sebagai soft delete. Tidak ada hard delete untuk `TARGET_MASTER`.

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
| `production_review` | `read`, `void`, `request_correction`, `pre_closing_correction` |
| `quarantine` | `read`, `approve`, `reject`, `request_correction` |
| `daily_closing` | `create`, `read`, `reopen` |
| `adjustment` | `create`, `read`, `approve`, `reject` |
| `dashboard` | `read` |
| `user_role` | `create`, `read`, `update`, `soft_delete` |
| `work_master` | `read`, `create`, `update`, `soft_delete` |
| `defect_change_request` | `create`, `read`, `approve`, `reject` |
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
