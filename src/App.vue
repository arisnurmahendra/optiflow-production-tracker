<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

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

const maintenanceProperties = ref([
  {
    key: 'AUTH_MODE',
    sensitivity: 'CONFIG',
    status: 'SET',
    value_preview: 'OFF',
    updatable: true,
    deletable: false,
    rotatable: false,
  },
  {
    key: 'SPREADSHEET_ID',
    sensitivity: 'CONFIG',
    status: 'SET',
    value_preview: '1abc...2345',
    updatable: true,
    deletable: true,
    rotatable: false,
  },
  {
    key: 'APP_ACTIVE_UNTIL',
    sensitivity: 'CONFIG',
    status: 'SET',
    value_preview: '2099-12-31',
    updatable: true,
    deletable: true,
    rotatable: false,
  },
  {
    key: 'ENCRYPTION_SALT',
    sensitivity: 'SECRET',
    status: 'SET',
    value_preview: '',
    updatable: false,
    deletable: false,
    rotatable: true,
  },
]);

const isMaintenanceOpen = ref(false);
const tapCount = ref(0);
let keyBuffer = '';

const maintenanceSummary = computed(() => {
  const setCount = maintenanceProperties.value.filter((property) => property.status === 'SET').length;
  return `${setCount}/${maintenanceProperties.value.length} key siap`;
});

function openMaintenanceConsole() {
  isMaintenanceOpen.value = true;
}

function closeMaintenanceConsole() {
  isMaintenanceOpen.value = false;
}

function handleBrandTap() {
  tapCount.value += 1;

  if (tapCount.value >= 5) {
    openMaintenanceConsole();
    tapCount.value = 0;
  }

  window.setTimeout(() => {
    tapCount.value = 0;
  }, 1400);
}

function handleKeydown(event) {
  if (event.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) {
    return;
  }

  keyBuffer = `${keyBuffer}${event.key}`.toUpperCase().replace(/[^A-Z]/g, '').slice(-14);

  if (keyBuffer.endsWith('OPTIFLOWADMIN')) {
    openMaintenanceConsole();
    keyBuffer = '';
  }

  if (event.key === 'Escape') {
    closeMaintenanceConsole();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <button class="brand-trigger" type="button" aria-label="OPTIFLOW maintenance trigger" @click="handleBrandTap">
          OPTIFLOW
        </button>
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

    <section
      v-if="isMaintenanceOpen"
      class="maintenance-console"
      aria-labelledby="maintenance-title"
      role="dialog"
      aria-modal="true"
    >
      <div class="maintenance-scrim" @click="closeMaintenanceConsole"></div>
      <div class="maintenance-panel">
        <div class="section-title">
          <div>
            <p class="eyebrow">SuperAdmin</p>
            <h2 id="maintenance-title">Maintenance console</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup maintenance console" @click="closeMaintenanceConsole">
            X
          </button>
        </div>

        <div class="maintenance-status">
          <span class="status success">{{ maintenanceSummary }}</span>
          <span class="status warning">Secret status-only</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Type</th>
                <th>Status</th>
                <th>Preview</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="property in maintenanceProperties" :key="property.key">
                <td>{{ property.key }}</td>
                <td>{{ property.sensitivity }}</td>
                <td>
                  <span :class="['status', property.status === 'SET' ? 'success' : 'warning']">
                    {{ property.status }}
                  </span>
                </td>
                <td>{{ property.value_preview || 'Hidden' }}</td>
                <td>
                  <div class="maintenance-actions">
                    <button class="button secondary compact-button" type="button" :disabled="!property.updatable">
                      Update
                    </button>
                    <button class="button secondary compact-button" type="button" :disabled="!property.deletable">
                      Delete
                    </button>
                    <button class="button primary compact-button" type="button" :disabled="!property.rotatable">
                      Rotate
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="maintenance-note">
          Endpoint GAS wajib memvalidasi allowlist, RBAC, dan audit sebelum aksi ini aktif penuh lewat apiAdapter.
        </p>
      </div>
    </section>
  </main>
</template>
