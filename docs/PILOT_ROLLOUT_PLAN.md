# PILOT_ROLLOUT_PLAN.md - OPTIFLOW 1 Line / 1 Shift Pilot

Purpose: menjalankan pilot kecil sebelum rollout ke banyak operator.

## 1. Scope

- Line: 1 line produksi.
- Shift: 1 shift.
- Role lapangan: minimal 1 Mandor dan beberapa Operator.
- Durasi rekomendasi: 1-2 minggu.
- Data resmi pilot tetap mengikuti append-only `RAW_LOGS`, quarantine, closing, adjustment, dan `MASTER_RECAP`.

## 2. Entry Criteria

- `npm test`, `npm run build:verify`, `npm run prepare:gas`, dan `npm audit --audit-level=moderate` pass.
- Production hardening checklist tidak memiliki P0 terbuka untuk scope pilot.
- Akun pilot sudah ada di `USER_ROLES`.
- Permission pilot sudah ada di `ROLE_PERMISSIONS`.
- Mandor memahami approve/reject/correction, closing, adjustment, dan recap.

## 3. Metrics

| Metric | Target Pilot | Source |
| :--- | :--- | :--- |
| Waktu submit operator | Turun dibanding proses manual baseline. | Observasi dan app timestamp |
| Waktu review quarantine | Terukur per kasus. | `QUARANTINE.reviewed_at` |
| Waktu recap | Terukur dan repeatable. | `MASTER_RECAP.generated_at` |
| Duplicate rate | Menurun atau tertangani lewat idempotency/quarantine. | `RAW_LOGS`, `QUARANTINE` |
| Sync failure rate | Tercatat dan tidak menghilangkan data. | IndexedDB queue dan audit |
| Correction request | Tercatat sebagai sinyal training/SOP. | `QUARANTINE`, `ADJUSTMENT_LOGS` |

## 4. Daily Ritual

1. Operator submit data produksi.
2. Mandor review quarantine dan correction request.
3. Mandor melakukan daily closing.
4. Koreksi setelah closing dicatat lewat adjustment.
5. Supervisor atau Management menjalankan recap.
6. Temuan harian dicatat sebagai PICA pilot.

## 5. Exit Criteria

- Data pilot lengkap untuk minimal satu siklus line/shift.
- Mandor menyetujui SOP harian.
- Risiko rollout memiliki corrective action.
- Keputusan tertulis: lanjut rollout, perpanjang pilot, atau kembali ke countermeasure.

