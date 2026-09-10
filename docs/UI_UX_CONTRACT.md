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
- Form ringkas untuk line, shift, machine, operator demo, target, tandon, OK, reject, dan kategori defect.
- Pada mode development/demo, field Line, Shift, Mesin, dan Operator harus berupa selector dari response `getOperatorReferenceData` sehingga tester dapat meniru transaksi multi-user tanpa mengganti email Google.
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
- Mandor workspace wajib action-first: pending approval, conflict, dan closing harus dipisah sebagai task surface yang mudah dipindai.
- Mandor workspace perlu memiliki target management flow saat `TARGET_MASTER` diimplementasikan: pilih scope target, pilih apakah berlaku untuk semua operator atau satu operator, preview dampak multi-user, lalu simpan dengan audit.
- Supervisor workspace wajib alert-first: conflict, closing terbuka, adjustment pending, dan transaksi anomali tampil sebelum tabel mentah.
- Management workspace wajib insight-first dan read-only: KPI final, Pareto defect, dan status pending tampil tanpa kontrol mutasi data.
- HRD workspace wajib privacy-first: dashboard user access, role assignment, permission readiness, dan audit summary tampil dengan PII masked dan tanpa akses secret. Default HRD adalah Dashboard; menu Users menampilkan direktori akses masked, Roles menampilkan matriks permission, Audit menampilkan ringkasan event aman, dan Privacy menampilkan batas data yang tidak boleh dibuka. Walaupun seed `USER_ROLES` dapat berisi username, field terenkripsi, dan `profile_base64`, dashboard akses read-only HRD tidak boleh merender avatar/profile atau PII detail sampai ada workflow HRD detail yang disetujui kontrak.

## 5. Mobile Mandor

Tujuan UI mobile Mandor adalah approval inbox dan closing harian.

Wajib:
- `CONFLICT_PENDING` tampil paling prioritas.
- Konflik menampilkan pembanding visual antar transaksi.
- Aksi utama tersedia: `Approve`, `Reject`, `Reject Both`, `Request Correction`.
- Tombol closing hanya aktif ketika kondisi line/shift memenuhi rule.
- Notifikasi pending review terlihat tanpa membuka dashboard penuh.
- Tombol keputusan konflik minimal 44px dan memakai teks eksplisit, bukan ikon saja.
- Jika approval backend gagal atau belum tersedia pada environment lokal, UI wajib menandai keputusan sebagai staged agar tidak memberi kesan data sudah terkunci.

## 6. Desktop Supervisor

Desktop Supervisor adalah control center.

Wajib:
- Sidebar atau navigasi tetap untuk Dashboard, Reports, Quarantine, Closing, Master Data, dan Audit.
- Filter server-side untuk tanggal, line, shift, machine, operator, dan status.
- Table dengan server-side pagination.
- Detail drawer untuk review tanpa kehilangan konteks tabel.
- Timeline event sourcing untuk transaksi konflik.
- Approval inbox desktop memakai tabel di kiri dan detail comparison drawer atau pane di kanan.
- `CONFLICT_PENDING` harus memiliki highlight baris, badge teks, dan alasan konflik yang terlihat tanpa membuka detail.
- Closing dan adjustment harus memakai confirmation dialog dan status badge yang jelas.

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

## 13. Component Contract

Komponen inti wajib memiliki state `default`, `hover`, `focus`, `disabled`, `loading`, dan `error` bila relevan.

| Komponen | Kontrak |
| :--- | :--- |
| Button | Primary solid untuk submit/approve; danger solid untuk reject; secondary outline untuk aksi pendukung. |
| Input Number | Tinggi mobile minimal 48px, angka besar, validasi inline, tidak menggeser layout saat error muncul. |
| Select/Search | Mendukung master data line, shift, machine, operator, dan defect category. |
| Badge Status | Selalu pakai warna, ikon, dan teks. |
| Metric Tile | Menampilkan label, value, delta/status kecil, dan sumber data. |
| Data Table | Sticky header, pagination server-side, empty state, loading state, dan row action jelas. |
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
- Bandingkan transaksi berdampingan: machine, operator, timestamp device, OK, reject, defect, dan sumber device.
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
