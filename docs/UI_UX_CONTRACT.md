# UI_UX_CONTRACT.md - OPTIFLOW Design System Contract

> Purpose: menjaga UI OPTIFLOW tetap modern, jelas, mudah dipakai di lantai produksi, dan aman untuk status operasional kritis.

## 1. Design Direction

OPTIFLOW memakai gaya Industrial Soft UI.

Neumorphism dan Claymorphism boleh dipakai sebagai aksen visual, tetapi tidak boleh menjadi satu-satunya indikator affordance, status, atau prioritas aksi. Sistem harus tetap terasa utilitarian, cepat dibaca, dan cocok untuk operator produksi, Mandor, Supervisor, HRD, SuperAdmin, dan Management.

## 2. Prinsip Visual

- Tampilan utama harus bersih, terang, dan kontras tinggi.
- Tombol aksi utama wajib memakai warna solid.
- Status kritis wajib terlihat dari kombinasi warna, teks, dan ikon.
- Card/panel boleh memakai shadow lembut, tetapi tetap harus memiliki border atau pemisah yang jelas.
- Border radius default maksimal 8px untuk card, input, table container, dan tombol.
- Jangan memakai Neumorphism murni yang membuat tombol terlihat seperti dekorasi.
- Jangan memakai Claymorphism berlebihan untuk tabel, form padat, atau dashboard operasional.

## 3. Palette

Token warna awal:

| Token | Warna | Penggunaan |
| :--- | :--- | :--- |
| `background` | `#F4F7F9` | Latar aplikasi. |
| `surface` | `#FFFFFF` | Panel, form, table container. |
| `surface-soft` | `#EEF3F6` | Area sekunder dan empty state. |
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
- Form ringkas untuk line, shift, machine, target, tandon, OK, reject, dan kategori defect.
- Input angka besar dan mudah disentuh.
- Status koneksi, draft, dan sync selalu terlihat.
- Kategori defect muncul hanya ketika `perolehan_reject > 0`.
- Draft autosave tidak mengganggu input.
- Tombol submit solid dan jelas.

Dilarang:
- Tabel besar di layar operator.
- Status penting hanya berupa warna tanpa teks.
- UI yang membutuhkan banyak scroll untuk input harian utama.

## 5. Mobile Mandor

Tujuan UI mobile Mandor adalah approval inbox dan closing harian.

Wajib:
- `CONFLICT_PENDING` tampil paling prioritas.
- Konflik menampilkan pembanding visual antar transaksi.
- Aksi utama tersedia: `Approve`, `Reject`, `Reject Both`, `Request Correction`.
- Tombol closing hanya aktif ketika kondisi line/shift memenuhi rule.
- Notifikasi pending review terlihat tanpa membuka dashboard penuh.

## 6. Desktop Supervisor

Desktop Supervisor adalah control center.

Wajib:
- Sidebar atau navigasi tetap untuk Dashboard, Reports, Quarantine, Closing, Master Data, dan Audit.
- Filter server-side untuk tanggal, line, shift, machine, operator, dan status.
- Table dengan server-side pagination.
- Detail drawer untuk review tanpa kehilangan konteks tabel.
- Timeline event sourcing untuk transaksi konflik.

## 7. Desktop Management

Desktop Management bersifat read-only.

Wajib:
- Dashboard membaca `MASTER_RECAP`, bukan `RAW_LOGS`.
- Data `CONFLICT_PENDING` tidak dihitung.
- Tampilkan badge jika masih ada quarantine pending atau closing belum selesai.
- Widget utama: target vs actual, OK, reject, defect rate, closing status, Pareto defect, dan trend harian.

## 8. Hidden SuperAdmin Maintenance Console

Console maintenance untuk Script Properties harus terasa seperti tool administratif, bukan fitur operasional umum.

Wajib:
- Tersembunyi dari navigasi normal dan hanya tampil lewat hidden trigger yang disepakati.
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
| `shadow-soft` | `0 8px 24px rgba(15, 23, 42, 0.08)` | Panel penting. |
| `shadow-pressed` | `inset 2px 2px 5px rgba(15, 23, 42, 0.12), inset -2px -2px 5px rgba(255, 255, 255, 0.75)` | Toggle/segmented active state saja. |

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
- Bottom action bar boleh dipakai untuk submit/retry/sync.
- Status sync harus tetap terlihat tanpa membuka menu.
- Form utama harus selesai dalam alur input yang pendek.

Desktop:
- Gunakan sidebar tetap atau top-level tabs sesuai kepadatan fitur.
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
