# UI_UX_CONTRACT.md - OPTIFLOW Design System Contract

> Purpose: menjaga UI OPTIFLOW tetap modern, jelas, mudah dipakai di lantai produksi, dan aman untuk status operasional kritis.

## 1. Design Direction

OPTIFLOW memakai gaya Industrial Soft UI.

Neumorphism dan Claymorphism boleh dipakai sebagai aksen visual, tetapi tidak boleh menjadi satu-satunya indikator affordance, status, atau prioritas aksi. Sistem harus tetap terasa utilitarian, cepat dibaca, dan cocok untuk operator produksi, Mandor, Supervisor, HRD, SuperAdmin, dan Management.

Komposisi visual wajib mengikuti rasio arah desain:
- 70% Minimalist Operational UI sebagai fondasi layout, form, tabel, dashboard, dan navigasi.
- 20% Neumorphism / Soft UI untuk card ringkasan, panel input, segmented control, dan tombol besar operator.
- 10% Claymorphism / Glass accent untuk modal, empty state, hidden maintenance console, dan highlight demo/trial.

Rasio ini adalah batas arah desain, bukan ukuran matematis per halaman. Jika ada konflik antara estetika dan keterbacaan operasional, keterbacaan, kontras, dan kecepatan input selalu menang.

Kontrak i18n:
- UI harus siap alih bahasa untuk `ID`, `EN`, dan `CN`.
- Bahasa default adalah `ID`.
- Full translation dilakukan setelah rebaseline proses bisnis stabil agar istilah domain tidak diterjemahkan berulang.
- Istilah yang masih perlu dikunci sebelum translation penuh mencakup `Bagian`, `Tandon`, `Pencatat`, `Verifikator`, status absensi, target harian, target bulanan, dan upah per unit.
- Missing translation key wajib fallback deterministik ke `ID` atau key development yang mudah diaudit.

Status implementasi 2026-09-09:
- App shell multi-view, workspace navigation per role, Help/Cara penggunaan per role, Operator mobile UI, autosave/sync status, defect conditional field, Pareto preview, ChartJS Operator dashboard, SweetAlert2 metric help, hidden SuperAdmin console, dan Mandor approval inbox UI sudah ada di `src/App.vue`.
- Scope M5/M6 runtime lokal sudah menambahkan control center desktop, daily closing action, adjustment review, management dashboard read-only, dan HRD read-only access dashboard sebagai view terpisah.
- Artefak readiness dan QCC sudah tersedia; permukaan UI produksi yang belum lengkap tetap harus masuk kontrak/issue sebelum diimplementasikan.

## 2. Prinsip Visual

- Tampilan utama harus bersih, terang, dan kontras tinggi.
- Minimalist Operational UI wajib menjadi fondasi mayoritas layar.
- Latar boleh memakai app-like blue depth background dengan radial/linear gradient ringan seperti referensi mobile banking, selama konten operasional tetap berada di surface putih/terang yang mudah dibaca.
- App shell wajib memisahkan workflow utama ke view/tab yang jelas; jangan menumpuk Operator, Mandor, Supervisor, Management, HRD, dan Pengaturan dalam satu halaman panjang.
- Setiap workflow role wajib memakai pola production workspace: `Overview`, `Work Queue`, dan `Detail/Action`. Hindari layout yang menampilkan semua fitur sekaligus tanpa prioritas tugas.
- Nav utama wajib menjadi feature nav untuk workspace yang sedang aktif, baik desktop maupun mobile. Pilihan workspace dipindahkan ke trigger/dropdown nyata di dalam `.app-nav`, bukan pseudo-element `::before`.
- Semua workspace default ke menu `Dashboard` saat pertama dipilih. Semua role wajib memiliki menu `Help` berisi cara penggunaan, proses bisnis role aktif, dan troubleshooting. Untuk Operator, feature nav wajib berisi `Dashboard`, `Input`, `Riwayat`, `Defect`, `Status`, dan `Help`.
- Trigger/dropdown `.app-nav` saat tertutup hanya menampilkan label mode seperti `Menu Operator`; pilihan workspace muncul setelah diklik.
- Pada mobile, trigger/dropdown `.nav-context` tetap berada tepat di atas `.app-nav` seperti desktop, bukan berpindah jauh ke area lain.
- Desktop wajib memakai navigasi workflow di area atas aplikasi; mobile wajib memakai bottom nav button ala aplikasi e-commerce agar bisa dijangkau satu tangan.
- Desktop nav item wajib memakai pola icon kiri dan text-stack kanan. Tinggi icon harus setara dengan gabungan tinggi label dan badge, dan setiap row nav harus memiliki tinggi tetap agar active state tidak membuat button meloncat.
- Pengaturan sesi wajib tersedia sebagai top floating button yang benar-benar mengambang di area kanan atas, bukan sebagai item bottom nav mobile.
- Saat role aktif `SuperAdmin`, Pengaturan sesi boleh menampilkan card maintenance untuk membuka console Script Properties allowlisted, status bootstrap/diagnostics, dan aksi local-device maintenance.
- Local-device maintenance SuperAdmin boleh mencakup lihat snapshot data lokal, kosongkan draft/queue IndexedDB, reset/delete database IndexedDB, reset semua data lokal termasuk preferensi Try Role, dan reload aplikasi. Aksi clear/reset wajib memakai confirmation dialog dan menjelaskan bahwa Google Sheets, Script Properties, audit backend, dan master data tidak disentuh.
- Viewer localStorage hanya boleh menampilkan namespace aplikasi `optiflow.*`, bukan seluruh localStorage browser.
- Mobile bottom nav wajib menampilkan icon besar untuk semua item, tetapi label teks penuh hanya untuk menu aktif agar hemat ruang; badge workflow disembunyikan di mobile dock agar tinggi nav stabil.
- View berat seperti Supervisor dan Management wajib lazy-load ketika dibuka, bukan otomatis memanggil semua API saat startup Operator.
- Tombol aksi utama wajib memakai warna solid.
- Status kritis wajib terlihat dari kombinasi warna, teks, dan ikon.
- Card/panel boleh memakai shadow lembut, tetapi tetap harus memiliki border atau pemisah yang jelas.
- Border radius default maksimal 8px untuk card operasional, input, table container, dan tombol standar; komponen taktil khusus seperti bottom dock, floating session button, role switcher, dan active nav bubble boleh memakai radius penuh/circular.
- Jangan memakai Neumorphism murni yang membuat tombol terlihat seperti dekorasi.
- Jangan memakai Claymorphism berlebihan untuk tabel, form padat, atau dashboard operasional.
- Jangan memakai Glass accent pada konten yang membutuhkan pembacaan angka cepat atau status kritis.

## 3. Palette

Token warna awal:

| Token | Warna | Penggunaan |
| :--- | :--- | :--- |
| `background` | `#C9EDFB` | Latar aplikasi biru terang seperti referensi mobile banking. |
| `surface` | `#FFFFFF` | Panel, form, table container. |
| `surface-soft` | `#EEF3F6` | Area sekunder dan empty state. |
| `shell-tint` | `rgba(255, 255, 255, 0.68)` | Lapisan app shell di atas latar biru. |
| `text-primary` | `#111827` | Teks utama. |
| `text-secondary` | `#4B5563` | Teks pendukung. |
| `primary` | `#2563EB` | Tombol utama, link aktif. |
| `primary-alt` | `#0F766E` | Aksen industrial/teal. |
| `success` | `#16A34A` | `SYNCED`, `APPROVED`, sukses. |
| `warning` | `#F59E0B` | `PENDING_SYNC`, pending review. |
| `danger` | `#DC2626` | `FAILED`, `REJECTED`, error. |
| `conflict` | `#B45309` | `CONFLICT_PENDING`. |
| `border` | `#DBE3EA` | Border panel dan input. |

## 4. Mobile Operator

Tujuan UI mobile operator adalah one-hand reporting.

Wajib:
- Form ringkas untuk Bagian, shift, jenis pekerjaan/work category, operator demo, target, tandon, OK, reject, dan kategori defect. `line_id` dan `machine_id` hanya boleh menjadi field kompatibilitas tersembunyi sampai migrasi data selesai.
- Pada mode development/demo, field Bagian, Shift, Jenis Pekerjaan, dan Operator harus berupa selector dari response `getOperatorReferenceData` sehingga tester dapat meniru transaksi multi-user tanpa mengganti email Google.
- Perubahan data demo seperti target planning dan submit mock harus tetap terlihat setelah reload karena state mock GAS tersimpan di IndexedDB.
- UI wajib menjelaskan bahwa target dibandingkan dengan `OK + Reject`; `Tandon` adalah konteks buffer/sisa yang tidak masuk realisasi target dan boleh tetap diisi walaupun target tercapai.
- Target harian Operator idealnya auto-filled dari `TARGET_MASTER` dan tampil sebagai read-only/locked value. Input manual target hanya boleh tampil sebagai fallback warning jika target master belum tersedia.
- Input angka besar dan mudah disentuh.
- Status koneksi, draft, dan sync selalu terlihat.
- Kategori defect muncul hanya ketika `perolehan_reject > 0`.
- Saat kategori defect dipilih, UI menampilkan `qcc_factor`, `severity`, dan preview Pareto ringkas tanpa menambah langkah input operator.
- Draft autosave tidak mengganggu input.
- Tombol submit solid dan jelas.
- Error validasi angka dan kategori defect tampil inline dekat field terkait.
- Summary total target/OK/reject harus terlihat sebelum submit.
- Status hydrate/autosave IndexedDB harus terlihat dengan bahasa ringkas seperti `Draft dimuat`, `Draft tersimpan`, atau `Queue gagal`.

Dilarang:
- Tabel besar di layar operator.
- Status penting hanya berupa warna tanpa teks.
- UI yang membutuhkan banyak scroll untuk input harian utama.

## 4A. Role Workspace Ergonomics

- Operator workspace wajib memprioritaskan form submit cepat, lalu draft/sync, lalu riwayat submit terbaru.
- Operator Dashboard wajib menampilkan komposisi perolehan `Hari ini` dan `Kemarin` sebagai ChartJS doughnut `OK vs Reject`, plus ChartJS trend detail `Target`, `Realisasi`, `OK`, dan `Reject` dengan segmented control horizontal `Daily`, `Weekly`, dan `Monthly`. Angka tengah doughnut wajib menampilkan capaian `Realisasi / Target`, bukan rasio `OK / Realisasi`. `Realisasi` berarti `OK + Reject`, sedangkan `Tandon` tidak masuk garis realisasi dan tampil sebagai informasi pendamping. Default periode adalah `Daily`. Chart wajib memakai container responsif dengan tinggi terikat agar tidak terlalu besar di desktop atau terlalu kecil di mobile. Dalam mode development, UI wajib dapat membaca dummy `getOperatorDashboard` dari `mock_gas.js` agar visual dapat diperiksa tanpa upload ke GAS.
- Metric strip Operator untuk `Target`, `OK`, `Reject`, dan `Queue` wajib bisa diklik/tap untuk membuka bantuan ringkas yang menjelaskan arti metric, rumus, dan tindakan yang perlu dilakukan user.
- Help role wajib tersedia sebagai menu fitur, bukan modal tersembunyi, agar user awam dapat memahami urutan kerja tanpa membaca dokumentasi repository. Saat Help aktif, panel kerja role lain tidak boleh ikut tampil sehingga layar tetap fokus.
- Riwayat dan Status Operator harus punya empty/loading/error state yang jelas, serta tetap menggabungkan informasi mock/backend dengan queue lokal tanpa membuat user membaca log teknis.
- Mandor workspace wajib field-operations-first dengan menu `Dashboard`, `Absensi Tim`, `Target Harian`, `Hasil Operator`, `Approval & Koreksi`, `Closing Harian`, `Defect Request`, dan `Help`.
- `Dashboard` Mandor menampilkan kesiapan tim hari ini: hadir/belum dikonfirmasi, target yang sudah/belum ditetapkan, output masuk, correction queue, conflict/actionable queue, dan status closing. Dashboard hanya ringkasan dengan drilldown ke menu terkait.
- `Absensi Tim` wajib menyediakan check per karyawan, check all, dan pengecualian `Izin`, `Sakit`, `Alpha` dengan catatan. UI harus mencegah konfirmasi massal untuk karyawan resign/nonaktif.
- `Absensi Tim` wajib menampilkan status `BELUM_KONFIRMASI`, `HADIR`, `IZIN`, `SAKIT`, `ALPHA`, dan `RESIGN` dengan badge teks/warna yang mudah dipindai. Karyawan yang belum `CLOCK_IN` atau belum dikonfirmasi Mandor harus terlihat sebagai pekerjaan aktif.
- `Target Harian` wajib menyediakan flow pilih Bagian/tanggal/jenis pekerjaan, pilih operator atau semua operator dalam scope, preview dampak multi-user, lalu simpan dengan audit.
- `Hasil Operator` wajib menjadi layar monitoring submit normal `ACCEPTED` dan output terbaru. Tabel tidak boleh hanya menampilkan UUID; tampilkan konteks employee id/nama termasking bila perlu, Bagian, timestamp, OK, Reject, Tandon, dan status.
- `Approval & Koreksi` wajib menggabungkan conflict queue, pending review, `VOID`, `REQUEST_CORRECTION`, dan `PRE_CLOSING_CORRECTION` sebagai pekerjaan aktif. Status final tidak boleh tetap berada di queue aktif.
- `Closing Harian` wajib membantu Mandor memeriksa absensi, target, output, correction queue, dan conflict sebelum mengunci laporan harian atau mengirim ke verifikator Supervisor.
- `Defect Request` wajib memisahkan usulan defect lapangan dari master defect final yang hanya disahkan Supervisor atau SuperAdmin.
- Dashboard Mandor wajib menampilkan monitoring submit operator terbaru untuk data `ACCEPTED`/raw scoped view, sehingga laporan normal terlihat tanpa mencampurnya ke Approval Inbox.
- Tabel monitoring submit Mandor tidak boleh hanya menampilkan UUID transaksi mentah; setiap transaction cell wajib memiliki metadata ringkas seperti operator termasking, Bagian/shift, jenis pekerjaan, dan waktu device agar Mandor dapat memahami konteks tanpa membuka detail teknis.
- Work Queue Mandor hanya boleh menampilkan kasus actionable `PENDING` dan `CONFLICT_PENDING`; setelah keputusan `Approve`, `Reject`, atau `Request correction`, baris harus hilang dari queue aktif dan detail aktif berpindah ke kasus berikutnya atau empty state.
- Mandor perlu memiliki surface review sebelum closing untuk submit normal `ACCEPTED` dengan aksi `VOID`, `REQUEST_CORRECTION`, dan `PRE_CLOSING_CORRECTION`; UI tidak boleh memberi kesan Mandor mengedit angka transaksi asal secara langsung.
- Tombol pre-closing review wajib muncul dekat konteks submit terbaru: transaction id, operator masked/email, Bagian, shift, jenis pekerjaan, timestamp, OK, Reject, dan status.
- Mandor boleh membuat draft/request kategori defect baru dari temuan lapangan, tetapi UI harus membedakan request tersebut dari master defect final yang hanya bisa disahkan Supervisor atau SuperAdmin.
- Mandor workspace perlu memiliki target management flow: pilih scope target, pilih apakah berlaku untuk semua operator atau satu operator, preview dampak multi-user, lalu simpan dengan audit. Tabel target aktif wajib menyediakan aksi edit, aktifkan, nonaktifkan, dan hapus berbasis soft delete; hard delete tetap dilarang.
- Supervisor workspace wajib memakai menu bisnis `Dashboard`, `Verifikasi QC`, `Defect & Pareto`, `Closing & Koreksi`, `Target & Tim`, `Detail Data`, dan `Help`. Menu teknis lama seperti `Reports`, `Quarantine`, `Raw Logs`, dan `Audit` tidak boleh menjadi navigasi utama; istilah tersebut hanya boleh muncul sebagai sumber data/detail investigasi.
- `Dashboard` Supervisor menampilkan ringkasan output tervalidasi, output menunggu verifikasi QC, closing terbuka, defect dominan, risiko target, dan performa tim.
- `Verifikasi QC` adalah work queue utama untuk validasi `OK + Reject` per Bagian, karyawan, tanggal, dan transaksi. Aksi harus jelas, auditable, dan tidak memberi kesan mengubah transaksi asal.
- `Defect & Pareto` menampung master defect final, draft/request defect dari Mandor, Pareto defect, severity, dan `qcc_factor`.
- `Closing & Koreksi` menampilkan void, request correction, pre-closing correction, adjustment, dan status closing dengan bahasa proses bisnis.
- `Target & Tim` menampilkan target per operator/tim, kapasitas berbasis absensi, gap target vs realisasi, serta ranking tim sesuai scope.
- `Detail Data` menggantikan `Raw Logs` sebagai drilldown aman. Data teknis berat wajib lazy-load dan termasking sesuai permission.
- Management workspace wajib insight-first untuk transaksi produksi: KPI final, Pareto defect, dan status pending tampil tanpa kontrol mutasi data produksi.
- Management boleh memiliki workflow CRUD khusus untuk `BAGIAN_MASTER` dan kebijakan upah per item. UI harus jelas membedakan "master kebijakan" dari "data transaksi"; tombol simpan/nonaktifkan wajib berada di menu Bagian/Upah dan menampilkan status sukses/error singkat.
- Management workspace rebaseline wajib dapat menampilkan dummy/real insight per Bagian: output tervalidasi Supervisor, kehadiran, absen, tandon sebagai angka konteks, performa terhadap target, dan sinyal payroll-ready tanpa membuka PII detail. Fungsi QC melekat pada Supervisor dan tidak ditampilkan sebagai role terpisah.
- Menu Management target adalah `Dashboard`, `Bagian & Upah`, `Produksi`, `Absensi`, `Risiko & Pareto`, `Risiko & Pending`, dan `Help`. `Bagian & Upah` wajib menyediakan tabel master Bagian aktif/nonaktif, form create/update, tombol seed default, aksi nonaktif berbasis soft delete, `unit_rate`, `monthly_target_unit`, dan `target_salary`.
- `Bagian & Upah` adalah satu-satunya UI normal untuk mutasi final kebijakan upah per item dan target gaji/UMR. Field minimum: Bagian, status aktif, upah per item, target gaji bulanan, target unit bulanan, jumlah hari masuk rencana, target harian turunan, effective date, status policy, dan audit preview.
- UI kebijakan wajib menghitung/menampilkan `monthly_target_unit = ceil(target_salary / unit_rate)` dan `daily_target_unit = ceil(monthly_target_unit / planned_attendance_days)` sebagai preview sebelum simpan. Jika field policy belum lengkap, tampilkan `POLICY_PENDING`.
- HRD hanya melihat kebijakan upah sebagai konteks payroll-ready dan tidak melihat tombol simpan final kecuali workflow draft/request HRD disahkan kemudian.
- Mandor hanya melihat target operasional turunan untuk planning tim; Supervisor hanya melihat kebijakan sebagai konteks verifikasi output dan eskalasi.
- Operator tidak boleh melihat simulasi gaji personal penuh pada MVP; tampilkan target produksi dan performa tanpa membuka payroll-sensitive detail.
- `Produksi` wajib menjadi menu khusus performa output: target vs realisasi, OK, Reject, reject rate, tren, perbandingan Bagian, serta status output tervalidasi Supervisor.
- `Risiko & Pareto` wajib memakai bahasa improvement Management: defect terbesar, konsentrasi reject, Bagian terdampak, tren risiko, dan prioritas QCC.
- `Risiko & Pending` mengganti istilah teknis `Pending` menjadi bahasa keputusan: conflict, output belum verified, closing terbuka, policy pending, master data belum lengkap, dan rekap yang belum bisa dipercaya.
- `Laporan/Export` belum menjadi menu wajib. Jika dibutuhkan, kontrak export harus menentukan format, masking, audit, dan izin sebelum implementasi.
- Halaman `Upah UMR` wajib read-only dan menampilkan kondisi `Memenuhi UMR`, `Di bawah UMR`, atau `Policy pending` berdasarkan proyeksi gaji bulanan dibanding target gaji/UMR.
- Jika satu akun memiliki beberapa role, session/role switcher wajib menampilkan daftar role yang diizinkan untuk akun tersebut dan berpindah workspace tanpa reload penuh.
- Pilihan workspace dari `nav-context-trigger` boleh disimpan di localStorage agar tetap aktif setelah reload, tetapi hanya sebagai preferensi UI. Setelah `getSessionContext` selesai, frontend wajib merekonsiliasi workspace tersimpan terhadap role/session yang diizinkan; jika tidak berhak, UI harus pindah ke workspace pertama yang berhak atau Settings. Backend tetap menjadi otorisasi final.
- Untuk session SuperAdmin, role switcher boleh dipakai untuk menampilkan/menyembunyikan workspace role lain, termasuk Supervisor, tanpa menurunkan identitas session menjadi role operasional tersebut. Aksi backend tetap memakai otorisasi SuperAdmin atau permission final dari GAS.
- HRD workspace wajib privacy-first dengan empat menu utama: `Dashboard`, `Karyawan`, `Absensi`, dan `Akses & Audit`.
- `Dashboard` HRD menampilkan total karyawan aktif, resign/nonaktif, absensi hari ini, pending konfirmasi Mandor, data belum lengkap, dan ringkasan payroll-ready; jangan gunakan judul "PII".
- `Karyawan` menggabungkan konsep lama User Masked dan Privacy Safe: ID karyawan 5 digit, nama, Bagian, status aktif/resign, email, tombol WhatsApp `wa.me`, alamat, kelengkapan data, dan mode masking/detail access.
- `Absensi` menampilkan rekap harian/bulanan, status Hadir/Izin/Sakit/Alpha/Resign/Belum Konfirmasi, jam masuk/keluar, status konfirmasi Mandor, jumlah hari hadir, dan export payroll-ready.
- `Akses & Audit` menggabungkan Roles RBAC dan audit ringan: role aktif/nonaktif, multi-role user, anomali akses, perubahan data karyawan/role, login terakhir, dan akses ditolak. Jangan tampilkan log teknis backend penuh, secret, Script Properties, atau raw audit metadata.
- UI HRD untuk `Karyawan` dan `Absensi` harus membedakan data detail karyawan dari agregat Management. Management tidak boleh melihat alamat, nomor WA, email mentah, atau profile kecuali kontrak permission detail disahkan.
- Walaupun seed `USER_ROLES` dapat berisi username, field terenkripsi, dan `profile_base64`, dashboard akses read-only HRD tidak boleh merender avatar/profile atau PII detail sampai ada workflow HRD detail yang disetujui kontrak.
- Mode mock/demo HRD boleh menampilkan direktori dummy berisi ID karyawan 5 digit, nama lengkap, alamat, email, dan tombol WhatsApp `wa.me` untuk verifikasi UI. Tampilan wajib tetap memberi konteks dummy/demo dan tidak boleh diperlakukan sebagai izin membuka PII production.
- Statistik performa Operator wajib role-aware: Operator hanya melihat dirinya sendiri, Mandor/Supervisor boleh melihat ranking tim, dan Management hanya melihat agregat tanpa PII.
- Progress header tidak boleh memakai komponen/data yang sama untuk semua role. Operator memakai progress personal, Mandor memakai progress tim Operator bawahannya, Supervisor memakai progress area, dan Management memakai KPI final agregat.
- Jika relasi Mandor-Operator belum lengkap, UI Mandor wajib menampilkan progress sebagai scoped team view berdasarkan filter yang tersedia dan tidak menyebutnya sebagai progress personal.
- Pareto defect wajib mengikuti filter dan batas akses role; UI harus menampilkan filter periode, Bagian, jenis pekerjaan, operator/team sesuai permission tanpa membocorkan data lintas role. Filter line/shift/machine hanya boleh muncul sebagai mode legacy/migrasi.

## 5. Mobile Mandor

Tujuan UI mobile Mandor adalah approval inbox dan closing harian.

Wajib:
- `CONFLICT_PENDING` tampil paling prioritas.
- Konflik menampilkan pembanding visual antar transaksi.
- Aksi utama tersedia: `Approve`, `Reject`, `Reject Both`, `Request Correction`.
- Tombol closing hanya aktif ketika kondisi Bagian/tanggal memenuhi rule; line/shift hanya kompatibilitas legacy.
- Notifikasi pending review terlihat tanpa membuka dashboard penuh.
- Tombol keputusan konflik minimal 44px dan memakai teks eksplisit, bukan ikon saja.
- Jika approval backend gagal atau belum tersedia pada environment lokal, UI wajib menandai keputusan sebagai staged agar tidak memberi kesan data sudah terkunci.

## 6. Desktop Supervisor

Desktop Supervisor adalah workspace QC/verifikator.

Wajib:
- Sidebar atau navigasi tetap untuk `Dashboard`, `Verifikasi QC`, `Defect & Pareto`, `Closing & Koreksi`, `Target & Tim`, `Detail Data`, dan `Help`.
- Filter server-side untuk tanggal, Bagian, karyawan/operator, status verifikasi, status closing, defect, dan status koreksi.
- Table dengan server-side pagination.
- Detail drawer untuk review/verifikasi tanpa kehilangan konteks tabel.
- Timeline event sourcing untuk transaksi konflik.
- Work queue verifikasi desktop memakai tabel di kiri dan detail comparison drawer atau pane di kanan.
- `CONFLICT_PENDING` harus memiliki highlight baris, badge teks, dan alasan konflik yang terlihat tanpa membuka detail.
- Closing, void, correction request, dan adjustment harus memakai confirmation dialog dan status badge yang jelas.

## 7. Desktop Management

Desktop Management bersifat read-only.

Wajib:
- Dashboard membaca `MASTER_RECAP`, bukan `RAW_LOGS`.
- Data `CONFLICT_PENDING` tidak dihitung.
- Tampilkan badge jika masih ada quarantine pending atau closing belum selesai.
- Widget utama: target vs actual, OK, reject, defect rate, closing status, Pareto defect, dan trend harian.
- Dashboard harus menampilkan empty/loading/error state tanpa meminta user membaca log teknis.

## 8. Hidden SuperAdmin Maintenance Console

Console maintenance untuk Script Properties harus terasa seperti tool administratif, bukan fitur operasional umum.

Wajib:
- Tidak tampil di navigasi operasional normal. Console boleh dibuka lewat card SuperAdmin di Pengaturan sesi dan hidden trigger yang disepakati untuk emergency.
- Menampilkan status allowlisted key, sensitivitas, masked preview untuk config, dan status-only untuk secret.
- Memakai confirmation dialog untuk update, delete, dan rotate.
- Menampilkan error aman tanpa stack trace atau nilai property.
- Menyediakan status refresh setelah aksi berhasil.
- Mobile tetap bisa membuka console untuk emergency, tetapi tabel boleh horizontal scroll karena ini bukan workflow harian operator.

Dilarang:
- Menampilkan `ENCRYPTION_SALT`, token, credential, atau secret mentah.
- Menjadikan hidden trigger sebagai kontrol keamanan utama; keamanan tetap berada di RBAC backend.
- Memakai gaya visual mencolok yang membuat console terlihat seperti menu utama operator.

## 9. Status Treatment

| Status | Tampilan wajib |
| :--- | :--- |
| `DRAFT` | Netral, teks `Draft tersimpan`. |
| `PENDING_SYNC` | Warning, teks `Menunggu sinkronisasi`. |
| `SYNCING` | Loading, teks `Mengirim data`. |
| `SYNCED` | Success, teks `Tersinkron`. |
| `FAILED` | Danger, teks error ringkas dan tombol retry. |
| `CONFLICT_PENDING` | Conflict, ikon peringatan, teks `Bentrok Data`, prioritas tinggi. |
| `APPROVED` | Success, teks `Disetujui`. |
| `REJECTED` | Danger, teks `Ditolak`. |
| `CLOSED` | Netral tegas, teks `Closing selesai`. |

## 10. Accessibility And Ergonomics

- Target sentuh mobile minimal 44px.
- Teks harus tetap terbaca di layar redup.
- Fokus keyboard harus terlihat.
- Gunakan ikon hanya sebagai pendamping teks untuk status penting.
- Jangan menaruh informasi kritis hanya di tooltip.
- Error harus menjelaskan tindakan berikutnya tanpa menampilkan detail internal.

## 11. Typography And Density

OPTIFLOW adalah aplikasi operasional, bukan landing page. Skala tipografi harus padat, jelas, dan mudah dipindai.

Token awal:

| Token | Ukuran | Penggunaan |
| :--- | :--- | :--- |
| `text-xs` | `12px` | Metadata, timestamp, helper text. |
| `text-sm` | `14px` | Label form, badge, secondary text. |
| `text-md` | `16px` | Body utama dan input mobile. |
| `text-lg` | `18px` | Section title dan card metric kecil. |
| `text-xl` | `22px` | Judul halaman operasional. |
| `metric` | `28px` | Angka target, OK, reject, output utama. |

Rules:
- Jangan memakai font yang sulit dibaca di lingkungan produksi.
- Letter spacing harus `0`.
- Jangan menskalakan font berdasarkan viewport width.
- Angka produksi harus tabular jika font mendukung `font-variant-numeric: tabular-nums`.
- Heading di dashboard tidak boleh berukuran hero.

## 12. Spacing, Shape, And Elevation

Token awal:

| Token | Nilai | Penggunaan |
| :--- | :--- | :--- |
| `space-1` | `4px` | Jarak mikro antar ikon/teks. |
| `space-2` | `8px` | Gap field kecil. |
| `space-3` | `12px` | Padding badge/input compact. |
| `space-4` | `16px` | Padding panel mobile. |
| `space-6` | `24px` | Gap antar section. |
| `radius-sm` | `4px` | Badge, tag, table cell highlight. |
| `radius-md` | `8px` | Card, input, button, modal. |
| `radius-pill` | `999px` | Floating session button, active dock bubble, role switcher icon. |
| `shadow-soft` | `0 8px 24px rgba(15, 23, 42, 0.08)` | Panel penting. |
| `shadow-neomorphic` | `9px 9px 16px rgba(163, 177, 198, 0.42), -9px -9px 16px rgba(255, 255, 255, 0.72)` | Metric, role switcher, dan elemen taktil non-kritis. |
| `shadow-pressed` | `inset 6px 6px 10px rgba(163, 177, 198, 0.45), inset -6px -6px 10px rgba(255, 255, 255, 0.72)` | Toggle/segmented active state saja. |
| `shadow-clay` | `0 20px 40px rgba(249, 115, 22, 0.22), inset 0 -5px 10px rgba(154, 52, 18, 0.12)` | Aksen demo/trial dan active dock bubble. |

Rules:
- Radius komponen operasional maksimal `8px`.
- Shadow tidak boleh menggantikan border.
- Efek pressed Neumorphism hanya untuk toggle, segmented control, atau status internal yang tidak kritis.
- Claymorphism boleh dipakai untuk modal/summary ringan, tetapi opacity tidak boleh menurunkan keterbacaan.
- Token spacing wajib dipetakan ke CSS custom properties `--space-1`, `--space-2`, `--space-3`, `--space-4`, dan `--space-6`. Jangan memakai nilai ad-hoc seperti `10px`, `14px`, atau `rem` untuk jarak antar komponen.
- Jarak antar komponen saudara memakai `gap` pada container stack. Dilarang menumpuk `gap` parent dengan `margin-top`/`margin-bottom` anak yang membuat jarak dobel.
- Stack shell (`topbar`, nav, progress, metric strip, workspace) dan stack panel role memakai `--space-4`.
- Grid kartu/field operasional (metric, task card, form field, mini-metric, help card, tabel split) memakai `--space-3`.
- Gap label-ke-input dan aksi compact memakai `--space-2`. Gap mikro ikon/teks memakai `--space-1`.
- Padding panel operasional memakai `--space-4` di desktop dan mobile; jangan memakai padding panel yang berbeda antar workspace kecuali komponen compact khusus seperti badge atau segmented control.

## 13. Component Contract

Komponen inti wajib memiliki state `default`, `hover`, `focus`, `disabled`, `loading`, dan `error` bila relevan.

| Komponen | Kontrak |
| :--- | :--- |
| Button | Primary solid untuk submit/approve; danger solid untuk reject; secondary outline untuk aksi pendukung. |
| Input Number | Tinggi mobile minimal 48px, angka besar, validasi inline, tidak menggeser layout saat error muncul. |
| Select/Search | Mendukung master data Bagian, shift, jenis pekerjaan/work category, operator/karyawan, dan defect category. Legacy line/machine tetap boleh dibaca untuk migrasi. |
| Badge Status | Selalu pakai warna, ikon, dan teks. |
| Metric Tile | Menampilkan label, value, delta/status kecil, dan sumber data. |
| Data Table | Sticky header, pagination server-side (bila data masif), global filter search di table-heading, kolom dapat diurutkan (sortable headers dengan arah 🔼/🔽), empty state, loading state, dan row action jelas. Semua data array lokal difilter melalui `useTableSearchAndSort` untuk reaktivitas UI. |
| Detail Drawer | Untuk review tanpa meninggalkan tabel desktop. |
| Confirmation Dialog | Wajib untuk approve/reject/closing/adjustment. |
| Toast/Inline Alert | Toast untuk informasi non-kritis; inline alert untuk error yang perlu tindakan operator. |

## 14. Responsive Layout Contract

Breakpoint awal:

| Breakpoint | Lebar | Target |
| :--- | :--- | :--- |
| `mobile` | `< 768px` | Operator dan Mandor lapangan. |
| `tablet` | `768px - 1023px` | Mandor/Supervisor ringan. |
| `desktop` | `>= 1024px` | Supervisor, HRD, SuperAdmin, Management. |

Mobile:
- Layout satu kolom.
- Navigasi workflow mobile wajib menjadi bottom nav button sticky dengan target sentuh minimal 44px, tetap berada dalam flow layout, dan active bubble tidak boleh terpotong oleh dock maupun item parent.
- Mobile dock wajib berbentuk pill putih rendah; item aktif memakai circular bubble yang naik di atas dock dengan label oranye di bawahnya, sedangkan item nonaktif hanya icon abu-abu.
- Mobile dock wajib memberi ruang lebih besar untuk item aktif. Item nonaktif boleh dirapatkan agar label item aktif tetap terbaca, termasuk saat ada lima workflow menu.
- Item navigasi mobile yang tidak aktif hanya menampilkan icon; item aktif menampilkan icon dan label ringkas tanpa badge agar tinggi dock tidak meloncat.
- Item navigasi mobile aktif boleh memakai floating circular button di atas bar dengan aksen solid; bar tetap harus kontras tinggi dan tidak menutup submit/retry.
- Tombol Pengaturan sesi di area atas boleh menampilkan icon dan role aktif; proses Try Role harus optimistik/instan di UI, dengan refresh session backend berjalan setelahnya.
- Role button di Pengaturan wajib mendukung multi-select untuk menentukan workflow menu yang dirender. Role yang aktif langsung menampilkan menu terkait; role yang nonaktif langsung menyembunyikan menu terkait.
- Bottom action bar boleh dipakai untuk submit/retry/sync.
- Status sync harus tetap terlihat tanpa membuka menu.
- Form utama harus selesai dalam alur input yang pendek.

Desktop:
- Gunakan top navigation untuk workflow utama atau sidebar tetap jika kepadatan fitur bertambah; modul besar harus dipisah sebagai view mandiri.
- Tabel dan filter boleh berdampingan jika ruang cukup.
- Detail transaksi dibuka di drawer kanan.
- Dashboard management harus memprioritaskan metric dan pengecualian operasional, bukan dekorasi.

## 15. Offline And Sync UX

UI wajib merepresentasikan kontrak Offline-Tolerant secara jujur.

- Loading awal tetap membutuhkan koneksi internet ke GAS HTML Service.
- Setelah aplikasi terbuka, draft dan queue disimpan melalui Global State ke IndexedDB.
- UI tidak boleh menampilkan klaim "full offline/PWA" karena Service Worker bukan mekanisme wajib di GAS.
- Status koneksi minimum: `Online`, `Offline - draft aman`, `Syncing`, `Sync failed`, dan `Synced`.
- Tombol retry tersedia ketika sync gagal.
- Queue count harus terlihat untuk operator dan Mandor.
- Data yang belum tersinkron tidak boleh tampil sebagai data final.

## 16. Conflict And HITL UX

Data `CONFLICT_PENDING` harus terasa sebagai pengecualian serius, bukan sekadar badge kecil.

Wajib:
- Konflik tampil di prioritas atas inbox Mandor.
- Bandingkan transaksi berdampingan: Bagian, jenis pekerjaan, operator, timestamp device, OK, reject, defect, dan sumber device. `machine_id` hanya ditampilkan sebagai metadata legacy bila ada.
- Tampilkan alasan conflict, misalnya `MACHINE_OPERATOR_TIME_COLLISION`.
- Dashboard Management mengecualikan konflik dari KPI dan menampilkan warning agregat.
- Aksi konflik harus diaudit: `Approve`, `Reject`, `Reject Both`, atau `Request Correction`.

Dilarang:
- Auto-approve konflik.
- Menyembunyikan konflik di tabel umum tanpa prioritas visual.
- Menggunakan warna saja untuk menandai data konflik.

## 17. Implementation Checklist

Sebelum UI dianggap siap:
- Token warna, spacing, radius, dan shadow dipakai konsisten.
- Mobile operator lulus target sentuh minimal 44px.
- Status sync/offline terlihat di layar utama.
- Form reject hanya menampilkan kategori defect ketika reject lebih dari 0.
- Critical actions memakai confirmation dialog.
- Data `CONFLICT_PENDING` diprioritaskan dan dikecualikan dari dashboard final.
- Desktop table memakai pagination/filter yang sesuai kontrak backend.
- Semua error user-facing aman, ringkas, dan tidak membocorkan stack trace.
- Screenshot/manual verification dilakukan untuk mobile dan desktop pada issue implementasi frontend terkait.
