# DATA_SCHEMA.md - OPTIFLOW Database & Multi-Sheet Contract

> Architecture: Google Sheets multi-sheet, append-only transaction logs, soft-delete, audit trail, and PII protection.

## 1. Sheet Wajib

OPTIFLOW menggunakan beberapa sheet yang dipisahkan berdasarkan fungsi agar transaksi harian, approval, dan dashboard tidak saling mengganggu.

| Sheet | Fungsi | Aturan |
| :--- | :--- | :--- |
| `USER_ROLES` | Master user, role, status aktif, dan PII terenkripsi | Tidak boleh hard-delete. PII mentah tidak boleh disimpan. |
| `ROLE_PERMISSIONS` | Matrix permission per role | Dipakai backend untuk least privilege. |
| `LINE_MASTER` | Master lini/area produksi | Dipakai untuk filtering dashboard dan scope Mandor. |
| `SHIFT_MASTER` | Master shift dan jam kerja pabrik | Batas waktu memakai timezone `Asia/Jakarta`. |
| `DEFECT_CATEGORIES` | Master kategori reject/defect | Dipakai untuk Pareto defect dan improvement QCC. |
| `RAW_LOGS` | Landing zone append-only untuk semua transaksi produksi | Tidak boleh memakai formula. Tidak boleh diedit manual untuk koreksi. |
| `QUARANTINE` | Data konflik/anomali yang menunggu keputusan Mandor/Supervisor | Semua keputusan wajib diaudit. |
| `MASTER_RECAP` | Rekap bersih untuk dashboard dan Looker Studio | Dibentuk oleh batch process backend. |
| `DAILY_CLOSING` | Status closing harian per line/shift | Setelah closing, koreksi wajib lewat adjustment. |
| `ADJUSTMENT_LOGS` | Koreksi setelah closing atau koreksi administratif | Append-only dan wajib approval. |
| `AUDIT_LOGS` | Audit trail auth, approval, perubahan konfigurasi, dan error penting | Wajib melakukan masking data sensitif. |

Bootstrap backend wajib membuat sheet wajib jika belum ada dan menulis header dari kontrak ini hanya ketika sheet masih kosong. Health check schema wajib melaporkan sheet hilang, kolom hilang, urutan kolom tidak sesuai, kolom ekstra, dan formula pada `RAW_LOGS`.

Status implementasi 2026-09-02:
- `OptiflowSheets.bootstrap()` membuat sheet/header kontrak dan men-seed `DEFECT_CATEGORIES` saat kosong.
- `submitProductionReport` sudah menulis append-only ke `RAW_LOGS`, menolak duplicate `transaction_id`, memvalidasi kategori defect aktif, dan merutekan konflik mesin/operator/waktu ke `QUARANTINE`.
- `DAILY_CLOSING`, `ADJUSTMENT_LOGS`, dan `MASTER_RECAP` sudah memiliki workflow backend M5, termasuk closing/reopen append-only, adjustment approval, dan recap idempotent.

## 2. Schema `USER_ROLES`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `user_id` | String UUID | ID unik pengguna. |
| `email` | String | Email Google untuk `Session.getActiveUser().getEmail()`. |
| `role` | Enum | `Operator`, `Mandor`, `Management`, `HRD`, `SuperAdmin`. |
| `nama_lengkap_encrypted` | String | Nama lengkap terenkripsi di backend. |
| `nomor_telepon_encrypted` | String | Nomor telepon terenkripsi di backend. |
| `phone_blind_index` | String | HMAC-SHA256 untuk pencarian nomor telepon. |
| `status_aktif` | Boolean | `TRUE` jika boleh mengakses sistem. |
| `is_deleted` | Boolean | Soft-delete flag. |
| `deleted_at` | String atau kosong | ISO 8601 UTC saat soft-delete. |
| `last_login` | String atau kosong | ISO 8601 UTC login terakhir. |
| `created_at` | String | ISO 8601 UTC saat dibuat. |
| `updated_at` | String | ISO 8601 UTC saat diperbarui. |

## 3. Schema `ROLE_PERMISSIONS`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `permission_id` | String | ID permission unik, misalnya `operator.submit_report`. |
| `role` | Enum | `Operator`, `Mandor`, `Management`, `HRD`, `SuperAdmin`. |
| `resource` | String | Resource aplikasi, misalnya `production_report`, `quarantine`, `user_role`, `dashboard`, atau `test_runner`. |
| `action` | String | Aksi yang diizinkan, misalnya `create`, `read`, `approve`, `reject`, `update`, `soft_delete`, atau `run`. |
| `is_allowed` | Boolean | `TRUE` jika role diizinkan melakukan aksi. |
| `updated_at` | String | ISO 8601 UTC saat permission diperbarui. |

Authorization wajib memakai exact match `role + resource + action`. Missing permission, `is_allowed=FALSE`, role tidak dikenal, resource tidak dikenal, atau action tidak dikenal wajib ditolak. `SuperAdmin` tetap harus memiliki permission eksplisit di matrix.

Resource `test_runner` hanya memiliki action `run` dan ditujukan untuk smoke test produksi oleh `SuperAdmin` atau role lain yang diberi izin eksplisit. Hasil runner wajib berupa ringkasan Pass/Fail tanpa secret, PII mentah, atau payload produksi lengkap.

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

Default bootstrap wajib mengisi katalog MVP jika sheet masih kosong: `DEF-SOLDER-THIN`, `DEF-SOLDER-BRIDGE`, `DEF-COMPONENT-MISS`, dan `DEF-VISUAL-SCRATCH`. Setiap kategori wajib membawa `qcc_factor` dan `severity` agar capture reject siap dipakai untuk Pareto dan QCC Step 1.

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
| `adjustment_type` | Enum | `CORRECTION`, `POST_CLOSING_ADJUSTMENT`, `VOID`. |
| `delta_json` | String JSON | Perubahan angka/field dengan allowlist. |
| `reason` | String | Alasan koreksi, tidak boleh berisi PII. |
| `status` | Enum | `PENDING`, `APPROVED`, `REJECTED`. |
| `requested_by` | String | Email pengaju. |
| `approved_by` | String atau kosong | Email approver. |
| `approved_at` | String atau kosong | ISO 8601 UTC saat approval. |
| `created_at` | String UTC | Waktu dibuat. |

`delta_json` hanya boleh memuat field produksi yang disetujui: `target_harian`, `tandon`, `perolehan_ok`, `perolehan_reject`, `defect_category_id`, dan `defect_notes`. Nilai numerik memakai delta integer, sedangkan field defect memakai nilai pengganti yang tervalidasi.

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
