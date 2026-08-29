<script setup>
const metrics = [
  { label: 'Target', value: '1,200', tone: 'neutral' },
  { label: 'OK', value: '1,164', tone: 'success' },
  { label: 'Reject', value: '36', tone: 'danger' },
  { label: 'Queue', value: '2', tone: 'warning' },
];

const fields = [
  { label: 'Line', value: 'SMT-02' },
  { label: 'Shift', value: 'Pagi' },
  { label: 'Machine', value: 'SLD-14' },
  { label: 'Defect', value: 'Solder tipis' },
];

const queueItems = [
  { id: 'TX-1042', status: 'PENDING_SYNC', time: '08:42' },
  { id: 'TX-1043', status: 'CONFLICT_PENDING', time: '08:51' },
];

const reviewRows = [
  { machine: 'SLD-14', operator: 'Andi', ok: 420, reject: 8, status: 'SYNCED' },
  { machine: 'SLD-14', operator: 'Rina', ok: 416, reject: 12, status: 'CONFLICT_PENDING' },
  { machine: 'SLD-18', operator: 'Budi', ok: 328, reject: 5, status: 'PENDING_SYNC' },
];
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">OPTIFLOW</p>
        <h1>Input produksi harian</h1>
      </div>
      <div class="sync-pill" aria-label="Status sinkronisasi">
        <span class="dot"></span>
        Offline - draft aman
      </div>
    </header>

    <section class="metric-strip" aria-label="Ringkasan produksi">
      <article v-for="metric in metrics" :key="metric.label" :class="['metric', metric.tone]">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </section>

    <div class="workspace">
      <section class="panel input-panel" aria-labelledby="form-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Operator</p>
            <h2 id="form-title">Laporan cepat</h2>
          </div>
          <span class="badge">Draft tersimpan</span>
        </div>

        <div class="field-grid">
          <label v-for="field in fields" :key="field.label" class="field">
            <span>{{ field.label }}</span>
            <select :aria-label="field.label">
              <option>{{ field.value }}</option>
            </select>
          </label>
        </div>

        <div class="number-grid">
          <label class="number-field">
            <span>Tandon</span>
            <input value="80" inputmode="numeric" aria-label="Tandon" />
          </label>
          <label class="number-field">
            <span>OK</span>
            <input value="1164" inputmode="numeric" aria-label="OK" />
          </label>
          <label class="number-field danger">
            <span>Reject</span>
            <input value="36" inputmode="numeric" aria-label="Reject" />
          </label>
        </div>

        <div class="check-row">
          <span>Total perolehan</span>
          <strong>1,200</strong>
          <small>OK + Reject sesuai target</small>
        </div>

        <div class="action-row">
          <button class="button secondary" type="button">Simpan Draft</button>
          <button class="button primary" type="button">Submit</button>
        </div>
      </section>

      <aside class="panel queue-panel" aria-labelledby="queue-title">
        <div class="section-title compact">
          <div>
            <p class="eyebrow">Sync</p>
            <h2 id="queue-title">Antrean device</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Retry sync">↻</button>
        </div>

        <ul class="queue-list">
          <li v-for="item in queueItems" :key="item.id">
            <div>
              <strong>{{ item.id }}</strong>
              <span>{{ item.time }}</span>
            </div>
            <span :class="['status', item.status === 'CONFLICT_PENDING' ? 'conflict' : 'warning']">
              {{ item.status }}
            </span>
          </li>
        </ul>

        <div class="hint-box">
          Data konflik tidak masuk dashboard sampai Mandor menyetujui.
        </div>
      </aside>

      <section class="panel review-panel" aria-labelledby="review-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Mandor</p>
            <h2 id="review-title">Review transaksi</h2>
          </div>
          <span class="badge conflict">1 konflik</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Machine</th>
                <th>Operator</th>
                <th>OK</th>
                <th>Reject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reviewRows" :key="`${row.machine}-${row.operator}`">
                <td>{{ row.machine }}</td>
                <td>{{ row.operator }}</td>
                <td>{{ row.ok }}</td>
                <td>{{ row.reject }}</td>
                <td>
                  <span :class="['status', row.status === 'CONFLICT_PENDING' ? 'conflict' : row.status === 'SYNCED' ? 'success' : 'warning']">
                    {{ row.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>
