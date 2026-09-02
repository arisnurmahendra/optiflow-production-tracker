<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useOperatorReportStore } from './composables/useOperatorReportStore.js';
import { ApiAdapterError, api } from './services/apiAdapter.js';
import {
  defectOptions,
  formatNumber,
  lineOptions,
  machineOptions,
  shiftOptions,
} from './services/operatorReportForm.js';

const operatorStore = useOperatorReportStore();
const {
  clearFieldError,
  draftStatus,
  form,
  formErrors,
  hydrate,
  isTotalValid,
  metrics,
  normalizeRejectState,
  persistenceError,
  queueItems,
  saveDraft,
  shouldShowDefect,
  submitMessage,
  submitOperatorReport,
  syncError,
  syncQueue,
  syncStatus,
  isSyncing,
  totalOutput,
} = operatorStore;

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
const isMaintenanceLoading = ref(false);
const maintenanceError = ref('');
const tapCount = ref(0);
let keyBuffer = '';
const maintenanceSession = { simulated_role: 'SuperAdmin' };

const maintenanceSummary = computed(() => {
  const setCount = maintenanceProperties.value.filter((property) => property.status === 'SET').length;
  return `${setCount}/${maintenanceProperties.value.length} key siap`;
});

function openMaintenanceConsole() {
  isMaintenanceOpen.value = true;
  refreshMaintenanceProperties();
}

function closeMaintenanceConsole() {
  isMaintenanceOpen.value = false;
  maintenanceError.value = '';
}

async function refreshMaintenanceProperties() {
  isMaintenanceLoading.value = true;
  maintenanceError.value = '';

  try {
    const response = await api.getScriptPropertiesStatus({ session: maintenanceSession });
    maintenanceProperties.value = response.data.properties || [];
  } catch (error) {
    maintenanceError.value = getSafeErrorMessage(error);
  } finally {
    isMaintenanceLoading.value = false;
  }
}

async function updateMaintenanceProperty(property) {
  const nextValue = window.prompt(`Nilai baru untuk ${property.key}`, property.value_preview || '');

  if (nextValue === null) {
    return;
  }

  await runMaintenanceAction(() => api.setScriptProperty({
    session: maintenanceSession,
    key: property.key,
    value: nextValue,
  }));
}

async function deleteMaintenanceProperty(property) {
  if (!window.confirm(`Hapus value ${property.key}?`)) {
    return;
  }

  await runMaintenanceAction(() => api.deleteScriptProperty({
    session: maintenanceSession,
    key: property.key,
  }));
}

async function rotateMaintenanceProperty(property) {
  if (!window.confirm(`Rotate secret ${property.key}? Nilai lama tidak akan ditampilkan.`)) {
    return;
  }

  await runMaintenanceAction(() => api.rotateSecretProperty({
    session: maintenanceSession,
    key: property.key,
  }));
}

async function runMaintenanceAction(action) {
  isMaintenanceLoading.value = true;
  maintenanceError.value = '';

  try {
    await action();
    await refreshMaintenanceProperties();
  } catch (error) {
    maintenanceError.value = getSafeErrorMessage(error);
  } finally {
    isMaintenanceLoading.value = false;
  }
}

function getSafeErrorMessage(error) {
  if (error instanceof ApiAdapterError) {
    return `${error.code}: ${error.message}`;
  }

  return 'Aksi gagal. Periksa koneksi atau permission SuperAdmin.';
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
  hydrate();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  operatorStore.dispose();
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
          <span class="badge">{{ draftStatus }}</span>
        </div>

        <div class="field-grid">
          <label class="field">
            <span>Line</span>
            <select v-model="form.line_id" aria-label="Line" @change="clearFieldError('line_id')">
              <option v-for="option in lineOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.line_id" class="field-error">{{ formErrors.line_id }}</small>
          </label>
          <label class="field">
            <span>Shift</span>
            <select v-model="form.shift_id" aria-label="Shift" @change="clearFieldError('shift_id')">
              <option v-for="option in shiftOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.shift_id" class="field-error">{{ formErrors.shift_id }}</small>
          </label>
          <label class="field">
            <span>Machine</span>
            <select v-model="form.machine_id" aria-label="Machine" @change="clearFieldError('machine_id')">
              <option v-for="option in machineOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.machine_id" class="field-error">{{ formErrors.machine_id }}</small>
          </label>
        </div>

        <div class="number-grid">
          <label class="number-field">
            <span>Target</span>
            <input v-model.number="form.target_harian" inputmode="numeric" aria-label="Target" @input="clearFieldError('target_harian')" />
            <small v-if="formErrors.target_harian" class="field-error">{{ formErrors.target_harian }}</small>
          </label>
          <label class="number-field">
            <span>Tandon</span>
            <input v-model.number="form.tandon" inputmode="numeric" aria-label="Tandon" @input="clearFieldError('tandon')" />
            <small v-if="formErrors.tandon" class="field-error">{{ formErrors.tandon }}</small>
          </label>
          <label class="number-field">
            <span>OK</span>
            <input v-model.number="form.perolehan_ok" inputmode="numeric" aria-label="OK" @input="clearFieldError('perolehan_ok')" />
            <small v-if="formErrors.perolehan_ok" class="field-error">{{ formErrors.perolehan_ok }}</small>
          </label>
          <label class="number-field danger">
            <span>Reject</span>
            <input v-model.number="form.perolehan_reject" inputmode="numeric" aria-label="Reject" @input="normalizeRejectState" />
            <small v-if="formErrors.perolehan_reject" class="field-error">{{ formErrors.perolehan_reject }}</small>
          </label>
        </div>

        <div v-if="shouldShowDefect" class="defect-row">
          <label class="field">
            <span>Kategori defect</span>
            <select v-model="form.defect_category_id" aria-label="Kategori defect" @change="clearFieldError('defect_category_id')">
              <option v-for="option in defectOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.defect_category_id" class="field-error">{{ formErrors.defect_category_id }}</small>
          </label>
          <label class="field">
            <span>Catatan</span>
            <input v-model="form.defect_notes" aria-label="Catatan defect" maxlength="140" @input="clearFieldError('defect_notes')" />
            <small v-if="formErrors.defect_notes" class="field-error">{{ formErrors.defect_notes }}</small>
          </label>
        </div>

        <div :class="['check-row', isTotalValid ? 'valid' : 'invalid']">
          <span>Total perolehan</span>
          <strong>{{ formatNumber(totalOutput) }}</strong>
          <small>{{ isTotalValid ? 'OK + Reject masih dalam Target + Tandon' : 'OK + Reject melebihi Target + Tandon' }}</small>
        </div>

        <div v-if="persistenceError" class="inline-error" role="alert">
          {{ persistenceError }}
        </div>

        <div v-if="submitMessage" class="inline-info" role="status">
          {{ submitMessage }}
        </div>

        <div class="action-row">
          <button class="button secondary" type="button" @click="saveDraft">Simpan Draft</button>
          <button class="button primary" type="button" @click="submitOperatorReport">Submit</button>
        </div>
      </section>

      <aside class="panel queue-panel" aria-labelledby="queue-title">
        <div class="section-title compact">
          <div>
            <p class="eyebrow">Sync</p>
            <h2 id="queue-title">Antrean device</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Retry sync" :disabled="isSyncing" @click="syncQueue">
            R
          </button>
        </div>

        <div class="sync-summary" role="status">
          {{ syncStatus }}
        </div>

        <div v-if="syncError" class="inline-error" role="alert">
          {{ syncError }}
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
          <span v-if="isMaintenanceLoading" class="status warning">Loading</span>
        </div>

        <div v-if="maintenanceError" class="inline-error" role="alert">
          {{ maintenanceError }}
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
                    <button
                      class="button secondary compact-button"
                      type="button"
                      :disabled="isMaintenanceLoading || !property.updatable"
                      @click="updateMaintenanceProperty(property)"
                    >
                      Update
                    </button>
                    <button
                      class="button secondary compact-button"
                      type="button"
                      :disabled="isMaintenanceLoading || !property.deletable"
                      @click="deleteMaintenanceProperty(property)"
                    >
                      Delete
                    </button>
                    <button
                      class="button primary compact-button"
                      type="button"
                      :disabled="isMaintenanceLoading || !property.rotatable"
                      @click="rotateMaintenanceProperty(property)"
                    >
                      Rotate
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="maintenance-note">
          Semua aksi melewati apiAdapter, callable allowlist, validasi backend, RBAC, dan audit.
        </p>
      </div>
    </section>
  </main>
</template>
