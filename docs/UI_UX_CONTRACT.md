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

## 8. Status Treatment

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

## 9. Accessibility And Ergonomics

- Target sentuh mobile minimal 44px.
- Teks harus tetap terbaca di layar redup.
- Fokus keyboard harus terlihat.
- Gunakan ikon hanya sebagai pendamping teks untuk status penting.
- Jangan menaruh informasi kritis hanya di tooltip.
- Error harus menjelaskan tindakan berikutnya tanpa menampilkan detail internal.

