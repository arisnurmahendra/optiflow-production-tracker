# DATA_SCHEMA.md - OPTIFLOW Database & Multi-Sheet Contract

> Architecture: Google Sheets multi-sheet, append-only transaction logs, soft-delete, audit trail, and PII protection.

## 1. Sheet Wajib

OPTIFLOW menggunakan beberapa sheet yang dipisahkan berdasarkan fungsi agar transaksi harian, approval, dan dashboard tidak saling mengganggu.

| Sheet | Fungsi | Aturan |
| :--- | :--- | :--- |
| `USER_ROLES` | Master user, role, status aktif, dan PII terenkripsi | Tidak boleh hard-delete. PII mentah tidak boleh disimpan. |
| `ROLE_PERMISSIONS` | Matrix permission per role | Dipakai backend untuk least privilege. |
| `LINE_MASTER` | Master lini/area produksi legacy | Dipakai sementara untuk kompatibilitas runtime lama; rebaseline baru memakai `BAGIAN_MASTER`. |
| `SHIFT_MASTER` | Master shift dan jam kerja pabrik | Batas waktu memakai timezone `Asia/Jakarta`. |
| `BAGIAN_MASTER` | Master Bagian dan kebijakan upah per item | Sumber opsi Bagian, status aktif, `unit_rate`, target gaji/UMR, dan target unit bulanan. |
| `DEFECT_CATEGORIES` | Master kategori reject/defect | Dipakai untuk Pareto defect dan improvement QCC. |
| `RAW_LOGS` | Landing zone append-only untuk semua transaksi produksi | Tidak boleh memakai formula. Tidak boleh diedit manual untuk koreksi. |
| `QUARANTINE` | Data konflik/anomali yang menunggu keputusan Mandor/Supervisor | Semua keputusan wajib diaudit. |
| `MASTER_RECAP` | Rekap bersih untuk dashboard dan Looker Studio | Dibentuk oleh batch process backend. |
| `DAILY_CLOSING` | Status closing harian per line/shift | Setelah closing, koreksi wajib lewat adjustment. |
| `ADJUSTMENT_LOGS` | Koreksi setelah closing atau koreksi administratif | Append-only dan wajib approval. |
| `AUDIT_LOGS` | Audit trail auth, approval, perubahan konfigurasi, dan error penting | Wajib melakukan masking data sensitif. |

Bootstrap backend wajib membuat sheet wajib jika belum ada dan menulis header dari kontrak ini hanya ketika sheet masih kosong. Health check schema wajib melaporkan sheet hilang, kolom hilang, urutan kolom tidak sesuai, kolom ekstra, dan formula pada `RAW_LOGS`.

Status implementasi 2026-09-05:
- `OptiflowSheets.bootstrap()` membuat sheet/header kontrak, menambahkan kolom schema baru yang hilang di ujung header tanpa menghapus data lama, dan men-seed `DEFECT_CATEGORIES` saat kosong.
- `submitProductionReport` sudah menulis append-only ke `RAW_LOGS`, menolak duplicate `transaction_id`, memvalidasi kategori defect aktif, dan merutekan konflik mesin/operator/waktu ke `QUARANTINE`.
- `DAILY_CLOSING`, `ADJUSTMENT_LOGS`, dan `MASTER_RECAP` sudah memiliki workflow backend M5, termasuk closing/reopen append-only, adjustment approval, dan recap idempotent.
- `ROLE_PERMISSIONS` sudah mencakup resource `test_runner:run` untuk native smoke runner Apps Script dan `audit_log:read` untuk ringkasan audit aman HRD.

## 2. Schema `USER_ROLES`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `user_id` | String UUID | ID unik pengguna. |
| `email` | String | Email Google untuk `Session.getActiveUser().getEmail()`. |
| `role` | Enum | Primary/default role untuk kompatibilitas lama: `Operator`, `Mandor`, `Supervisor`, `Management`, `HRD`, `SuperAdmin`. Fungsi QC berada di `Supervisor`. |
| `nama_lengkap_encrypted` | String | Nama lengkap terenkripsi di backend. |
| `nomor_telepon_encrypted` | String | Nomor telepon terenkripsi di backend. |
| `phone_blind_index` | String | HMAC-SHA256 untuk pencarian nomor telepon. |
| `status_aktif` | Boolean | `TRUE` jika boleh mengakses sistem. |
| `is_deleted` | Boolean | Soft-delete flag. |
| `deleted_at` | String atau kosong | ISO 8601 UTC saat soft-delete. |
| `last_login` | String atau kosong | ISO 8601 UTC login terakhir. |
| `created_at` | String | ISO 8601 UTC saat dibuat. |
| `updated_at` | String | ISO 8601 UTC saat diperbarui. |
| `username` | String | Username internal untuk tampilan/admin lookup; harus unik per user jika diaktifkan. |
| `alamat_encrypted` | String | Alamat pengguna terenkripsi di backend. |
| `profile_base64` | String atau kosong | Avatar/profile image base64 untuk kebutuhan HRD/admin; dianggap data pribadi dan tidak boleh dikirim ke workspace non-HRD. |
| `mandor_email` | String atau kosong | Email Mandor penanggung jawab langsung untuk user Operator; kosong untuk role non-Operator atau jika relasi ditentukan dari master lain. |

Seed dummy development wajib mengisi variasi role minimal `Operator`, `Mandor`, `Supervisor`, `Management`, `HRD`, `SuperAdmin`, dan satu user nonaktif. Field nama, alamat, nomor telepon, dan profile dummy boleh ada untuk validasi UI/HRD, tetapi data production wajib mengikuti aturan enkripsi dan masking di kontrak keamanan.

Relasi Mandor-Operator:
- Satu `Mandor` boleh membawahi banyak `Operator`.
- Tidak semua `Operator` pada line yang sama otomatis memiliki Mandor yang sama; filtering tim Mandor wajib memakai mapping eksplisit seperti `USER_ROLES.mandor_email` atau sheet assignment yang disahkan kemudian.
- Dashboard Mandor tidak boleh memakai progress personal Operator sebagai progress tim. Progress Mandor wajib dihitung dari agregasi Operator dalam scope tanggung jawabnya.

Kontrak multi-role:
- `USER_ROLES.role` tetap dipertahankan sebagai primary/default role agar data lama tidak rusak.
- Akses multi-role wajib dimodelkan melalui sheet assignment terpisah seperti `USER_ROLE_ASSIGNMENTS`, bukan menyimpan daftar role bebas di satu cell untuk authorization production.
- Satu `user_id`/email boleh memiliki banyak role aktif, misalnya `Management` dan `Supervisor`.
- Session context wajib mengembalikan daftar role yang diizinkan. Frontend boleh meminta role aktif, tetapi backend harus memvalidasi role tersebut terhadap assignment aktif.

## 2A. Schema Rencana `USER_ROLE_ASSIGNMENTS`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `assignment_id` | String UUID | ID assignment role. |
| `user_id` | String | Referensi karyawan/user. |
| `email` | String | Email login untuk lookup cepat. |
| `role` | Enum | Role yang diberikan. |
| `scope_type` | Enum | `GLOBAL`, `BAGIAN`, atau scope lain yang disahkan. |
| `scope_id` | String atau kosong | ID Bagian/scope jika tidak global. |
| `status_aktif` | Boolean | `TRUE` jika role aktif. |
| `created_at` | String UTC | Waktu dibuat. |
| `updated_at` | String UTC | Waktu diperbarui. |

## 2B. Schema Rencana Absensi

Absensi wajib event-based agar tombol `Masuk`, `Keluar`, konfirmasi Mandor, dan koreksi status tetap auditable.

Sheet rencana:
- `EMPLOYEE_MASTER`: nomor karyawan, nama, status aktif/resign, Bagian default, dan field HRD tambahan yang dimasking/terenkripsi sesuai kebutuhan.
- `ATTENDANCE_EVENTS`: event `CLOCK_IN`, `CLOCK_OUT`, `MANDOR_CHECK`, `MANDOR_CHECK_ALL`, `SET_STATUS`.
- `ATTENDANCE_DAILY_RECAP`: output harian per karyawan dan Bagian.
- `ATTENDANCE_MONTHLY_RECAP`: output bulanan payroll-ready.

Status kehadiran minimal: `HADIR`, `IZIN`, `SAKIT`, `ALPHA`, `RESIGN`, `BELUM_KONFIRMASI`.

Mandor boleh melakukan `check` atau `check all`, dan boleh menetapkan `Izin`, `Sakit`, atau `Alpha` dengan `keterangan`. HRD/Management membaca rekap sesuai permission; data pribadi tidak boleh terbuka di dashboard operasional.

## 3. Schema `ROLE_PERMISSIONS`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `permission_id` | String | ID permission unik, misalnya `operator.submit_report`. |
| `role` | Enum | `Operator`, `Mandor`, `Supervisor`, `Management`, `HRD`, `SuperAdmin`. |
| `resource` | String | Resource aplikasi, misalnya `production_report`, `quarantine`, `user_role`, `dashboard`, atau `test_runner`. |
| `action` | String | Aksi yang diizinkan, misalnya `create`, `read`, `approve`, `reject`, `update`, `soft_delete`, atau `run`. |
| `is_allowed` | Boolean | `TRUE` jika role diizinkan melakukan aksi. |
| `updated_at` | String | ISO 8601 UTC saat permission diperbarui. |

Authorization wajib memakai exact match `role + resource + action`. Missing permission, `is_allowed=FALSE`, role tidak dikenal, resource tidak dikenal, atau action tidak dikenal wajib ditolak. `SuperAdmin` tetap harus memiliki permission eksplisit di matrix.

Resource `test_runner` hanya memiliki action `run` dan ditujukan untuk smoke test produksi oleh `SuperAdmin` atau role lain yang diberi izin eksplisit. Hasil runner wajib berupa ringkasan Pass/Fail tanpa secret, PII mentah, atau payload produksi lengkap.

Resource `audit_log` hanya memiliki action `read` untuk ringkasan audit aman. HRD boleh membaca ringkasan audit akses dan role tanpa payload mentah atau PII mentah.

Resource `reference_data` hanya memiliki action `read` untuk master data non-PII seperti `LINE_MASTER`, `SHIFT_MASTER`, mesin dari data produksi/target, dan daftar operator aktif yang dimasking. Frontend wajib memakai response backend sebagai sumber opsi line/shift/mesin/operator ketika tersedia; fallback lokal hanya boleh dipakai untuk development/offline sementara.
Mode development/demo wajib memakai response mock GAS dengan shape yang sama agar pertukaran data, queue IndexedDB, dan transaksi submit terasa seperti runtime GAS. Snapshot state mock GAS wajib bertahan di IndexedDB dan seed default hanya dibuat saat snapshot demo kosong.

Resource `production_target` memiliki action `read`, `create`, `update`, `bulk_update`, dan `soft_delete`. Operator hanya boleh membaca target aktif. Mandor dan role di atasnya boleh mengatur target sesuai scope permission. Management tetap read-only kecuali diberi permission eksplisit untuk perencanaan target.

Resource `bagian_master` memiliki action `read`, `create`, `update`, `soft_delete`, dan `seed`. Management dan SuperAdmin boleh membuat/mengubah/nonaktifkan Bagian dan mengatur `unit_rate`, `monthly_target_unit`, serta `target_salary`. Supervisor membaca untuk verifikasi/output; Mandor/Operator membaca sesuai workflow. Perubahan master Bagian wajib audit-log dan tidak boleh mengubah transaksi historis.

Resource `work_master` memiliki action `read`, `create`, `update`, dan `soft_delete` untuk master jenis pekerjaan, line, dan machine. Owner utama adalah `Supervisor` dan `SuperAdmin`; role lain hanya membaca sesuai kebutuhan workflow.

Resource `defect_change_request` memiliki action `create`, `read`, `approve`, dan `reject`. `Mandor` boleh membuat request/draft defect baru dari temuan lapangan, sedangkan approval menjadi tanggung jawab `Supervisor` atau `SuperAdmin`.

Resource `production_review` memiliki action `read`, `void`, `request_correction`, dan `pre_closing_correction`. Resource ini dipakai Mandor/Supervisor untuk review submit normal `ACCEPTED` sebelum daily closing tanpa mengedit baris asal `RAW_LOGS`.

## 4. Schema `RAW_LOGS`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `transaction_id` | String UUID | Idempotency key dari client. |
| `device_timestamp` | String UTC | Waktu submit dari perangkat. |
| `server_received_at` | String UTC | Waktu diterima backend. |
| `sync_type` | Enum | `LIVE` atau `OFFLINE_QUEUE`. |
| `operator_email` | String | Email operator pengirim. |
| `client_version` | String | Versi frontend. |
| `factory_date` | String | Tanggal operasional berdasarkan `Asia/Jakarta`. |
| `line_id` | String | Referensi ke `LINE_MASTER`. |
| `shift_id` | String | Referensi ke `SHIFT_MASTER`. |
| `machine_id` | String | ID mesin atau stasiun kerja. |
| `target_harian` | Integer | Target harian operator. |
| `tandon` | Integer | Jumlah tandon/sisa. |
| `perolehan_ok` | Integer | Jumlah produk OK. |
| `perolehan_reject` | Integer | Jumlah produk reject. |
| `defect_category_id` | String atau kosong | Kategori defect dominan jika ada reject. |
| `defect_notes` | String atau kosong | Catatan reject singkat, tidak boleh berisi PII. |
| `status` | Enum | `ACCEPTED`, `CONFLICT_PENDING`, `QUARANTINED`, `DUPLICATE`, `REJECTED`. |

Catatan target:
- `target_harian` pada `RAW_LOGS` adalah snapshot target yang berlaku saat operator submit, bukan master target yang diedit langsung di log transaksi.
- Realisasi target hanya dihitung dari `perolehan_ok + perolehan_reject`; `tandon` tidak masuk pembanding target dan boleh bernilai 0 atau lebih selama tetap integer non-negatif.
- Frontend Operator wajib membaca target dari backend berdasarkan scope aktif dan tidak menjadikan input manual sebagai sumber utama.
- Dashboard Operator wajib memakai target aktif dari `TARGET_MASTER` untuk progress harian bila tersedia. Snapshot `RAW_LOGS.target_harian` hanya menjadi fallback historis jika target master tidak ditemukan untuk tanggal/scope tersebut.
- Jika target belum ditemukan, fallback manual hanya boleh tampil dengan status warning dan tetap tunduk validasi backend.

## 4A. Schema `TARGET_MASTER`

`TARGET_MASTER` adalah sheet wajib runtime dan menjadi sumber kebenaran target harian.

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `target_id` | String UUID | ID unik target. |
| `factory_date` | String | Tanggal operasional `YYYY-MM-DD` atau kosong jika memakai range. |
| `effective_from` | String | Tanggal mulai berlaku `YYYY-MM-DD`. |
| `effective_until` | String atau kosong | Tanggal akhir berlaku inclusive. |
| `line_id` | String | Referensi ke `LINE_MASTER`. |
| `shift_id` | String | Referensi ke `SHIFT_MASTER`. |
| `machine_id` | String atau `ALL` | Mesin spesifik atau semua mesin dalam scope. |
| `operator_email` | String atau `ALL` | Operator spesifik atau semua operator dalam scope. |
| `target_harian` | Integer | Target produksi yang berlaku untuk scope tersebut. |
| `scope_type` | Enum | `ALL_USERS`, `OPERATOR_ONLY`, `LINE_SHIFT`, atau `MACHINE_SCOPE`. |
| `status_aktif` | Boolean | `TRUE` jika target masih berlaku. |
| `created_by` | String | Email/ID role pembuat target. |
| `updated_by` | String | Email/ID role pengubah terakhir. |
| `created_at` | String UTC | Waktu dibuat. |
| `updated_at` | String UTC | Waktu diperbarui. |

Aturan `TARGET_MASTER`:
- Penggantian target harian hanya boleh dilakukan oleh `Mandor` atau role di atasnya melalui permission `production_target`.
- Setiap perubahan wajib memilih scope eksplisit: berlaku ke semua operator dalam line/shift/mesin, atau hanya satu operator tertentu.
- Perubahan target wajib append/audit-friendly: target lama dinonaktifkan atau diakhiri masa berlakunya; jangan mengubah snapshot `target_harian` pada `RAW_LOGS` historis.
- Jika ada target lebih dari satu yang cocok, prioritas resolusi adalah `OPERATOR_ONLY`, lalu `MACHINE_SCOPE`, lalu `LINE_SHIFT`, lalu `ALL_USERS`.
- Semua create/update/bulk update/soft delete wajib tervalidasi, diaudit, dan menolak target negatif atau scope ambigu.

## 5. Schema `LINE_MASTER`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `line_id` | String | ID lini produksi, misalnya `LINE-A`. |
| `line_name` | String | Nama lini/area produksi. |
| `area` | String | Area pabrik. |
| `mandor_email` | String | Mandor utama yang bertanggung jawab. |
| `status_aktif` | Boolean | `TRUE` jika line aktif. |
| `created_at` | String UTC | Waktu dibuat. |
| `updated_at` | String UTC | Waktu diperbarui. |

## 5A. Schema `BAGIAN_MASTER`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `bagian_id` | String | ID unik uppercase, contoh `SOLDER`, `LEM`, atau `PACKING`. |
| `bagian_name` | String | Nama tampil Bagian, maksimal 80 karakter. |
| `description` | String | Deskripsi ringkas tanpa PII, maksimal 160 karakter. |
| `unit_rate` | Number | Upah per item dalam rupiah, integer `0..999999`. Nilai `0` berarti kebijakan belum ditetapkan. |
| `monthly_target_unit` | Number | Target unit bulanan, integer `0..999999`. |
| `target_salary` | Number | Target gaji/UMR bulanan dalam rupiah, integer `0..999999999`. |
| `status_aktif` | Boolean | `TRUE` jika boleh dipakai di transaksi/filter. |
| `created_by` | Email | Email pembuat. |
| `updated_by` | Email | Email updater terakhir. |
| `created_at` | String UTC | Waktu dibuat. |
| `updated_at` | String UTC | Waktu diperbarui. |

Default bootstrap/seed development wajib mengisi minimal `SOLDER`, `LEM`, dan `PACKING`. `SOLDER` memakai contoh `unit_rate=94`, `monthly_target_unit=37234`, `target_salary=3500000`; `LEM` memakai `unit_rate=83`, `monthly_target_unit=42169`, `target_salary=3500000`; `PACKING` boleh `unit_rate=0` agar UI menampilkan `POLICY_PENDING`.

## 6. Schema `SHIFT_MASTER`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `shift_id` | String | ID shift, misalnya `SHIFT-1`. |
| `shift_name` | String | Nama shift. |
| `start_time` | String | Jam mulai lokal pabrik format `HH:mm`. |
| `end_time` | String | Jam selesai lokal pabrik format `HH:mm`. |
| `timezone` | String | Wajib `Asia/Jakarta`. |
| `status_aktif` | Boolean | `TRUE` jika shift aktif. |
| `updated_at` | String UTC | Waktu diperbarui. |

## 7. Schema `DEFECT_CATEGORIES`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `defect_category_id` | String | ID kategori defect, misalnya `DEF-SOLDER`. |
| `defect_name` | String | Nama defect, misalnya `Solder kurang`. |
| `qcc_factor` | Enum | Kaitan awal ke `Man`, `Method`, `Machine`, `Material`, atau `Environment`. |
| `severity` | Enum | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. |
| `status_aktif` | Boolean | `TRUE` jika kategori aktif. |
| `updated_at` | String UTC | Waktu diperbarui. |

`DEFECT_CATEGORIES` adalah sumber utama kategori defect untuk frontend dan backend. Frontend wajib mengambil katalog aktif melalui callable `getDefectCategories`, menyimpannya sebagai cache runtime, dan hanya memakai default lokal/mock sebagai fallback development/offline. Perubahan kategori dilakukan dengan endpoint terotorisasi dan/atau edit spreadsheet terkontrol, bukan hardcode UI.

Default bootstrap/seed wajib mengisi katalog MVP jika sheet masih kosong atau item belum ada: `DEF-SOLDER-THIN`, `DEF-SOLDER-BRIDGE`, `DEF-COMPONENT-MISS`, `DEF-VISUAL-SCRATCH`, `DEF-POLARITY-REVERSE`, dan `DEF-COLD-SOLDER`. Setiap kategori wajib membawa `qcc_factor` dan `severity` agar capture reject siap dipakai untuk Pareto dan QCC Step 1.

Hak akses master defect:
- `Operator`: `read` saja. Operator boleh melihat dan memilih kategori defect aktif, tetapi tidak boleh menambah, mengubah, seed, atau menonaktifkan reference data.
- `Mandor`: `read` untuk master aktif dan `defect_change_request.create` untuk mengusulkan atau membuat draft defect baru. Mandor tidak boleh langsung mengubah master final tanpa approval role owner.
- `Supervisor`: `read`, `create`, `update`, `soft_delete`, `approve`, dan `reject` untuk fungsi QC/verifikasi kualitas dan kontrol defect lintas Bagian. `seed` tetap bukan aksi harian.
- `Management`: `read` saja. Management membaca insight/Pareto dan tidak boleh mengubah master defect agar independensi data KPI tetap terjaga.
- `SuperAdmin`: full access termasuk `seed`, karena seed adalah aksi administrasi sistem.

## 8. Schema `QUARANTINE`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `quarantine_id` | String UUID | ID kasus quarantine. |
| `transaction_id` | String UUID | Referensi transaksi asal. |
| `reason_code` | Enum | Kode anomali, misalnya `NEGATIVE_VALUE`, `DUPLICATE_SUSPECT`, `MACHINE_OPERATOR_TIME_COLLISION`, `TIME_DRIFT`, `INVALID_TOTAL`. |
| `payload_json` | String JSON | Snapshot payload yang dimasking jika mengandung data sensitif. |
| `status` | Enum | `PENDING`, `CONFLICT_PENDING`, `APPROVED`, `REJECTED`, `CORRECTION_REQUESTED`, `RESUBMITTED`. |
| `reviewed_by` | String atau kosong | Email Mandor/Supervisor. |
| `reviewed_at` | String atau kosong | ISO 8601 UTC saat review. |
| `notes` | String | Catatan keputusan. |

## 9. Schema `MASTER_RECAP`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `recap_id` | String | ID unik recap, misalnya tanggal + operator + machine. |
| `factory_date` | String | Tanggal operasional berdasarkan `Asia/Jakarta`. |
| `operator_email` | String | Email operator. |
| `line_id` | String | Referensi lini produksi. |
| `shift_id` | String | Referensi shift. |
| `machine_id` | String | ID mesin atau stasiun kerja. |
| `target_total` | Integer | Total target. |
| `tandon_total` | Integer | Total tandon. |
| `ok_total` | Integer | Total OK. |
| `reject_total` | Integer | Total reject. |
| `defect_rate` | Number | `reject_total / (ok_total + reject_total)`. |
| `top_defect_category_id` | String atau kosong | Defect dominan untuk Pareto awal. |
| `generated_at` | String UTC | Waktu batch recap dibuat. |

## 10. Schema `DAILY_CLOSING`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `closing_id` | String | ID unik `factory_date + line_id + shift_id`. |
| `factory_date` | String | Tanggal operasional pabrik. |
| `line_id` | String | Referensi lini produksi. |
| `shift_id` | String | Referensi shift. |
| `status` | Enum | `OPEN`, `CLOSED`, `REOPEN_REQUESTED`, `REOPENED`. |
| `closed_by` | String atau kosong | Email Mandor/Supervisor yang melakukan closing. |
| `closed_at` | String atau kosong | ISO 8601 UTC saat closing. |
| `reopened_by` | String atau kosong | Email SuperAdmin/Mandor yang membuka ulang sesuai permission. |
| `reopened_at` | String atau kosong | ISO 8601 UTC saat reopen. |
| `notes` | String | Catatan closing atau reopen. |

## 11. Schema `ADJUSTMENT_LOGS`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `adjustment_id` | String UUID | ID koreksi. |
| `source_transaction_id` | String UUID | Transaksi asal yang dikoreksi. |
| `factory_date` | String | Tanggal operasional terdampak. |
| `line_id` | String | Lini terdampak. |
| `shift_id` | String | Shift terdampak. |
| `adjustment_type` | Enum | `CORRECTION`, `POST_CLOSING_ADJUSTMENT`, `VOID`, `REQUEST_CORRECTION`, `PRE_CLOSING_CORRECTION`. |
| `delta_json` | String JSON | Perubahan angka/field dengan allowlist. |
| `reason` | String | Alasan koreksi, tidak boleh berisi PII. |
| `status` | Enum | `PENDING`, `APPROVED`, `REJECTED`. |
| `requested_by` | String | Email pengaju. |
| `approved_by` | String atau kosong | Email approver. |
| `approved_at` | String atau kosong | ISO 8601 UTC saat approval. |
| `created_at` | String UTC | Waktu dibuat. |

`delta_json` hanya boleh memuat field produksi yang disetujui: `target_harian`, `tandon`, `perolehan_ok`, `perolehan_reject`, `defect_category_id`, dan `defect_notes`. Nilai numerik memakai delta integer, sedangkan field defect memakai nilai pengganti yang tervalidasi.

Kontrak pre-closing review:
- Submit normal `ACCEPTED` boleh masuk rekap harian sementara sampai daily closing.
- Sebelum closing, Mandor/Supervisor boleh membuat event `VOID`, `REQUEST_CORRECTION`, atau `PRE_CLOSING_CORRECTION` melalui resource `production_review`.
- Event pre-closing wajib append-only dan mereferensikan `source_transaction_id`; baris `RAW_LOGS` asal tidak boleh diubah langsung.
- `VOID` dan `PRE_CLOSING_CORRECTION` yang dibuat role berwenang sebelum closing langsung berstatus `APPROVED`; `REQUEST_CORRECTION` berstatus `PENDING` sampai operator mengirim submit koreksi baru.
- `MASTER_RECAP` wajib mengecualikan transaksi dengan event latest `VOID:APPROVED` atau `REQUEST_CORRECTION:PENDING/APPROVED`, lalu menerapkan delta dari `PRE_CLOSING_CORRECTION:APPROVED`.
- `createProductionReview(request)` menerima `session`, `source_transaction_id`, `action`, optional `delta`, dan `reason`.
- Setelah daily closing, koreksi wajib memakai workflow adjustment post-closing yang sudah ada.

## 12. Schema `AUDIT_LOGS`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `audit_id` | String UUID | ID audit. |
| `actor_email` | String | Email pelaku aksi. |
| `actor_role` | String | Role saat aksi dilakukan. |
| `action` | String | Nama aksi, misalnya `LOGIN_SUCCESS`, `APPROVE_QUARANTINE`, `SOFT_DELETE_USER`. |
| `entity_type` | String | Jenis entitas terdampak. |
| `entity_id` | String | ID entitas terdampak. |
| `metadata_json` | String JSON | Metadata dengan masking PII. |
| `created_at` | String UTC | Waktu audit dibuat. |

## 13. Kontrak JSON Submit Produksi

Callable GAS `submitProductionReport` menerima object request dengan field `metadata` dan `payload`. Field `session` opsional hanya dipakai untuk simulasi role saat `AUTH_MODE=OFF`; pada `AUTH_MODE=ON`, backend tetap memakai identitas Google Workspace dari `Session.getActiveUser()` dan tidak mempercayai role/email dari frontend sebagai batas keamanan.

```json
{
  "session": {
    "simulated_role": "Operator"
  },
  "metadata": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "device_timestamp": "2026-08-29T22:42:48.000Z",
    "sync_type": "OFFLINE_QUEUE",
    "operator_email": "operator@perusahaan.com",
    "client_version": "v1.0.0"
  },
  "payload": {
    "line_id": "LINE-A",
    "shift_id": "SHIFT-1",
    "machine_id": "SOLDER-A12",
    "target_harian": 1400,
    "tandon": 150,
    "perolehan_ok": 1240,
    "perolehan_reject": 10,
    "defect_category_id": "DEF-SOLDER",
    "defect_notes": "Solder kurang pada sampling akhir"
  }
}
```

## 14. Kontrak JSON Session Context

Request dev mode boleh kosong atau berisi role simulasi:

```json
{
  "simulated_role": "Mandor"
}
```

Response success:

```json
{
  "ok": true,
  "data": {
    "auth_mode": "OFF",
    "email": "dev.simulated@optiflow.local",
    "role": "Mandor",
    "user_id": "DEV-Mandor",
    "is_simulated": true,
    "requires_role_selection": false,
    "allowed_simulated_roles": [
      "Operator",
      "Mandor",
      "Management",
      "HRD",
      "SuperAdmin"
    ]
  },
  "meta": {},
  "error": null
}
```

Response session context tidak boleh memuat `nama_lengkap_encrypted`, `nomor_telepon_encrypted`, `phone_blind_index`, `ENCRYPTION_SALT`, atau isi `SCRIPT_PROPERTIES`.

## 15. Kontrak JSON Script Properties Maintenance

Script Properties hanya boleh dikelola lewat endpoint maintenance SuperAdmin yang memakai allowlist. Frontend tidak boleh menerima dump mentah `PropertiesService.getScriptProperties()`.

Allowlist:

| Key | Sensitivitas | Read | Update | Delete | Rotate | Aturan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AUTH_MODE` | `CONFIG` | Masked/full enum | Ya | Tidak | Tidak | Nilai hanya `ON` atau `OFF`. |
| `APP_ACTIVE_UNTIL` | `CONFIG` | Full date | Ya | Ya | Tidak | Format `YYYY-MM-DD`, inclusive sampai akhir tanggal berdasarkan `Asia/Jakarta`; kosong berarti tidak ada expiry. |
| `REQUIRE_REGISTERED_EMAIL_LOGIN` | `CONFIG` | Full enum | Ya | Ya | Tidak | Nilai hanya `TRUE` atau `FALSE`; kosong dianggap `TRUE` oleh render gate. `FALSE` hanya untuk demo/trial/development terkontrol. |
| `SPREADSHEET_ID` | `CONFIG` | Masked preview | Ya | Ya | Tidak | Format Google ID alfanumerik, `_`, atau `-`, minimal 20 karakter. |
| `ENCRYPTION_SALT` | `SECRET` | Status-only | Tidak | Tidak | Ya | Tidak pernah dikirim mentah ke frontend, log, atau audit metadata. |

Request baca status:

```json
{
  "session": {
    "simulated_role": "SuperAdmin"
  }
}
```

Response baca status:

```json
{
  "ok": true,
  "data": {
    "properties": [
      {
        "key": "ENCRYPTION_SALT",
        "sensitivity": "SECRET",
        "status": "SET",
        "readable": false,
        "updatable": false,
        "deletable": false,
        "rotatable": true,
        "value_preview": ""
      }
    ]
  },
  "meta": {},
  "error": null
}
```

Request update config:

```json
{
  "session": {
    "simulated_role": "SuperAdmin"
  },
  "key": "APP_ACTIVE_UNTIL",
  "value": "2026-12-31"
}
```

Request delete config:

```json
{
  "session": {
    "simulated_role": "SuperAdmin"
  },
  "key": "SPREADSHEET_ID"
}
```

Request rotate secret:

```json
{
  "session": {
    "simulated_role": "SuperAdmin"
  },
  "key": "ENCRYPTION_SALT"
}
```

Semua endpoint maintenance wajib menolak key yang tidak ada di allowlist, action yang tidak sesuai kontrak key, role tanpa permission `script_property:*`, dan payload yang membawa field tambahan.

`doGet()` wajib membaca `APP_ACTIVE_UNTIL` sebelum merender aplikasi. Jika tanggal hari ini di timezone `Asia/Jakarta` lebih besar dari nilai tersebut, atau format nilai tidak valid, backend wajib mengembalikan halaman penolakan akses tanpa merender `Index.html`.

Setelah expiry gate lolos, `doGet()` wajib membaca `REQUIRE_REGISTERED_EMAIL_LOGIN`. Jika nilai kosong atau `TRUE`, `AUTH_MODE=ON` wajib menolak user yang email Google-nya tidak terdaftar/aktif di `USER_ROLES`. Jika nilai `FALSE`, aplikasi boleh render untuk skenario demo/trial tanpa registered-email render gate; production hardening wajib mengembalikannya ke `TRUE`.

## 16. Standar Waktu

- Semua timestamp transaksional disimpan sebagai ISO 8601 UTC.
- `device_timestamp` wajib merepresentasikan waktu aktual ketika operator menekan submit di perangkat.
- `server_received_at` wajib merepresentasikan waktu ketika backend GAS menerima payload.
- Rekap harian memakai anchor timezone pabrik `Asia/Jakarta`.
- Frontend boleh merender waktu sesuai timezone perangkat, tetapi tidak boleh mengubah nilai mentah di database.

## 17. Kontrak Event Sourcing Dan Conflict Flagging

- Sinkronisasi dari IndexedDB ke GAS wajib menambah baris baru di `RAW_LOGS` melalui insert/append row.
- Sinkronisasi offline tidak boleh menimpa cell atau baris lama di Google Sheets.
- `transaction_id` adalah UUID unik per percobaan submit dari client dan menjadi idempotency key.
- Backend wajib memakai `device_timestamp` untuk analisis urutan kejadian operator dan `server_received_at` untuk audit penerimaan server.
- Jika backend mendeteksi dua transaksi dengan `machine_id` sama, `operator_email` berbeda, dan selisih `device_timestamp` berada dalam conflict time window yang dikonfigurasi, transaksi wajib diberi status `CONFLICT_PENDING`.
- Data `CONFLICT_PENDING` wajib direferensikan ke `QUARANTINE` dengan `reason_code=MACHINE_OPERATOR_TIME_COLLISION`.
- Data `CONFLICT_PENDING` tidak boleh dihitung ke `MASTER_RECAP` sampai Mandor/Supervisor melakukan approve.
- Jika `perolehan_reject > 0`, `defect_category_id` wajib merujuk kategori aktif di `DEFECT_CATEGORIES`; kategori tidak aktif atau tidak dikenal wajib ditolak oleh frontend dan backend.
- Callable master defect:
  - `getDefectCategories({ session, include_inactive? })` mengembalikan `categories` dari `DEFECT_CATEGORIES`; Operator/Management hanya menerima kategori aktif.
  - `upsertDefectCategory({ session, category })` membuat/memperbarui satu kategori dengan validasi ID, nama, `qcc_factor`, `severity`, dan `status_aktif`; hanya `Supervisor` atau `SuperAdmin`.
  - `requestDefectCategoryChange({ session, draft })` membuat request/draft defect dari Mandor untuk ditinjau owner utama sebelum masuk master final.
  - `deactivateDefectCategory({ session, defect_category_id })` melakukan soft delete dengan `status_aktif=FALSE`; hanya `Supervisor` atau `SuperAdmin`.
  - `seedDefectCategories({ session })` menambahkan default seed yang belum ada tanpa menghapus kategori existing; hanya SuperAdmin atau menu administrasi terkontrol.

## 18. Kontrak Callable M5

Callable closing:
- `closeDailyClosing(request)` menerima `session`, `factory_date`, `line_id`, `shift_id`, dan `notes`.
- `reopenDailyClosing(request)` menerima field yang sama dan menghasilkan status terbaru `REOPENED`.
- Closing ditulis append-only ke `DAILY_CLOSING`; status terbaru dihitung dari baris terakhir untuk `factory_date + line_id + shift_id`.
- Closing wajib ditolak jika masih ada `QUARANTINE` aktif untuk scope yang sama.

Callable adjustment:
- `createAdjustment(request)` menerima `session`, `source_transaction_id`, `adjustment_type`, `delta`, dan `reason`.
- `approveAdjustment(request)` dan `rejectAdjustment(request)` menerima `session`, `adjustment_id`, dan `notes`.
- Adjustment ditulis append-only ke `ADJUSTMENT_LOGS`; status terbaru dihitung dari baris terakhir untuk `adjustment_id`.
- Adjustment hanya mempengaruhi recap jika status terbaru `APPROVED`.

Callable recap/dashboard:
- `runMasterRecap(request)` menerima `session`, optional `factory_date`, `line_id`, dan `shift_id`, lalu mengganti data turunan di `MASTER_RECAP` secara idempotent untuk scope tersebut.
- `getSupervisorControlCenter(request)` menerima `session`, filter server-side, `page`, dan `page_size`.
- `getManagementDashboard(request)` menerima `session`, filter server-side, `page`, dan `page_size`, lalu membaca `MASTER_RECAP` tanpa menampilkan data mentah `RAW_LOGS`.
- `getOperatorDashboard(request)` menerima `session`, filter server-side, `page`, `page_size`, dan optional `period` dengan enum `DAILY`, `WEEKLY`, atau `MONTHLY`, lalu mengembalikan response ringkas khusus Operator. Response wajib memakai shape standar `{ok,data,meta,error}` dan `data` berisi:
  - `summary`: `factory_date`, `line_id`, `shift_id`, `machine_id`, `operator_name_masked`, `target_today`, `tandon_today`, `ok_today`, `reject_today`, `target_yesterday`, `tandon_yesterday`, `ok_yesterday`, dan `reject_yesterday`.
  - `trend_history`: array time-series sesuai `period`; `DAILY` default berisi 7 hari, `WEEKLY` berisi beberapa minggu terakhir, dan `MONTHLY` berisi beberapa bulan terakhir. Setiap item memuat `period`, `period_start`, `period_end`, `label`, `target`, `actual`, `ok`, `reject`, dan `tandon`. Untuk chart produksi, `actual` wajib berarti `ok + reject`; frontend wajib dapat menampilkan detail `target`, `actual`, `ok`, dan `reject`. `tandon` tidak ikut dihitung dalam realisasi chart dan hanya tampil sebagai informasi pendamping.
  - `weekly_history`: alias backward-compatible untuk `trend_history` saat `period=DAILY` sampai seluruh client lama dipensiunkan.
  - `recent_submissions`: transaksi terbaru untuk riwayat Operator, memakai `transaction_id`, `device_timestamp`, `line_id`, `shift_id`, `machine_id`, angka produksi, `status`, dan optional `defect_category_id`.
  - `sync`: status ringkas `draft_status`, `queue_count`, `last_sync_at`, dan `status`.
  - `pareto`: ringkasan defect Operator berisi `defect_category_id`, `defect_name`, `reject_total`, `pareto_percent`, `qcc_factor`, dan `severity`.

Callable HRD:
- `getHrdAccessDashboard({ session, filter?, page?, page_size? })` membutuhkan permission `user_role:read` dan `audit_log:read`.
- Response hanya boleh memuat `summary`, `users`, `role_matrix`, dan `audit_summary`.
- `users.items[]` memuat `user_id`, `email_masked`, `role`, `status_aktif`, `is_deleted`, `last_login`, `created_at`, dan `updated_at`; tidak boleh memuat `email` mentah, `nama_lengkap_encrypted`, `alamat_encrypted`, `nomor_telepon_encrypted`, `phone_blind_index`, atau `profile_base64` pada dashboard akses read-only.
- Untuk mode mock/demo HRD yang diberi label jelas sebagai data dummy, response boleh menambahkan `employee_no` 5 digit, `full_name`, `address`, `email`, `wa_number`, dan `wa_url` agar UI direktori HRD bisa diuji tanpa data pribadi production. Production tetap wajib memakai workflow HRD detail yang terotorisasi sebelum membuka PII mentah.
- `role_matrix[]` memuat role, total permission aktif, resource aktif, dan flag readiness.
- `audit_summary` memuat hitungan action login/RBAC/user-role dan timestamp terakhir; tidak boleh memuat `AUDIT_LOGS.metadata_json` mentah.

Callable reference data:
- `getBagianMaster({ session, include_inactive? })` membutuhkan permission `bagian_master:read`.
- `upsertBagianMaster({ session, bagian })` membuat/memperbarui satu Bagian dengan validasi ID, nama, deskripsi, `unit_rate`, `monthly_target_unit`, `target_salary`, dan `status_aktif`; hanya `Management` atau `SuperAdmin`.
- `deactivateBagianMaster({ session, bagian_id })` melakukan soft delete dengan `status_aktif=FALSE`; hanya `Management` atau `SuperAdmin`.
- `seedBagianMaster({ session })` mengisi default Bagian yang belum ada; hanya `Management` atau `SuperAdmin`.
- `getShiftOptions({ session, include_inactive? })` membutuhkan permission `reference_data:read`.
- Response memuat `shifts[]` dari `SHIFT_MASTER` dengan `value`, `label`, `shift_id`, `shift_name`, `start_time`, `end_time`, `timezone`, dan `status_aktif`.
- `getOperatorReferenceData({ session, include_inactive? })` membutuhkan permission `reference_data:read`.
- Response memuat `lines[]` dari `LINE_MASTER`, `shifts[]` dari `SHIFT_MASTER`, `machines[]` dari `TARGET_MASTER`/`RAW_LOGS`, dan `operators[]` dari `USER_ROLES` aktif dengan label aman/masked. Ini dipakai Operator di mode development/demo untuk mengganti Line, Shift, Mesin, dan Operator tanpa upload ke GAS.
- Default response hanya mengembalikan shift aktif. `include_inactive=true` hanya untuk role yang tetap memiliki permission `reference_data:read`.
