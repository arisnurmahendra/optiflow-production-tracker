# KNOWLEDGE_BASE.md - OPTIFLOW Project Background

> Purpose: sumber konteks bisnis, baseline operasional, dan keputusan arsitektur utama.

## 1. Latar Belakang

OPTIFLOW dibuat untuk lini perakitan headset yang masih mengandalkan WhatsApp, kertas, dan rekap manual untuk laporan produksi harian.

Masalah utama:
- Laporan operator tersebar di beberapa media.
- Mandor perlu menyalin ulang data ke buku statistik.
- Rekap memakan waktu sekitar 120 menit per hari.
- Volume data harian tinggi, sekitar 140.000+ unit produksi.
- Kesalahan input sulit dicegah dan sulit dilacak.

## 2. Target Dampak

- Rekap harian turun menjadi sekitar 5 menit.
- Penggunaan kertas laporan turun drastis.
- Data produksi lebih cepat tersedia untuk mandor dan manajemen.
- Reject dan tren defect bisa dianalisis lebih cepat.
- Proses standar lebih mudah dipertahankan karena workflow masuk aplikasi.

## 3. Metodologi QCC

OPTIFLOW mengikuti pendekatan 8 Langkah QCC. Detail aturan narasi, tools, dan deliverables dijaga di `QCC_8_STEPS_7_TOOLS.md`.

Ringkasan langkah:
1. Menentukan tema dan analisis situasi.
2. Menetapkan target perbaikan.
3. Menganalisis akar masalah.
4. Menyusun rencana perbaikan.
5. Mengimplementasikan digitalisasi dan Poka-Yoke.
6. Mengevaluasi hasil before vs after.
7. Melakukan standardisasi SOP.
8. Menyiapkan ekspansi dan pengembangan lanjutan.

## 4. Keputusan Arsitektur

- Google Apps Script dipilih karena cocok dengan ekosistem Google Workspace dan tidak membutuhkan server tambahan.
- Google Sheets dipakai sebagai database awal dengan pola multi-sheet agar data mentah, konflik, rekap, dan role tidak bercampur.
- Vue 3 dipakai untuk membuat UI operator yang responsif dan mudah dikembangkan.
- IndexedDB dipakai untuk toleransi koneksi tidak stabil dan caching data referensi agar panggilan `google.script.run` berkurang.
- OPTIFLOW memakai istilah Offline-Tolerant, bukan Offline-First, karena GAS HTML Service berjalan di sandbox iframe dan Service Worker/PWA tidak didukung secara native sebagai dependency utama.
- `RAW_LOGS` dibuat append-only agar transaksi mudah diaudit.
- `QUARANTINE` dipakai untuk konflik dan anomali agar koreksi melibatkan manusia.
- `MASTER_RECAP` menjadi sumber dashboard agar UI tidak membaca semua data mentah.
- PII diproteksi melalui enkripsi backend dan blind indexing.
- Baseline keamanan mengikuti `POL.ISMS.001.md`.
- Strategi resolusi konflik memakai event sourcing: data offline selalu append-only ke `RAW_LOGS`, konflik menjadi `CONFLICT_PENDING`, dan Mandor menyelesaikan konflik melalui Human-in-the-Loop.
- Setiap iterasi perubahan wajib menjaga benang merah dengan referensi inovasi/QCC, termasuk materi "Mencari Ide Inovasi" bila tersedia di repo.

## 5. Risiko Yang Harus Dijaga

- Kuota dan timeout Google Apps Script.
- Kebocoran PII dari frontend atau audit log.
- Duplikasi transaksi akibat retry/offline sync.
- Konflik mesin sama/operator berbeda/waktu berdekatan yang belum diselesaikan Mandor.
- Rekap salah tanggal karena timezone.
- File build frontend terpisah sehingga tidak kompatibel dengan HTML Service.
- Penghapusan permanen yang menghilangkan jejak audit.
