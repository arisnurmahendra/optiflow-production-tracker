# GUARDRAILS_CONTRACT.md - OPTIFLOW Enterprise Guardrails

> Purpose: aturan larangan dan kewajiban teknis agar OPTIFLOW aman, stabil, dan tidak merusak data produksi.

## 1. Keamanan Secret Dan PII

- `docs/POL.ISMS.001.md` adalah baseline keamanan minimum dan tidak boleh dilonggarkan tanpa risk assessment.
- Dilarang mengekspos nilai `PropertiesService.getScriptProperties()` ke frontend.
- `ENCRYPTION_SALT` hanya boleh dipakai di backend GAS.
- Enkripsi/dekripsi PII hanya boleh terjadi di backend.
- Data PII yang dikirim ke UI harus dimasking kecuali role pengguna adalah `HRD` atau `SuperAdmin`.
- Audit log tidak boleh menyimpan password, secret, token, nomor telepon mentah, atau PII mentah.
- Script Properties hanya boleh disentuh melalui endpoint maintenance allowlisted untuk key yang disahkan di `DATA_SCHEMA.md`.
- Endpoint maintenance Script Properties tidak boleh mengirim nilai secret mentah ke frontend; secret hanya boleh dikembalikan sebagai status `SET` atau `NOT_SET`.
- Mutasi Script Properties wajib diaudit dengan metadata yang tidak berisi nilai property.
- `APP_ACTIVE_UNTIL` wajib divalidasi sebagai `YYYY-MM-DD`; jika expired atau invalid, `doGet()` harus menolak render aplikasi utama dan mengembalikan halaman akses ditolak.

## 2. Auth Dan RBAC

- Role pengguna wajib dibaca dari `USER_ROLES`.
- `SCRIPT_PROPERTIES` tidak boleh dipakai untuk menyimpan daftar email atau role.
- Saat `AUTH_MODE=ON`, user tidak terdaftar atau tidak aktif harus ditolak.
- Saat `AUTH_MODE=OFF`, role switcher hanya boleh dipakai untuk development/testing.
- Saat `AUTH_MODE` kosong atau tidak dikenal, backend wajib fail closed dan menolak session.
- Request `simulated_role` dari frontend hanya boleh diproses ketika `AUTH_MODE=OFF`.
- Session context tidak boleh mengirim PII terenkripsi, PII mentah, blind index, atau nilai Script Properties ke frontend.
- Session success/failure wajib dicatat ke `AUDIT_LOGS` dengan metadata aman.
- Semua endpoint backend wajib mengecek permission sesuai role.
- Role saja tidak cukup untuk authorization; backend wajib mengecek `ROLE_PERMISSIONS` berdasarkan exact match `role + resource + action`.
- Tidak ada implicit allow untuk `SuperAdmin`; permission tetap harus eksplisit agar dapat diaudit.
- Missing permission wajib fail closed dan dicatat ke `AUDIT_LOGS` sebagai `RBAC_DENIED`.
- Aksi hidden maintenance console wajib memakai permission exact match `script_property:read_status`, `script_property:update`, `script_property:delete`, atau `script_property:rotate_secret`.
- MFA, password policy, dan account lockout dikelola oleh Google Workspace untuk model auth saat ini; jika custom password auth ditambahkan, kontrol password pada `POL.ISMS.001.md` menjadi wajib di aplikasi.

## 3. Frontend Dan API

- OPTIFLOW memakai gaya Industrial Soft UI: Neumorphism dan Claymorphism hanya boleh dipakai sebagai aksen visual, bukan sebagai satu-satunya indikator affordance atau status.
- Tombol aksi utama wajib memakai warna solid dan kontras tinggi.
- Status kritis seperti `FAILED`, `CONFLICT_PENDING`, `REJECTED`, dan `CLOSED` wajib memakai kombinasi warna, teks, dan ikon.
- UI mobile wajib mengutamakan input cepat, target sentuh minimal 44px, dan keterbacaan di layar redup.
- UI desktop wajib mengutamakan scan data, filter, server-side pagination, dan detail drawer untuk review.
- Komponen Vue tidak boleh memanggil `google.script.run` langsung.
- Semua panggilan backend wajib melewati `apiAdapter.js`.
- Wrapper production di `apiAdapter.js` wajib membungkus `google.script.run.withSuccessHandler().withFailureHandler()` menjadi Promise atau kontrak async yang setara.
- `apiAdapter.js` wajib memakai callable allowlist, timeout, normalisasi safe structured response, dan error object aman tanpa stack trace.
- Local development wajib memakai `mock_gas.js` yang meniru response GAS, termasuk latency, failure injection, dan response shape `{ ok, data, meta, error }`.
- `mock_gas.js` hanya boleh dipakai pada mode development/local; production build tetap memanggil Apps Script melalui `google.script.run`.
- Komponen UI tidak boleh membaca atau menulis langsung ke IndexedDB.
- Komponen UI hanya boleh berinteraksi dengan Global State/composables.
- IndexedDB hanya boleh diakses melalui persistence service yang dipanggil oleh Global State.
- Arsitektur frontend wajib disebut `Offline-Tolerant`, bukan `Offline-First`.
- Google Apps Script HTML Service berjalan di sandbox iframe `script.googleusercontent.com`; Service Worker/PWA tidak boleh dijadikan dependency utama karena tidak didukung secara native di GAS.
- Aplikasi boleh membutuhkan koneksi internet untuk loading awal `Index.html`, tetapi input yang sudah berjalan harus aman di IndexedDB saat koneksi terputus.
- IndexedDB dipakai untuk cache data referensi seperti pekerja, line, shift, tandon, target, dan queue transaksi agar panggilan `google.script.run` tidak berlebihan.
- Pencarian harus memakai debounce minimal 500 ms.
- Dataset besar wajib memakai pagination/lazy loading dari server.
- Dilarang memakai Vuex atau Pinia.
- Seluruh proses kompilasi frontend wajib menggunakan Vite dengan `vite-plugin-singlefile`.
- Dilarang keras menghasilkan file `.js` atau `.css` terpisah di direktori `/dist`.
- Seluruh komponen Vue 3, styling, dan aset base64 wajib ter-bundle 100% ke dalam satu file tunggal `Index.html` agar dapat dieksekusi oleh engine Google Apps Script HTML Service.
- Hidden maintenance console boleh ada untuk `SuperAdmin`, tetapi harus tersembunyi dari navigasi normal, tidak boleh menampilkan secret, dan semua aksi wajib melewati `apiAdapter.js` menuju endpoint GAS tervalidasi.

## 4. Data Integrity

- Aturan keamanan mutlak: backend Google Apps Script tidak boleh menganggap data input dari luar sebagai data aman.
- Setiap fungsi GAS yang menerima input dari frontend, trigger, webhook, atau sumber eksternal wajib memiliki blok `Input Validation & Sanitization` di baris pertama eksekusinya.
- Blok `Input Validation & Sanitization` wajib memvalidasi tipe, field allowlist, enum, batas nilai, format tanggal, dan relasi data sesuai `DATA_SCHEMA.md`.
- Data yang tidak sesuai dengan `DATA_SCHEMA.md` wajib ditolak dengan `throw new Error` atau safe structured error yang setara.
- Validasi frontend Vue 3 tidak pernah menggantikan validasi backend GAS.
- Callable wrapper di `Code.js` wajib memiliki komentar blok `Input Validation & Sanitization` dan memanggil `OptiflowValidation` sebelum session lookup, authorization, sheet access, atau business logic.
- Compliance validasi entrypoint wajib dicek dengan `npm run audit:gas:validation` saat endpoint GAS ditambah atau diubah.
- Dilarang memakai `deleteRow` untuk master data, user role, audit, dan transaksi.
- Penghapusan wajib memakai soft-delete dengan `is_deleted=TRUE` dan `deleted_at`.
- `RAW_LOGS` bersifat append-only.
- Data dari IndexedDB operator tidak boleh menimpa langsung `MASTER_RECAP`.
- Sinkronisasi otomatis harus menulis ke status draft, pending, `RAW_LOGS`, atau `QUARANTINE` sesuai validasi; penguncian data utama membutuhkan proses Human-in-the-Loop saat rule mensyaratkan review.
- Setiap sinkronisasi offline ke online wajib menambah baris baru di `RAW_LOGS`; dilarang menimpa cell atau baris Google Sheets yang sudah ada.
- Payload offline wajib membawa UUID `transaction_id` dan `device_timestamp` aktual saat operator menekan submit.
- Transaksi wajib memakai `transaction_id` sebagai idempotency key.
- Duplicate detection tambahan wajib mempertimbangkan `operator_email`, `factory_date`, `line_id`, `shift_id`, `machine_id`, dan time window.
- Jika backend mendeteksi `machine_id` sama, operator berbeda, dan selisih `device_timestamp` berdekatan, data wajib dilabeli `CONFLICT_PENDING` dan diisolasi dari `MASTER_RECAP`.
- Data `CONFLICT_PENDING` wajib memicu notifikasi Mandor dan hanya boleh menjadi `APPROVED` atau `REJECTED` melalui Human-in-the-Loop.
- Backend wajib memvalidasi payload di awal fungsi.
- Data yang sudah masuk periode `CLOSED` tidak boleh diubah langsung.
- Koreksi setelah closing wajib masuk `ADJUSTMENT_LOGS` dan membutuhkan approval.
- Kategori defect wajib ketika `perolehan_reject > 0`.

## 5. Blind Indexing

- Dilarang melakukan loop dekripsi baris untuk mencari PII.
- Pencarian nomor telepon atau PII sejenis wajib memakai blind index.
- Blind index dibuat di backend menggunakan HMAC-SHA256 atau mekanisme hash satu arah yang disetujui.

## 6. Waktu Dan Shift

- Dilarang menyimpan `new Date().toString()` atau waktu lokal mentah ke sheet.
- Semua timestamp mentah wajib ISO 8601 UTC.
- Rekap harian dan batas shift wajib memakai timezone pabrik `Asia/Jakarta`.
- `SHIFT_MASTER` adalah sumber kontrak jam kerja; jangan hardcode jam shift di komponen UI.
- Tampilan waktu lokal dilakukan di frontend.

## 7. Logging Dan Error Handling

- Error backend wajib dikembalikan sebagai payload JSON terstruktur.
- Stack trace dan detail internal tidak boleh ditampilkan ke user.
- Error penting dicatat ke `AUDIT_LOGS` dengan masking.
- UI wajib menyediakan state loading, error, dan retry.
- UI wajib menampilkan status sync dan tidak boleh menghapus draft lokal sebelum server mengonfirmasi hasil submit.
- Draft atau queue IndexedDB hanya boleh dihapus setelah response GAS mengembalikan status success yang tervalidasi.
- Backend wajib memiliki `test_runner.gs` atau file test GAS setara untuk pengujian unit/manual CRUD, validation, idempotency, RBAC, quarantine, closing, adjustment, dan recap.

## 8. Documentation-Driven Development

- Pre-Code Rule: setiap rencana modifikasi logika bisnis, penambahan parameter, atau perubahan variabel wajib ditulis dan disahkan terlebih dahulu di `DATA_SCHEMA.md` dan `BUSINESS_PROCESS.md` sebelum kode GAS atau Vue diubah.
- Knowledge Base Maintenance: setiap iterasi pembaruan proyek wajib divalidasi silang terhadap `KNOWLEDGE_BASE.md` dan referensi inovasi/QCC agar tidak melenceng dari visi dasar.
- Auto-Sync Protocol: setiap kali agen AI mengeksekusi perubahan kode atau menambahkan fitur baru, agen wajib menghentikan proses sementara untuk men-generate dan memperbarui isi md, json, dan dokumentasi relevan lainnya.
- Perubahan schema wajib dimulai dari `DATA_SCHEMA.md`.
- Perubahan alur bisnis wajib dimulai dari `BUSINESS_PROCESS.md`.
- Perubahan keamanan/performa wajib dimulai dari `GUARDRAILS_CONTRACT.md`.
- Perubahan roadmap wajib dimulai dari `IMPLEMENTATION_PLAN.md`.
- Perubahan narasi QCC wajib dimulai dari `QCC_8_STEPS_7_TOOLS.md`.
- Perubahan baseline keamanan wajib dimulai dari `POL.ISMS.001.md`.
