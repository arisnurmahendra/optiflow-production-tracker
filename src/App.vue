<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useOperatorReportStore } from './composables/useOperatorReportStore.js';
import { ApiAdapterError, api } from './services/apiAdapter.js';
import {
  approvalLineOptions,
  approvalStatusOptions,
  filterApprovalCases,
  findApprovalCase,
  initialApprovalCases,
  resolveApprovalCase,
  summarizeApprovalCases,
} from './services/approvalInbox.js';
import {
  defectOptions,
  formatNumber,
  createParetoRejectSummary,
  getDefectCategory,
  lineOptions,
  machineOptions,
  shiftOptions,
} from './services/operatorReportForm.js';
import {
  buildDashboardTiles,
  defaultDashboardFilters,
  formatCompact,
} from './services/managementDashboard.js';
import {
  createAdjustmentPayload,
  createClosingPayload,
  defaultSupervisorFilters,
  getFirstPageItems,
  summarizeControlCenter,
} from './services/supervisorControlCenter.js';

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

const approvalCases = ref(initialApprovalCases.map((item) => ({ ...item })));
const approvalStatusFilter = ref('ALL');
const approvalLineFilter = ref('ALL');
const activeApprovalId = ref(initialApprovalCases[0]?.id || '');
const approvalMessage = ref('');

const approvalSummary = computed(() => summarizeApprovalCases(approvalCases.value));
const filteredApprovalCases = computed(() => filterApprovalCases(approvalCases.value, {
  status: approvalStatusFilter.value,
  line: approvalLineFilter.value,
}));
const activeApprovalCase = computed(() =>
  findApprovalCase(approvalCases.value, activeApprovalId.value) || filteredApprovalCases.value[0] || null,
);
const activeComparisonRows = computed(() => {
  if (!activeApprovalCase.value) {
    return [];
  }

  return [
    ['Operator', activeApprovalCase.value.current.operator_email_masked, activeApprovalCase.value.conflict_with?.operator_email_masked || '-'],
    ['Waktu Device', formatDateTime(activeApprovalCase.value.current.device_timestamp), formatDateTime(activeApprovalCase.value.conflict_with?.device_timestamp)],
    ['OK', formatNumber(activeApprovalCase.value.current.ok), formatNumber(activeApprovalCase.value.conflict_with?.ok)],
    ['Reject', formatNumber(activeApprovalCase.value.current.reject), formatNumber(activeApprovalCase.value.conflict_with?.reject)],
    ['Defect', activeApprovalCase.value.current.defect_category_id || '-', activeApprovalCase.value.conflict_with?.defect_category_id || '-'],
  ];
});
const supervisorFilters = ref({ ...defaultSupervisorFilters });
const supervisorData = ref(null);
const supervisorLoading = ref(false);
const supervisorError = ref('');
const supervisorMessage = ref('');
const supervisorLoaded = ref(false);
const dashboardFilters = ref({ ...defaultDashboardFilters });
const dashboardData = ref(null);
const dashboardLoading = ref(false);
const dashboardError = ref('');
const dashboardLoaded = ref(false);
const roleOptions = Object.freeze(['Operator', 'Mandor', 'Management', 'HRD', 'SuperAdmin']);
const roleIcons = Object.freeze({
  Operator: '📝',
  Mandor: '✅',
  Management: '📈',
  HRD: '👤',
  SuperAdmin: '🔐',
});
const workflowRoleMap = Object.freeze({
  operator: Object.freeze(['Operator', 'SuperAdmin']),
  mandor: Object.freeze(['Mandor', 'SuperAdmin']),
  supervisor: Object.freeze(['Mandor', 'SuperAdmin']),
  management: Object.freeze(['Management', 'SuperAdmin']),
  hrd: Object.freeze(['HRD', 'SuperAdmin']),
});
const workflowIconMap = Object.freeze({
  operator: roleIcons.Operator,
  mandor: roleIcons.Mandor,
  supervisor: '📊',
  management: roleIcons.Management,
  hrd: roleIcons.HRD,
});
const selectedRole = ref(readPreferredRole());
const visibleRoles = ref(readVisibleRoles());
const sessionContext = ref(null);
const sessionLoading = ref(false);
const sessionError = ref('');
const sessionMessage = ref('');
const supervisorTiles = computed(() => summarizeControlCenter(supervisorData.value || {}));
const dashboardTiles = computed(() => buildDashboardTiles(dashboardData.value || {}));
const supervisorRawRows = computed(() => getFirstPageItems(supervisorData.value?.raw_logs));
const supervisorQuarantineRows = computed(() => getFirstPageItems(supervisorData.value?.quarantine));
const dashboardRows = computed(() => getFirstPageItems(dashboardData.value?.rows));
const selectedDefectCategory = computed(() => getDefectCategory(form.value.defect_category_id));
const paretoPreview = computed(() => createParetoRejectSummary([
  {
    payload: {
      defect_category_id: form.value.defect_category_id,
      perolehan_reject: form.value.perolehan_reject,
    },
  },
  ...queueItems.value.map((item) => item.payload),
]));
const activeView = ref('operator');
const appViews = computed(() => [
  {
    id: 'operator',
    icon: '📝',
    label: 'Operator',
    title: 'Input produksi harian',
    subtitle: 'Pelaporan cepat dengan draft lokal dan antrean sinkronisasi.',
    badge: queueItems.value.length ? `${queueItems.value.length} queue` : draftStatus.value,
  },
  {
    id: 'mandor',
    icon: '✅',
    label: 'Mandor',
    title: 'Approval inbox',
    subtitle: 'Review konflik, koreksi, dan keputusan Human-in-the-Loop.',
    badge: approvalSummary.value.conflict ? `${approvalSummary.value.conflict} konflik` : 'Terkendali',
  },
  {
    id: 'supervisor',
    icon: '📊',
    label: 'Supervisor',
    title: 'Control center',
    subtitle: 'Pantau transaksi, quarantine, closing, dan adjustment per line/shift.',
    badge: supervisorLoading.value ? 'Memuat' : 'Live view',
  },
  {
    id: 'management',
    icon: '📈',
    label: 'Management',
    title: 'Read-only dashboard',
    subtitle: 'KPI final berbasis MASTER_RECAP tanpa data konflik pending.',
    badge: dashboardLoading.value ? 'Memuat' : 'MASTER_RECAP',
  },
  {
    id: 'hrd',
    icon: roleIcons.HRD,
    label: 'HRD',
    title: 'User privacy',
    subtitle: 'Review kesiapan akses user tanpa membuka PII mentah.',
    badge: 'PII guarded',
  },
  {
    id: 'settings',
    icon: '⚙️',
    label: 'Pengaturan',
    title: 'Pengaturan user',
    subtitle: 'Try role untuk demo/trial tanpa berganti akun email.',
    badge: selectedRole.value,
  },
]);
const activeViewMeta = computed(() =>
  appViews.value.find((view) => view.id === activeView.value) || appViews.value[0],
);
const navViews = computed(() => appViews.value
  .filter((view) =>
    view.id !== 'settings'
    && (workflowRoleMap[view.id] || []).some((role) => visibleRoles.value.includes(role)),
  )
  .map((view) => ({
    ...view,
    icon: workflowIconMap[view.id] || view.icon,
  })));
const currentSessionLabel = computed(() => {
  if (sessionContext.value?.auth_mode === 'ON') {
    return `${sessionContext.value.role || 'Unknown'} dari Google Account`;
  }

  return `Try as ${selectedRole.value}`;
});
const sessionModeLabel = computed(() =>
  sessionContext.value?.auth_mode === 'ON' ? 'Email login aktif' : 'Demo role aktif',
);

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
    key: 'REQUIRE_REGISTERED_EMAIL_LOGIN',
    sensitivity: 'CONFIG',
    status: 'SET',
    value_preview: 'FALSE',
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
    const response = await api.getScriptPropertiesStatus({ session: buildSessionPayload() });
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
    session: buildSessionPayload(),
    key: property.key,
    value: nextValue,
  }));
}

async function deleteMaintenanceProperty(property) {
  if (!window.confirm(`Hapus value ${property.key}?`)) {
    return;
  }

  await runMaintenanceAction(() => api.deleteScriptProperty({
    session: buildSessionPayload(),
    key: property.key,
  }));
}

async function rotateMaintenanceProperty(property) {
  if (!window.confirm(`Rotate secret ${property.key}? Nilai lama tidak akan ditampilkan.`)) {
    return;
  }

  await runMaintenanceAction(() => api.rotateSecretProperty({
    session: buildSessionPayload(),
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

function setActiveApprovalCase(id) {
  activeApprovalId.value = id;
  approvalMessage.value = '';
}

async function stageApprovalAction(action) {
  if (!activeApprovalCase.value) {
    return;
  }

  const decisionMap = {
    APPROVE_CURRENT: api.approveQuarantine,
    REJECT_BOTH: api.rejectQuarantine,
    REQUEST_CORRECTION: api.requestQuarantineCorrection,
  };

  try {
    await decisionMap[action]({
      session: buildSessionPayload(),
      quarantine_id: activeApprovalCase.value.id,
      notes: action.replace(/_/g, ' '),
    });
    approvalMessage.value = `Keputusan ${action.replace(/_/g, ' ')} tersimpan di backend.`;
  } catch (error) {
    approvalMessage.value = `${getSafeErrorMessage(error)} Keputusan distage lokal.`;
  }

  approvalCases.value = resolveApprovalCase(approvalCases.value, activeApprovalCase.value.id, action);
  await refreshSupervisorControlCenter();
}

async function refreshSupervisorControlCenter() {
  supervisorLoading.value = true;
  supervisorError.value = '';

  try {
    const response = await api.getSupervisorControlCenter({
      session: buildSessionPayload(),
      filter: compactFilter(supervisorFilters.value),
      page: 1,
      page_size: 8,
    });
    supervisorData.value = response.data;
    supervisorLoaded.value = true;
  } catch (error) {
    supervisorError.value = getSafeErrorMessage(error);
  } finally {
    supervisorLoading.value = false;
  }
}

async function closeCurrentScope() {
  if (!window.confirm('Closing line/shift ini?')) {
    return;
  }

  supervisorMessage.value = '';
  try {
    await api.closeDailyClosing({
      session: buildSessionPayload(),
      ...createClosingPayload(supervisorFilters.value, 'Closed from supervisor control center.'),
    });
    supervisorMessage.value = 'Closing tersimpan.';
    await refreshSupervisorControlCenter();
    await refreshManagementDashboard();
  } catch (error) {
    supervisorError.value = getSafeErrorMessage(error);
  }
}

async function createAdjustmentFromFirstRow() {
  const firstRow = supervisorRawRows.value[0];
  if (!firstRow) {
    supervisorError.value = 'Tidak ada transaksi sumber untuk adjustment.';
    return;
  }

  if (!window.confirm('Buat adjustment draft dari transaksi pertama pada filter ini?')) {
    return;
  }

  try {
    await api.createAdjustment({
      session: buildSessionPayload(),
      ...createAdjustmentPayload(firstRow.transaction_id, { perolehan_ok: 0 }, 'No-op verification adjustment.'),
    });
    supervisorMessage.value = 'Adjustment draft dibuat.';
    await refreshSupervisorControlCenter();
  } catch (error) {
    supervisorError.value = getSafeErrorMessage(error);
  }
}

async function runRecapAndDashboard() {
  dashboardLoading.value = true;
  dashboardError.value = '';

  try {
    await api.runMasterRecap({
      session: buildSessionPayload(),
      filter: compactFilter(dashboardFilters.value),
      page: 1,
      page_size: 8,
    });
    await refreshManagementDashboard();
  } catch (error) {
    dashboardError.value = getSafeErrorMessage(error);
    dashboardLoading.value = false;
  }
}

async function refreshManagementDashboard() {
  dashboardLoading.value = true;
  dashboardError.value = '';

  try {
    const response = await api.getManagementDashboard({
      session: buildSessionPayload(),
      filter: compactFilter(dashboardFilters.value),
      page: 1,
      page_size: 8,
    });
    dashboardData.value = response.data;
    dashboardLoaded.value = true;
  } catch (error) {
    dashboardError.value = getSafeErrorMessage(error);
  } finally {
    dashboardLoading.value = false;
  }
}

async function submitOperatorReportWithSession() {
  return submitOperatorReport({
    session: buildSessionPayload(),
    simulatedRole: selectedRole.value,
  });
}

async function syncQueueWithSession() {
  return syncQueue({
    session: buildSessionPayload(),
    simulatedRole: selectedRole.value,
  });
}

async function refreshSessionContext() {
  sessionLoading.value = true;
  sessionError.value = '';

  try {
    const response = await api.getSessionContext(buildSessionPayload());
    sessionContext.value = response.data;
    sessionMessage.value = sessionContext.value?.requires_role_selection
      ? 'Pilih role untuk demo/trial.'
      : `Session aktif sebagai ${sessionContext.value?.role || selectedRole.value}.`;
  } catch (error) {
    sessionError.value = getSafeErrorMessage(error);
  } finally {
    sessionLoading.value = false;
  }
}

async function setTryRole(role) {
  if (!roleOptions.includes(role)) {
    return;
  }

  const wasVisible = visibleRoles.value.includes(role);
  let nextVisibleRoles = wasVisible
    ? visibleRoles.value.filter((item) => item !== role)
    : [...visibleRoles.value, role];

  if (nextVisibleRoles.length === 0) {
    nextVisibleRoles = [role];
  }

  visibleRoles.value = nextVisibleRoles;
  selectedRole.value = wasVisible && selectedRole.value === role
    ? nextVisibleRoles[0]
    : role;
  persistPreferredRole(selectedRole.value);
  persistVisibleRoles(nextVisibleRoles);
  ensureVisibleActiveView();
  sessionError.value = '';
  sessionMessage.value = `Role demo langsung aktif sebagai ${selectedRole.value}.`;
  void refreshSessionContext();
}

async function switchView(viewId) {
  if (viewId !== 'settings' && !navViews.value.some((view) => view.id === viewId)) {
    return;
  }

  activeView.value = viewId;

  if (viewId === 'supervisor' && !supervisorLoaded.value) {
    await refreshSupervisorControlCenter();
  }

  if (viewId === 'management' && !dashboardLoaded.value) {
    await refreshManagementDashboard();
  }

  if (viewId === 'settings') {
    await refreshSessionContext();
  }
}

function ensureVisibleActiveView() {
  if (activeView.value === 'settings' || navViews.value.some((view) => view.id === activeView.value)) {
    return;
  }

  activeView.value = navViews.value[0]?.id || 'settings';
}

function buildSessionPayload() {
  return {
    simulated_role: selectedRole.value,
  };
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
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
  ensureVisibleActiveView();
  refreshSessionContext();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  operatorStore.dispose();
  window.removeEventListener('keydown', handleKeydown);
});

function compactFilter(filter) {
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== ''));
}

function readPreferredRole() {
  try {
    const storedRole = window.localStorage.getItem('optiflow.try_role');
    return roleOptions.includes(storedRole) ? storedRole : 'Operator';
  } catch {
    return 'Operator';
  }
}

function readVisibleRoles() {
  try {
    const storedRoles = JSON.parse(window.localStorage.getItem('optiflow.visible_roles') || '[]');
    const validRoles = Array.isArray(storedRoles)
      ? storedRoles.filter((role) => roleOptions.includes(role))
      : [];
    return validRoles.length ? [...new Set(validRoles)] : ['Operator', 'Mandor', 'Management'];
  } catch {
    return ['Operator', 'Mandor', 'Management'];
  }
}

function persistPreferredRole(role) {
  try {
    window.localStorage.setItem('optiflow.try_role', role);
  } catch {
    // localStorage is optional; selected role still works for this session.
  }
}

function persistVisibleRoles(roles) {
  try {
    window.localStorage.setItem('optiflow.visible_roles', JSON.stringify(roles));
  } catch {
    // localStorage is optional; visible roles still work for this session.
  }
}
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="title-stack">
        <button class="brand-trigger" type="button" aria-label="OPTIFLOW maintenance trigger" @click="handleBrandTap">
          OPTIFLOW
        </button>
        <h1>{{ activeViewMeta.title }}</h1>
        <p>{{ activeViewMeta.subtitle }}</p>
      </div>
      <div class="top-actions">
        <div class="sync-pill" aria-label="Status sinkronisasi">
          <span class="dot"></span>
          {{ syncStatus }}
        </div>
        <button
          :class="['session-fab', { active: activeView === 'settings' }]"
          type="button"
          aria-label="Buka pengaturan sesi"
          @click="switchView('settings')"
        >
          <span aria-hidden="true">⚙️</span>
          <strong>{{ selectedRole }}</strong>
        </button>
      </div>
    </header>

    <nav class="app-nav" aria-label="Navigasi workflow">
      <button
        v-for="view in navViews"
        :key="view.id"
        type="button"
        :class="['nav-item', { active: activeView === view.id }]"
        :aria-current="activeView === view.id ? 'page' : undefined"
        @click="switchView(view.id)"
      >
        <span class="nav-icon" aria-hidden="true">{{ view.icon }}</span>
        <span class="nav-label">{{ view.label }}</span>
        <strong class="nav-badge">{{ view.badge }}</strong>
      </button>
    </nav>

    <section v-if="activeView === 'operator'" class="metric-strip" aria-label="Ringkasan produksi">
      <article v-for="metric in metrics" :key="metric.label" :class="['metric', metric.tone]">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </section>

    <div :class="['workspace', `view-${activeView}`]">
      <section v-if="activeView === 'operator'" class="panel input-panel" aria-labelledby="form-title">
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

        <div v-if="shouldShowDefect" class="defect-insight" aria-label="Defect Pareto preview">
          <div>
            <span>Faktor QCC</span>
            <strong>{{ selectedDefectCategory?.qcc_factor || '-' }}</strong>
          </div>
          <div>
            <span>Severity</span>
            <strong>{{ selectedDefectCategory?.severity || '-' }}</strong>
          </div>
          <div>
            <span>Pareto Top</span>
            <strong>{{ paretoPreview[0]?.defect_name || '-' }}</strong>
          </div>
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
          <button class="button primary" type="button" @click="submitOperatorReportWithSession">Submit</button>
        </div>
      </section>

      <aside v-if="activeView === 'operator'" class="panel queue-panel" aria-labelledby="queue-title">
        <div class="section-title compact">
          <div>
            <p class="eyebrow">Sync</p>
            <h2 id="queue-title">Antrean device</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Retry sync" :disabled="isSyncing" @click="syncQueueWithSession">
            Retry
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

      <section v-if="activeView === 'mandor'" class="panel review-panel" aria-labelledby="review-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Mandor</p>
            <h2 id="review-title">Approval inbox</h2>
          </div>
          <span class="badge conflict">! {{ approvalSummary.conflict }} konflik</span>
        </div>

        <div class="approval-summary" aria-label="Ringkasan approval">
          <span class="status conflict">! Bentrok {{ approvalSummary.conflict }}</span>
          <span class="status warning">Review {{ approvalSummary.pending }}</span>
          <span class="status success">Selesai {{ approvalSummary.resolved }}</span>
        </div>

        <div class="approval-filters" aria-label="Filter approval">
          <label class="field">
            <span>Status</span>
            <select v-model="approvalStatusFilter" aria-label="Filter status approval">
              <option v-for="option in approvalStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Line</span>
            <select v-model="approvalLineFilter" aria-label="Filter line approval">
              <option v-for="option in approvalLineOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="approval-layout">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Machine</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filteredApprovalCases"
                  :key="row.id"
                  :class="{ 'active-row': activeApprovalCase && activeApprovalCase.id === row.id, 'conflict-row': row.status === 'CONFLICT_PENDING' }"
                  @click="setActiveApprovalCase(row.id)"
                >
                  <td>
                    <button class="row-button" type="button" @click.stop="setActiveApprovalCase(row.id)">
                      {{ row.id }}
                    </button>
                  </td>
                  <td>{{ row.machine_id }}</td>
                  <td>{{ row.reason_code }}</td>
                  <td>
                    <span :class="['status', row.status === 'CONFLICT_PENDING' ? 'conflict' : row.status === 'APPROVED' ? 'success' : 'warning']">
                      {{ row.status === 'CONFLICT_PENDING' ? '! Bentrok Data' : row.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <aside v-if="activeApprovalCase" class="approval-detail" aria-label="Detail comparison approval">
            <div class="detail-head">
              <div>
                <p class="eyebrow">{{ activeApprovalCase.line_id }} / {{ activeApprovalCase.shift_id }}</p>
                <h3>{{ activeApprovalCase.machine_id }}</h3>
              </div>
              <span :class="['status', activeApprovalCase.status === 'CONFLICT_PENDING' ? 'conflict' : activeApprovalCase.status === 'APPROVED' ? 'success' : 'warning']">
                {{ activeApprovalCase.status }}
              </span>
            </div>

            <p class="approval-note">{{ activeApprovalCase.note }}</p>

            <div class="comparison-grid">
              <div class="comparison-label"></div>
              <strong>Current</strong>
              <strong>Conflict</strong>
              <template v-for="row in activeComparisonRows" :key="row[0]">
                <span class="comparison-label">{{ row[0] }}</span>
                <span>{{ row[1] }}</span>
                <span>{{ row[2] }}</span>
              </template>
            </div>

            <div v-if="approvalMessage" class="inline-info" role="status">
              {{ approvalMessage }}
            </div>

            <div class="approval-actions">
              <button class="button primary" type="button" @click="stageApprovalAction('APPROVE_CURRENT')">
                Approve current
              </button>
              <button class="button secondary" type="button" @click="stageApprovalAction('REQUEST_CORRECTION')">
                Request correction
              </button>
              <button class="button danger-button" type="button" @click="stageApprovalAction('REJECT_BOTH')">
                Reject both
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section v-if="activeView === 'supervisor'" class="panel supervisor-panel" aria-labelledby="supervisor-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Supervisor</p>
            <h2 id="supervisor-title">Control center</h2>
          </div>
          <span class="badge">{{ supervisorLoading ? 'Memuat' : 'Server-side view' }}</span>
        </div>

        <div class="control-filters" aria-label="Filter supervisor">
          <label class="field">
            <span>Tanggal</span>
            <input v-model="supervisorFilters.factory_date" aria-label="Tanggal supervisor" />
          </label>
          <label class="field">
            <span>Line</span>
            <select v-model="supervisorFilters.line_id" aria-label="Line supervisor">
              <option v-for="option in lineOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Shift</span>
            <select v-model="supervisorFilters.shift_id" aria-label="Shift supervisor">
              <option v-for="option in shiftOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button class="button secondary" type="button" @click="refreshSupervisorControlCenter">Refresh</button>
        </div>

        <div class="mini-metrics" aria-label="Ringkasan control center">
          <article v-for="tile in supervisorTiles" :key="tile.label" :class="['mini-metric', tile.tone]">
            <span>{{ tile.label }}</span>
            <strong>{{ tile.value }}</strong>
          </article>
        </div>

        <div v-if="supervisorError" class="inline-error" role="alert">
          {{ supervisorError }}
        </div>
        <div v-if="supervisorMessage" class="inline-info" role="status">
          {{ supervisorMessage }}
        </div>

        <div class="control-actions">
          <button class="button primary" type="button" @click="closeCurrentScope">Close line/shift</button>
          <button class="button secondary" type="button" @click="createAdjustmentFromFirstRow">Create adjustment</button>
        </div>

        <div class="split-tables">
          <div class="table-wrap">
            <h3>Raw logs</h3>
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Machine</th>
                  <th>OK</th>
                  <th>Reject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in supervisorRawRows" :key="row.transaction_id">
                  <td>{{ row.transaction_id }}</td>
                  <td>{{ row.machine_id }}</td>
                  <td>{{ row.perolehan_ok }}</td>
                  <td>{{ row.perolehan_reject }}</td>
                  <td><span :class="['status', row.status === 'CONFLICT_PENDING' ? 'conflict' : 'success']">{{ row.status }}</span></td>
                </tr>
                <tr v-if="supervisorRawRows.length === 0">
                  <td colspan="5">Tidak ada data pada filter ini.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-wrap">
            <h3>Quarantine</h3>
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Reason</th>
                  <th>Machine</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in supervisorQuarantineRows" :key="row.quarantine_id">
                  <td>{{ row.quarantine_id }}</td>
                  <td>{{ row.reason_code }}</td>
                  <td>{{ row.machine_id }}</td>
                  <td><span :class="['status', row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'conflict']">{{ row.status }}</span></td>
                </tr>
                <tr v-if="supervisorQuarantineRows.length === 0">
                  <td colspan="4">Tidak ada quarantine aktif.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeView === 'management'" class="panel dashboard-panel" aria-labelledby="dashboard-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Management</p>
            <h2 id="dashboard-title">Read-only dashboard</h2>
          </div>
          <span class="badge">{{ dashboardLoading ? 'Memuat' : 'MASTER_RECAP' }}</span>
        </div>

        <div class="control-filters" aria-label="Filter dashboard">
          <label class="field">
            <span>Tanggal</span>
            <input v-model="dashboardFilters.factory_date" aria-label="Tanggal dashboard" />
          </label>
          <label class="field">
            <span>Line</span>
            <select v-model="dashboardFilters.line_id" aria-label="Line dashboard">
              <option value="">Semua line</option>
              <option v-for="option in lineOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Shift</span>
            <select v-model="dashboardFilters.shift_id" aria-label="Shift dashboard">
              <option value="">Semua shift</option>
              <option v-for="option in shiftOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button class="button primary" type="button" @click="runRecapAndDashboard">Run recap</button>
        </div>

        <div class="mini-metrics" aria-label="Ringkasan dashboard">
          <article v-for="tile in dashboardTiles" :key="tile.label" :class="['mini-metric', tile.tone]">
            <span>{{ tile.label }}</span>
            <strong>{{ tile.value }}</strong>
          </article>
        </div>

        <div class="approval-summary" aria-label="Status dashboard">
          <span class="status warning">Quarantine {{ dashboardData?.summary?.pending_quarantine || 0 }}</span>
          <span class="status warning">Open closing {{ dashboardData?.summary?.open_closing || 0 }}</span>
        </div>

        <div v-if="dashboardError" class="inline-error" role="alert">
          {{ dashboardError }}
        </div>

        <div class="split-tables">
          <div class="table-wrap">
            <h3>Recap rows</h3>
            <table>
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Shift</th>
                  <th>Machine</th>
                  <th>OK</th>
                  <th>Reject</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dashboardRows" :key="row.recap_id">
                  <td>{{ row.line_id }}</td>
                  <td>{{ row.shift_id }}</td>
                  <td>{{ row.machine_id }}</td>
                  <td>{{ formatCompact(row.ok_total) }}</td>
                  <td>{{ formatCompact(row.reject_total) }}</td>
                </tr>
                <tr v-if="dashboardRows.length === 0">
                  <td colspan="5">Recap belum tersedia untuk filter ini.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-wrap">
            <h3>Pareto defect</h3>
            <table>
              <thead>
                <tr>
                  <th>Defect</th>
                  <th>Reject</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dashboardData?.pareto || []" :key="row.defect_category_id">
                  <td>{{ row.defect_category_id }}</td>
                  <td>{{ formatCompact(row.reject_total) }}</td>
                  <td>{{ row.pareto_percent }}%</td>
                </tr>
                <tr v-if="(dashboardData?.pareto || []).length === 0">
                  <td colspan="3">Belum ada reject Pareto.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeView === 'hrd'" class="panel hrd-panel" aria-labelledby="hrd-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">HRD</p>
            <h2 id="hrd-title">User privacy readiness</h2>
          </div>
          <span class="badge">PII guarded</span>
        </div>

        <div class="settings-grid">
          <article class="settings-card">
            <span>Akses user</span>
            <strong>USER_ROLES</strong>
            <p>Role truth tetap dari sheet backend; UI tidak menyimpan daftar email atau role.</p>
          </article>
          <article class="settings-card">
            <span>Data sensitif</span>
            <strong>Masked only</strong>
            <p>PII mentah tidak ditampilkan pada workflow umum dan tetap dijaga oleh backend.</p>
          </article>
        </div>

        <div class="hint-box">
          View HRD disiapkan sebagai permukaan scalable untuk review user dan PII masking tanpa membuka secret atau data mentah.
        </div>
      </section>

      <section v-if="activeView === 'settings'" class="panel settings-panel" aria-labelledby="settings-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">User</p>
            <h2 id="settings-title">Pengaturan sesi</h2>
          </div>
          <span class="badge">{{ sessionModeLabel }}</span>
        </div>

        <div class="settings-grid">
          <article class="settings-card">
            <span>Session aktif</span>
            <strong>{{ currentSessionLabel }}</strong>
            <p>{{ sessionContext?.email || 'Demo role tidak membutuhkan pergantian email.' }}</p>
          </article>
          <article class="settings-card">
            <span>Status auth</span>
            <strong>{{ sessionContext?.auth_mode || 'OFF' }}</strong>
            <p>{{ sessionContext?.is_simulated ? 'Simulasi role aktif untuk demo/trial.' : 'Menggunakan akun Google aktif.' }}</p>
          </article>
        </div>

        <div class="role-switcher" aria-label="Try role">
          <button
            v-for="role in roleOptions"
            :key="role"
            type="button"
            :class="['role-button', { active: visibleRoles.includes(role), selected: selectedRole === role }]"
            :aria-pressed="visibleRoles.includes(role)"
            @click="setTryRole(role)"
          >
            <span>{{ roleIcons[role] }}</span>
            <strong>{{ role }}</strong>
            <small>{{ visibleRoles.includes(role) ? 'Menu aktif' : 'Menu hidden' }}</small>
          </button>
        </div>

        <div v-if="sessionLoading" class="inline-info" role="status">
          Memuat session context.
        </div>
        <div v-if="sessionMessage" class="inline-info" role="status">
          {{ sessionMessage }}
        </div>
        <div v-if="sessionError" class="inline-error" role="alert">
          {{ sessionError }}
        </div>

        <div class="hint-box">
          Try role hanya berlaku ketika backend memakai `AUTH_MODE=OFF`. Saat production `AUTH_MODE=ON`, backend tetap memakai email Google aktif.
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
