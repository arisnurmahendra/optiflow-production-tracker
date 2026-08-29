# ⚡ OPTIFLOW 
> **Operational Process Tracking & Integrated Floor-Workflow**

OPTIFLOW adalah aplikasi pelaporan produksi harian berbasis web yang dirancang untuk mengeliminasi pencatatan manual berbasis kertas (*paperless*) dan *double-entry* pada lini produksi manufaktur. 

Dikembangkan menggunakan **Google Apps Script (GAS)** dan **Internal HTML Service**, OPTIFLOW memberikan solusi otomatisasi operasional dan *Business Intelligence Dashboard* secara *real-time* tanpa memerlukan investasi biaya infrastruktur *server* tambahan.

---

## 🎯 Masalah & Solusi (Problem & Solution)

### Problem Statement
Pada proses bisnis konvensional, 100+ operator melaporkan hasil kerja harian (Tandon, OK, Reject) melalui chat WA dan kertas fisik (±100 lembar kertas/hari). Mandor harus menyalin ulang data tersebut ke buku statistik manual, yang memakan waktu ±120 menit/hari serta berisiko tinggi terjadi *human error* pada penginputan 140.000+ unit barang per hari.

### Solution Impact
- **Efisiensi Waktu:** Memangkas waktu rekapitulasi data dari 120 menit menjadi 5 menit/hari (Efisiensi 95.8%).
- **Paperless & Eco-Friendly:** Mengeliminasi ±54.000 lembar kertas/tahun (Mereduksi ±270 kg CO2e/tahun).
- **Data Integrity (Poka-Yoke):** Validasi otomatis di mana `Perolehan` wajib sama dengan `OK + Reject`.
- **Real-Time BI:** Manajemen dapat memantau performa produksi dan tren defect secara langsung.

---

## 🛠️ Tech Stack & Architecture

- **Backend / Core Engine:** Google Apps Script (JavaScript ES6)
- **Frontend UI:** HTML5, CSS3 (Bootstrap / Tailwind), JavaScript (Asynchronous GAS API)
- **Database:** Google Sheets (Centralized Data Storage)
- **Analytics & BI:** Looker Studio / Internal HTML Web Dashboard

---

## ✨ Fitur Utama (Key Features)

1. **Multi-User & Role-Based Access Control:**
   - **Operator:** Form pelaporan ringkas & *mobile-friendly* (Input: Tandon, Target, OK, Reject).
   - **Supervisor/Mandor:** Fitur verifikasi, validasi, dan *approval* data harian.
   - **Management:** Akses *Read-Only* ke *Business Intelligence Dashboard*.
2. **Poka-Yoke Validation (System Guard):** Mencegah kesalahan input angka yang tidak sinkron secara *real-time*.
3. **Automated Summary & Analytics:** Rekapitulasi otomatis per operator, per lini kerja, dan per kategori produk.

---

## 🚀 Metodologi Pengembangan (8 Steps QCC & 7 Tools)

Aplikasi ini dikembangkan berdasarkan metodologi perbaikan mutu **8 Langkah QCC & Lean Six Sigma**:
1. Menentukan Tema & Analisis Situasi (SIPOC Diagram)
2. Menetapkan Target (SMART Principle)
3. Analisis Akar Masalah (Fishbone Diagram / 4M1E)
4. Rencana Perbaikan (5W + 1H Matrix)
5. Implementasi Sistem (Poka-Yoke & Digitalization)
6. Evaluasi Hasil (Perbandingan Metrics Before vs After)
7. Standardisasi (SOP & System Auto-lock)
8. Rencana Selanjutnya (Predictive Maintenance & Horizontal Expansion)

---

## 👤 Author & Contributor

**Aris Nur Mahendra**  
*Digital Transformation Specialist & Workflow Hacker*  
- LinkedIn: [Link LinkedIn Anda]
- Portfolio / Contact: [Email / Website Anda]

---
*Project ini dibuat sebagai solusi perbaikan proses bisnis (Process Improvement) pada lini perakitan manufaktur.*
