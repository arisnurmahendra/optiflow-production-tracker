# OPTIFLOW
> Operational Process Tracking & Integrated Floor-Workflow

OPTIFLOW adalah aplikasi pelaporan produksi harian berbasis web untuk menghilangkan pencatatan kertas, laporan WhatsApp yang tercecer, dan pekerjaan rekap manual di lini produksi manufaktur.

Sistem ini dirancang dengan pendekatan zero-cost infrastructure menggunakan Google Apps Script, Google Sheets, dan frontend Vue 3 yang dibundel menjadi satu `Index.html` untuk Google Apps Script HTML Service.

## Masalah Yang Diselesaikan

Pada proses berjalan, 100+ operator melaporkan hasil kerja harian seperti Tandon, Target, OK, dan Reject melalui chat atau kertas. Mandor harus menyalin ulang data tersebut ke buku statistik, memakan waktu sekitar 120 menit per hari dan membuka risiko salah input pada volume produksi 140.000+ unit per hari.

OPTIFLOW menargetkan:
- Rekap harian turun dari 120 menit menjadi sekitar 5 menit.
- Pengurangan kertas sekitar 54.000 lembar per tahun.
- Validasi Poka-Yoke agar `perolehan_ok + perolehan_reject` konsisten dengan total perolehan.
- Dashboard real-time untuk mandor, supervisor, dan manajemen.

## Stack Utama

- Backend: Google Apps Script V8.
- Frontend: Vue 3 Composition API.
- Build: Vite dengan `vite-plugin-singlefile`, menghasilkan satu `Index.html` tanpa file `.js` atau `.css` terpisah di `/dist`.
- Database: Google Sheets multi-sheet.
- Offline mode: IndexedDB queue di sisi client.
- Validasi client: Zod.
- Integrasi BI: Looker Studio atau dashboard internal HTML.

Catatan offline: OPTIFLOW bersifat Offline-Tolerant, bukan Offline-First penuh. Aplikasi membutuhkan koneksi untuk loading awal dari Google Apps Script HTML Service, lalu IndexedDB menjaga draft, cache referensi, dan queue sinkronisasi jika koneksi operator terputus saat input.

## Ruang Lingkup MVP

MVP difokuskan pada alur produksi inti:
1. Operator mengirim laporan harian dari UI mobile-friendly.
2. Backend memvalidasi payload, memastikan idempotency, lalu menulis ke `RAW_LOGS`.
3. Data anomali atau konflik masuk ke `QUARANTINE`.
4. Mandor/Supervisor melakukan verifikasi.
5. Proses batch membentuk `MASTER_RECAP`.
6. Manajemen membaca dashboard tanpa akses edit.

Upgrade proses setelah MVP:
- Pelaporan berbasis line dan shift.
- Draft autosave dan status sync per transaksi.
- Kategori defect untuk Pareto reject.
- Correction workflow sebelum approval final.
- Daily closing per line/shift.
- Adjustment log untuk koreksi setelah closing.
- Dashboard operasional dan dashboard improvement yang dipisahkan.
- Pilot rollout 1 line dan 1 shift sebelum skala penuh.

## Prinsip Arsitektur

- Documentation-Driven Development: kontrak markdown diperbarui sebelum kode.
- Defense in Depth: validasi terjadi di client dan server.
- Append-only event sourcing: transaksi masuk tidak diubah langsung.
- Soft-delete: tidak ada hard-delete untuk data master dan transaksi.
- PII isolation: enkripsi/dekripsi PII hanya di backend GAS.
- Blind indexing: pencarian PII memakai hash bayangan, bukan loop dekripsi.
- Server-side pagination: frontend tidak menarik seluruh dataset mentah.
- Conflict flagging: data offline yang berpotensi bentrok masuk `CONFLICT_PENDING` dan diselesaikan Mandor sebelum masuk dashboard manajemen.

## Dokumen Kontrak

- [AGENT.md](AGENT.md): aturan kerja agen dan batasan implementasi.
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): roadmap teknis dan urutan eksekusi.
- [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md): kontrak Google Sheets dan payload JSON.
- [docs/BUSINESS_PROCESS.md](docs/BUSINESS_PROCESS.md): SOP proses bisnis, role, dan alur approval.
- [docs/GUARDRAILS_CONTRACT.md](docs/GUARDRAILS_CONTRACT.md): aturan keamanan, performa, dan larangan teknis.
- [docs/KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md): latar belakang, metrik baseline, dan keputusan arsitektur.
- [docs/DOCUMENTATION_AUDIT.md](docs/DOCUMENTATION_AUDIT.md): audit konsistensi kontrak dokumentasi.
- [docs/UI_UX_CONTRACT.md](docs/UI_UX_CONTRACT.md): kontrak gaya Industrial Soft UI untuk mobile dan desktop.
- [docs/QCC_8_STEPS_7_TOOLS.md](docs/QCC_8_STEPS_7_TOOLS.md): kontrak narasi improvement QCC/Lean Six Sigma.
- [docs/POL.ISMS.001.md](docs/POL.ISMS.001.md): baseline kontrol keamanan untuk auth, PII, audit, API, dan deployment.
- [docs/SYSTEM_PROMPT.md](docs/SYSTEM_PROMPT.md): instruksi perilaku agen untuk pengembangan lanjutan.
- [ISSUE_TRACKER.md](ISSUE_TRACKER.md): backlog sinkronisasi GitHub Issues, labels, dan milestones.
- [ISSUE_TRACKER.json](ISSUE_TRACKER.json): versi machine-readable untuk otomasi sinkronisasi issue.

## Status Saat Ini

Repo masih berada pada tahap perencanaan dan kontrak implementasi. File Apps Script awal sudah ada, tetapi struktur Vue/Vite, adapter API, schema validator, dan test runner belum dibangun penuh.

Langkah berikutnya adalah mengikuti fase pada [Implementation Plan](docs/IMPLEMENTATION_PLAN.md), dimulai dari bootstrap struktur proyek dan setup kontrak sheet.

## Author

Aris Nur Mahendra  
Digital Transformation Specialist & Workflow Hacker
