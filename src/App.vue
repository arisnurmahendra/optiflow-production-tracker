<script setup>
import Chart from 'chart.js/auto';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useOperatorReportStore } from './composables/useOperatorReportStore.js';
import { useTableSearchAndSort } from './composables/useTableSearchAndSort.js';
import { ApiAdapterError, api } from './services/apiAdapter.js';
import {
  approvalLineOptions,
  approvalStatusOptions,
  createApprovalCasesFromControlCenter,
  filterActionableApprovalCases,
  filterApprovalCases,
  findApprovalCase,
  initialApprovalCases,
  resolveApprovalCase,
  summarizeApprovalCases,
} from './services/approvalInbox.js';
import {
  defectOptions as defaultDefectOptions,
  formatNumber,
  bagianOptions as fallbackBagianOptions,
  createParetoRejectSummary,
  getDefectOptions,
  getDefectCategory,
  lineOptions as fallbackLineOptions,
  machineOptions as fallbackMachineOptions,
  setDefectCategories,
  shiftOptions as fallbackShiftOptions,
  workCategoryOptions as fallbackWorkCategoryOptions,
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
  isTandonValid,
  isTotalValid,
  normalizeRejectState,
  persistenceError,
  queueItems,
  clearLocalData,
  inspectLocalData,
  resetLocalData,
  resetLocalDatabase,
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
const approvalWorkQueueCases = computed(() => filterActionableApprovalCases(filteredApprovalCases.value));
const activeApprovalCase = computed(() =>
  findApprovalCase(approvalWorkQueueCases.value, activeApprovalId.value) || approvalWorkQueueCases.value[0] || null,
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
const bagianMasterRows = ref([]);
const bagianMasterLoading = ref(false);
const bagianMasterError = ref('');
const bagianMasterMessage = ref('');
const bagianMasterForm = ref({
  bagian_id: '',
  bagian_name: '',
  description: '',
  unit_rate: 0,
  monthly_target_unit: 0,
  target_salary: 3500000,
  status_aktif: true,
});
const hrdData = ref(null);
const hrdLoading = ref(false);
const hrdError = ref('');
const hrdLoaded = ref(false);
const hrdEmployeeDetailMode = ref('MASKED');
const hrdFilters = ref({
  factory_date: '2026-09-03',
  period_month: '2026-09',
  bagian_id: 'ALL',
  attendance_status: 'ALL',
});
const hrdEmployeeSearchInput = ref('');
const hrdEmployeeSearch = ref('');
const hrdEmployeeFilters = ref({
  bagian_id: 'ALL',
  status: 'ALL',
  role: 'ALL',
  completeness: 'ALL',
});
const hrdEmployeeFormMode = ref('CREATE');
const hrdEmployeeSaving = ref(false);
const hrdEmployeeMessage = ref('');
const hrdEmployeeError = ref('');
const hrdEmployeeForm = ref(createEmptyHrdEmployeeForm());
const hrdEmployeeEditorOpen = ref(false);
const productionTargetData = ref(null);
const productionTargetLoading = ref(false);
const productionTargetError = ref('');
const productionTargetMessage = ref('');
const operatorDashboardData = ref(null);
const operatorDashboardLoading = ref(false);
const operatorDashboardError = ref('');
const operatorDashboardLoaded = ref(false);
const operatorTrendChartCanvas = ref(null);
let operatorTrendChart = null;
const operatorDonutChartCanvases = ref([]);
const operatorDonutCharts = [];

const hrdAttendanceDonutCanvas = ref(null);
let hrdAttendanceDonutChart = null;
const hrdWorkforceBarCanvas = ref(null);
let hrdWorkforceBarChart = null;
const hrdReadinessPieCanvas = ref(null);
let hrdReadinessPieChart = null;
const hrdTrendLineCanvas = ref(null);
let hrdTrendLineChart = null;

let hrdEmployeeSearchTimer = null;
const bagianOptions = ref(fallbackBagianOptions);
const lineOptions = ref(fallbackLineOptions);
const machineOptions = ref(fallbackMachineOptions);
const workCategoryOptions = ref(fallbackWorkCategoryOptions);
const operatorOptions = ref([]);
const selectedOperatorEmail = ref('operator@example.com');
const defectOptions = ref(defaultDefectOptions);
const shiftOptions = ref(fallbackShiftOptions);
const shiftCatalogLoading = ref(false);
const shiftCatalogError = ref('');
const defectCatalogLoading = ref(false);
const defectCatalogError = ref('');
const defectCatalogVersion = ref(0);
const skeletonItems = Object.freeze([1, 2, 3, 4]);
const skeletonRows = Object.freeze([1, 2, 3, 4, 5]);
const operatorTrendPeriod = ref('DAILY');
const operatorTrendPeriods = Object.freeze([
  { value: 'DAILY', label: 'Daily', hint: '7 hari' },
  { value: 'WEEKLY', label: 'Weekly', hint: '8 minggu' },
  { value: 'MONTHLY', label: 'Monthly', hint: '6 bulan' },
]);
const targetScopeOptions = Object.freeze([
  { value: 'MACHINE_SCOPE', label: 'Jenis pekerjaan ini', hint: 'Berlaku untuk semua operator pada jenis pekerjaan ini.' },
  { value: 'OPERATOR_ONLY', label: 'Satu operator', hint: 'Berlaku hanya untuk email operator tertentu.' },
  { value: 'LINE_SHIFT', label: 'Bagian/shift', hint: 'Berlaku untuk semua jenis pekerjaan dan operator pada Bagian/shift.' },
  { value: 'ALL_USERS', label: 'Semua user', hint: 'Berlaku untuk seluruh operator dalam Bagian/shift.' },
]);
const targetForm = ref({
  target_id: '',
  factory_date: '',
  effective_from: new Date().toISOString().slice(0, 10),
  effective_until: '',
  line_id: 'SMT-02',
  shift_id: 'SHIFT-1',
  machine_id: 'SLD-14',
  operator_email: 'ALL',
  target_harian: 1200,
  scope_type: 'MACHINE_SCOPE',
  status_aktif: true,
});
const operatorTrendPeriodLabel = computed(() =>
  operatorTrendPeriods.find((period) => period.value === operatorTrendPeriod.value)?.hint || '7 hari',
);
const metricHelpContent = Object.freeze({
  Target: {
    icon: 'info',
    title: 'Apa itu Target?',
    html: '<p><strong>Target</strong> adalah jumlah perolehan yang harus dicapai pada Bagian, shift, dan jenis pekerjaan aktif.</p><p>Dipakai sebagai pembanding utama terhadap realisasi produksi.</p><p><strong>Rumus kontrol:</strong> Realisasi = OK + Reject.</p>',
  },
  OK: {
    icon: 'success',
    title: 'Apa itu OK?',
    html: '<p><strong>OK</strong> adalah jumlah produk yang lolos standar kualitas dan bisa dihitung sebagai output baik.</p><p>Angka ini tetap menjadi bagian dari realisasi produksi.</p>',
  },
  Reject: {
    icon: 'warning',
    title: 'Apa itu Reject?',
    html: '<p><strong>Reject</strong> adalah jumlah produk yang tidak lolos standar kualitas.</p><p>Jika Reject lebih dari 0, operator wajib memilih kategori defect agar data bisa dipakai untuk Pareto dan QCC.</p>',
  },
  Queue: {
    icon: 'question',
    title: 'Apa itu Queue?',
    html: '<p><strong>Queue</strong> adalah antrean laporan yang tersimpan lokal di IndexedDB dan belum selesai sinkron ke GAS.</p><p>Data tetap aman saat koneksi putus dan akan dikirim ulang saat device online.</p>',
  },
});
const roleOptions = Object.freeze(['Operator', 'Mandor', 'Supervisor', 'Management', 'HRD', 'SuperAdmin']);
const roleIcons = Object.freeze({
  Operator: '📝',
  Mandor: '✅',
  Supervisor: '📊',
  Management: '📈',
  HRD: '👤',
  SuperAdmin: '🔐',
});
const workflowRoleMap = Object.freeze({
  operator: Object.freeze(['Operator', 'SuperAdmin']),
  mandor: Object.freeze(['Mandor', 'SuperAdmin']),
  supervisor: Object.freeze(['Supervisor', 'SuperAdmin']),
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
const helpFeatureView = Object.freeze({
  id: 'workspace-help',
  type: 'role-feature',
  icon: '?',
  label: 'Help',
  title: 'Cara penggunaan aplikasi',
  subtitle: 'Panduan singkat, proses bisnis, dan troubleshooting sesuai role aktif.',
  badge: 'Panduan',
});
const appendHelpFeature = (views) => Object.freeze([...views, helpFeatureView]);
const operatorFeatureViews = Object.freeze([
  {
    id: 'operator-dashboard',
    type: 'role-feature',
    icon: '📊',
    label: 'Dashboard',
    title: 'Dashboard operator',
    subtitle: 'Target, OK, Reject, dan Tandon hari ini.',
    badge: 'Shift',
  },
  {
    id: 'operator-input',
    type: 'role-feature',
    icon: '📝',
    label: 'Input',
    title: 'Input produksi harian',
    subtitle: 'Form cepat untuk submit angka produksi.',
    badge: 'Cepat',
  },
  {
    id: 'operator-history',
    type: 'role-feature',
    icon: '🕘',
    label: 'Riwayat',
    title: 'Riwayat submit',
    subtitle: 'Submit terakhir hari ini dari device operator.',
    badge: 'Hari ini',
  },
  {
    id: 'operator-defect',
    type: 'role-feature',
    icon: '🧩',
    label: 'Defect',
    title: 'Defect insight',
    subtitle: 'Kategori reject dan preview Pareto operator.',
    badge: 'QCC',
  },
  {
    id: 'operator-status',
    type: 'role-feature',
    icon: '📡',
    label: 'Status',
    title: 'Status sinkronisasi',
    subtitle: 'Draft, queue, retry, dan status sync device.',
    badge: 'Sync',
  },
]);
const roleFeatureViews = Object.freeze({
  operator: appendHelpFeature(operatorFeatureViews),
  mandor: appendHelpFeature([
    { id: 'mandor-dashboard', type: 'role-feature', icon: '📊', label: 'Dashboard', title: 'Dashboard Mandor', subtitle: 'Ringkasan approval, conflict, dan closing harian.', badge: 'Live' },
    { id: 'mandor-approval', type: 'role-feature', icon: '✅', label: 'Approval', title: 'Approval inbox', subtitle: 'Review submit operator yang membutuhkan keputusan.', badge: 'Inbox' },
    { id: 'mandor-conflict', type: 'role-feature', icon: '⚠️', label: 'Conflict', title: 'Conflict queue', subtitle: 'Isolasi data CONFLICT_PENDING sebelum recap.', badge: 'HITL' },
    { id: 'mandor-target', type: 'role-feature', icon: '🎯', label: 'Target', title: 'Target harian', subtitle: 'Atur target per scope semua operator atau satu operator.', badge: 'Planning' },
    { id: 'mandor-closing', type: 'role-feature', icon: '🔒', label: 'Closing', title: 'Daily closing', subtitle: 'Tutup Bagian/tanggal setelah review selesai.', badge: 'Shift' },
  ]),
  supervisor: appendHelpFeature([
    { id: 'supervisor-dashboard', type: 'role-feature', icon: '📊', label: 'Dashboard', title: 'Supervisor dashboard', subtitle: 'Alert-first control center per line dan shift.', badge: 'Live' },
    { id: 'supervisor-alerts', type: 'role-feature', icon: '🚨', label: 'Alerts', title: 'Production alerts', subtitle: 'Conflict, closing terbuka, dan adjustment pending.', badge: 'Prioritas' },
    { id: 'supervisor-raw', type: 'role-feature', icon: '📋', label: 'Raw Logs', title: 'Raw logs', subtitle: 'Transaksi produksi terfilter dari backend.', badge: 'Data' },
    { id: 'supervisor-quarantine', type: 'role-feature', icon: '🧯', label: 'Quarantine', title: 'Quarantine', subtitle: 'Anomali dan conflict yang perlu pengawasan.', badge: 'Control' },
    { id: 'supervisor-adjustment', type: 'role-feature', icon: '🛠️', label: 'Adjustment', title: 'Adjustment', subtitle: 'Koreksi pasca closing dengan audit trail.', badge: 'Audit' },
  ]),
  management: appendHelpFeature([
    { id: 'management-dashboard', type: 'role-feature', icon: '📊', label: 'Dashboard', title: 'Executive dashboard', subtitle: 'KPI final, attendance, dan status kebijakan.', badge: 'Final' },
    { id: 'management-bagian', type: 'role-feature', icon: '🏭', label: 'Bagian', title: 'Bagian performance', subtitle: 'Output tervalidasi Supervisor per Bagian.', badge: 'Verif' },
    { id: 'management-wage', type: 'role-feature', icon: '💰', label: 'Upah UMR', title: 'UMR monthly condition', subtitle: 'Estimasi upah unit vs target gaji bulanan.', badge: 'Read' },
    { id: 'management-attendance', type: 'role-feature', icon: '🕒', label: 'Absensi', title: 'Attendance recap', subtitle: 'Hadir, absen, dan pending check Mandor.', badge: 'HR' },
    { id: 'management-flow', type: 'role-feature', icon: '🔗', label: 'Trace', title: 'Material traceability', subtitle: 'Relasi bahan antar Bagian.', badge: 'Flow' },
    { id: 'management-pareto', type: 'role-feature', icon: '🧩', label: 'Pareto', title: 'Pareto defect', subtitle: 'Prioritas improvement berdasarkan reject.', badge: 'QCC' },
    { id: 'management-pending', type: 'role-feature', icon: '⏳', label: 'Pending', title: 'Pending status', subtitle: 'Quarantine dan closing yang dikecualikan dari KPI.', badge: 'Guard' },
  ]),
  hrd: appendHelpFeature([
    { id: 'hrd-dashboard', type: 'role-feature', icon: '📊', label: 'Dashboard', title: 'Dashboard HRD', subtitle: 'Tenaga kerja, absensi, dan payroll readiness.', badge: 'Workforce' },
    { id: 'hrd-employees', type: 'role-feature', icon: '👤', label: 'Karyawan', title: 'Direktori karyawan', subtitle: 'Data karyawan dengan akses detail privacy-safe.', badge: 'Data' },
    { id: 'hrd-attendance', type: 'role-feature', icon: '🕒', label: 'Absensi', title: 'Rekap absensi', subtitle: 'Hadir, izin, sakit, alpha, resign, dan payroll-ready.', badge: 'Payroll' },
    { id: 'hrd-access-audit', type: 'role-feature', icon: '🔐', label: 'Akses & Audit', title: 'Role dan audit ringan', subtitle: 'Multi-role, anomali akses, dan ringkasan audit HRD.', badge: 'Govern' },
  ]),
});
const roleHelpGuides = Object.freeze({
  operator: Object.freeze({
    role: 'Operator',
    headline: 'Input produksi cepat tanpa kehilangan data saat koneksi tidak stabil.',
    steps: Object.freeze([
      '📋 Cek header shift aktif: line, shift, mesin, dan operator.',
      '📝 Buka Input, isi Target, Tandon, OK, Reject, lalu pilih kategori defect jika Reject lebih dari 0.',
      '📊 Cek Dashboard untuk melihat Target vs Realisasi, OK, Reject, dan Tandon hari ini maupun kemarin.',
      '🕰️ Buka Riwayat untuk memastikan submit terakhir tercatat.',
      '📶 Buka Status untuk melihat draft lokal, queue IndexedDB, retry sync, dan status online.',
    ]),
    process: '💡 Realisasi produksi dihitung dari OK + Reject. Tandon hanya ditampilkan sebagai konteks buffer dan tidak masuk realisasi. Data offline masuk queue lebih dulu, lalu dikirim ke GAS saat online.',
    troubleshooting: Object.freeze([
      '❓ Shift kosong: jalankan menu bootstrap/seed master data atau refresh data master dari spreadsheet.',
      '❓ Kategori defect tidak muncul: minta Mandor/Supervisor/Management memastikan DEFECT_CATEGORIES aktif.',
      '❓ Queue tidak kosong: cek koneksi, izin GAS, lalu tekan Retry di menu Status.',
    ]),
  }),
  mandor: Object.freeze({
    role: 'Mandor',
    headline: 'Menjaga data operator agar valid sebelum masuk proses final.',
    steps: Object.freeze([
      '📊 Buka Dashboard untuk melihat pending approval, conflict, dan kesiapan closing.',
      '✅ Buka Approval untuk review submit operator yang perlu keputusan.',
      '⚠️ Buka Conflict untuk memilih data valid atau menolak data bentrok.',
      '🔒 Buka Closing setelah approval dan conflict selesai.',
    ]),
    process: '💡 Mandor adalah Human-in-the-Loop. Data CONFLICT_PENDING tidak boleh masuk rekap sampai Mandor menyelesaikan keputusan.',
    troubleshooting: Object.freeze([
      '❓ Data operator tidak terlihat: pastikan operator sudah sync dan status backend bukan draft lokal.',
      '❓ Conflict tidak bisa selesai: cek permission role dan audit trail.',
      '❓ Closing gagal: pastikan tidak ada approval/conflict aktif di line dan shift yang sama.',
    ]),
  }),
  supervisor: Object.freeze({
    role: 'Supervisor',
    headline: 'Control center untuk memantau alert, raw logs, quarantine, dan adjustment.',
    steps: Object.freeze([
      '📊 Buka Dashboard untuk ringkasan Bagian/shift yang perlu perhatian.',
      '🚨 Gunakan Alerts untuk prioritas conflict, closing terbuka, dan adjustment pending.',
      '📄 Gunakan Raw Logs untuk inspeksi transaksi terfilter.',
      '🛡️ Gunakan Quarantine untuk memantau anomali yang belum boleh masuk KPI.',
      '⚖️ Gunakan Adjustment hanya sebagai event koreksi terpisah dengan audit trail.',
    ]),
    process: '💡 Supervisor mengawasi kualitas proses, bukan menimpa transaksi asal. Adjustment selalu append-only dan terpisah dari raw event.',
    troubleshooting: Object.freeze([
      '❓ Data filter kosong: cek tanggal, line, shift, dan status seed master data.',
      '❓ Run action gagal: cek permission role dan response validasi GAS.',
      '❓ Quarantine membesar: eskalasi ke Mandor untuk penyelesaian conflict.',
    ]),
  }),
  management: Object.freeze({
    role: 'Management',
    headline: 'Melihat KPI final yang sudah aman dari conflict dan data pending.',
    steps: Object.freeze([
      '📊 Buka Dashboard untuk KPI ringkas berbasis MASTER_RECAP.',
      '📋 Gunakan Recap untuk melihat baris final per line, shift, dan mesin.',
      '📉 Gunakan Pareto untuk prioritas improvement defect.',
      '⏳ Gunakan Pending untuk melihat data yang dikecualikan dari KPI final.',
    ]),
    process: '💡 Management bersifat read-only. Dashboard hanya memakai data final; quarantine, conflict, dan closing terbuka tetap dipisahkan.',
    troubleshooting: Object.freeze([
      '❓ KPI terlihat lebih kecil dari raw logs: cek Pending karena data belum final memang dikecualikan.',
      '❓ Pareto kosong: belum ada Reject final dengan kategori defect aktif.',
      '❓ Recap tidak berubah: jalankan Run recap setelah proses approval/closing selesai.',
    ]),
  }),
  hrd: Object.freeze({
    role: 'HRD',
    headline: 'Mengelola data karyawan, absensi, akses, dan audit dengan batas privasi yang jelas.',
    steps: Object.freeze([
      '📊 Buka Dashboard untuk melihat 4 metrik utama (karyawan aktif, absensi hari ini, kelengkapan data, payroll-ready) dan 4 grafik interaktif (Donut kehadiran, Bar distribusi bagian, Pie kelengkapan data, Line tren kehadiran 7 hari).',
      '👥 Buka Karyawan untuk mengelola direktori karyawan: tambah, edit, set resign, search global, sorting kolom, filter bagian/status/role/kelengkapan, dan toggle tampilan masked/detail.',
      '📅 Buka Absensi untuk melihat 3 blok terpisah: (1) Filter rekap payroll-ready, (2) Kartu harian dengan metrik dan tabel sortable, (3) Kartu bulanan dengan metrik dan tabel sortable.',
      '🛡️ Buka Akses & Audit untuk memeriksa role readiness, anomali akses, multi-role users, dan ringkasan audit event.',
    ]),
    process: '💡 HRD menjadi awal kualitas data: karyawan dan akses harus rapi sebelum Management, Mandor, Operator, Supervisor/QC, dan laporan akhir memakai data tersebut. Status payroll-ready mengharuskan data karyawan lengkap dan konfirmasi Mandor selesai.',
    troubleshooting: Object.freeze([
      '❓ Karyawan tidak muncul: cek status aktif/resign, filter Bagian, kelengkapan data, dan gunakan search box untuk pencarian cepat.',
      '❓ User tidak bisa masuk: cek USER_ROLES, REQUIRE_REGISTERED_EMAIL_LOGIN, dan status_aktif di menu Akses & Audit.',
      '❓ Data detail tidak tampil: pastikan role HRD/SuperAdmin memakai endpoint detail terotorisasi; tampilan default tetap masked untuk keamanan PII.',
      '❓ Grafik dashboard kosong: pastikan data HRD sudah dimuat (tunggu loading selesai) dan koneksi ke backend/mock aktif.',
      '❓ Tabel tidak bisa di-sort: klik pada header kolom yang memiliki tanda panah (🔼/🔽) untuk mengurutkan data.',
    ]),
  }),
});
const selectedRole = ref(readPreferredRole());
const visibleRoles = ref(readVisibleRoles());
const navRoleMenuOpen = ref(false);
const sessionContext = ref(null);
const sessionLoading = ref(false);
const sessionError = ref('');
const sessionMessage = ref('');
const localMaintenanceSnapshot = ref(null);
const localMaintenanceError = ref('');
const supervisorTiles = computed(() => summarizeControlCenter(supervisorData.value || {}));
const dashboardTiles = computed(() => buildDashboardTiles(dashboardData.value || {}));
const supervisorRawRows = computed(() => getFirstPageItems(supervisorData.value?.raw_logs));
const supervisorQuarantineRows = computed(() => getFirstPageItems(supervisorData.value?.quarantine));
const dashboardRows = computed(() => getFirstPageItems(dashboardData.value?.rows));
const operatorDashboardPending = computed(() => operatorDashboardLoading.value && !operatorDashboardData.value);
const supervisorPending = computed(() => supervisorLoading.value && !supervisorLoaded.value);
const dashboardPending = computed(() => dashboardLoading.value && !dashboardLoaded.value);
const hrdPending = computed(() => hrdLoading.value && !hrdLoaded.value);
const sessionPending = computed(() => sessionLoading.value && !sessionContext.value);
const selectedDefectCategory = computed(() => {
  defectCatalogVersion.value;
  return getDefectCategory(form.value.defect_category_id);
});
const paretoPreview = computed(() => {
  defectCatalogVersion.value;
  return createParetoRejectSummary([
    {
      payload: {
        defect_category_id: form.value.defect_category_id,
        perolehan_reject: form.value.perolehan_reject,
      },
    },
    ...queueItems.value.map((item) => item.payload),
  ]);
});
const activeView = ref(readPreferredWorkspace());
const activeRoleFeatures = ref({
  operator: 'operator-dashboard',
  mandor: 'mandor-dashboard',
  supervisor: 'supervisor-dashboard',
  management: 'management-dashboard',
  hrd: 'hrd-dashboard',
});
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
    subtitle: 'Pantau transaksi, quarantine, closing, dan adjustment per Bagian/shift.',
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
const sessionAllowedRoles = computed(() => {
  if (!sessionContext.value) {
    return roleOptions;
  }

  if (sessionContext.value.role === 'SuperAdmin') {
    return roleOptions;
  }

  if (sessionContext.value.auth_mode === 'ON') {
    return roleOptions.includes(sessionContext.value.role) ? [sessionContext.value.role] : [];
  }

  const allowed = Array.isArray(sessionContext.value.allowed_simulated_roles)
    ? sessionContext.value.allowed_simulated_roles.filter((role) => roleOptions.includes(role))
    : [];

  return allowed.length ? allowed : roleOptions;
});
const effectiveVisibleRoles = computed(() => {
  const allowed = sessionAllowedRoles.value;
  const visible = visibleRoles.value.filter((role) => allowed.includes(role));
  return visible.length ? visible : allowed.slice(0, 1);
});
const isSuperAdminWorkspaceManager = computed(() =>
  selectedRole.value === 'SuperAdmin' || sessionContext.value?.role === 'SuperAdmin',
);
const roleSwitcherRoles = computed(() =>
  isSuperAdminWorkspaceManager.value ? roleOptions : sessionAllowedRoles.value,
);
const navVisibleRoles = computed(() => {
  if (!isSuperAdminWorkspaceManager.value) {
    return effectiveVisibleRoles.value;
  }

  const visible = visibleRoles.value.filter((role) =>
    role !== 'SuperAdmin' && roleOptions.includes(role),
  );

  return visible.length ? visible : ['SuperAdmin'];
});
const activeViewMeta = computed(() =>
  appViews.value.find((view) => view.id === activeView.value) || appViews.value[0],
);
const navViews = computed(() => appViews.value
  .filter((view) =>
    view.id !== 'settings'
    && (workflowRoleMap[view.id] || []).some((role) => navVisibleRoles.value.includes(role)),
  )
  .map((view) => ({
    ...view,
    icon: workflowIconMap[view.id] || view.icon,
  })));
const navModeLabel = computed(() => {
  const current = navViews.value.find((view) => view.id === activeView.value);
  return current ? `Menu ${current.label}` : 'Pilih Role / Workspace';
});
const navItems = computed(() => roleFeatureViews[activeView.value] || navViews.value);
const activeFeatureId = computed(() => activeRoleFeatures.value[activeView.value] || `${activeView.value}-dashboard`);
const activeNavId = computed(() => activeFeatureId.value);
const displayedApprovalCases = computed(() => {
  if (activeFeatureId.value === 'mandor-conflict') {
    return approvalWorkQueueCases.value.filter((row) => row.status === 'CONFLICT_PENDING');
  }

  return approvalWorkQueueCases.value;
});
const currentRoleFeatureMeta = computed(() =>
  navItems.value.find((view) => view.id === activeFeatureId.value) || navItems.value[0],
);
const activeShellMeta = computed(() => {
  if (roleFeatureViews[activeView.value]) {
    return currentRoleFeatureMeta.value;
  }

  return activeViewMeta.value;
});
const activeHelpGuide = computed(() => roleHelpGuides[activeView.value] || roleHelpGuides.operator);
const activeWorkspaceRole = computed(() => {
  if (selectedRole.value === 'SuperAdmin' || activeView.value === 'settings') {
    return selectedRole.value;
  }

  return {
    operator: 'Operator',
    mandor: 'Mandor',
    supervisor: 'Supervisor',
    management: 'Management',
    hrd: 'HRD',
  }[activeView.value] || selectedRole.value;
});
const selectedOperatorLabel = computed(() =>
  operatorOptions.value.find((option) => option.value === selectedOperatorEmail.value)?.label
  || selectedOperatorEmail.value
  || selectedRole.value
  || 'Operator',
);
const selectedBagianLabel = computed(() =>
  findOptionLabel(bagianOptions.value, form.value.bagian_id)
  || findOptionLabel(lineOptions.value, form.value.line_id)
  || form.value.bagian_id
  || form.value.line_id
  || '-',
);
const selectedWorkCategoryLabel = computed(() =>
  findOptionLabel(workCategoryOptions.value, form.value.work_category_id)
  || findOptionLabel(machineOptions.value, form.value.machine_id)
  || form.value.work_category_id
  || form.value.machine_id
  || '-',
);
const operatorContextItems = computed(() => [
  { label: 'Bagian', value: operatorDashboardSummary.value.bagian_name || selectedBagianLabel.value },
  { label: 'Shift', value: operatorDashboardSummary.value.shift_id || form.value.shift_id || '-' },
  { label: 'Jenis pekerjaan', value: operatorDashboardSummary.value.work_category_id || selectedWorkCategoryLabel.value },
  { label: 'Operator', value: operatorDashboardSummary.value.operator_name_masked || selectedOperatorLabel.value },
]);
const operatorDashboardSummary = computed(() => operatorDashboardData.value?.summary || {
  factory_date: new Date().toISOString().slice(0, 10),
  bagian_id: form.value.bagian_id || '',
  bagian_name: selectedBagianLabel.value,
  work_category_id: form.value.work_category_id || '',
  line_id: form.value.line_id || '-',
  shift_id: form.value.shift_id || '-',
  machine_id: form.value.machine_id || '-',
  operator_name_masked: selectedRole.value || 'Operator',
  target_today: Number(form.value.target_harian || 0),
  tandon_today: Number(form.value.tandon || 0),
  ok_today: Number(form.value.perolehan_ok || 0),
  reject_today: Number(form.value.perolehan_reject || 0),
  target_yesterday: Math.max(0, Math.round(Number(form.value.target_harian || 0) * 0.96)),
  tandon_yesterday: Math.max(0, Math.round(Number(form.value.tandon || 0) * 0.9)),
  ok_yesterday: Math.max(0, Math.round(Number(form.value.perolehan_ok || 0) * 0.94)),
  reject_yesterday: Math.max(0, Math.round(Number(form.value.perolehan_reject || 0) * 1.08)),
});
const activeProductionTarget = computed(() => productionTargetData.value?.active_target || null);
const productionTargetRows = computed(() => productionTargetData.value?.targets || []);
const isTargetLocked = computed(() => Boolean(activeProductionTarget.value && activeProductionTarget.value.status_aktif));
const targetStatusLabel = computed(() => {
  if (productionTargetLoading.value) {
    return 'Memuat target';
  }

  if (isTargetLocked.value) {
    return `${activeProductionTarget.value.scope_type} ${formatNumber(activeProductionTarget.value.target_harian)}`;
  }

  return 'Manual fallback';
});
const targetScopePreview = computed(() => {
  const scope = targetScopeOptions.find((option) => option.value === targetForm.value.scope_type);
  const parts = [
    targetForm.value.line_id,
    targetForm.value.shift_id,
    targetForm.value.scope_type === 'LINE_SHIFT' || targetForm.value.scope_type === 'ALL_USERS' ? 'ALL jenis pekerjaan' : targetForm.value.machine_id,
    targetForm.value.scope_type === 'OPERATOR_ONLY' ? targetForm.value.operator_email : 'ALL operator',
  ];
  return `${scope?.label || targetForm.value.scope_type}: ${parts.join(' / ')}`;
});
const machineScopedOptions = computed(() => machineOptions.value.filter((option) => option.value !== 'ALL'));
function findOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || '';
}

const operatorOkPercent = computed(() =>
  Math.min(100, Math.round(((Number(operatorDashboardSummary.value.ok_today || 0) + Number(operatorDashboardSummary.value.reject_today || 0)) / Math.max(1, Number(operatorDashboardSummary.value.target_today || 0))) * 100)),
);
const operatorComparisonDonuts = computed(() => [
  {
    label: 'Hari ini',
    target: Number(operatorDashboardSummary.value.target_today || 0),
    ok: Number(operatorDashboardSummary.value.ok_today || 0),
    reject: Number(operatorDashboardSummary.value.reject_today || 0),
    tandon: Number(operatorDashboardSummary.value.tandon_today || 0),
  },
  {
    label: 'Kemarin',
    target: Number(operatorDashboardSummary.value.target_yesterday || 0),
    ok: Number(operatorDashboardSummary.value.ok_yesterday || 0),
    reject: Number(operatorDashboardSummary.value.reject_yesterday || 0),
    tandon: Number(operatorDashboardSummary.value.tandon_yesterday || 0),
  },
].map((item) => {
  const actual = item.ok + item.reject;
  const okSharePercent = (item.ok / Math.max(1, actual)) * 100;
  const achievementPercent = (actual / Math.max(1, item.target)) * 100;
  const gap = actual - item.target;
  return {
    ...item,
    actual,
    okSharePercent,
    achievementPercent,
    achievementPercentLabel: `${formatPercent(achievementPercent)}%`,
    gap,
    status: gap > 0 ? 'Melebihi target' : gap < 0 ? 'Kurang target' : 'Pas target',
  };
}));
const operatorTrendHistory = computed(() => {
  const rows = operatorDashboardData.value?.trend_history || operatorDashboardData.value?.weekly_history || [];
  if (rows.length) {
    return rows.map((row) => ({
      label: row.label,
      target: Number(row.target || 0),
      actual: Number(row.actual || (Number(row.ok || 0) + Number(row.reject || 0))),
      ok: Number(row.ok || 0),
      reject: Number(row.reject || 0),
    }));
  }

  const target = Math.max(1, Number(form.value.target_harian || 0));
  const ok = Math.max(0, Number(form.value.perolehan_ok || 0));
  const reject = Math.max(0, Number(form.value.perolehan_reject || 0));
  const labelsByPeriod = {
    DAILY: ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'Kemarin', 'Hari ini'],
    WEEKLY: ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'W'],
    MONTHLY: ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Bulan ini'],
  };
  const labels = labelsByPeriod[operatorTrendPeriod.value] || labelsByPeriod.DAILY;

  return labels.map((label, index) => ({
    label,
    target: Math.round(target * (0.92 + (index % 4) * 0.025)),
    actual: Math.round((ok + reject) * (0.84 + (index % 5) * 0.035)),
    ok: Math.round(ok * (0.84 + (index % 5) * 0.035)),
    reject: Math.round(reject * (0.84 + (index % 5) * 0.035)),
  }));
});
const operatorRecentSubmissions = computed(() => [
  ...(operatorDashboardData.value?.recent_submissions || []),
  ...queueItems.value.map((item) => ({
    transaction_id: item.id,
    device_timestamp: item.time,
    line_id: item.payload?.payload?.line_id || form.value.line_id,
    shift_id: item.payload?.payload?.shift_id || form.value.shift_id,
    machine_id: item.payload?.payload?.machine_id || form.value.machine_id,
    target_harian: item.payload?.payload?.target_harian || 0,
    tandon: item.payload?.payload?.tandon || 0,
    perolehan_ok: item.payload?.payload?.perolehan_ok || 0,
    perolehan_reject: item.payload?.payload?.perolehan_reject || 0,
    defect_category_id: item.payload?.payload?.defect_category_id || '',
    status: item.status || 'QUEUED',
  })),
]);
const operatorSyncSummary = computed(() => operatorDashboardData.value?.sync || {
  draft_status: draftStatus.value,
  queue_count: queueItems.value.length,
  last_sync_at: '',
  status: syncStatus.value,
});
const operatorDashboardMetrics = computed(() => [
  {
    label: 'Target',
    value: formatNumber(operatorDashboardSummary.value.target_today),
    tone: 'neutral',
  },
  {
    label: 'OK',
    value: formatNumber(operatorDashboardSummary.value.ok_today),
    tone: 'success',
  },
  {
    label: 'Reject',
    value: formatNumber(operatorDashboardSummary.value.reject_today),
    tone: 'danger',
  },
  {
    label: 'Queue',
    value: formatNumber(operatorSyncSummary.value.queue_count),
    tone: 'warning',
  },
]);
const mandorProgressSummary = computed(() => {
  const targetByOperator = new Map();
  const totals = supervisorRawRows.value.reduce((summary, row) => {
    const operatorKey = row.operator_email || row.operator_email_masked || row.transaction_id;
    const target = Number(row.target_harian || 0);
    if (target > 0 && operatorKey) {
      targetByOperator.set(operatorKey, Math.max(targetByOperator.get(operatorKey) || 0, target));
    }

    summary.actual += Number(row.perolehan_ok || 0) + Number(row.perolehan_reject || 0);
    return summary;
  }, {
    actual: 0,
    target: 0,
  });
  totals.target = [...targetByOperator.values()].reduce((sum, value) => sum + value, 0);
  return totals;
});
const mandorProgressPercent = computed(() =>
  Math.min(100, Math.round((mandorProgressSummary.value.actual / Math.max(1, mandorProgressSummary.value.target)) * 100)),
);
const operatorTaskCards = computed(() => [
  {
    label: 'Draft device',
    value: draftStatus.value,
    hint: persistenceError.value || 'Aman tersimpan lokal saat koneksi putus.',
    tone: persistenceError.value ? 'danger' : 'success',
  },
  {
    label: 'Queue sync',
    value: queueItems.value.length,
    hint: syncStatus.value,
    tone: queueItems.value.length ? 'warning' : 'success',
  },
  {
    label: 'Validasi input',
    value: 'OK + Reject',
    hint: 'Target dibandingkan dengan realisasi; Tandon hanya konteks.',
    tone: 'success',
  },
]);
const mandorTaskCards = computed(() => [
  {
    label: 'Butuh keputusan',
    value: approvalSummary.value.pending,
    hint: 'Pending approval dari operator.',
    tone: approvalSummary.value.pending ? 'warning' : 'success',
  },
  {
    label: 'Conflict queue',
    value: approvalSummary.value.conflict,
    hint: 'Wajib diselesaikan sebelum masuk recap.',
    tone: approvalSummary.value.conflict ? 'conflict' : 'success',
  },
  {
    label: 'Closing harian',
    value: 'Ready',
    hint: 'Jalankan setelah review Bagian/shift lengkap.',
    tone: 'warning',
  },
]);
const supervisorAlertCards = computed(() => [
  {
    label: 'Open alerts',
    value: supervisorTiles.value.find((tile) => tile.label === 'Quarantine')?.value || 0,
    hint: 'Prioritas kontrol sebelum membaca raw logs.',
    tone: 'conflict',
  },
  {
    label: 'Closing status',
    value: supervisorTiles.value.find((tile) => tile.label === 'Closing')?.value || 0,
    hint: 'Pantau Bagian/shift yang belum selesai.',
    tone: 'warning',
  },
  {
    label: 'Adjustment',
    value: supervisorTiles.value.find((tile) => tile.label === 'Adjustment')?.value || 0,
    hint: 'Koreksi setelah closing perlu jejak audit.',
    tone: 'success',
  },
]);
const managementInsightCards = computed(() => [
  {
    label: 'Final output',
    value: dashboardTiles.value.find((tile) => tile.label === 'OK')?.value || 0,
    hint: 'Bersumber dari MASTER_RECAP approved.',
    tone: 'success',
  },
  {
    label: 'Reject risk',
    value: dashboardTiles.value.find((tile) => tile.label === 'Reject')?.value || 0,
    hint: 'Gunakan Pareto untuk improvement.',
    tone: 'danger',
  },
  {
    label: 'Pending exclude',
    value: dashboardData.value?.summary?.pending_quarantine || 0,
    hint: 'Tidak dihitung dalam KPI final.',
    tone: 'warning',
  },
]);
const managementBagianSummary = computed(() => dashboardData.value?.bagian_summary || []);
const managementAttendanceSummary = computed(() => dashboardData.value?.attendance_summary || {});
const managementMaterialFlow = computed(() => dashboardData.value?.material_flow || []);
const managementWagePolicy = computed(() => dashboardData.value?.wage_policy || []);
const bagianMasterOptions = computed(() => {
  const rows = bagianMasterRows.value.length ? bagianMasterRows.value : managementWagePolicy.value;
  return rows
    .filter((bagian) => bagian.status_aktif !== false)
    .map((bagian) => ({
      value: bagian.bagian_id,
      label: bagian.bagian_name || bagian.bagian_id,
    }));
});
const managementWageRows = computed(() => managementBagianSummary.value.map((item) => ({
  ...item,
  statusLabel: item.umr_status === 'MEETS_UMR'
    ? 'Memenuhi UMR'
    : item.umr_status === 'BELOW_UMR'
      ? 'Di bawah UMR'
      : 'Policy pending',
  tone: item.umr_status === 'MEETS_UMR'
    ? 'success'
    : item.umr_status === 'BELOW_UMR'
      ? 'warning'
      : 'neutral',
})));
const managementAttendanceCards = computed(() => [
  {
    label: 'Hadir',
    value: formatNumber(managementAttendanceSummary.value.present_count),
    tone: 'success',
  },
  {
    label: 'Absen',
    value: formatNumber(managementAttendanceSummary.value.absent_count),
    tone: Number(managementAttendanceSummary.value.absent_count || 0) > 0 ? 'warning' : 'success',
  },
  {
    label: 'Pending check',
    value: formatNumber(managementAttendanceSummary.value.pending_confirmation_count),
    tone: Number(managementAttendanceSummary.value.pending_confirmation_count || 0) > 0 ? 'warning' : 'success',
  },
]);
const hrdAccessCards = computed(() => [
  {
    label: 'Karyawan aktif',
    value: formatNumber(hrdSummary.value.active_users),
    hint: `${formatNumber(hrdSummary.value.total_users)} karyawan/user terdaftar, ${formatNumber(hrdSummary.value.inactive_users)} nonaktif/resign.`,
    tone: 'success',
  },
  {
    label: 'Absensi hari ini',
    value: formatNumber(hrdAttendanceSummary.value.present_today),
    hint: `${formatNumber(hrdAttendanceSummary.value.pending_confirmation)} pending konfirmasi Mandor.`,
    tone: hrdAttendanceSummary.value.pending_confirmation > 0 ? 'warning' : 'success',
  },
  {
    label: 'Data belum lengkap',
    value: formatNumber(hrdIncompleteEmployees.value),
    hint: 'Cek menu Karyawan untuk melengkapi email, WA, alamat, Bagian, atau status.',
    tone: hrdIncompleteEmployees.value > 0 ? 'warning' : 'success',
  },
  {
    label: 'Payroll-ready',
    value: hrdPayrollReadyLabel.value,
    hint: 'Siap jika data karyawan, status, absensi, dan konfirmasi Mandor lengkap.',
    tone: hrdPayrollReadyLabel.value === 'Review' ? 'warning' : 'success',
  },
]);
const hrdSummary = computed(() => hrdData.value?.summary || {
  total_users: 0,
  active_users: 0,
  inactive_users: 0,
  deleted_users: 0,
  roles_with_missing_permissions: 0,
  last_audit_at: '',
});
const hrdUsers = computed(() => getFirstPageItems(hrdData.value?.users));
const hrdEmployees = computed(() => hrdUsers.value.map((user) => {
  const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean);
  const employeeNo = String(user.employee_no || user.user_id || '');
  const isEmployeeMasterRecord = /^\d{5}$/.test(employeeNo);
  const completenessFields = [
    isEmployeeMasterRecord ? employeeNo : '',
    user.full_name,
    user.bagian_id,
    user.email || user.email_masked,
    user.wa_number || user.wa_url,
    user.address,
  ];
  const completedFields = completenessFields.filter(Boolean).length;
  const completenessPercent = Math.round((completedFields / completenessFields.length) * 100);

  return {
    ...user,
    roles,
    can_edit_employee: isEmployeeMasterRecord,
    employee_record_status: isEmployeeMasterRecord ? 'EMPLOYEE_MASTER' : 'ACCESS_ONLY',
    status_label: user.is_deleted ? 'Deleted' : user.status_karyawan || (user.status_aktif ? 'AKTIF' : 'RESIGN'),
    status_tone: user.is_deleted || user.status_karyawan === 'RESIGN' ? 'danger' : user.status_aktif ? 'success' : 'warning',
    email_display: hrdEmployeeDetailMode.value === 'DETAIL' && user.email ? user.email : user.email_masked,
    address_display: hrdEmployeeDetailMode.value === 'DETAIL' && user.address ? user.address : 'Masked',
    wa_display: hrdEmployeeDetailMode.value === 'DETAIL' && user.wa_number ? user.wa_number : 'Masked',
    completeness_percent: completenessPercent,
    completeness_status: completenessPercent >= 100 ? 'Complete' : 'Need review',
    completeness_tone: completenessPercent >= 100 ? 'success' : 'warning',
  };
}));
const hrdEmployeeFilterOptions = computed(() => ({
  bagian: ['ALL', ...new Set(hrdEmployees.value.map((user) => user.bagian_id).filter(Boolean))].sort((a, b) =>
    a === 'ALL' ? -1 : b === 'ALL' ? 1 : a.localeCompare(b),
  ),
  status: ['ALL', ...new Set(hrdEmployees.value.map((user) => user.status_label).filter(Boolean))].sort((a, b) =>
    a === 'ALL' ? -1 : b === 'ALL' ? 1 : a.localeCompare(b),
  ),
  role: ['ALL', ...new Set(hrdEmployees.value.flatMap((user) => user.roles || []).filter(Boolean))].sort((a, b) =>
    a === 'ALL' ? -1 : b === 'ALL' ? 1 : a.localeCompare(b),
  ),
}));
const hrdEmployeeSearchHint = computed(() => {
  const raw = hrdEmployeeSearchInput.value.trim();

  if (raw && raw.length < 2) {
    return 'Ketik minimal 2 karakter untuk mulai mencari.';
  }

  if (hrdEmployeeSearch.value) {
    return `Filter aktif untuk "${hrdEmployeeSearch.value}".`;
  }

  return 'Cari ID, nama, email, WA, alamat, Bagian, atau role.';
});
const hrdVisibleEmployees = computed(() => {
  const query = normalizeSearchText(hrdEmployeeSearch.value);

  return hrdEmployees.value.filter((user) => {
    const matchSearch = !query || normalizeSearchText([
      user.employee_no,
      user.user_id,
      user.full_name,
      user.username,
      user.email,
      user.email_masked,
      user.wa_number,
      user.address,
      user.bagian_id,
      user.status_label,
      ...(user.roles || []),
    ].join(' ')).includes(query);
    const matchBagian = hrdEmployeeFilters.value.bagian_id === 'ALL' || user.bagian_id === hrdEmployeeFilters.value.bagian_id;
    const matchStatus = hrdEmployeeFilters.value.status === 'ALL' || user.status_label === hrdEmployeeFilters.value.status;
    const matchRole = hrdEmployeeFilters.value.role === 'ALL' || (user.roles || []).includes(hrdEmployeeFilters.value.role);
    const matchCompleteness = hrdEmployeeFilters.value.completeness === 'ALL'
      || (hrdEmployeeFilters.value.completeness === 'COMPLETE' && user.completeness_percent >= 100)
      || (hrdEmployeeFilters.value.completeness === 'INCOMPLETE' && user.completeness_percent < 100);

    return matchSearch && matchBagian && matchStatus && matchRole && matchCompleteness;
  });
});
const hrdIncompleteEmployees = computed(() =>
  hrdEmployees.value.filter((user) => user.completeness_percent < 100).length,
);
const hrdMandorOptions = computed(() => {
  const options = hrdEmployees.value
    .filter((user) =>
      user.status_aktif
      && Array.isArray(user.roles)
      && user.roles.includes('Mandor')
      && user.email,
    )
    .map((user) => ({
      value: user.email,
      label: `${user.employee_no || user.employee_id || '-'} - ${user.full_name || user.username || user.email_masked || user.email}`,
    }));
  const currentEmail = String(hrdEmployeeForm.value.mandor_email || '').trim();

  if (currentEmail && !options.some((option) => option.value === currentEmail)) {
    options.push({
      value: currentEmail,
      label: `Tersimpan - ${maskEmailForUi(currentEmail)}`,
    });
  }

  return options;
});
const hrdAttendanceSummary = computed(() => hrdData.value?.attendance_summary || {
  factory_date: '',
  period_month: '',
  present_today: 0,
  absent_today: 0,
  izin_today: 0,
  sakit_today: 0,
  alpha_today: 0,
  resign_today: 0,
  pending_confirmation: 0,
  payroll_ready_count: 0,
  payroll_blocked_count: 0,
  monthly_hadir_count: 0,
  monthly_izin_count: 0,
  monthly_sakit_count: 0,
  monthly_alpha_count: 0,
  monthly_resign_count: 0,
  monthly_pending_confirmation_count: 0,
  status: 'REVIEW_REQUIRED',
});
const hrdPayrollReadyLabel = computed(() => {
  if (hrdAttendanceSummary.value.pending_confirmation > 0 || hrdIncompleteEmployees.value > 0) {
    return 'Review';
  }

  return 'Ready';
});
const hrdRoleMatrix = computed(() => hrdData.value?.role_matrix || []);
const hrdAuditSummary = computed(() => hrdData.value?.audit_summary || {
  session: 0,
  rbac: 0,
  user_role: 0,
  other: 0,
  last_event_at: '',
});
const hrdAttendanceDailyRows = computed(() => getFirstPageItems(hrdData.value?.attendance_daily));
const hrdAttendanceMonthlyRows = computed(() => getFirstPageItems(hrdData.value?.attendance_monthly));
const hrdAttendanceFilters = computed(() => hrdData.value?.attendance_filters || {
  bagian_options: ['SOLDER', 'LEM'],
  status_options: ['ALL', 'HADIR', 'IZIN', 'SAKIT', 'ALPHA', 'BELUM_KONFIRMASI', 'RESIGN'],
});
const hrdAttendanceCards = computed(() => [
  { label: 'Hadir', value: formatNumber(hrdAttendanceSummary.value.present_today), tone: 'success' },
  { label: 'Izin/Sakit/Alpha', value: formatNumber(hrdAttendanceSummary.value.absent_today), tone: hrdAttendanceSummary.value.absent_today > 0 ? 'warning' : 'success' },
  { label: 'Belum konfirmasi', value: formatNumber(hrdAttendanceSummary.value.pending_confirmation), tone: hrdAttendanceSummary.value.pending_confirmation > 0 ? 'warning' : 'success' },
  { label: 'Payroll-ready', value: `${formatNumber(hrdAttendanceSummary.value.payroll_ready_count)} siap`, tone: hrdAttendanceSummary.value.payroll_blocked_count > 0 ? 'warning' : 'success' },
]);

const hrdAttendanceDonutData = computed(() => [
  Number(hrdAttendanceSummary.value.present_today || 0),
  Number(hrdAttendanceSummary.value.izin_today || 0),
  Number(hrdAttendanceSummary.value.sakit_today || 0),
  Number(hrdAttendanceSummary.value.alpha_today || 0),
  Number(hrdAttendanceSummary.value.pending_confirmation || 0),
]);

const hrdWorkforceBarData = computed(() => {
  const parts = bagianOptions.value.map(opt => opt.value).filter(val => val !== 'ALL');
  const counts = parts.map(bagian => {
    return hrdEmployees.value.filter(emp => emp.bagian_id === bagian && emp.status_aktif).length;
  });
  return { labels: parts, data: counts };
});

const hrdReadinessPieData = computed(() => {
  const incomplete = hrdIncompleteEmployees.value;
  const complete = Math.max(0, hrdEmployees.value.length - incomplete);
  return [complete, incomplete];
});

const hrdTrendLineData = computed(() => {
  // Mock data based on today's attendance to show a realistic trend
  const baseHadir = Number(hrdAttendanceSummary.value.present_today || 0);
  const baseAbsen = Number(hrdAttendanceSummary.value.absent_today || 0);
  return {
    labels: ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'Kemarin', 'Hari ini'],
    hadir: [baseHadir - 2, baseHadir + 1, baseHadir, baseHadir - 1, baseHadir + 2, baseHadir - 1, baseHadir].map(v => Math.max(0, v)),
    absen: [baseAbsen + 1, baseAbsen, baseAbsen - 1, baseAbsen, baseAbsen + 1, baseAbsen, baseAbsen].map(v => Math.max(0, v)),
  };
});
const hrdMonthlyAttendanceCards = computed(() => [
  { label: 'Hadir bulan ini', value: formatNumber(hrdAttendanceSummary.value.monthly_hadir_count), tone: 'success' },
  { label: 'Izin', value: formatNumber(hrdAttendanceSummary.value.monthly_izin_count), tone: 'neutral' },
  { label: 'Sakit', value: formatNumber(hrdAttendanceSummary.value.monthly_sakit_count), tone: 'neutral' },
  { label: 'Alpha', value: formatNumber(hrdAttendanceSummary.value.monthly_alpha_count), tone: hrdAttendanceSummary.value.monthly_alpha_count > 0 ? 'warning' : 'success' },
]);
const hrdGovernanceSummary = computed(() => hrdData.value?.governance_summary || {
  multi_role_user_count: 0,
  access_anomaly_count: 0,
  denied_access_count: 0,
  last_login_missing_count: 0,
});
const hrdAccessAnomalies = computed(() => hrdData.value?.access_anomalies || []);
const hrdMultiRoleUsers = computed(() => hrdData.value?.multi_role_users || []);
const hrdAuditEvents = computed(() => hrdData.value?.audit_events || []);
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
const isMaintenanceLoaded = ref(false);
const maintenanceError = ref('');
const tapCount = ref(0);
const viewLog = ref(readViewLogPreference());
const debugLogs = ref([]);
let keyBuffer = '';

const debugEmojiMap = Object.freeze({
  session: '🔐',
  workspace: '🧭',
  role: '🎭',
  api: '📡',
  success: '✅',
  warning: '⚠️',
  error: '🧯',
  storage: '💾',
  info: 'ℹ️',
});
const DEBUG_LOG_LIMIT = 80;

const maintenanceSummary = computed(() => {
  const setCount = maintenanceProperties.value.filter((property) => property.status === 'SET').length;
  return `${setCount}/${maintenanceProperties.value.length} key siap`;
});
const maintenancePending = computed(() => isMaintenanceLoading.value && !isMaintenanceLoaded.value);

function openMaintenanceConsole() {
  isMaintenanceOpen.value = true;
  refreshMaintenanceProperties();
}

function closeMaintenanceConsole() {
  isMaintenanceOpen.value = false;
  maintenanceError.value = '';
}

function isRoleButtonActive(role) {
  return visibleRoles.value.includes(role);
}

function getRoleButtonStatus(role) {
  return isRoleButtonActive(role) ? 'Menu aktif' : 'Menu hidden';
}

function debugLog(type, message, details = {}) {
  const safeType = debugEmojiMap[type] ? type : 'info';
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    emoji: debugEmojiMap[safeType],
    type: safeType,
    message,
    details,
  };

  debugLogs.value = [entry, ...debugLogs.value].slice(0, DEBUG_LOG_LIMIT);

  if (viewLog.value && typeof console !== 'undefined') {
    console.debug(`${entry.emoji} Optiflow ${safeType}: ${message}`, details);
  }
}

function toggleViewLog() {
  viewLog.value = !viewLog.value;
  persistViewLogPreference(viewLog.value);
  debugLog(viewLog.value ? 'success' : 'warning', `Debug console ${viewLog.value ? 'aktif' : 'nonaktif'}`, {
    activeView: activeView.value,
    selectedRole: selectedRole.value,
  });
}

async function refreshMaintenanceProperties() {
  isMaintenanceLoading.value = true;
  maintenanceError.value = '';

  try {
    const response = await api.getScriptPropertiesStatus({ session: buildSessionPayload() });
    maintenanceProperties.value = response.data.properties || [];
    isMaintenanceLoaded.value = true;
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

  const resolvedId = activeApprovalCase.value.id;
  approvalCases.value = resolveApprovalCase(approvalCases.value, resolvedId, action);
  activeApprovalId.value = approvalWorkQueueCases.value[0]?.id || '';
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
    const nextApprovalCases = createApprovalCasesFromControlCenter(response.data);
    approvalCases.value = nextApprovalCases;
    activeApprovalId.value = filterActionableApprovalCases(filterApprovalCases(nextApprovalCases, {
      status: approvalStatusFilter.value,
      line: approvalLineFilter.value,
    }))[0]?.id || '';
    supervisorLoaded.value = true;
  } catch (error) {
    supervisorError.value = getSafeErrorMessage(error);
  } finally {
    supervisorLoading.value = false;
  }
}

function syncSupervisorFiltersFromOperator() {
  supervisorFilters.value = {
    ...supervisorFilters.value,
    factory_date: operatorDashboardSummary.value.factory_date || new Date().toISOString().slice(0, 10),
    line_id: form.value.line_id || supervisorFilters.value.line_id,
    shift_id: form.value.shift_id || supervisorFilters.value.shift_id,
  };
}

async function closeCurrentScope() {
  if (!window.confirm('Closing Bagian/shift ini?')) {
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

async function createProductionReviewFromRow(row, action) {
  if (!row?.transaction_id) {
    supervisorError.value = 'Transaksi sumber tidak valid untuk review.';
    return;
  }

  const payload = await buildProductionReviewPayload(row, action);
  if (!payload) {
    return;
  }

  supervisorError.value = '';
  supervisorMessage.value = '';
  try {
    const response = await api.createProductionReview({
      session: buildSessionPayload(),
      source_transaction_id: row.transaction_id,
      ...payload,
    });
    supervisorMessage.value = `Review ${response.data.action} tersimpan dengan status ${response.data.status}.`;
    await refreshSupervisorControlCenter();
    await runRecapForSupervisorScope();
  } catch (error) {
    supervisorError.value = getSafeErrorMessage(error);
  }
}

async function buildProductionReviewPayload(row, action) {
  if (action === 'VOID') {
    const result = await Swal.fire({
      title: 'Void transaksi?',
      text: `${row.transaction_id} tidak akan dihitung di rekap sebelum closing.`,
      input: 'text',
      inputLabel: 'Alasan void',
      inputPlaceholder: 'Contoh: double input operator',
      showCancelButton: true,
      confirmButtonText: 'Void',
      cancelButtonText: 'Batal',
      inputValidator: (value) => (!String(value || '').trim() ? 'Alasan wajib diisi.' : undefined),
    });
    return result.isConfirmed ? { action, delta: {}, reason: result.value } : null;
  }

  if (action === 'REQUEST_CORRECTION') {
    const result = await Swal.fire({
      title: 'Request correction',
      input: 'textarea',
      inputLabel: 'Instruksi koreksi untuk operator',
      inputPlaceholder: 'Contoh: cek ulang reject karena defect belum lengkap',
      showCancelButton: true,
      confirmButtonText: 'Kirim request',
      cancelButtonText: 'Batal',
      inputValidator: (value) => (!String(value || '').trim() ? 'Instruksi wajib diisi.' : undefined),
    });
    return result.isConfirmed ? { action, delta: {}, reason: result.value } : null;
  }

  const result = await Swal.fire({
    title: 'Pre-closing correction',
    html: '<input id="swal-delta-ok" class="swal2-input" type="number" placeholder="Delta OK"><input id="swal-delta-reject" class="swal2-input" type="number" placeholder="Delta Reject"><textarea id="swal-delta-reason" class="swal2-textarea" placeholder="Alasan koreksi"></textarea>',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Simpan koreksi',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const ok = Number(document.getElementById('swal-delta-ok')?.value || 0);
      const reject = Number(document.getElementById('swal-delta-reject')?.value || 0);
      const reason = String(document.getElementById('swal-delta-reason')?.value || '').trim();
      if (!Number.isInteger(ok) || !Number.isInteger(reject)) {
        Swal.showValidationMessage('Delta harus angka bulat.');
        return false;
      }
      if (ok === 0 && reject === 0) {
        Swal.showValidationMessage('Isi minimal satu delta OK atau Reject.');
        return false;
      }
      if (!reason) {
        Swal.showValidationMessage('Alasan wajib diisi.');
        return false;
      }
      return { ok, reject, reason };
    },
  });

  if (!result.isConfirmed) {
    return null;
  }

  return {
    action,
    delta: {
      perolehan_ok: result.value.ok,
      perolehan_reject: result.value.reject,
    },
    reason: result.value.reason,
  };
}

async function runRecapForSupervisorScope() {
  await api.runMasterRecap({
    session: buildSessionPayload(),
    filter: compactFilter({
      factory_date: supervisorFilters.value.factory_date,
      line_id: supervisorFilters.value.line_id,
      shift_id: supervisorFilters.value.shift_id,
    }),
    page: 1,
    page_size: 8,
  });
}

async function runRecapAndDashboard() {
  dashboardLoading.value = true;
  dashboardError.value = '';

  try {
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

async function refreshBagianMaster() {
  bagianMasterLoading.value = true;
  bagianMasterError.value = '';

  try {
    const response = await api.getBagianMaster({
      session: buildSessionPayload(),
      include_inactive: true,
    });
    bagianMasterRows.value = response.data?.bagian || [];
  } catch (error) {
    bagianMasterError.value = getSafeErrorMessage(error);
  } finally {
    bagianMasterLoading.value = false;
  }
}

function editBagianMaster(row) {
  bagianMasterForm.value = {
    bagian_id: row.bagian_id || '',
    bagian_name: row.bagian_name || '',
    description: row.description || '',
    unit_rate: Number(row.unit_rate || 0),
    monthly_target_unit: Number(row.monthly_target_unit || 0),
    target_salary: Number(row.target_salary || 3500000),
    status_aktif: row.status_aktif !== false,
  };
}

function resetBagianMasterForm() {
  bagianMasterForm.value = {
    bagian_id: '',
    bagian_name: '',
    description: '',
    unit_rate: 0,
    monthly_target_unit: 0,
    target_salary: 3500000,
    status_aktif: true,
  };
}

async function saveBagianMaster() {
  bagianMasterLoading.value = true;
  bagianMasterError.value = '';
  bagianMasterMessage.value = '';

  try {
    const response = await api.upsertBagianMaster({
      session: buildSessionPayload(),
      bagian: {
        ...bagianMasterForm.value,
        unit_rate: Number(bagianMasterForm.value.unit_rate || 0),
        monthly_target_unit: Number(bagianMasterForm.value.monthly_target_unit || 0),
        target_salary: Number(bagianMasterForm.value.target_salary || 0),
      },
    });
    bagianMasterMessage.value = response.data?.created ? 'Bagian baru tersimpan.' : 'Bagian diperbarui.';
    resetBagianMasterForm();
    await refreshBagianMaster();
    await refreshManagementDashboard();
  } catch (error) {
    bagianMasterError.value = getSafeErrorMessage(error);
  } finally {
    bagianMasterLoading.value = false;
  }
}

async function deactivateBagian(row) {
  bagianMasterLoading.value = true;
  bagianMasterError.value = '';
  bagianMasterMessage.value = '';

  try {
    await api.deactivateBagianMaster({
      session: buildSessionPayload(),
      bagian_id: row.bagian_id,
    });
    bagianMasterMessage.value = `${row.bagian_name || row.bagian_id} dinonaktifkan.`;
    await refreshBagianMaster();
    await refreshManagementDashboard();
  } catch (error) {
    bagianMasterError.value = getSafeErrorMessage(error);
  } finally {
    bagianMasterLoading.value = false;
  }
}

async function seedBagianDefaults() {
  bagianMasterLoading.value = true;
  bagianMasterError.value = '';
  bagianMasterMessage.value = '';

  try {
    const response = await api.seedBagianMaster({
      session: buildSessionPayload(),
    });
    const inserted = response.data?.inserted || [];
    bagianMasterMessage.value = inserted.length
      ? `Seed Bagian ditambahkan: ${inserted.join(', ')}.`
      : 'Default Bagian sudah lengkap.';
    await refreshBagianMaster();
    await refreshManagementDashboard();
  } catch (error) {
    bagianMasterError.value = getSafeErrorMessage(error);
  } finally {
    bagianMasterLoading.value = false;
  }
}

async function refreshHrdAccessDashboard() {
  hrdLoading.value = true;
  hrdError.value = '';
  const requestPayload = {
    session: buildSessionPayload(),
    filter: compactFilter(hrdFilters.value),
    page: 1,
    page_size: 12,
  };
  debugLog('info', 'HRD dashboard request dikirim.', {
    request: requestPayload,
    activeFeatureId: activeFeatureId.value,
  });

  try {
    const response = await api.getHrdAccessDashboard(requestPayload);
    hrdData.value = response.data;
    hrdLoaded.value = true;
    debugLog('success', 'HRD dashboard response diterima.', {
      summary: response.data?.summary,
      attendance_summary: response.data?.attendance_summary,
      users_count: getFirstPageItems(response.data?.users).length,
      role_matrix_count: getFirstPageItems(response.data?.role_matrix).length,
    });
  } catch (error) {
    hrdError.value = getSafeErrorMessage(error);
    debugLog('error', 'HRD dashboard request gagal.', {
      error: hrdError.value,
      request: requestPayload,
    });
  } finally {
    hrdLoading.value = false;
  }
}

function createEmptyHrdEmployeeForm() {
  return {
    employee_no: '',
    full_name: '',
    bagian_id: 'SOLDER',
    status_karyawan: 'AKTIF',
    email: '',
    wa_number: '',
    address: '',
    mandor_email: '',
    role: 'Operator',
    roles: ['Operator'],
    username: '',
  };
}

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resetHrdEmployeeFilters() {
  hrdEmployeeSearchInput.value = '';
  hrdEmployeeSearch.value = '';
  hrdEmployeeFilters.value = {
    bagian_id: 'ALL',
    status: 'ALL',
    role: 'ALL',
    completeness: 'ALL',
  };
  debugLog('info', 'Filter direktori HRD direset.', {
    total: hrdEmployees.value.length,
  });
}

function resetHrdEmployeeForm(options = {}) {
  hrdEmployeeFormMode.value = 'CREATE';
  hrdEmployeeForm.value = createEmptyHrdEmployeeForm();
  hrdEmployeeError.value = '';
  if (!options.keepMessage) {
    hrdEmployeeMessage.value = '';
  }
}

function openHrdEmployeeCreateModal() {
  resetHrdEmployeeForm();
  hrdEmployeeEditorOpen.value = true;
  debugLog('info', 'HRD employee create modal dibuka.', {
    mode: hrdEmployeeFormMode.value,
    form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
  });
}

function closeHrdEmployeeEditor() {
  if (hrdEmployeeSaving.value) {
    debugLog('warning', 'HRD employee modal tidak ditutup karena proses simpan masih berjalan.', {
      mode: hrdEmployeeFormMode.value,
      form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
    });
    return;
  }
  hrdEmployeeEditorOpen.value = false;
  debugLog('info', 'HRD employee modal ditutup.', {
    mode: hrdEmployeeFormMode.value,
    form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
  });
}

function normalizeHrdEmployeeNo(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 5 ? digits.slice(0, 5) : digits;
}

function normalizeHrdEmployeeRoles(roles, fallbackRole = 'Operator') {
  const normalizedRoles = Array.isArray(roles)
    ? roles.filter((role) => roleOptions.includes(role))
    : [];
  const fallback = roleOptions.includes(fallbackRole) ? fallbackRole : 'Operator';
  return normalizedRoles.length ? [...new Set(normalizedRoles)] : [fallback];
}

function toggleHrdEmployeeRole(role) {
  if (!roleOptions.includes(role)) {
    return;
  }

  const currentRoles = normalizeHrdEmployeeRoles(hrdEmployeeForm.value.roles, hrdEmployeeForm.value.role);
  const nextRoles = currentRoles.includes(role)
    ? currentRoles.filter((item) => item !== role)
    : [...currentRoles, role];

  hrdEmployeeForm.value.roles = nextRoles.length ? nextRoles : [role];
  hrdEmployeeForm.value.role = hrdEmployeeForm.value.roles[0];
}

function editHrdEmployee(user) {
  const employeeNo = normalizeHrdEmployeeNo(user.employee_no || user.user_id);
  const roles = normalizeHrdEmployeeRoles(user.roles, user.role || 'Operator');
  debugLog('info', 'HRD employee edit dipilih dari tabel.', {
    source_row: buildHrdEmployeeDebugSnapshot(user),
    normalized_employee_no: employeeNo,
  });

  if (!/^\d{5}$/.test(employeeNo)) {
    hrdEmployeeError.value = `Data ${user.employee_no || user.user_id || '-'} adalah record akses/demo, bukan data karyawan 5 digit. Edit melalui record EMPLOYEE_MASTER yang valid.`;
    hrdEmployeeMessage.value = '';
    debugLog('warning', 'HRD employee edit ditolak karena bukan record EMPLOYEE_MASTER valid.', {
      source_row: buildHrdEmployeeDebugSnapshot(user),
      reason: 'employee_no bukan 5 digit',
    });
    return;
  }

  hrdEmployeeFormMode.value = 'EDIT';
  hrdEmployeeForm.value = {
    employee_no: employeeNo,
    full_name: user.full_name || '',
    bagian_id: user.bagian_id || 'SOLDER',
    status_karyawan: user.status_karyawan || (user.status_aktif ? 'AKTIF' : 'RESIGN'),
    email: user.email || '',
    wa_number: user.wa_number || '',
    address: user.address || '',
    mandor_email: user.mandor_email || '',
    role: roles[0],
    roles,
    username: user.username || '',
  };
  hrdEmployeeError.value = '';
  hrdEmployeeMessage.value = `Edit data ${hrdEmployeeForm.value.employee_no}.`;
  hrdEmployeeEditorOpen.value = true;
  debugLog('info', 'HRD employee edit modal dibuka.', {
    mode: hrdEmployeeFormMode.value,
    form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
  });
}

async function saveHrdEmployee() {
  hrdEmployeeSaving.value = true;
  hrdEmployeeError.value = '';
  hrdEmployeeMessage.value = '';

  try {
    const employeeNo = normalizeHrdEmployeeNo(hrdEmployeeForm.value.employee_no);

    if (!/^\d{5}$/.test(employeeNo)) {
      hrdEmployeeError.value = 'ID karyawan harus 5 digit. Untuk data lama, lengkapi ID karyawan dulu sebelum menyimpan perubahan.';
      debugLog('warning', 'HRD employee submit ditolak oleh validasi frontend.', {
        mode: hrdEmployeeFormMode.value,
        error: hrdEmployeeError.value,
        form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
      });
      return;
    }

    const roles = normalizeHrdEmployeeRoles(hrdEmployeeForm.value.roles, hrdEmployeeForm.value.role);
    if (roles.length === 0) {
      hrdEmployeeError.value = 'Pilih minimal satu role untuk karyawan.';
      debugLog('warning', 'HRD employee submit ditolak karena role kosong.', {
        mode: hrdEmployeeFormMode.value,
        form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
      });
      return;
    }

    if (hrdEmployeeFormMode.value === 'CREATE') {
      const duplicate = findHrdEmployeeDuplicate(employeeNo, hrdEmployeeForm.value.email);
      if (duplicate) {
        hrdEmployeeError.value = `Data karyawan sudah ada (${duplicate.reason}: ${duplicate.value}). Gunakan Edit untuk memperbarui data existing.`;
        debugLog('warning', 'HRD employee create ditolak karena duplikat frontend.', {
          duplicate,
          form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
        });
        return;
      }
    }

    const payload = {
      ...hrdEmployeeForm.value,
      employee_no: employeeNo,
      role: roles[0],
      roles,
    };
    const requestPayload = {
      session: buildSessionPayload(),
      mode: hrdEmployeeFormMode.value,
      employee: payload,
    };
    debugLog('info', 'HRD employee submit request dikirim.', {
      mode: hrdEmployeeFormMode.value,
      request: {
        ...requestPayload,
        employee: buildHrdEmployeeDebugSnapshot(payload),
      },
    });
    const response = await api.upsertHrdEmployee({
      session: requestPayload.session,
      mode: requestPayload.mode,
      employee: requestPayload.employee,
    });
    const successMessage = `${response.data.mode === 'CREATE' ? 'Karyawan ditambahkan' : 'Data karyawan diperbarui'}: ${response.data.employee.employee_no}.`;
    debugLog('success', 'HRD employee submit response diterima.', {
      mode: response.data.mode,
      employee: buildHrdEmployeeDebugSnapshot(response.data.employee),
      message: successMessage,
    });
    hrdEmployeeEditorOpen.value = false;
    resetHrdEmployeeForm({ keepMessage: true });
    hrdEmployeeMessage.value = successMessage;
    await refreshHrdAccessDashboard();
  } catch (error) {
    hrdEmployeeError.value = getSafeErrorMessage(error);
    debugLog('error', 'HRD employee submit gagal.', {
      mode: hrdEmployeeFormMode.value,
      error: hrdEmployeeError.value,
      form: buildHrdEmployeeDebugSnapshot(hrdEmployeeForm.value),
    });
  } finally {
    hrdEmployeeSaving.value = false;
  }
}

function findHrdEmployeeDuplicate(employeeNo, email) {
  const normalizedEmployeeNo = String(employeeNo || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existingById = hrdEmployees.value.find((user) =>
    String(user.employee_no || user.employee_id || '').trim() === normalizedEmployeeNo,
  );

  if (existingById) {
    return {
      reason: 'ID',
      value: normalizedEmployeeNo,
      employee: buildHrdEmployeeDebugSnapshot(existingById),
    };
  }

  if (normalizedEmail) {
    const existingByEmail = hrdEmployees.value.find((user) =>
      String(user.email || '').trim().toLowerCase() === normalizedEmail,
    );

    if (existingByEmail) {
      return {
        reason: 'Email',
        value: maskEmailForUi(normalizedEmail),
        employee: buildHrdEmployeeDebugSnapshot(existingByEmail),
      };
    }
  }

  return null;
}

async function resignHrdEmployee(user) {
  const employeeNo = user.employee_no || user.user_id;
  debugLog('warning', 'HRD employee resign confirmation dibuka.', {
    employee: buildHrdEmployeeDebugSnapshot(user),
  });
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Set karyawan resign?',
    html: `<p>${employeeNo} - ${user.full_name || user.email_masked || ''} akan dinonaktifkan untuk transaksi baru.</p>`,
    showCancelButton: true,
    confirmButtonText: 'Set Resign',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
  });

  if (!result.isConfirmed) {
    debugLog('info', 'HRD employee resign dibatalkan user.', {
      employee_no: employeeNo,
    });
    return;
  }

  hrdEmployeeSaving.value = true;
  hrdEmployeeError.value = '';
  const requestPayload = {
    session: buildSessionPayload(),
    employee_no: employeeNo,
  };
  debugLog('warning', 'HRD employee resign request dikirim.', requestPayload);

  try {
    const response = await api.deactivateHrdEmployee(requestPayload);
    hrdEmployeeMessage.value = `Karyawan ${employeeNo} diset Resign.`;
    debugLog('success', 'HRD employee resign response diterima.', {
      employee: buildHrdEmployeeDebugSnapshot(response.data?.employee),
      status_karyawan: response.data?.status_karyawan,
      message: hrdEmployeeMessage.value,
    });
    await refreshHrdAccessDashboard();
  } catch (error) {
    hrdEmployeeError.value = getSafeErrorMessage(error);
    debugLog('error', 'HRD employee resign gagal.', {
      error: hrdEmployeeError.value,
      request: requestPayload,
    });
  } finally {
    hrdEmployeeSaving.value = false;
  }
}

function buildHrdEmployeeDebugSnapshot(employee = {}) {
  const roles = Array.isArray(employee.roles) && employee.roles.length
    ? employee.roles
    : [employee.role].filter(Boolean);
  const waDigits = String(employee.wa_number || '').replace(/\D/g, '');

  return {
    employee_no: employee.employee_no || employee.user_id || '',
    full_name: employee.full_name || '',
    bagian_id: employee.bagian_id || '',
    status_karyawan: employee.status_karyawan || (employee.status_aktif === false ? 'RESIGN' : ''),
    email_masked: employee.email_masked || maskEmailForUi(employee.email),
    wa_last4: waDigits ? waDigits.slice(-4) : '',
    address_length: String(employee.address || '').length,
    role: employee.role || '',
    roles,
    mandor_email_masked: maskEmailForUi(employee.mandor_email),
    username: employee.username || '',
  };
}

async function refreshOperatorDashboard() {
  operatorDashboardLoading.value = true;
  operatorDashboardError.value = '';

  try {
    const response = await api.getOperatorDashboard({
      session: buildSessionPayload(),
      filter: compactFilter({
        factory_date: operatorDashboardSummary.value.factory_date,
        bagian_id: form.value.bagian_id,
        work_category_id: form.value.work_category_id,
        line_id: form.value.line_id,
        shift_id: form.value.shift_id,
        machine_id: form.value.machine_id,
        operator_email: selectedOperatorEmail.value,
      }),
      period: operatorTrendPeriod.value,
      page: 1,
      page_size: 8,
    });
    operatorDashboardData.value = response.data;
    operatorDashboardLoaded.value = true;
  } catch (error) {
    operatorDashboardError.value = getSafeErrorMessage(error);
  } finally {
    operatorDashboardLoading.value = false;
  }
}

async function refreshDefectCategories() {
  defectCatalogLoading.value = true;
  defectCatalogError.value = '';

  try {
    const response = await api.getDefectCategories({
      session: buildSessionPayload(),
    });
    setDefectCategories(response.data.categories || []);
    defectOptions.value = getDefectOptions();
    defectCatalogVersion.value += 1;
  } catch (error) {
    setDefectCategories([]);
    defectOptions.value = getDefectOptions();
    defectCatalogVersion.value += 1;
    defectCatalogError.value = `${getSafeErrorMessage(error)} Memakai katalog defect default lokal.`;
  } finally {
    defectCatalogLoading.value = false;
  }
}

async function refreshOperatorReferenceData() {
  shiftCatalogLoading.value = true;
  shiftCatalogError.value = '';

  try {
    const response = await api.getOperatorReferenceData({
      session: buildSessionPayload(),
    });
    const bagian = response.data.bagian || response.data.bagians || [];
    const lines = response.data.lines || [];
    const shifts = response.data.shifts || [];
    const machines = response.data.machines || [];
    const workCategories = response.data.work_categories || response.data.workCategories || [];
    const operators = response.data.operators || [];
    bagianOptions.value = normalizeSelectOptions(bagian, fallbackBagianOptions, 'bagian_id');
    lineOptions.value = normalizeSelectOptions(lines, fallbackLineOptions, 'line_id');
    shiftOptions.value = normalizeSelectOptions(shifts, fallbackShiftOptions, 'shift_id');
    machineOptions.value = normalizeSelectOptions(machines, fallbackMachineOptions, 'machine_id');
    workCategoryOptions.value = normalizeSelectOptions(workCategories, fallbackWorkCategoryOptions, 'work_category_id');
    operatorOptions.value = normalizeSelectOptions(operators, [{ value: selectedOperatorEmail.value, label: selectedOperatorEmail.value }], 'email');

    if (!bagianOptions.value.some((option) => option.value === form.value.bagian_id)) {
      form.value.bagian_id = bagianOptions.value[0]?.value || form.value.bagian_id;
    }

    if (!lineOptions.value.some((option) => option.value === form.value.line_id)) {
      form.value.line_id = lineOptions.value[0]?.value || form.value.line_id;
    }

    if (!shiftOptions.value.some((option) => option.value === form.value.shift_id)) {
      form.value.shift_id = shiftOptions.value[0]?.value || form.value.shift_id;
    }

    if (!machineOptions.value.some((option) => option.value === form.value.machine_id)) {
      form.value.machine_id = machineOptions.value[0]?.value || form.value.machine_id;
    }

    if (!workCategoryOptions.value.some((option) => option.value === form.value.work_category_id)) {
      form.value.work_category_id = workCategoryOptions.value[0]?.value || form.value.work_category_id;
    }

    if (!operatorOptions.value.some((option) => option.value === selectedOperatorEmail.value)) {
      selectedOperatorEmail.value = operatorOptions.value[0]?.value || selectedOperatorEmail.value;
    }
  } catch (error) {
    bagianOptions.value = fallbackBagianOptions;
    lineOptions.value = fallbackLineOptions;
    shiftOptions.value = fallbackShiftOptions;
    machineOptions.value = fallbackMachineOptions;
    workCategoryOptions.value = fallbackWorkCategoryOptions;
    operatorOptions.value = [{ value: selectedOperatorEmail.value, label: selectedOperatorEmail.value }];
    shiftCatalogError.value = `${getSafeErrorMessage(error)} Memakai data referensi default lokal.`;
  } finally {
    shiftCatalogLoading.value = false;
  }
}

async function refreshShiftOptions() {
  return refreshOperatorReferenceData();
}

async function refreshProductionTarget() {
  productionTargetLoading.value = true;
  productionTargetError.value = '';

  try {
    const filter = buildProductionTargetFilter();
    const response = await api.getProductionTarget({
      session: buildSessionPayload(),
      filter,
      include_inactive: activeView.value === 'mandor',
    });
    productionTargetData.value = response.data;

    if (response.data.active_target?.target_harian !== undefined) {
      form.value.target_harian = Number(response.data.active_target.target_harian || 0);
    }
  } catch (error) {
    productionTargetError.value = `${getSafeErrorMessage(error)} Target memakai fallback manual.`;
  } finally {
    productionTargetLoading.value = false;
  }
}

function buildProductionTargetFilter() {
  if (activeView.value === 'mandor' && activeFeatureId.value === 'mandor-target') {
    const scopeType = targetForm.value.scope_type;
    return {
      factory_date: targetForm.value.factory_date || targetForm.value.effective_from || new Date().toISOString().slice(0, 10),
      line_id: targetForm.value.line_id,
      shift_id: targetForm.value.shift_id,
      machine_id: scopeType === 'LINE_SHIFT' || scopeType === 'ALL_USERS' ? 'ALL' : targetForm.value.machine_id,
      operator_email: scopeType === 'OPERATOR_ONLY' ? targetForm.value.operator_email : 'ALL',
    };
  }

  return {
    factory_date: new Date().toISOString().slice(0, 10),
    line_id: form.value.line_id,
    shift_id: form.value.shift_id,
    machine_id: form.value.machine_id,
    operator_email: selectedOperatorEmail.value || sessionContext.value?.email || 'ALL',
  };
}

function normalizeTargetFormPayload() {
  const validationMessage = validateTargetFormBeforeSave();
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const scopeType = targetForm.value.scope_type;
  return {
    ...targetForm.value,
    factory_date: targetForm.value.factory_date || '',
    machine_id: scopeType === 'LINE_SHIFT' || scopeType === 'ALL_USERS' ? 'ALL' : targetForm.value.machine_id,
    operator_email: scopeType === 'OPERATOR_ONLY' ? targetForm.value.operator_email : 'ALL',
    status_aktif: true,
  };
}

function validateTargetFormBeforeSave() {
  const scopeType = targetForm.value.scope_type;

  if (scopeType === 'MACHINE_SCOPE' && (!targetForm.value.machine_id || targetForm.value.machine_id === 'ALL')) {
    return 'Pilih jenis pekerjaan spesifik untuk scope ini. Gunakan scope "Bagian/shift" atau "Semua user" jika ingin berlaku untuk semua jenis pekerjaan.';
  }

  if (scopeType === 'OPERATOR_ONLY' && (!targetForm.value.operator_email || targetForm.value.operator_email === 'ALL')) {
    return 'Pilih operator spesifik untuk scope "Satu operator".';
  }

  return '';
}

function syncTargetScopeDefaults() {
  const scopeType = targetForm.value.scope_type;

  if (scopeType === 'LINE_SHIFT' || scopeType === 'ALL_USERS') {
    if (targetForm.value.machine_id !== 'ALL') {
      targetForm.value.machine_id = 'ALL';
    }
    if (targetForm.value.operator_email !== 'ALL') {
      targetForm.value.operator_email = 'ALL';
    }
    return;
  }

  if (scopeType === 'MACHINE_SCOPE') {
    if (!targetForm.value.machine_id || targetForm.value.machine_id === 'ALL') {
      targetForm.value.machine_id = machineScopedOptions.value[0]?.value || form.value.machine_id || '';
    }
    if (targetForm.value.operator_email !== 'ALL') {
      targetForm.value.operator_email = 'ALL';
    }
    return;
  }

  if (scopeType === 'OPERATOR_ONLY' && (!targetForm.value.operator_email || targetForm.value.operator_email === 'ALL')) {
    targetForm.value.operator_email = selectedOperatorEmail.value || operatorOptions.value[0]?.value || '';
  }
}

async function saveProductionTarget() {
  productionTargetLoading.value = true;
  productionTargetError.value = '';
  productionTargetMessage.value = '';

  try {
    syncTargetScopeDefaults();
    const response = await api.upsertProductionTarget({
      session: buildSessionPayload(),
      target: normalizeTargetFormPayload(),
    });
    productionTargetMessage.value = response.data.created ? 'Target baru tersimpan.' : 'Target diperbarui.';
    targetForm.value = {
      ...targetForm.value,
      ...response.data.target,
    };
    await refreshProductionTarget();
  } catch (error) {
    productionTargetError.value = error instanceof ApiAdapterError ? getSafeErrorMessage(error) : error.message || getSafeErrorMessage(error);
  } finally {
    productionTargetLoading.value = false;
  }
}

function editProductionTarget(target) {
  if (!target?.target_id) {
    return;
  }

  targetForm.value = {
    ...targetForm.value,
    target_id: target.target_id,
    factory_date: target.factory_date || '',
    effective_from: target.effective_from || new Date().toISOString().slice(0, 10),
    effective_until: target.effective_until || '',
    line_id: target.line_id || targetForm.value.line_id,
    shift_id: target.shift_id || targetForm.value.shift_id,
    machine_id: target.machine_id || 'ALL',
    operator_email: target.operator_email || 'ALL',
    target_harian: Number(target.target_harian || 0),
    scope_type: target.scope_type || 'LINE_SHIFT',
    status_aktif: Boolean(target.status_aktif),
  };
  productionTargetMessage.value = `Target ${target.target_id} siap diedit.`;
  productionTargetError.value = '';
  syncTargetScopeDefaults();
}

async function activateProductionTarget(target) {
  if (!target?.target_id) {
    return;
  }

  productionTargetLoading.value = true;
  productionTargetError.value = '';
  productionTargetMessage.value = '';

  try {
    await api.upsertProductionTarget({
      session: buildSessionPayload(),
      target: buildProductionTargetPayloadFromRow(target, true),
    });
    productionTargetMessage.value = 'Target diaktifkan.';
    await refreshProductionTarget();
  } catch (error) {
    productionTargetError.value = getSafeErrorMessage(error);
  } finally {
    productionTargetLoading.value = false;
  }
}

function buildProductionTargetPayloadFromRow(target, statusAktif) {
  return {
    target_id: target.target_id,
    factory_date: target.factory_date || '',
    effective_from: target.effective_from || new Date().toISOString().slice(0, 10),
    effective_until: target.effective_until || '',
    line_id: target.line_id,
    shift_id: target.shift_id,
    machine_id: target.machine_id,
    operator_email: target.operator_email,
    target_harian: Number(target.target_harian || 0),
    scope_type: target.scope_type,
    status_aktif: statusAktif,
  };
}

async function deactivateProductionTarget(target, options = {}) {
  if (!target?.target_id || (!options.skipConfirm && !window.confirm('Nonaktifkan target ini?'))) {
    return;
  }

  productionTargetLoading.value = true;
  productionTargetError.value = '';
  productionTargetMessage.value = '';

  try {
    await api.deactivateProductionTarget({
      session: buildSessionPayload(),
      target_id: target.target_id,
    });
    productionTargetMessage.value = 'Target dinonaktifkan.';
    await refreshProductionTarget();
  } catch (error) {
    productionTargetError.value = getSafeErrorMessage(error);
  } finally {
    productionTargetLoading.value = false;
  }
}

async function deleteProductionTarget(target) {
  if (!target?.target_id || !window.confirm('Hapus target ini dari daftar aktif? Data akan dinonaktifkan sebagai soft delete.')) {
    return;
  }

  await deactivateProductionTarget(target, { skipConfirm: true });
}

async function submitOperatorReportWithSession() {
  return submitOperatorReport({
    session: buildSessionPayload(),
    simulatedRole: selectedRole.value,
    operatorEmail: selectedOperatorEmail.value,
  });
}

async function syncQueueWithSession() {
  const result = await syncQueue({
    session: buildSessionPayload(),
    simulatedRole: selectedRole.value,
  });
  await refreshOperatorDashboard();
  if (activeView.value === 'mandor' || activeView.value === 'supervisor') {
    syncSupervisorFiltersFromOperator();
    await refreshSupervisorControlCenter();
  }
  return result;
}

async function refreshSessionContext() {
  sessionLoading.value = true;
  sessionError.value = '';
  debugLog('session', 'Memuat session context.', buildSessionPayload());

  try {
    const response = await api.getSessionContext(buildSessionPayload());
    sessionContext.value = response.data;
    reconcileSessionRoleAccess();
    sessionMessage.value = sessionContext.value?.requires_role_selection
      ? 'Pilih role untuk demo/trial.'
      : `Session aktif sebagai ${sessionContext.value?.role || selectedRole.value}.`;
    debugLog('success', 'Session context berhasil dimuat.', {
      auth_mode: sessionContext.value?.auth_mode,
      role: sessionContext.value?.role,
      selectedRole: selectedRole.value,
      visibleRoles: visibleRoles.value,
    });
  } catch (error) {
    sessionError.value = getSafeErrorMessage(error);
    debugLog('error', 'Gagal memuat session context.', { error: sessionError.value });
  } finally {
    sessionLoading.value = false;
  }
}

async function setTryRole(role) {
  if (!roleOptions.includes(role)) {
    return;
  }

  if (!roleSwitcherRoles.value.includes(role)) {
    sessionError.value = 'Role ini tidak tersedia untuk session aktif.';
    debugLog('warning', 'Role switch ditolak oleh session.', {
      role,
      allowed: roleSwitcherRoles.value,
      selectedRole: selectedRole.value,
    });
    return;
  }

  if (isSuperAdminWorkspaceManager.value && role === 'SuperAdmin' && visibleRoles.value.includes('SuperAdmin')) {
    sessionError.value = '';
    sessionMessage.value = 'SuperAdmin tetap aktif sebagai pemilik akses penuh.';
    await switchView('settings');
    debugLog('role', sessionMessage.value, {
      clickedRole: role,
      selectedRole: selectedRole.value,
      visibleRoles: visibleRoles.value,
    });
    return;
  }

  if (isSuperAdminWorkspaceManager.value && role !== 'SuperAdmin') {
    const wasVisible = visibleRoles.value.includes(role);
    const nextVisibleRoles = wasVisible
      ? visibleRoles.value.filter((item) => item !== role)
      : [...visibleRoles.value, role];

    if (!nextVisibleRoles.includes('SuperAdmin')) {
      nextVisibleRoles.push('SuperAdmin');
    }

    visibleRoles.value = nextVisibleRoles;
    selectedRole.value = 'SuperAdmin';
    persistPreferredRole(selectedRole.value);
    persistVisibleRoles(nextVisibleRoles);
    persistSuperAdminVisibleRoles(nextVisibleRoles);
    sessionError.value = '';
    sessionMessage.value = `Menu ${role} ${wasVisible ? 'disembunyikan' : 'diaktifkan'} untuk SuperAdmin.`;
    ensureVisibleActiveView();
    debugLog('role', sessionMessage.value, {
      clickedRole: role,
      selectedRole: selectedRole.value,
      visibleRoles: visibleRoles.value,
      activeView: activeView.value,
    });
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

  if (!isSuperAdminWorkspaceManager.value || role === 'SuperAdmin') {
    selectedRole.value = wasVisible && selectedRole.value === role
      ? nextVisibleRoles[0]
      : role;
  }

  persistPreferredRole(selectedRole.value);
  persistVisibleRoles(nextVisibleRoles);
  ensureVisibleActiveView();
  sessionError.value = '';
  sessionMessage.value = isSuperAdminWorkspaceManager.value && role !== 'SuperAdmin'
    ? `Workspace ${role} ${wasVisible ? 'disembunyikan' : 'diaktifkan'} untuk SuperAdmin.`
    : `Role demo langsung aktif sebagai ${selectedRole.value}.`;
  debugLog('role', sessionMessage.value, {
    clickedRole: role,
    selectedRole: selectedRole.value,
    visibleRoles: visibleRoles.value,
  });
  void refreshSessionContext();
}

async function selectWorkspaceFromNav(viewId) {
  if (!navViews.value.some((view) => view.id === viewId)) {
    debugLog('warning', 'Workspace nav ditolak karena tidak tersedia.', {
      viewId,
      navViews: navViews.value.map((view) => view.id),
      selectedRole: selectedRole.value,
    });
    return;
  }

  navRoleMenuOpen.value = false;
  activeRoleFeatures.value = {
    ...activeRoleFeatures.value,
    [viewId]: `${viewId}-dashboard`,
  };
  await switchView(viewId);
  sessionError.value = '';
  sessionMessage.value = `Workspace aktif: ${viewId}.`;
  debugLog('workspace', sessionMessage.value, { viewId, activeFeatureId: activeFeatureId.value });
}

function toggleNavRoleMenu() {
  navRoleMenuOpen.value = !navRoleMenuOpen.value;
}

async function switchView(viewId) {
  if (viewId !== 'settings' && !navViews.value.some((view) => view.id === viewId)) {
    sessionError.value = 'Workspace tidak tersedia untuk role/session aktif.';
    debugLog('warning', sessionError.value, {
      requestedView: viewId,
      visibleRoles: visibleRoles.value,
      allowedRoles: sessionAllowedRoles.value,
    });
    return;
  }

  activeView.value = viewId;
  persistPreferredWorkspace(viewId);
  debugLog('workspace', `Switch view ke ${viewId}.`, {
    selectedRole: selectedRole.value,
    activeWorkspaceRole: activeWorkspaceRole.value,
  });

  if (viewId === 'operator' && !operatorDashboardLoaded.value) {
    await refreshOperatorDashboard();
    await refreshProductionTarget();
  }

  if (viewId === 'mandor') {
    syncSupervisorFiltersFromOperator();
    await refreshSupervisorControlCenter();
  }

  if (viewId === 'supervisor' && !supervisorLoaded.value) {
    await refreshSupervisorControlCenter();
  }

  if (viewId === 'management' && !dashboardLoaded.value) {
    await refreshBagianMaster();
    await refreshManagementDashboard();
  }

  if (viewId === 'hrd' && !hrdLoaded.value) {
    await refreshHrdAccessDashboard();
  }

  if (viewId === 'settings') {
    await refreshSessionContext();
  }
}

async function switchNavigationItem(item) {
  navRoleMenuOpen.value = false;

  if (item.type === 'role-feature') {
    activeRoleFeatures.value = {
      ...activeRoleFeatures.value,
      [activeView.value]: item.id,
    };
    if (activeView.value === 'operator' && !operatorDashboardLoaded.value) {
      await refreshOperatorDashboard();
    }
    if (item.id === 'mandor-target') {
      targetForm.value = {
        ...targetForm.value,
        line_id: form.value.line_id,
        shift_id: form.value.shift_id,
        machine_id: form.value.machine_id,
      };
      await refreshProductionTarget();
    }
    if (item.id === 'management-bagian' && bagianMasterRows.value.length === 0) {
      await refreshBagianMaster();
    }
    return;
  }

  await switchView(item.id);
}

function ensureVisibleActiveView() {
  if (activeView.value === 'settings' || navViews.value.some((view) => view.id === activeView.value)) {
    return;
  }

  const fallbackView = navViews.value[0]?.id || 'settings';
  activeView.value = fallbackView;
  persistPreferredWorkspace(fallbackView);
}

function reconcileSessionRoleAccess() {
  const allowed = sessionAllowedRoles.value;
  if (allowed.length === 0) {
    visibleRoles.value = [];
    selectedRole.value = 'Operator';
    ensureVisibleActiveView();
    return;
  }

  if (sessionContext.value?.auth_mode === 'ON') {
    if (sessionContext.value.role === 'SuperAdmin') {
      const storedSuperAdminRoles = readSuperAdminVisibleRoles();
      const sourceRoles = storedSuperAdminRoles.length
        ? mergeRoleLists(storedSuperAdminRoles, visibleRoles.value)
        : visibleRoles.value;
      const nextVisibleRoles = sourceRoles.filter((role) => allowed.includes(role));
      visibleRoles.value = nextVisibleRoles.length ? withRequiredRole(nextVisibleRoles, 'SuperAdmin') : [...allowed];
      selectedRole.value = 'SuperAdmin';
      debugLog('role', 'SuperAdmin production roles direkonsiliasi.', {
        allowed,
        storedSuperAdminRoles,
        sourceRoles,
        resolvedVisibleRoles: visibleRoles.value,
      });
    } else {
      visibleRoles.value = [...allowed];
      selectedRole.value = allowed[0];
    }

    persistPreferredRole(selectedRole.value);
    persistVisibleRoles(visibleRoles.value);
    if (selectedRole.value === 'SuperAdmin') {
      persistSuperAdminVisibleRoles(visibleRoles.value);
    }
    ensureVisibleActiveView();
    return;
  }

  const nextVisibleRoles = visibleRoles.value.filter((role) => allowed.includes(role));

  if (selectedRole.value === 'SuperAdmin' && allowed.includes('SuperAdmin')) {
    const storedSuperAdminRoles = readSuperAdminVisibleRoles();
    const sourceRoles = storedSuperAdminRoles.length
      ? mergeRoleLists(storedSuperAdminRoles, nextVisibleRoles)
      : nextVisibleRoles;
    visibleRoles.value = withRequiredRole(sourceRoles.filter((role) => allowed.includes(role)), 'SuperAdmin');
    persistPreferredRole(selectedRole.value);
    persistVisibleRoles(visibleRoles.value);
    persistSuperAdminVisibleRoles(visibleRoles.value);
    debugLog('role', 'SuperAdmin visible roles direkonsiliasi.', {
      allowed,
      storedSuperAdminRoles,
      nextVisibleRoles,
      resolvedVisibleRoles: visibleRoles.value,
    });
    ensureVisibleActiveView();
    return;
  }

  visibleRoles.value = nextVisibleRoles.length ? nextVisibleRoles : [allowed[0]];

  if (!visibleRoles.value.includes(selectedRole.value)) {
    selectedRole.value = visibleRoles.value[0];
    persistPreferredRole(selectedRole.value);
  }

  persistVisibleRoles(visibleRoles.value);
  ensureVisibleActiveView();
}

function buildSessionPayload() {
  return {
    simulated_role: activeWorkspaceRole.value,
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

function maskEmailForUi(email) {
  const value = String(email || '').trim();
  if (!value || !value.includes('@')) {
    return '-';
  }

  const [name, domain] = value.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

function formatPercent(value) {
  const numericValue = Number(value || 0);

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function normalizeSelectOptions(rows, fallback, valueKey) {
  const normalized = rows
    .map((row) => {
      const value = row.value || row[valueKey] || row.email || '';
      return {
        value,
        label: row.label || row.name || row[valueKey] || row.email || value,
      };
    })
    .filter((row) => row.value);

  return normalized.length ? normalized : fallback;
}

async function renderOperatorDashboardCharts() {
  if (activeView.value !== 'operator' || activeFeatureId.value !== 'operator-dashboard' || operatorDashboardPending.value) {
    return;
  }

  await nextTick();
  renderOperatorTrendChart();
  renderOperatorDonutCharts();
}

function renderOperatorTrendChart() {
  if (!operatorTrendChartCanvas.value) {
    return;
  }

  const rootStyles = window.getComputedStyle(document.documentElement);
  if (operatorTrendChart && operatorTrendChart.canvas !== operatorTrendChartCanvas.value) {
    operatorTrendChart.destroy();
    operatorTrendChart = null;
  }

  const primaryColor = rootStyles.getPropertyValue('--primary').trim() || '#2563eb';
  const successColor = rootStyles.getPropertyValue('--success').trim() || '#16a34a';
  const dangerColor = rootStyles.getPropertyValue('--danger').trim() || '#dc2626';
  const warningColor = rootStyles.getPropertyValue('--warning').trim() || '#f59e0b';
  const textSecondary = rootStyles.getPropertyValue('--text-secondary').trim() || '#4b5563';
  const gridColor = '#dbeafe';
  const labels = operatorTrendHistory.value.map((row) => row.label);
  const targetData = operatorTrendHistory.value.map((row) => Number(row.target || 0));
  const actualData = operatorTrendHistory.value.map((row) => Number(row.actual || 0));
  const okData = operatorTrendHistory.value.map((row) => Number(row.ok || 0));
  const rejectData = operatorTrendHistory.value.map((row) => Number(row.reject || 0));
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Target',
        data: targetData,
        borderColor: primaryColor,
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: primaryColor,
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 3,
        tension: 0.35,
        fill: false,
      },
      {
        label: 'Realisasi',
        data: actualData,
        borderColor: successColor,
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: successColor,
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 3,
        tension: 0.35,
        fill: true,
      },
      {
        label: 'OK',
        data: okData,
        borderColor: warningColor,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: warningColor,
        pointBorderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderDash: [6, 5],
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      },
      {
        type: 'bar',
        label: 'Reject',
        data: rejectData,
        borderColor: dangerColor,
        backgroundColor: 'rgba(220, 38, 38, 0.18)',
        borderRadius: 6,
        maxBarThickness: 18,
      },
    ],
  };

  if (!operatorTrendChart) {
    operatorTrendChart = new Chart(operatorTrendChartCanvas.value, {
      type: 'line',
      data: chartData,
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.92)',
            displayColors: true,
            padding: 10,
            titleFont: {
              size: 12,
              weight: '700',
            },
            bodyFont: {
              size: 12,
              weight: '700',
            },
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatNumber(context.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: textSecondary,
              font: {
                size: 11,
                weight: '700',
              },
              maxRotation: 0,
              autoSkip: false,
            },
          },
          y: {
            beginAtZero: true,
            grace: '8%',
            border: {
              display: false,
            },
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textSecondary,
              font: {
                size: 11,
                weight: '700',
              },
              callback(value) {
                return formatCompact(Number(value || 0));
              },
            },
          },
        },
      },
    });
    return;
  }

  operatorTrendChart.data = chartData;
  operatorTrendChart.update('none');
}

function setOperatorDonutCanvas(element, index) {
  if (!element) {
    if (operatorDonutCharts[index]) {
      operatorDonutCharts[index].destroy();
      operatorDonutCharts[index] = null;
    }
    operatorDonutChartCanvases.value[index] = null;
    return;
  }

  operatorDonutChartCanvases.value[index] = element;
}

function destroyOperatorDonutCharts() {
  operatorDonutCharts.forEach((chart) => chart?.destroy());
  operatorDonutCharts.length = 0;
}

function renderOperatorDonutCharts() {
  const rootStyles = window.getComputedStyle(document.documentElement);
  const successColor = rootStyles.getPropertyValue('--success').trim() || '#16a34a';
  const dangerColor = rootStyles.getPropertyValue('--danger').trim() || '#dc2626';
  const textPrimary = rootStyles.getPropertyValue('--text-primary').trim() || '#111827';
  const items = operatorComparisonDonuts.value;

  items.forEach((item, index) => {
    const canvas = operatorDonutChartCanvases.value[index];
    if (!canvas) {
      return;
    }

    if (operatorDonutCharts[index] && operatorDonutCharts[index].canvas !== canvas) {
      operatorDonutCharts[index].destroy();
      operatorDonutCharts[index] = null;
    }

    const chartData = {
      labels: ['OK', 'Reject'],
      datasets: [
        {
          data: [item.ok, item.reject],
          backgroundColor: [successColor, dangerColor],
          borderColor: '#ffffff',
          borderWidth: 5,
          borderRadius: 8,
          hoverOffset: 2,
        },
      ],
    };

    if (!operatorDonutCharts[index]) {
      operatorDonutCharts[index] = new Chart(canvas, {
        type: 'doughnut',
        data: chartData,
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          cutout: '56%',
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.92)',
              displayColors: true,
              padding: 10,
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              titleFont: {
                size: 12,
                weight: '700',
              },
              bodyFont: {
                size: 12,
                weight: '700',
              },
              callbacks: {
                label(context) {
                  return `${context.label}: ${formatNumber(context.parsed)}`;
                },
                afterBody() {
                  return [
                    `Realisasi: ${formatNumber(item.actual)}`,
                    `Target: ${formatNumber(item.target)}`,
                    `Capaian: ${item.achievementPercentLabel}`,
                    `Komposisi OK: ${formatPercent(item.okSharePercent)}%`,
                  ];
                },
              },
            },
          },
        },
      });
      operatorDonutCharts[index].options.color = textPrimary;
      return;
    }

    operatorDonutCharts[index].data = chartData;
    operatorDonutCharts[index].options.color = textPrimary;
    operatorDonutCharts[index].update('none');
  });

  operatorDonutCharts.slice(items.length).forEach((chart) => chart?.destroy());
  operatorDonutCharts.length = items.length;
}

function destroyHrdDashboardCharts() {
  if (hrdAttendanceDonutChart) { hrdAttendanceDonutChart.destroy(); hrdAttendanceDonutChart = null; }
  if (hrdWorkforceBarChart) { hrdWorkforceBarChart.destroy(); hrdWorkforceBarChart = null; }
  if (hrdReadinessPieChart) { hrdReadinessPieChart.destroy(); hrdReadinessPieChart = null; }
  if (hrdTrendLineChart) { hrdTrendLineChart.destroy(); hrdTrendLineChart = null; }
}

function renderHrdDashboardCharts() {
  if (activeView.value !== 'hrd' || activeFeatureId.value !== 'hrd-dashboard' || hrdPending.value) {
    return;
  }

  const rootStyles = window.getComputedStyle(document.documentElement);
  const successColor = rootStyles.getPropertyValue('--success').trim() || '#16a34a';
  const warningColor = rootStyles.getPropertyValue('--warning').trim() || '#d97706';
  const dangerColor = rootStyles.getPropertyValue('--danger').trim() || '#dc2626';
  const primaryColor = rootStyles.getPropertyValue('--primary').trim() || '#2563eb';
  const neutralColor = '#94a3b8';
  const textPrimary = rootStyles.getPropertyValue('--text-primary').trim() || '#111827';

  // 1. Donut Chart (Kehadiran Hari Ini)
  if (hrdAttendanceDonutCanvas.value) {
    const data = hrdAttendanceDonutData.value;
    if (hrdAttendanceDonutChart) {
      hrdAttendanceDonutChart.data.datasets[0].data = data;
      hrdAttendanceDonutChart.options.color = textPrimary;
      hrdAttendanceDonutChart.update('none');
    } else {
      hrdAttendanceDonutChart = new Chart(hrdAttendanceDonutCanvas.value, {
        type: 'doughnut',
        data: {
          labels: ['Hadir', 'Izin', 'Sakit', 'Alpha', 'Pending'],
          datasets: [{
            data,
            backgroundColor: [successColor, primaryColor, warningColor, dangerColor, neutralColor],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          color: textPrimary,
          plugins: { legend: { position: 'right' } }
        }
      });
    }
  }

  // 2. Bar Chart (Distribusi Pekerja)
  if (hrdWorkforceBarCanvas.value) {
    const data = hrdWorkforceBarData.value;
    if (hrdWorkforceBarChart) {
      hrdWorkforceBarChart.data.labels = data.labels;
      hrdWorkforceBarChart.data.datasets[0].data = data.data;
      hrdWorkforceBarChart.options.color = textPrimary;
      hrdWorkforceBarChart.update('none');
    } else {
      hrdWorkforceBarChart = new Chart(hrdWorkforceBarCanvas.value, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Karyawan Aktif',
            data: data.data,
            backgroundColor: primaryColor,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          color: textPrimary,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }

  // 3. Pie Chart (Readiness Kelengkapan)
  if (hrdReadinessPieCanvas.value) {
    const data = hrdReadinessPieData.value;
    if (hrdReadinessPieChart) {
      hrdReadinessPieChart.data.datasets[0].data = data;
      hrdReadinessPieChart.options.color = textPrimary;
      hrdReadinessPieChart.update('none');
    } else {
      hrdReadinessPieChart = new Chart(hrdReadinessPieCanvas.value, {
        type: 'pie',
        data: {
          labels: ['Payroll-ready', 'Review required'],
          datasets: [{
            data,
            backgroundColor: [successColor, warningColor],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          color: textPrimary,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  // 4. Line Chart (Tren Kehadiran Mingguan)
  if (hrdTrendLineCanvas.value) {
    const data = hrdTrendLineData.value;
    if (hrdTrendLineChart) {
      hrdTrendLineChart.data.labels = data.labels;
      hrdTrendLineChart.data.datasets[0].data = data.hadir;
      hrdTrendLineChart.data.datasets[1].data = data.absen;
      hrdTrendLineChart.options.color = textPrimary;
      hrdTrendLineChart.update('none');
    } else {
      hrdTrendLineChart = new Chart(hrdTrendLineCanvas.value, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            { label: 'Hadir', data: data.hadir, borderColor: successColor, backgroundColor: successColor, tension: 0.3 },
            { label: 'Absen/Izin', data: data.absen, borderColor: warningColor, backgroundColor: warningColor, tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          color: textPrimary,
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }
}

function showMetricHelp(metric) {
  const content = metricHelpContent[metric.label];

  if (!content) {
    return;
  }

  Swal.fire({
    icon: content.icon,
    title: content.title,
    html: content.html,
    confirmButtonText: 'Mengerti',
    buttonsStyling: false,
    customClass: {
      popup: 'metric-help-popup',
      title: 'metric-help-title',
      htmlContainer: 'metric-help-body',
      confirmButton: 'metric-help-confirm',
    },
  });
}

function getSafeErrorMessage(error) {
  if (error instanceof ApiAdapterError) {
    return `${error.code}: ${error.message}`;
  }

  if (error?.message) {
    return error.message;
  }

  return 'Aksi gagal. Periksa koneksi atau permission role aktif.';
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

onMounted(async () => {
  debugLog('info', 'Aplikasi dimount.', {
    activeView: activeView.value,
    selectedRole: selectedRole.value,
    viewLog: viewLog.value,
  });
  hydrate();
  ensureVisibleActiveView();
  await refreshSessionContext();
  refreshOperatorReferenceData();
  refreshDefectCategories();
  refreshProductionTarget();
  await switchView(activeView.value);
  renderOperatorDashboardCharts();
  window.addEventListener('keydown', handleKeydown);
});

watch(operatorComparisonDonuts, async () => {
  await nextTick();
  renderOperatorDashboardCharts();
}, {
  deep: true,
  flush: 'post',
});

watch(operatorTrendHistory, async () => {
  await nextTick();
  renderOperatorDashboardCharts();
}, {
  deep: true,
  flush: 'post',
});

watch(operatorTrendPeriod, () => {
  debugLog('info', `Chart period berubah ke ${operatorTrendPeriod.value}.`);
  refreshOperatorDashboard();
});

watch(() => [activeView.value, activeFeatureId.value, operatorDashboardPending.value, hrdPending.value], () => {
  renderOperatorDashboardCharts();
  renderHrdDashboardCharts();
}, {
  flush: 'post',
});

watch(() => [activeView.value, activeFeatureId.value], ([viewId, featureId]) => {
  debugLog('workspace', 'Navigasi aktif berubah.', {
    viewId,
    featureId,
    selectedRole: selectedRole.value,
  });
});

watch(() => [selectedRole.value, visibleRoles.value.join('|')], ([role, visible]) => {
  if (role === 'SuperAdmin') {
    persistSuperAdminVisibleRoles(visibleRoles.value);
  }
  debugLog('role', 'State role berubah.', {
    selectedRole: role,
    visibleRoles: visible.split('|').filter(Boolean),
  });
});

watch(sessionError, (message) => {
  if (message) {
    debugLog('error', 'Session error muncul.', { message });
  }
});

watch(() => [
  hrdFilters.value.factory_date,
  hrdFilters.value.period_month,
  hrdFilters.value.bagian_id,
  hrdFilters.value.attendance_status,
], () => {
  if (activeView.value === 'hrd') {
    void refreshHrdAccessDashboard();
  }
});

watch(hrdEmployeeSearchInput, (value) => {
  if (hrdEmployeeSearchTimer) {
    window.clearTimeout(hrdEmployeeSearchTimer);
  }

  hrdEmployeeSearchTimer = window.setTimeout(() => {
    const normalized = String(value || '').trim();
    hrdEmployeeSearch.value = normalized.length >= 2 ? normalized : '';
    debugLog('info', 'Search direktori HRD diperbarui.', {
      raw_length: normalized.length,
      active_query: hrdEmployeeSearch.value,
      threshold: 2,
      result_count: hrdVisibleEmployees.value.length,
    });
  }, 280);
});

watch(() => [form.value.bagian_id, form.value.work_category_id, form.value.line_id, form.value.shift_id, form.value.machine_id, selectedOperatorEmail.value], () => {
  void refreshProductionTarget();
  if (activeView.value === 'operator') {
    void refreshOperatorDashboard();
  }
});

watch(() => [
  targetForm.value.scope_type,
  targetForm.value.factory_date,
  targetForm.value.effective_from,
  targetForm.value.line_id,
  targetForm.value.shift_id,
  targetForm.value.machine_id,
  targetForm.value.operator_email,
], () => {
  syncTargetScopeDefaults();
  if (activeView.value === 'mandor' && activeFeatureId.value === 'mandor-target') {
    void refreshProductionTarget();
  }
});

watch([machineOptions, operatorOptions], () => {
  syncTargetScopeDefaults();
});

onBeforeUnmount(() => {
  if (hrdEmployeeSearchTimer) {
    window.clearTimeout(hrdEmployeeSearchTimer);
  }
  operatorTrendChart?.destroy();
  destroyOperatorDonutCharts();
  destroyHrdDashboardCharts();
  operatorStore.dispose();
  window.removeEventListener('keydown', handleKeydown);
});

function ensureSuperAdminLocalMaintenance() {
  return selectedRole.value === 'SuperAdmin';
}

function readOptiflowLocalStorageSnapshot() {
  try {
    return Object.keys(window.localStorage)
      .filter((key) => key.startsWith('optiflow.'))
      .sort()
      .reduce((snapshot, key) => ({
        ...snapshot,
        [key]: window.localStorage.getItem(key),
      }), {});
  } catch {
    return {
      error: 'localStorage tidak tersedia di browser ini.',
    };
  }
}

async function inspectSuperAdminLocalData() {
  if (!ensureSuperAdminLocalMaintenance()) {
    return;
  }

  try {
    const indexedDbSnapshot = await inspectLocalData();
    const mockGasSnapshot = await loadMockGasDemoState();
    localMaintenanceSnapshot.value = {
      indexed_db: indexedDbSnapshot,
      mock_gas_indexed_db: summarizeMockGasSnapshot(mockGasSnapshot),
      local_storage: readOptiflowLocalStorageSnapshot(),
    };
    localMaintenanceError.value = '';
    sessionMessage.value = 'Snapshot data lokal device berhasil dimuat.';
  } catch (error) {
    localMaintenanceError.value = getSafeErrorMessage(error);
  }
}

async function clearSuperAdminLocalStores() {
  if (!ensureSuperAdminLocalMaintenance()) {
    return;
  }

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Kosongkan IndexedDB?',
    html: '<p>Draft dan queue lokal akan dihapus, tetapi database IndexedDB tetap ada.</p><p>Preferensi Try Role tidak berubah.</p>',
    showCancelButton: true,
    confirmButtonText: 'Kosongkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
  });

  if (!result.isConfirmed) {
    return;
  }

  await clearLocalData();
  sessionMessage.value = 'Draft dan queue IndexedDB sudah dikosongkan.';
  await inspectSuperAdminLocalData();
}

async function resetSuperAdminIndexedDb() {
  if (!ensureSuperAdminLocalMaintenance()) {
    return;
  }

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Reset database IndexedDB?',
    html: '<p>Database IndexedDB lokal akan dihapus total dan dibuat ulang saat aplikasi dipakai lagi.</p><p>Snapshot mock GAS demo juga akan dikosongkan agar seed awal dibuat ulang.</p><p>Data backend tidak berubah.</p>',
    showCancelButton: true,
    confirmButtonText: 'Reset database',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
  });

  if (!result.isConfirmed) {
    return;
  }

  await resetLocalDatabase();
  await clearMockGasDemoState();
  sessionMessage.value = 'Database IndexedDB lokal sudah direset.';
  await inspectSuperAdminLocalData();
}

async function resetSuperAdminLocalData() {
  if (!ensureSuperAdminLocalMaintenance()) {
    return;
  }

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Reset data lokal device?',
    html: '<p>Draft Operator, queue IndexedDB, snapshot mock GAS demo, dan preferensi Try Role di browser ini akan dihapus.</p><p>Data Google Sheets dan Script Properties tidak akan disentuh.</p>',
    showCancelButton: true,
    confirmButtonText: 'Reset lokal',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
  });

  if (!result.isConfirmed) {
    return;
  }

  await resetLocalData();
  await clearMockGasDemoState();
  clearLocalRolePreferences();
  selectedRole.value = 'Operator';
  visibleRoles.value = ['Operator', 'Mandor', 'Supervisor', 'Management'];
  activeView.value = 'operator';
  activeRoleFeatures.value = {
    ...activeRoleFeatures.value,
    operator: 'operator-dashboard',
  };
  navRoleMenuOpen.value = false;
  sessionError.value = '';
  sessionMessage.value = 'Data lokal device sudah direset. Role demo kembali ke default.';

  await refreshSessionContext();
}

async function loadMockGasDemoState() {
  try {
    const { createMockGasPersistence } = await import('./services/mockGasPersistence.js');
    return await createMockGasPersistence().loadState();
  } catch {
    return null;
  }
}

async function clearMockGasDemoState() {
  try {
    const { createMockGasPersistence } = await import('./services/mockGasPersistence.js');
    await createMockGasPersistence().clearState();
  } catch {
    // Mock GAS persistence exists only for local/demo runtime.
  }
}

function summarizeMockGasSnapshot(snapshot) {
  if (!snapshot) {
    return {
      status: 'EMPTY',
      note: 'Seed demo akan dibuat saat mock GAS berjalan.',
    };
  }

  return {
    status: 'PERSISTED',
    raw_logs: snapshot.rawLogs?.length || 0,
    quarantine: snapshot.quarantine?.length || 0,
    target_master: snapshot.targetMaster?.length || 0,
    defect_categories: snapshot.defectCategories?.length || 0,
    user_roles: snapshot.userRoles?.length || 0,
    line_master: snapshot.lineMaster?.length || 0,
    shift_master: snapshot.shiftMaster?.length || 0,
  };
}

function reloadAppFromSuperAdmin() {
  if (!ensureSuperAdminLocalMaintenance()) {
    return;
  }

  window.location.reload();
}

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

function readPreferredWorkspace() {
  try {
    const storedView = window.localStorage.getItem('optiflow.active_workspace');
    return appWorkspaceIds().includes(storedView) ? storedView : 'operator';
  } catch {
    return 'operator';
  }
}

function readVisibleRoles() {
  try {
    const storedRoles = JSON.parse(window.localStorage.getItem('optiflow.visible_roles') || '[]');
    const validRoles = Array.isArray(storedRoles)
      ? storedRoles.filter((role) => roleOptions.includes(role))
      : [];
    return validRoles.length ? [...new Set(validRoles)] : ['Operator', 'Mandor', 'Supervisor', 'Management'];
  } catch {
    return ['Operator', 'Mandor', 'Supervisor', 'Management'];
  }
}

function readSuperAdminVisibleRoles() {
  try {
    const storedRoles = JSON.parse(window.localStorage.getItem('optiflow.superadmin_visible_roles') || '[]');
    const validRoles = Array.isArray(storedRoles)
      ? storedRoles.filter((role) => roleOptions.includes(role))
      : [];
    return validRoles.length ? [...new Set(validRoles)] : [];
  } catch {
    return [];
  }
}

function withRequiredRole(roles, requiredRole) {
  const nextRoles = [...new Set((roles || []).filter((role) => roleOptions.includes(role)))];
  if (roleOptions.includes(requiredRole) && !nextRoles.includes(requiredRole)) {
    nextRoles.push(requiredRole);
  }
  return nextRoles;
}

function mergeRoleLists(...roleLists) {
  return [...new Set(roleLists.flat().filter((role) => roleOptions.includes(role)))];
}

function readViewLogPreference() {
  try {
    return window.localStorage.getItem('optiflow.view_log') === 'true';
  } catch {
    return false;
  }
}

function persistViewLogPreference(enabled) {
  try {
    window.localStorage.setItem('optiflow.view_log', enabled ? 'true' : 'false');
  } catch {
    // localStorage is optional; debug console remains controlled in memory.
  }
}

function persistPreferredWorkspace(viewId) {
  try {
    if (appWorkspaceIds().includes(viewId)) {
      window.localStorage.setItem('optiflow.active_workspace', viewId);
    }
  } catch {
    // localStorage is optional; active workspace still works for this session.
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

function persistSuperAdminVisibleRoles(roles) {
  try {
    window.localStorage.setItem('optiflow.superadmin_visible_roles', JSON.stringify(withRequiredRole(roles, 'SuperAdmin')));
  } catch {
    // localStorage is optional; SuperAdmin menu visibility still works for this session.
  }
}

function clearLocalRolePreferences() {
  try {
    window.localStorage.removeItem('optiflow.try_role');
    window.localStorage.removeItem('optiflow.visible_roles');
    window.localStorage.removeItem('optiflow.superadmin_visible_roles');
    window.localStorage.removeItem('optiflow.active_workspace');
  } catch {
    // localStorage is optional; IndexedDB reset remains available for local data cleanup.
  }
}

function appWorkspaceIds() {
  return ['operator', 'mandor', 'supervisor', 'management', 'hrd', 'settings'];
}

// --- Table Search & Sort Managers ---
const tblDefectOptions = useTableSearchAndSort(defectOptions);
const tblSupervisorRawRows = useTableSearchAndSort(supervisorRawRows);
const tblProductionTargetRows = useTableSearchAndSort(productionTargetRows);
const tblSupervisorQuarantineRows = useTableSearchAndSort(supervisorQuarantineRows);
const tblBagianMasterRows = useTableSearchAndSort(bagianMasterRows);
const tblDashboardPareto = useTableSearchAndSort(computed(() => dashboardData.value?.pareto || []));
const tblHrdVisibleEmployees = useTableSearchAndSort(hrdVisibleEmployees); // Already filtered, applying sort on top
const tblHrdAttendanceDailyRows = useTableSearchAndSort(hrdAttendanceDailyRows);
const tblHrdAttendanceMonthlyRows = useTableSearchAndSort(hrdAttendanceMonthlyRows);
const tblMaintenanceProperties = useTableSearchAndSort(maintenanceProperties);
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="title-stack">
        <button class="brand-trigger" type="button" aria-label="OPTIFLOW maintenance trigger" @click="handleBrandTap">
          OPTIFLOW
        </button>
        <h1>{{ activeShellMeta.title }}</h1>
        <p>{{ activeShellMeta.subtitle }}</p>
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
      <div class="nav-context">
        <button
          class="nav-context-trigger"
          type="button"
          :aria-expanded="navRoleMenuOpen"
          aria-haspopup="menu"
          @click="toggleNavRoleMenu"
        >
          <span>{{ navModeLabel }}</span>
        </button>
        <div v-if="navRoleMenuOpen" class="nav-role-menu" role="menu" aria-label="Pilih role atau workspace">
          <button
            v-for="view in navViews"
            :key="view.id"
            type="button"
            role="menuitem"
            :class="['nav-role-option', { active: activeView === view.id, selected: activeView === view.id }]"
            @click="selectWorkspaceFromNav(view.id)"
          >
            <span>{{ view.icon }}</span>
            <strong>{{ view.label }}</strong>
          </button>
        </div>
      </div>
      <button
        v-for="view in navItems"
        :key="view.id"
        type="button"
        :class="['nav-item', { active: activeNavId === view.id }]"
        :aria-current="activeNavId === view.id ? 'page' : undefined"
        @click="switchNavigationItem(view)"
      >
        <span class="nav-icon" aria-hidden="true">{{ view.icon }}</span>
        <span class="nav-label">{{ view.label }}</span>
        <strong class="nav-badge">{{ view.badge }}</strong>
      </button>
    </nav>

    <div v-if="activeView === 'operator'" class="operator-progress">
      <div>
        <span>📈 Progress Realisasi</span>
        <strong>{{ formatNumber(Number(operatorDashboardSummary.ok_today || 0) + Number(operatorDashboardSummary.reject_today || 0)) }} / {{ formatNumber(operatorDashboardSummary.target_today) }}</strong>
      </div>
      <div class="progress-track">
        <span :style="{ width: `${operatorOkPercent}%` }"></span>
      </div>
    </div>

    <div v-else-if="activeView === 'mandor'" class="role-progress mandor-progress">
      <div>
        <span>👥 Progress Tim Mandor</span>
        <strong>{{ formatNumber(mandorProgressSummary.actual) }} / {{ formatNumber(mandorProgressSummary.target) }}</strong>
        <small>{{ supervisorFilters.line_id }} / {{ supervisorFilters.shift_id }} - {{ supervisorFilters.factory_date }}</small>
      </div>
      <div class="progress-track">
        <span :style="{ width: `${mandorProgressPercent}%` }"></span>
      </div>
    </div>

    <section v-if="activeView === 'operator' && activeFeatureId === 'operator-dashboard'" class="metric-strip" aria-label="Ringkasan produksi">
      <template v-if="operatorDashboardPending">
        <article
          v-for="item in skeletonItems"
          :key="`metric-skeleton-${item}`"
          class="metric skeleton-card"
          aria-hidden="true"
        >
          <span class="skeleton-line short"></span>
          <strong class="skeleton-line metric-value"></strong>
        </article>
      </template>
      <button
        v-else
        v-for="metric in operatorDashboardMetrics"
        :key="metric.label"
        type="button"
        :class="['metric', metric.tone]"
        :aria-label="`Lihat penjelasan ${metric.label}`"
        @click="showMetricHelp(metric)"
      >
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </button>
    </section>

    <div :class="['workspace', `view-${activeView}`, activeView === 'operator' ? `operator-${activeFeatureId}` : '']">
      <section v-if="activeView === 'operator'" class="panel operator-context-panel" aria-label="Header shift aktif">
        <div v-if="operatorDashboardPending" class="operator-context-grid" aria-hidden="true">
          <article v-for="item in skeletonItems" :key="`context-skeleton-${item}`" class="skeleton-card">
            <span class="skeleton-line short"></span>
            <strong class="skeleton-line"></strong>
          </article>
        </div>
        <div v-else class="operator-context-grid">
          <article v-for="item in operatorContextItems" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
      </section>

      <section v-if="activeView === 'operator' && activeFeatureId === 'operator-input'" class="panel input-panel role-workspace" aria-labelledby="form-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Operator</p>
            <h2 id="form-title">📝 Laporan cepat</h2>
          </div>
          <span class="badge">{{ draftStatus }}</span>
        </div>

        <div class="task-strip" aria-label="Prioritas kerja operator">
          <article v-for="card in operatorTaskCards" :key="card.label" :class="['task-card', card.tone]">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.hint }}</p>
          </article>
        </div>

        <div class="task-kicker">
          <span>1</span>
          <strong>Input produksi</strong>
          <small>Isi angka utama, cek total, lalu submit.</small>
        </div>

        <div class="field-grid">
          <label class="field">
            <span>🏭 Bagian</span>
            <select v-model="form.bagian_id" aria-label="Bagian" @change="clearFieldError('bagian_id')">
              <option v-for="option in bagianOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.bagian_id" class="field-error">{{ formErrors.bagian_id }}</small>
          </label>
          <label class="field">
            <span>🕒 Shift</span>
            <select v-model="form.shift_id" aria-label="Shift" @change="clearFieldError('shift_id')">
              <option v-for="option in shiftOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="shiftCatalogLoading">Memuat referensi dari database.</small>
            <small v-if="shiftCatalogError" class="field-error">{{ shiftCatalogError }}</small>
            <small v-if="formErrors.shift_id" class="field-error">{{ formErrors.shift_id }}</small>
          </label>
          <label class="field">
            <span>🛠️ Jenis pekerjaan</span>
            <select v-model="form.work_category_id" aria-label="Jenis pekerjaan" @change="clearFieldError('work_category_id')">
              <option v-for="option in workCategoryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.work_category_id" class="field-error">{{ formErrors.work_category_id }}</small>
          </label>
          <label class="field">
            <span>👨‍🔧 Operator</span>
            <select v-model="selectedOperatorEmail" aria-label="Operator demo">
              <option v-for="option in operatorOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small>Mode demo mengikuti dataset USER_ROLES.</small>
          </label>
        </div>

        <div class="number-grid">
          <label class="number-field">
            <span>🎯 Target</span>
            <input
              v-model.number="form.target_harian"
              inputmode="numeric"
              aria-label="Target"
              :readonly="isTargetLocked"
              @input="clearFieldError('target_harian')"
            />
            <small :class="isTargetLocked ? 'field-info' : 'field-error'">{{ targetStatusLabel }}</small>
            <small v-if="productionTargetError" class="field-error">{{ productionTargetError }}</small>
            <small v-if="formErrors.target_harian" class="field-error">{{ formErrors.target_harian }}</small>
          </label>
          <label class="number-field">
            <span>📦 Tandon</span>
            <input v-model.number="form.tandon" inputmode="numeric" aria-label="Tandon" @input="clearFieldError('tandon')" />
            <small v-if="formErrors.tandon" class="field-error">{{ formErrors.tandon }}</small>
          </label>
          <label class="number-field">
            <span>✔️ OK</span>
            <input v-model.number="form.perolehan_ok" inputmode="numeric" aria-label="OK" @input="clearFieldError('perolehan_ok')" />
            <small v-if="formErrors.perolehan_ok" class="field-error">{{ formErrors.perolehan_ok }}</small>
          </label>
          <label class="number-field danger">
            <span>❌ Reject</span>
            <input v-model.number="form.perolehan_reject" inputmode="numeric" aria-label="Reject" @input="normalizeRejectState" />
            <small v-if="formErrors.perolehan_reject" class="field-error">{{ formErrors.perolehan_reject }}</small>
          </label>
        </div>

        <div v-if="shouldShowDefect" class="defect-row">
          <label class="field">
            <span>🏷️ Kategori defect</span>
            <select v-model="form.defect_category_id" aria-label="Kategori defect" @change="clearFieldError('defect_category_id')">
              <option v-for="option in defectOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="defectCatalogLoading">Memuat kategori dari master defect.</small>
            <small v-if="defectCatalogError" class="field-error">{{ defectCatalogError }}</small>
            <small v-if="formErrors.defect_category_id" class="field-error">{{ formErrors.defect_category_id }}</small>
          </label>
          <label class="field">
            <span>📝 Catatan</span>
            <input v-model="form.defect_notes" aria-label="Catatan defect" maxlength="140" @input="clearFieldError('defect_notes')" />
            <small v-if="formErrors.defect_notes" class="field-error">{{ formErrors.defect_notes }}</small>
          </label>
        </div>

        <div v-if="shouldShowDefect" class="defect-insight" aria-label="Defect Pareto preview">
          <div>
            <span>🔬 Faktor QCC</span>
            <strong>{{ selectedDefectCategory?.qcc_factor || '-' }}</strong>
          </div>
          <div>
            <span>⚠️ Severity</span>
            <strong>{{ selectedDefectCategory?.severity || '-' }}</strong>
          </div>
          <div>
            <span>Pareto Top</span>
            <strong>{{ paretoPreview[0]?.defect_name || '-' }}</strong>
          </div>
        </div>

        <div :class="['check-row', isTandonValid ? 'valid' : 'invalid']">
          <span>Total perolehan</span>
          <strong>{{ formatNumber(totalOutput) }}</strong>
          <small>Realisasi target = OK + Reject. Tandon tidak masuk perhitungan target.</small>
        </div>

        <div v-if="persistenceError" class="inline-error" role="alert">
          {{ persistenceError }}
        </div>

        <div v-if="submitMessage" class="inline-info" role="status">
          {{ submitMessage }}
        </div>

        <div class="action-row">
          <button class="button secondary" type="button" @click="saveDraft">💾 Simpan Draft</button>
          <button class="button primary" type="button" @click="submitOperatorReportWithSession">🚀 Submit</button>
        </div>
      </section>

      <section v-if="activeView === 'operator' && activeFeatureId === 'operator-history'" class="panel operator-history-panel role-workspace" aria-labelledby="history-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Riwayat</p>
            <h2 id="history-title">🕰️ Submit terakhir hari ini</h2>
          </div>
          <span class="badge">{{ operatorRecentSubmissions.length }} item</span>
        </div>

        <div v-if="submitMessage" class="inline-info" role="status">
          {{ submitMessage }}
        </div>

        <div v-if="operatorDashboardError" class="inline-error" role="alert">
          {{ operatorDashboardError }}
        </div>

        <ul v-if="operatorDashboardPending" class="queue-list" aria-hidden="true">
          <li v-for="item in skeletonRows.slice(0, 3)" :key="`history-skeleton-${item}`" class="skeleton-card">
            <div>
              <strong class="skeleton-line wide"></strong>
              <span class="skeleton-line"></span>
            </div>
            <span class="skeleton-pill"></span>
          </li>
        </ul>

        <ul v-else class="queue-list">
          <li v-for="item in operatorRecentSubmissions" :key="item.transaction_id">
            <div>
              <strong>{{ item.transaction_id }}</strong>
              <span>{{ item.bagian_id || item.line_id }} / {{ item.shift_id }} / {{ item.work_category_id || item.machine_id }} - OK {{ formatNumber(item.perolehan_ok) }}, Reject {{ formatNumber(item.perolehan_reject) }}</span>
            </div>
            <span :class="['status', item.status === 'CONFLICT_PENDING' ? 'conflict' : 'warning']">
              {{ item.status }}
            </span>
          </li>
        </ul>

        <div v-if="!operatorDashboardPending && operatorRecentSubmissions.length === 0" class="empty-state">
          Belum ada antrean submit lokal untuk hari ini.
        </div>
      </section>

      <section v-if="activeView === 'operator' && activeFeatureId === 'operator-dashboard'" class="panel operator-dashboard-panel role-workspace" aria-labelledby="operator-dashboard-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Dashboard</p>
            <h2 id="operator-dashboard-title">📊 Target dan realisasi</h2>
          </div>
          <span class="badge">Hari ini vs kemarin</span>
        </div>

        <div v-if="operatorDashboardError" class="inline-error" role="alert">
          {{ operatorDashboardError }}
        </div>

        <div v-if="operatorDashboardPending" class="performance-grid" aria-hidden="true">
          <article v-for="item in skeletonItems.slice(0, 2)" :key="`performance-skeleton-${item}`" class="performance-donut-card skeleton-card">
            <span class="skeleton-line short"></span>
            <div>
              <strong class="skeleton-line metric-value"></strong>
              <small class="skeleton-line tiny"></small>
            </div>
            <div>
              <strong class="skeleton-line metric-value"></strong>
              <small class="skeleton-line tiny"></small>
            </div>
          </article>
        </div>

        <div v-else class="performance-grid" aria-label="Komposisi perolehan hari ini dan kemarin">
          <article v-for="(item, index) in operatorComparisonDonuts" :key="item.label" class="performance-donut-card">
            <div class="donut-chart-frame">
              <canvas
                :ref="(element) => setOperatorDonutCanvas(element, index)"
                class="performance-donut-chart"
                role="img"
                :aria-label="`Donut OK dan Reject ${item.label}`"
              ></canvas>
              <span>{{ item.achievementPercentLabel }}</span>
            </div>
            <div class="donut-detail">
              <span>{{ item.label }}</span>
              <strong>{{ formatNumber(item.actual) }} / {{ formatNumber(item.target) }}</strong>
              <small>{{ item.status }} ({{ item.gap > 0 ? '+' : '' }}{{ formatNumber(item.gap) }})</small>
              <div class="donut-breakdown">
                <span class="status success">OK {{ formatNumber(item.ok) }}</span>
                <span class="status danger">Reject {{ formatNumber(item.reject) }}</span>
                <span class="status warning">Tandon {{ formatNumber(item.tandon) }}</span>
              </div>
            </div>
          </article>
        </div>

        <div class="line-chart-card" aria-label="History target dan realisasi">
          <div class="chart-head">
            <div>
              <span>History {{ operatorTrendPeriodLabel }}</span>
              <strong>Target, realisasi, OK, reject</strong>
            </div>
            <div class="chart-tools">
              <div class="chart-period-control" aria-label="Periode trend operator">
                <button
                  v-for="period in operatorTrendPeriods"
                  :key="period.value"
                  type="button"
                  :class="{ active: operatorTrendPeriod === period.value }"
                  @click="operatorTrendPeriod = period.value"
                >
                  {{ period.label }}
                </button>
              </div>
              <div class="chart-legend" aria-label="Legenda chart">
                <span><i class="target-line"></i>Target</span>
                <span><i class="actual-line"></i>Realisasi</span>
                <span><i class="ok-line"></i>OK</span>
                <span><i class="reject-line"></i>Reject</span>
              </div>
            </div>
          </div>
          <div v-if="operatorDashboardPending" class="chart-canvas-frame skeleton-chart" aria-hidden="true">
            <span class="skeleton-line wide"></span>
          </div>
          <div v-else class="chart-canvas-frame">
            <canvas ref="operatorTrendChartCanvas" class="line-chart" role="img" aria-label="Line chart Target vs Realisasi"></canvas>
          </div>
        </div>

        <div class="hint-box">
          Data dashboard mengikuti response mock GAS `getOperatorDashboard` saat development lokal.
        </div>
      </section>

      <section v-if="activeView === 'operator' && activeFeatureId === 'operator-defect'" class="panel operator-defect-panel role-workspace" aria-labelledby="operator-defect-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Defect</p>
            <h2 id="operator-defect-title">⚠️ Reject dan Pareto mini</h2>
          </div>
          <span class="badge">{{ shouldShowDefect ? 'Reject aktif' : 'Tidak ada reject' }}</span>
        </div>

        <div class="defect-insight" aria-label="Defect Pareto preview">
          <div>
            <span>🔬 Faktor QCC</span>
            <strong>{{ selectedDefectCategory?.qcc_factor || '-' }}</strong>
          </div>
          <div>
            <span>⚠️ Severity</span>
            <strong>{{ selectedDefectCategory?.severity || '-' }}</strong>
          </div>
          <div>
            <span>Pareto Top</span>
            <strong>{{ paretoPreview[0]?.defect_name || '-' }}</strong>
          </div>
        </div>

        <div class="table-wrap">
          <div class="table-heading">
            <div>
              <span>Reference</span>
              <strong>Kategori defect aktif</strong>
            </div>
            <div class="control-filters">
              <label class="field" style="margin: 0; min-width: 150px;">
                <input type="search" v-model="tblDefectOptions.searchQuery" placeholder="Cari kategori..." aria-label="Cari kategori defect" />
              </label>
              <button class="button secondary compact-button" type="button" @click="refreshDefectCategories">
                🔄 Refresh
              </button>
            </div>
          </div>
          <div v-if="defectCatalogError" class="inline-error" role="alert">
            {{ defectCatalogError }}
          </div>
          <table>
            <thead>
              <tr>
                <th @click="tblDefectOptions.toggleSort('label')" style="cursor: pointer;">Kategori <span v-if="tblDefectOptions.sortKey === 'label'">{{ tblDefectOptions.sortAsc ? '🔼' : '🔽' }}</span></th>
                <th @click="tblDefectOptions.toggleSort('qcc_factor')" style="cursor: pointer;">QCC <span v-if="tblDefectOptions.sortKey === 'qcc_factor'">{{ tblDefectOptions.sortAsc ? '🔼' : '🔽' }}</span></th>
                <th @click="tblDefectOptions.toggleSort('severity')" style="cursor: pointer;">Severity <span v-if="tblDefectOptions.sortKey === 'severity'">{{ tblDefectOptions.sortAsc ? '🔼' : '🔽' }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="option in tblDefectOptions.processedData.filter((item) => item.value)" :key="option.value">
                <td>{{ option.label }}</td>
                <td>{{ getDefectCategory(option.value)?.qcc_factor || '-' }}</td>
                <td>{{ getDefectCategory(option.value)?.severity || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside v-if="activeView === 'operator' && activeFeatureId === 'operator-status'" class="panel queue-panel role-workspace" aria-labelledby="queue-title">
        <div class="section-title compact">
          <div>
            <p class="eyebrow">Sync</p>
            <h2 id="queue-title">📶 Antrean device</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Retry sync" :disabled="isSyncing" @click="syncQueueWithSession">
            🔁 Retry
          </button>
        </div>

        <div class="sync-summary" role="status">
          {{ operatorSyncSummary.status }} - Draft {{ operatorSyncSummary.draft_status }} - Queue {{ operatorSyncSummary.queue_count }}
          <span v-if="operatorSyncSummary.last_sync_at"> - Last sync {{ formatDateTime(operatorSyncSummary.last_sync_at) }}</span>
        </div>

        <div class="task-kicker compact-flow">
          <span aria-hidden="true">↻</span>
          <strong>Draft dan retry</strong>
          <small>Periksa antrean hanya saat ada pending sync.</small>
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

      <section v-if="activeView === 'mandor' && activeFeatureId !== 'workspace-help'" class="panel review-panel role-workspace" aria-labelledby="review-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Mandor</p>
            <h2 id="review-title">✅ Approval inbox</h2>
          </div>
          <span class="badge conflict">! {{ approvalSummary.conflict }} konflik</span>
        </div>

        <div v-if="activeFeatureId === 'mandor-dashboard'" class="task-strip" aria-label="Prioritas kerja Mandor">
          <article v-for="card in mandorTaskCards" :key="card.label" :class="['task-card', card.tone]">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.hint }}</p>
          </article>
        </div>

        <div v-if="activeFeatureId === 'mandor-dashboard'" class="approval-summary" aria-label="Ringkasan approval">
          <span class="status conflict">! Bentrok {{ approvalSummary.conflict }}</span>
          <span class="status warning">Review {{ approvalSummary.pending }}</span>
          <span class="status success">Selesai {{ approvalSummary.resolved }}</span>
        </div>

        <div v-if="activeFeatureId === 'mandor-dashboard'" class="table-wrap">
          <div class="table-heading">
            <div>
              <span>🖥️ Monitoring</span>
              <strong>Submit operator terbaru</strong>
            </div>
            <div class="control-filters">
              <label class="field" style="margin: 0; min-width: 150px;">
                <input type="search" v-model="tblSupervisorRawRows.searchQuery" placeholder="Cari transaksi..." aria-label="Cari transaksi" />
              </label>
              <button class="button secondary compact-button" type="button" @click="refreshSupervisorControlCenter">🔄 Refresh</button>
            </div>
          </div>
          <div v-if="supervisorPending" class="table-skeleton" aria-hidden="true">
            <span v-for="item in skeletonRows.slice(0, 4)" :key="`mandor-raw-skeleton-${item}`" class="skeleton-line wide"></span>
          </div>
          <table v-else>
            <thead>
              <tr>
                <th @click="tblSupervisorRawRows.toggleSort('transaction_id')" style="cursor: pointer;">Transaction <span v-if="tblSupervisorRawRows.sortKey === 'transaction_id'">{{ tblSupervisorRawRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                <th @click="tblSupervisorRawRows.toggleSort('work_category_id')" style="cursor: pointer;">Jenis pekerjaan <span v-if="tblSupervisorRawRows.sortKey === 'work_category_id'">{{ tblSupervisorRawRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                <th @click="tblSupervisorRawRows.toggleSort('perolehan_ok')" style="cursor: pointer;">OK <span v-if="tblSupervisorRawRows.sortKey === 'perolehan_ok'">{{ tblSupervisorRawRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                <th @click="tblSupervisorRawRows.toggleSort('perolehan_reject')" style="cursor: pointer;">Reject <span v-if="tblSupervisorRawRows.sortKey === 'perolehan_reject'">{{ tblSupervisorRawRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                <th @click="tblSupervisorRawRows.toggleSort('status')" style="cursor: pointer;">Status <span v-if="tblSupervisorRawRows.sortKey === 'status'">{{ tblSupervisorRawRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tblSupervisorRawRows.processedData" :key="row.transaction_id">
                <td>
                  <strong class="transaction-id">{{ row.transaction_id }}</strong>
                  <small class="transaction-meta">
                    {{ row.operator_email_masked || maskEmailForUi(row.operator_email) }} - {{ row.line_id }} / {{ row.shift_id }} - {{ formatDateTime(row.device_timestamp) }}
                  </small>
                </td>
                <td>{{ row.work_category_id || row.machine_id }}</td>
                <td>{{ formatNumber(row.perolehan_ok) }}</td>
                <td>{{ formatNumber(row.perolehan_reject) }}</td>
                <td><span :class="['status', row.status === 'CONFLICT_PENDING' ? 'conflict' : 'success']">{{ row.status }}</span></td>
                <td>
                  <div v-if="row.status === 'ACCEPTED'" class="review-actions" aria-label="Pre-closing review actions">
                    <button class="icon-button danger" type="button" title="Void" @click="createProductionReviewFromRow(row, 'VOID')">🚫 Void</button>
                    <button class="icon-button warning" type="button" title="Request correction" @click="createProductionReviewFromRow(row, 'REQUEST_CORRECTION')">📤 Request</button>
                    <button class="icon-button" type="button" title="Pre-closing correction" @click="createProductionReviewFromRow(row, 'PRE_CLOSING_CORRECTION')">✍️ Koreksi</button>
                  </div>
                  <span v-else class="muted-text">Quarantine flow</span>
                </td>
              </tr>
              <tr v-if="supervisorRawRows.length === 0">
                <td colspan="6">Belum ada submit operator pada filter Mandor saat ini.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="activeFeatureId === 'mandor-approval' || activeFeatureId === 'mandor-conflict'" class="approval-filters" aria-label="Filter approval">
          <label class="field">
            <span>📌 Status</span>
            <select v-model="approvalStatusFilter" aria-label="Filter status approval">
              <option v-for="option in approvalStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>🏭 Bagian</span>
            <select v-model="approvalLineFilter" aria-label="Filter Bagian approval">
              <option v-for="option in approvalLineOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="activeFeatureId === 'mandor-approval' || activeFeatureId === 'mandor-conflict'" class="approval-layout">
          <div class="table-wrap">
            <div class="table-heading">
              <div>
                <span>📋 Work Queue</span>
                <strong>Approval dan conflict</strong>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Jenis pekerjaan</th>
                  <th>Reason</th>
                  <th>📌 Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in displayedApprovalCases"
                  :key="row.id"
                  :class="{ 'active-row': activeApprovalCase && activeApprovalCase.id === row.id, 'conflict-row': row.status === 'CONFLICT_PENDING' }"
                  @click="setActiveApprovalCase(row.id)"
                >
                  <td>
                    <button class="row-button" type="button" @click.stop="setActiveApprovalCase(row.id)">
                      {{ row.id }}
                    </button>
                  </td>
                  <td>{{ row.work_category_id || row.machine_id }}</td>
                  <td>{{ row.reason_code }}</td>
                  <td>
                    <span :class="['status', row.status === 'CONFLICT_PENDING' ? 'conflict' : row.status === 'APPROVED' ? 'success' : 'warning']">
                      {{ row.status === 'CONFLICT_PENDING' ? '! Bentrok Data' : row.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="displayedApprovalCases.length === 0">
                  <td colspan="4">Tidak ada approval aktif untuk filter ini.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <aside v-if="activeApprovalCase" class="approval-detail" aria-label="Detail comparison approval">
            <div class="detail-head">
              <div>
                <p class="eyebrow">{{ activeApprovalCase.bagian_id || activeApprovalCase.line_id }} / {{ activeApprovalCase.shift_id }}</p>
                <h3>{{ activeApprovalCase.work_category_id || activeApprovalCase.machine_id }}</h3>
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
                ✅ Approve current
              </button>
              <button class="button secondary" type="button" @click="stageApprovalAction('REQUEST_CORRECTION')">
                📝 Request correction
              </button>
              <button class="button danger-button" type="button" @click="stageApprovalAction('REJECT_BOTH')">
                ❌ Reject both
              </button>
            </div>
          </aside>
        </div>

        <div v-if="activeFeatureId === 'mandor-closing'" class="task-panel">
          <div class="table-heading">
            <div>
              <span>⚙️ Detail/Action</span>
              <strong>Daily closing readiness</strong>
            </div>
          </div>
          <div class="hint-box">
            Jalankan closing setelah pending approval dan conflict queue selesai. Closing aktual tetap memakai permission backend dan audit trail.
          </div>
        </div>

        <div v-if="activeFeatureId === 'mandor-target'" class="target-management">
          <article class="task-panel target-form-panel">
            <div class="table-heading">
              <div>
                <span>📅 Planning</span>
                <strong>Atur target harian</strong>
              </div>
            </div>

            <div class="field-grid target-field-grid">
              <label class="field">
                <span>🔍 Scope</span>
                <select v-model="targetForm.scope_type" aria-label="Scope target">
                  <option v-for="option in targetScopeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>⏳ Mulai berlaku</span>
                <input v-model="targetForm.effective_from" aria-label="Mulai berlaku target" />
              </label>
              <label class="field">
                <span>⌛ Sampai</span>
                <input v-model="targetForm.effective_until" aria-label="Akhir berlaku target" placeholder="Opsional" />
              </label>
              <label class="field">
                <span>🏭 Bagian</span>
                <select v-model="targetForm.line_id" aria-label="Bagian target">
                  <option v-for="option in lineOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>🕒 Shift</span>
                <select v-model="targetForm.shift_id" aria-label="Shift target">
                  <option v-for="option in shiftOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>🛠️ Jenis pekerjaan</span>
                <select v-model="targetForm.machine_id" :disabled="targetForm.scope_type === 'LINE_SHIFT' || targetForm.scope_type === 'ALL_USERS'" aria-label="Jenis pekerjaan target">
                  <option v-if="targetForm.scope_type === 'LINE_SHIFT' || targetForm.scope_type === 'ALL_USERS'" value="ALL">ALL</option>
                  <option v-for="option in machineScopedOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>📧 Operator email</span>
                <select v-model="targetForm.operator_email" :disabled="targetForm.scope_type !== 'OPERATOR_ONLY'" aria-label="Operator email target">
                  <option v-if="targetForm.scope_type !== 'OPERATOR_ONLY'" value="ALL">ALL</option>
                  <option v-for="option in operatorOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="number-field">
                <span>🎯 Target</span>
                <input v-model.number="targetForm.target_harian" inputmode="numeric" aria-label="Nilai target harian" />
              </label>
            </div>

            <div class="hint-box">
              {{ targetScopePreview }}
            </div>

            <div v-if="productionTargetError" class="inline-error" role="alert">
              {{ productionTargetError }}
            </div>
            <div v-if="productionTargetMessage" class="inline-info" role="status">
              {{ productionTargetMessage }}
            </div>

            <div class="action-row inline-actions">
              <button class="button secondary" type="button" @click="refreshProductionTarget">
                🔄 Refresh
              </button>
              <button class="button primary" type="button" :disabled="productionTargetLoading" @click="saveProductionTarget">
                💾 Simpan target
              </button>
            </div>
          </article>

          <article class="task-panel">
            <div class="table-heading">
              <div>
                <span>🎯 Target aktif</span>
                <strong>Scope yang cocok</strong>
              </div>
              <div class="control-filters">
                <label class="field" style="margin: 0; min-width: 150px;">
                  <input type="search" v-model="tblProductionTargetRows.searchQuery" placeholder="Cari target..." aria-label="Cari target" />
                </label>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th @click="tblProductionTargetRows.toggleSort('scope_type')" style="cursor: pointer;">Scope <span v-if="tblProductionTargetRows.sortKey === 'scope_type'">{{ tblProductionTargetRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblProductionTargetRows.toggleSort('line_id')" style="cursor: pointer;">Bagian/Shift <span v-if="tblProductionTargetRows.sortKey === 'line_id'">{{ tblProductionTargetRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblProductionTargetRows.toggleSort('work_category_id')" style="cursor: pointer;">Jenis pekerjaan <span v-if="tblProductionTargetRows.sortKey === 'work_category_id'">{{ tblProductionTargetRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblProductionTargetRows.toggleSort('operator_email')" style="cursor: pointer;">Operator <span v-if="tblProductionTargetRows.sortKey === 'operator_email'">{{ tblProductionTargetRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblProductionTargetRows.toggleSort('target_harian')" style="cursor: pointer;">Target <span v-if="tblProductionTargetRows.sortKey === 'target_harian'">{{ tblProductionTargetRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblProductionTargetRows.toggleSort('status_aktif')" style="cursor: pointer;">Status <span v-if="tblProductionTargetRows.sortKey === 'status_aktif'">{{ tblProductionTargetRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="target in tblProductionTargetRows.processedData" :key="target.target_id">
                    <td>{{ target.scope_type }}</td>
                    <td>{{ target.line_id }} / {{ target.shift_id }}</td>
                    <td>{{ target.work_category_id || target.machine_id }}</td>
                    <td>{{ target.operator_email }}</td>
                    <td>{{ formatNumber(target.target_harian) }}</td>
                    <td><span :class="['status', target.status_aktif ? 'success' : 'warning']">{{ target.status_aktif ? 'Active' : 'Inactive' }}</span></td>
                    <td>
                      <div class="table-action-row">
                        <button class="button secondary compact-button" type="button" @click="editProductionTarget(target)">
                          ✏️ Edit
                        </button>
                        <button
                          v-if="target.status_aktif"
                          class="button secondary compact-button"
                          type="button"
                          @click="deactivateProductionTarget(target)"
                        >
                          🔴 Nonaktif
                        </button>
                        <button
                          v-else
                          class="button primary compact-button"
                          type="button"
                          @click="activateProductionTarget(target)"
                        >
                          🟢 Aktifkan
                        </button>
                        <button class="button danger-button compact-button" type="button" :disabled="!target.status_aktif" @click="deleteProductionTarget(target)">
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="productionTargetRows.length === 0">
                    <td colspan="7">Belum ada target untuk scope ini.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      <section v-if="activeView === 'supervisor' && activeFeatureId !== 'workspace-help'" class="panel supervisor-panel role-workspace" aria-labelledby="supervisor-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Supervisor</p>
            <h2 id="supervisor-title">🛡️ Control center</h2>
          </div>
          <span class="badge">{{ supervisorLoading ? 'Memuat' : 'Server-side view' }}</span>
        </div>

        <div v-if="supervisorPending && (activeFeatureId === 'supervisor-dashboard' || activeFeatureId === 'supervisor-alerts')" class="task-strip" aria-hidden="true">
          <article v-for="item in skeletonItems.slice(0, 3)" :key="`supervisor-task-skeleton-${item}`" class="task-card skeleton-card">
            <span class="skeleton-line short"></span>
            <strong class="skeleton-line metric-value"></strong>
            <p class="skeleton-line"></p>
          </article>
        </div>

        <div v-else-if="activeFeatureId === 'supervisor-dashboard' || activeFeatureId === 'supervisor-alerts'" class="task-strip" aria-label="Prioritas kontrol Supervisor">
          <article v-for="card in supervisorAlertCards" :key="card.label" :class="['task-card', card.tone]">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.hint }}</p>
          </article>
        </div>

        <div class="control-filters" aria-label="Filter supervisor">
          <label class="field">
            <span>📅 Tanggal</span>
            <input v-model="supervisorFilters.factory_date" aria-label="Tanggal supervisor" />
          </label>
          <label class="field">
            <span>🏭 Bagian</span>
            <select v-model="supervisorFilters.line_id" aria-label="Line supervisor">
              <option v-for="option in lineOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>🕒 Shift</span>
            <select v-model="supervisorFilters.shift_id" aria-label="Shift supervisor">
              <option v-for="option in shiftOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button class="button secondary" type="button" @click="refreshSupervisorControlCenter">🔄 Refresh</button>
        </div>

        <div v-if="supervisorPending && activeFeatureId === 'supervisor-dashboard'" class="mini-metrics" aria-hidden="true">
          <article v-for="item in skeletonItems" :key="`supervisor-metric-skeleton-${item}`" class="mini-metric skeleton-card">
            <span class="skeleton-line short"></span>
            <strong class="skeleton-line metric-value"></strong>
          </article>
        </div>

        <div v-else-if="activeFeatureId === 'supervisor-dashboard'" class="mini-metrics" aria-label="Ringkasan control center">
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

        <div v-if="activeFeatureId === 'supervisor-dashboard' || activeFeatureId === 'supervisor-adjustment'" class="control-actions">
          <button class="button primary" type="button" @click="closeCurrentScope">🔒 Close Bagian/shift</button>
          <button class="button secondary" type="button" @click="createAdjustmentFromFirstRow">⚖️ Create adjustment</button>
        </div>

        <div v-if="activeFeatureId === 'supervisor-raw' || activeFeatureId === 'supervisor-quarantine'" class="split-tables single-surface">
          <div v-if="activeFeatureId === 'supervisor-raw'" class="table-wrap">
            <div class="table-heading">
              <div>
                <span>📋 Work Queue</span>
                <strong>Raw logs</strong>
              </div>
            </div>
            <div v-if="supervisorPending" class="table-skeleton" aria-hidden="true">
              <span v-for="item in skeletonRows" :key="`raw-skeleton-${item}`" class="skeleton-line wide"></span>
            </div>
            <table v-else>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Jenis pekerjaan</th>
                  <th>OK</th>
                  <th>Reject</th>
                  <th>📌 Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in supervisorRawRows" :key="row.transaction_id">
                  <td>{{ row.transaction_id }}</td>
                  <td>{{ row.work_category_id || row.machine_id }}</td>
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

          <div v-if="activeFeatureId === 'supervisor-quarantine'" class="table-wrap">
            <div class="table-heading">
              <div>
                <span>⚠️ Exception Queue</span>
                <strong>Quarantine</strong>
              </div>
            </div>
            <div v-if="supervisorPending" class="table-skeleton" aria-hidden="true">
              <span v-for="item in skeletonRows" :key="`quarantine-skeleton-${item}`" class="skeleton-line wide"></span>
            </div>
            <table v-else>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Reason</th>
                  <th>Jenis pekerjaan</th>
                  <th>📌 Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in supervisorQuarantineRows" :key="row.quarantine_id">
                  <td>{{ row.quarantine_id }}</td>
                  <td>{{ row.reason_code }}</td>
                  <td>{{ row.work_category_id || row.machine_id }}</td>
                  <td><span :class="['status', row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'conflict']">{{ row.status }}</span></td>
                </tr>
                <tr v-if="supervisorQuarantineRows.length === 0">
                  <td colspan="4">Tidak ada quarantine aktif.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeFeatureId === 'supervisor-adjustment'" class="task-panel">
          <div class="table-heading">
            <div>
              <span>⚙️ Detail/Action</span>
              <strong>Adjustment control</strong>
            </div>
          </div>
          <div class="hint-box">
            Adjustment dibuat sebagai event terpisah setelah closing dan tidak mengubah transaksi asal secara langsung.
          </div>
        </div>
      </section>

      <section v-if="activeView === 'management' && activeFeatureId !== 'workspace-help'" class="panel dashboard-panel role-workspace" aria-labelledby="dashboard-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">Management</p>
            <h2 id="dashboard-title">📊 Read-only dashboard</h2>
          </div>
          <span class="badge">{{ dashboardLoading ? 'Memuat' : 'MASTER_RECAP' }}</span>
        </div>

        <div v-if="dashboardPending && activeFeatureId === 'management-dashboard'" class="task-strip" aria-hidden="true">
          <article v-for="item in skeletonItems.slice(0, 3)" :key="`management-task-skeleton-${item}`" class="task-card skeleton-card">
            <span class="skeleton-line short"></span>
            <strong class="skeleton-line metric-value"></strong>
            <p class="skeleton-line"></p>
          </article>
        </div>

        <div v-else-if="activeFeatureId === 'management-dashboard'" class="task-strip" aria-label="Insight utama Management">
          <article v-for="card in managementInsightCards" :key="card.label" :class="['task-card', card.tone]">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.hint }}</p>
          </article>
        </div>

        <div class="control-filters" aria-label="Filter dashboard">
          <label class="field">
            <span>📅 Tanggal</span>
            <input v-model="dashboardFilters.factory_date" aria-label="Tanggal dashboard" />
          </label>
          <label class="field">
            <span>🏭 Bagian</span>
            <select v-model="dashboardFilters.bagian_id" aria-label="Bagian dashboard">
              <option value="">Semua bagian</option>
              <option v-for="option in bagianMasterOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button class="button primary" type="button" @click="runRecapAndDashboard">🔄 Refresh</button>
        </div>

        <div v-if="dashboardPending" class="mini-metrics" aria-hidden="true">
          <article v-for="item in skeletonItems" :key="`dashboard-metric-skeleton-${item}`" class="mini-metric skeleton-card">
            <span class="skeleton-line short"></span>
            <strong class="skeleton-line metric-value"></strong>
          </article>
        </div>

        <div v-else class="mini-metrics" aria-label="Ringkasan dashboard">
          <article v-for="tile in dashboardTiles" :key="tile.label" :class="['mini-metric', tile.tone]">
            <span>{{ tile.label }}</span>
            <strong>{{ tile.value }}</strong>
          </article>
        </div>

        <div v-if="activeFeatureId === 'management-dashboard' || activeFeatureId === 'management-pending'" class="approval-summary" aria-label="Status dashboard">
          <span class="status warning">Quarantine {{ dashboardData?.summary?.pending_quarantine || 0 }}</span>
          <span class="status warning">Open closing {{ dashboardData?.summary?.open_closing || 0 }}</span>
          <span class="status success">Hadir {{ managementAttendanceSummary.present_count || 0 }}</span>
          <span class="status warning">Absen {{ managementAttendanceSummary.absent_count || 0 }}</span>
        </div>

        <div v-if="dashboardError" class="inline-error" role="alert">
          {{ dashboardError }}
        </div>

        <article v-if="activeFeatureId === 'management-bagian'" class="task-panel master-policy-panel">
          <div class="table-heading">
            <div>
              <span>📜 Master kebijakan</span>
              <strong>CRUD Bagian dan upah per item</strong>
            </div>
            <button class="button secondary compact-button" type="button" :disabled="bagianMasterLoading" @click="seedBagianDefaults">
              🌱 Seed default
            </button>
          </div>
          <div class="control-filters bagian-master-form" aria-label="Form master Bagian">
            <label class="field">
              <span>🆔 ID Bagian</span>
              <input v-model="bagianMasterForm.bagian_id" placeholder="SOLDER" aria-label="ID Bagian" />
            </label>
            <label class="field">
              <span>🏷️ Nama Bagian</span>
              <input v-model="bagianMasterForm.bagian_name" placeholder="Bagian Solder" aria-label="Nama Bagian" />
            </label>
            <label class="field wide-field">
              <span>📝 Deskripsi</span>
              <input v-model="bagianMasterForm.description" placeholder="Deskripsi singkat tanpa PII" aria-label="Deskripsi Bagian" />
            </label>
            <label class="field">
              <span>💰 Upah / item</span>
              <input v-model.number="bagianMasterForm.unit_rate" type="number" min="0" aria-label="Upah per item" />
            </label>
            <label class="field">
              <span>📦 Target unit/bulan</span>
              <input v-model.number="bagianMasterForm.monthly_target_unit" type="number" min="0" aria-label="Target unit bulanan" />
            </label>
            <label class="field">
              <span>💵 Target gaji</span>
              <input v-model.number="bagianMasterForm.target_salary" type="number" min="0" aria-label="Target gaji bulanan" />
            </label>
            <label class="field checkbox-field">
              <span>🟢 Aktif</span>
              <input v-model="bagianMasterForm.status_aktif" type="checkbox" aria-label="Status aktif Bagian" />
            </label>
            <div class="form-actions">
              <button class="button primary" type="button" :disabled="bagianMasterLoading" @click="saveBagianMaster">💾 Simpan</button>
              <button class="button secondary" type="button" :disabled="bagianMasterLoading" @click="resetBagianMasterForm">🔄 Reset</button>
            </div>
          </div>
          <p v-if="bagianMasterMessage" class="inline-success">{{ bagianMasterMessage }}</p>
          <p v-if="bagianMasterError" class="inline-error" role="alert">{{ bagianMasterError }}</p>
          <div class="table-wrap compact-table">
            <table>
              <thead>
                <tr>
                  <th>🏭 Bagian</th>
                  <th>Upah</th>
                  <th>Target/bulan</th>
                  <th>📌 Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in bagianMasterRows" :key="row.bagian_id">
                  <td>
                    <strong>{{ row.bagian_name }}</strong>
                    <small>{{ row.bagian_id }} - {{ row.description || 'Tanpa deskripsi' }}</small>
                  </td>
                  <td>Rp{{ formatCompact(row.unit_rate) }}</td>
                  <td>{{ formatCompact(row.monthly_target_unit) }} unit</td>
                  <td><span :class="['status', row.status_aktif ? 'success' : 'warning']">{{ row.status_aktif ? 'Aktif' : 'Nonaktif' }}</span></td>
                  <td>
                    <div class="action-row">
                      <button class="button secondary compact-button" type="button" @click="editBagianMaster(row)">✏️ Edit</button>
                      <button class="button danger compact-button" type="button" :disabled="!row.status_aktif || bagianMasterLoading" @click="deactivateBagian(row)">🔴 Nonaktif</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="bagianMasterRows.length === 0">
                  <td colspan="5">Belum ada master Bagian. Jalankan seed default atau tambah Bagian baru.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <div v-if="['management-dashboard', 'management-bagian', 'management-wage', 'management-attendance', 'management-flow'].includes(activeFeatureId)" class="management-demo-grid">
          <article v-if="activeFeatureId === 'management-dashboard' || activeFeatureId === 'management-bagian'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>🏭 Bagian</span>
                <strong>Output terverifikasi Supervisor</strong>
              </div>
            </div>
            <div class="bagian-list">
              <div v-for="item in managementBagianSummary" :key="item.bagian_id" class="bagian-row">
                <div>
                  <strong>{{ item.bagian_name }}</strong>
                <small>{{ item.verification_status }} - pencatat {{ maskEmailForUi(item.recorder) }} - verifikator Supervisor {{ maskEmailForUi(item.verifier) }}</small>
                </div>
                <div class="bagian-metrics">
                  <span>Target {{ formatCompact(item.target_total) }}</span>
                  <span>Realisasi {{ formatCompact(item.actual_total) }}</span>
                  <span>Reject {{ formatCompact(item.qc_reject_total) }}</span>
                  <strong>{{ item.achievement_rate }}%</strong>
                </div>
              </div>
            </div>
          </article>

          <article v-if="activeFeatureId === 'management-dashboard' || activeFeatureId === 'management-attendance'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>📅 Absensi</span>
                <strong>Rekap hari ini</strong>
              </div>
            </div>
            <div class="mini-metrics compact-metrics">
              <article v-for="card in managementAttendanceCards" :key="card.label" :class="['mini-metric', card.tone]">
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
              </article>
            </div>
            <div class="hint-box">
              Karyawan menekan Masuk/Keluar; Mandor melakukan check/check all dan menetapkan Izin, Sakit, atau Alpha.
            </div>
          </article>

          <article v-if="activeFeatureId === 'management-dashboard' || activeFeatureId === 'management-flow'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>🔎 Traceability</span>
                <strong>Sumber bahan ke Lem</strong>
              </div>
            </div>
            <ul class="flow-list">
              <li v-for="flow in managementMaterialFlow" :key="flow.flow_id">
                <strong>{{ flow.target_employee_no }} menerima {{ formatCompact(flow.received_units) }} unit</strong>
                <span>Dari {{ flow.source_employee_nos.join(', ') }} - verified {{ formatCompact(flow.verified_units) }}</span>
                <small>{{ flow.note }}</small>
              </li>
            </ul>
          </article>

          <article v-if="activeFeatureId === 'management-dashboard' || activeFeatureId === 'management-wage'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>💰 Upah unit</span>
                <strong>Kondisi UMR bulanan</strong>
              </div>
            </div>
            <ul class="flow-list">
              <li v-for="row in managementWageRows" :key="row.bagian_id">
                <span :class="['status', row.tone]">{{ row.statusLabel }}</span>
                <strong>{{ row.bagian_name }} - Rp{{ formatCompact(row.unit_rate) }}/unit</strong>
                <span>Estimasi bulan ini Rp{{ formatCompact(row.monthly_wage_estimate) }} dari target Rp{{ formatCompact(row.umr_monthly) }}</span>
                <small v-if="row.umr_status === 'BELOW_UMR'">Gap {{ formatCompact(row.wage_gap_units) }} unit atau Rp{{ formatCompact(row.wage_gap_amount) }}.</small>
                <small v-else-if="row.umr_status === 'POLICY_PENDING'">Harga satuan atau target gaji belum disahkan.</small>
                <small v-else>Target gaji bulanan sudah terpenuhi berdasarkan output tervalidasi Supervisor saat ini.</small>
              </li>
            </ul>
          </article>
        </div>

        <div v-if="activeFeatureId === 'management-pareto'" class="split-tables single-surface">
          <div v-if="activeFeatureId === 'management-pareto'" class="table-wrap">
            <div class="table-heading">
              <div>
                <span>🚀 Improvement</span>
                <strong>Pareto defect</strong>
              </div>
            </div>
            <div v-if="dashboardPending" class="table-skeleton" aria-hidden="true">
              <span v-for="item in skeletonRows" :key="`pareto-skeleton-${item}`" class="skeleton-line wide"></span>
            </div>
            <table v-else>
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

        <div v-if="activeFeatureId === 'management-pending'" class="task-panel">
          <div class="table-heading">
            <div>
              <span>🛡️ Guardrail</span>
              <strong>Data yang belum final</strong>
            </div>
          </div>
          <div class="hint-box">
            Data quarantine dan closing terbuka tidak dihitung ke KPI final sampai proses approval/closing selesai.
          </div>
        </div>
      </section>

      <section v-if="activeView === 'hrd' && activeFeatureId !== 'workspace-help'" class="panel hrd-panel role-workspace" aria-labelledby="hrd-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">HRD</p>
            <h2 id="hrd-title">{{ currentRoleFeatureMeta.title }}</h2>
          </div>
          <button class="button secondary compact-button" type="button" @click="refreshHrdAccessDashboard">
            {{ hrdLoading ? '⏳ Memuat' : '🔄 Refresh' }}
          </button>
        </div>

        <div v-if="hrdError" class="inline-error" role="alert">
          {{ hrdError }}
        </div>

        <div v-if="hrdPending && activeFeatureId === 'hrd-dashboard'" class="task-strip" aria-hidden="true">
          <article v-for="item in skeletonItems" :key="`hrd-card-skeleton-${item}`" class="task-card skeleton-card">
            <span class="skeleton-line short"></span>
            <strong class="skeleton-line metric-value"></strong>
            <p class="skeleton-line"></p>
          </article>
        </div>

        <div v-else-if="activeFeatureId === 'hrd-dashboard'" class="task-strip g4" aria-label="Prioritas HRD">
          <article v-for="card in hrdAccessCards" :key="card.label" :class="['task-card', card.tone]">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.hint }}</p>
          </article>
        </div>

        <div v-if="activeFeatureId === 'hrd-dashboard'" class="hrd-workflow hrd-workflow-full">
          <div class="hrd-chart-grid">
            <div class="hrd-chart-card">
              <h3>Komposisi Kehadiran Hari Ini</h3>
              <div class="hrd-chart-canvas-frame">
                <canvas ref="hrdAttendanceDonutCanvas" role="img" aria-label="Donut Chart Kehadiran"></canvas>
              </div>
            </div>

            <div class="hrd-chart-card">
              <h3>Distribusi Karyawan per Bagian</h3>
              <div class="hrd-chart-canvas-frame">
                <canvas ref="hrdWorkforceBarCanvas" role="img" aria-label="Bar Chart Pekerja"></canvas>
              </div>
            </div>

            <div class="hrd-chart-card">
              <h3>Kelengkapan Data Karyawan</h3>
              <div class="hrd-chart-canvas-frame">
                <canvas ref="hrdReadinessPieCanvas" role="img" aria-label="Pie Chart Kelengkapan Data"></canvas>
              </div>
            </div>

            <div class="hrd-chart-card">
              <h3>Tren Kehadiran (7 Hari Terakhir)</h3>
              <div class="hrd-chart-canvas-frame">
                <canvas ref="hrdTrendLineCanvas" role="img" aria-label="Line Chart Tren Kehadiran"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="activeFeatureId !== 'hrd-dashboard'"
          :class="['hrd-workflow', { 'hrd-workflow-full': activeFeatureId === 'hrd-employees' || activeFeatureId === 'hrd-attendance' }]"
        >
          <article v-if="activeFeatureId === 'hrd-employees'" class="task-panel hrd-employee-panel">
            <div class="hrd-directory-head">
              <div class="hrd-directory-title">
                <span>👥 Direktori karyawan</span>
                <strong>Manajemen data karyawan</strong>
                <p>Kelola identitas karyawan, Bagian, status kerja, kontak HRD, dan akses role secara privacy-safe.</p>
              </div>
              <div class="hrd-directory-actions">
                <button class="button primary compact-button" type="button" @click="openHrdEmployeeCreateModal">➕ Tambah karyawan</button>
                <button class="button secondary compact-button" type="button" @click="hrdEmployeeDetailMode = hrdEmployeeDetailMode === 'DETAIL' ? 'MASKED' : 'DETAIL'">
                  {{ hrdEmployeeDetailMode === 'DETAIL' ? '🛡️ Masking aktif' : '👁️ Lihat detail demo' }}
                </button>
              </div>
            </div>
            <div v-if="hrdEmployeeMessage" class="inline-success">{{ hrdEmployeeMessage }}</div>
            <div v-if="hrdEmployeeError" class="inline-error" role="alert">{{ hrdEmployeeError }}</div>
            <div v-if="hrdPending" class="table-skeleton" aria-hidden="true">
              <span v-for="item in skeletonRows" :key="`hrd-user-skeleton-${item}`" class="skeleton-line wide"></span>
            </div>
            <div v-else class="table-wrap">
              <div class="hrd-table-toolbar">
                <div class="hrd-table-summary">
                  <span>👥 Daftar karyawan</span>
                  <strong>{{ formatNumber(hrdVisibleEmployees.length) }} dari {{ formatNumber(hrdEmployees.length) }} data tampil</strong>
                  <small>{{ hrdEmployeeSearchHint }}</small>
                </div>
                <div class="hrd-table-controls" aria-label="Filter direktori karyawan">
                  <label class="hrd-search-field">
                    <span>🔎 Search</span>
                    <input
                      v-model="hrdEmployeeSearchInput"
                      type="search"
                      placeholder="Cari ID, nama, email, WA..."
                      aria-label="Cari karyawan HRD"
                    />
                  </label>
                  <button class="button secondary compact-button" type="button" @click="resetHrdEmployeeFilters">↺ Reset</button>
                  <span :class="['status', hrdEmployeeDetailMode === 'DETAIL' ? 'warning' : 'success']">
                    {{ hrdEmployeeDetailMode === 'DETAIL' ? 'Detail demo' : 'Masked' }}
                  </span>
                </div>
              </div>
              <table class="compact-table">
                <thead>
                  <tr>
                    <th @click="tblHrdVisibleEmployees.toggleSort('employee_no')" style="cursor: pointer;">ID <span v-if="tblHrdVisibleEmployees.sortKey === 'employee_no'">{{ tblHrdVisibleEmployees.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdVisibleEmployees.toggleSort('full_name')" style="cursor: pointer;">Karyawan <span v-if="tblHrdVisibleEmployees.sortKey === 'full_name'">{{ tblHrdVisibleEmployees.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdVisibleEmployees.toggleSort('bagian_id')" style="cursor: pointer;">Bagian <span v-if="tblHrdVisibleEmployees.sortKey === 'bagian_id'">{{ tblHrdVisibleEmployees.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdVisibleEmployees.toggleSort('status_label')" style="cursor: pointer;">Status <span v-if="tblHrdVisibleEmployees.sortKey === 'status_label'">{{ tblHrdVisibleEmployees.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th>Kontak</th>
                    <th>Role</th>
                    <th @click="tblHrdVisibleEmployees.toggleSort('completeness_percent')" style="cursor: pointer;">Kelengkapan <span v-if="tblHrdVisibleEmployees.sortKey === 'completeness_percent'">{{ tblHrdVisibleEmployees.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="tblHrdVisibleEmployees.processedData.length === 0">
                    <td colspan="8">
                      <div class="empty-table-state">
                        <strong>🔍 Tidak ada data cocok</strong>
                        <span>Ubah kata kunci atau reset filter untuk melihat seluruh karyawan.</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-for="user in tblHrdVisibleEmployees.processedData" :key="user.user_id || user.employee_no">
                    <td><strong>{{ user.employee_no || user.user_id }}</strong></td>
                    <td>
                      <strong>{{ user.full_name || '-' }}</strong>
                      <small>{{ user.address_display }}</small>
                      <small :class="['status', user.can_edit_employee ? 'success' : 'warning']">
                        {{ user.can_edit_employee ? 'EMPLOYEE_MASTER' : 'ACCESS_ONLY' }}
                      </small>
                    </td>
                    <td>{{ user.bagian_id || '-' }}</td>
                    <td><span :class="['status', user.status_tone]">{{ user.status_label }}</span></td>
                    <td>
                      <span>{{ user.email_display }}</span>
                      <small>
                        <a v-if="hrdEmployeeDetailMode === 'DETAIL' && user.wa_url" class="wa-link" :href="user.wa_url" target="_blank" rel="noopener noreferrer">
                          {{ user.wa_display }}
                        </a>
                        <span v-else>{{ user.wa_display }}</span>
                      </small>
                    </td>
                    <td>{{ user.roles.join(', ') }}</td>
                    <td><span :class="['status', user.completeness_tone]">{{ user.completeness_status }} {{ user.completeness_percent }}%</span></td>
                    <td>
                      <div class="row-actions">
                        <button
                          class="button secondary compact-button"
                          type="button"
                          :disabled="!user.can_edit_employee"
                          :title="user.can_edit_employee ? 'Edit data karyawan' : 'Record akses/demo tidak bisa diedit sebagai karyawan'"
                          @click="editHrdEmployee(user)"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          class="button danger-button compact-button"
                          type="button"
                          :disabled="!user.can_edit_employee || !user.status_aktif || hrdEmployeeSaving"
                          :title="user.can_edit_employee ? 'Set karyawan resign' : 'Record akses/demo tidak bisa diset resign'"
                          @click="resignHrdEmployee(user)"
                        >
                          🚪 Set Resign
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="hint-box">
              Tambah/Edit/Set Resign melewati permission `employee_master` dan audit backend. Mode detail hanya untuk response yang memang diberi izin backend atau data dummy/mock.
            </div>
          </article>

          <article v-if="activeFeatureId === 'hrd-attendance'" class="task-panel">
            <div class="hrd-attendance-card">
              <div class="table-heading">
              <div>
                <span>📅 Absensi</span>
                <strong>💰 Rekap payroll-ready</strong>
              </div>
              <div class="control-filters">
                <label class="field">
                  <span>📅 Tanggal</span>
                  <input v-model="hrdFilters.factory_date" type="date" aria-label="Tanggal absensi HRD" />
                </label>
                <label class="field">
                  <span>📆 Bulan</span>
                  <input v-model="hrdFilters.period_month" type="month" aria-label="Periode bulanan absensi HRD" />
                </label>
                <label class="field">
                  <span>🏭 Bagian</span>
                  <select v-model="hrdFilters.bagian_id" aria-label="Filter bagian absensi HRD">
                    <option value="ALL">Semua Bagian</option>
                    <option v-for="bagian in hrdAttendanceFilters.bagian_options" :key="bagian" :value="bagian">
                      {{ bagian }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  <span>📌 Status</span>
                  <select v-model="hrdFilters.attendance_status" aria-label="Filter status absensi HRD">
                    <option v-for="status in hrdAttendanceFilters.status_options" :key="status" :value="status">
                      {{ status }}
                    </option>
                  </select>
                </label>
              </div>
              </div>
            </div>

            <div class="hrd-attendance-card">

            <div class="table-heading">
              <div>
                <span>📅 Harian</span>
                <strong>{{ hrdAttendanceSummary.factory_date || hrdFilters.factory_date }}</strong>
              </div>
              <div class="control-filters">
                <label class="field" style="margin: 0; min-width: 150px;">
                  <input type="search" v-model="tblHrdAttendanceDailyRows.searchQuery" placeholder="Cari data harian..." aria-label="Cari data harian" />
                </label>
              </div>
            </div>
              <div class="mini-metrics">
              <article v-for="card in hrdAttendanceCards" :key="card.label" :class="['mini-metric', card.tone]">
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
              </article>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th @click="tblHrdAttendanceDailyRows.toggleSort('employee_no')" style="cursor: pointer;">ID <span v-if="tblHrdAttendanceDailyRows.sortKey === 'employee_no'">{{ tblHrdAttendanceDailyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceDailyRows.toggleSort('full_name')" style="cursor: pointer;">Nama <span v-if="tblHrdAttendanceDailyRows.sortKey === 'full_name'">{{ tblHrdAttendanceDailyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceDailyRows.toggleSort('bagian_id')" style="cursor: pointer;">Bagian <span v-if="tblHrdAttendanceDailyRows.sortKey === 'bagian_id'">{{ tblHrdAttendanceDailyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceDailyRows.toggleSort('attendance_status')" style="cursor: pointer;">Status <span v-if="tblHrdAttendanceDailyRows.sortKey === 'attendance_status'">{{ tblHrdAttendanceDailyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceDailyRows.toggleSort('clock_in_at')" style="cursor: pointer;">Masuk/Keluar <span v-if="tblHrdAttendanceDailyRows.sortKey === 'clock_in_at'">{{ tblHrdAttendanceDailyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceDailyRows.toggleSort('confirmed_by')" style="cursor: pointer;">Konfirmasi <span v-if="tblHrdAttendanceDailyRows.sortKey === 'confirmed_by'">{{ tblHrdAttendanceDailyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in tblHrdAttendanceDailyRows.processedData" :key="row.daily_attendance_id">
                    <td><strong>{{ row.employee_no }}</strong></td>
                    <td>{{ row.full_name }}</td>
                    <td>{{ row.bagian_id }}</td>
                    <td><span :class="['status', row.payroll_ready ? 'success' : 'warning']">{{ row.attendance_status }}</span></td>
                    <td>{{ row.clock_in_at ? formatDateTime(row.clock_in_at) : '-' }} / {{ row.clock_out_at ? formatDateTime(row.clock_out_at) : '-' }}</td>
                    <td>{{ row.confirmed_by || 'Belum dikonfirmasi' }}</td>
                  </tr>
                  <tr v-if="hrdAttendanceDailyRows.length === 0">
                    <td colspan="6">Belum ada data absensi harian untuk filter ini.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>

            <div class="hrd-attendance-card">
              <div class="table-heading">
              <div>
                <span>🗓️ Bulanan</span>
                <strong>{{ hrdAttendanceSummary.period_month || hrdFilters.period_month }}</strong>
              </div>
              <div class="control-filters">
                <label class="field" style="margin: 0; min-width: 150px;">
                  <input type="search" v-model="tblHrdAttendanceMonthlyRows.searchQuery" placeholder="Cari data bulanan..." aria-label="Cari data bulanan" />
                </label>
              </div>
            </div>
            <div class="mini-metrics">
              <article v-for="card in hrdMonthlyAttendanceCards" :key="card.label" :class="['mini-metric', card.tone]">
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
              </article>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th @click="tblHrdAttendanceMonthlyRows.toggleSort('employee_no')" style="cursor: pointer;">ID <span v-if="tblHrdAttendanceMonthlyRows.sortKey === 'employee_no'">{{ tblHrdAttendanceMonthlyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceMonthlyRows.toggleSort('full_name')" style="cursor: pointer;">Nama <span v-if="tblHrdAttendanceMonthlyRows.sortKey === 'full_name'">{{ tblHrdAttendanceMonthlyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceMonthlyRows.toggleSort('bagian_id')" style="cursor: pointer;">Bagian <span v-if="tblHrdAttendanceMonthlyRows.sortKey === 'bagian_id'">{{ tblHrdAttendanceMonthlyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceMonthlyRows.toggleSort('hadir_count')" style="cursor: pointer;">Hadir <span v-if="tblHrdAttendanceMonthlyRows.sortKey === 'hadir_count'">{{ tblHrdAttendanceMonthlyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th>I/S/A</th>
                    <th @click="tblHrdAttendanceMonthlyRows.toggleSort('pending_confirmation_count')" style="cursor: pointer;">Pending <span v-if="tblHrdAttendanceMonthlyRows.sortKey === 'pending_confirmation_count'">{{ tblHrdAttendanceMonthlyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                    <th @click="tblHrdAttendanceMonthlyRows.toggleSort('payroll_ready_count')" style="cursor: pointer;">Payroll <span v-if="tblHrdAttendanceMonthlyRows.sortKey === 'payroll_ready_count'">{{ tblHrdAttendanceMonthlyRows.sortAsc ? '🔼' : '🔽' }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in tblHrdAttendanceMonthlyRows.processedData" :key="`${row.employee_no}-${row.bagian_id}`">
                    <td><strong>{{ row.employee_no }}</strong></td>
                    <td>{{ row.full_name }}</td>
                    <td>{{ row.bagian_id }}</td>
                    <td>{{ formatNumber(row.hadir_count) }}</td>
                    <td>{{ formatNumber(row.izin_count) }} / {{ formatNumber(row.sakit_count) }} / {{ formatNumber(row.alpha_count) }}</td>
                    <td>{{ formatNumber(row.pending_confirmation_count) }}</td>
                    <td><span :class="['status', row.payroll_ready ? 'success' : 'warning']">{{ row.payroll_ready ? 'Ready' : 'Review' }}</span></td>
                  </tr>
                  <tr v-if="hrdAttendanceMonthlyRows.length === 0">
                    <td colspan="7">Belum ada rekap bulanan untuk filter ini.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>
            <div class="hint-box">
              Pending konfirmasi tidak boleh dianggap final untuk payroll. HRD membaca status payroll-ready; keputusan hadir lapangan tetap dikonfirmasi Mandor.
            </div>
          </article>

          <article v-if="activeFeatureId === 'hrd-access-audit'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>🛡️ Akses & Audit</span>
                <strong>Role readiness</strong>
              </div>
            </div>
            <ul class="readiness-list">
              <li v-for="role in hrdRoleMatrix" :key="role.role">
                <span :class="['status', role.readiness === 'READY' ? 'success' : 'warning']">{{ role.readiness }}</span>
                <strong>{{ role.role }} - {{ role.permission_count }} permission - {{ role.resources.join(', ') || 'no resource' }}</strong>
              </li>
            </ul>
          </article>

          <article v-if="activeFeatureId === 'hrd-access-audit'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>⚠️ Anomali akses</span>
                <strong>Perlu review HRD</strong>
              </div>
            </div>
            <ul class="readiness-list">
              <li v-for="item in hrdAccessAnomalies" :key="`${item.employee_no}-${item.anomaly_type}`">
                <span :class="['status', item.severity === 'WARNING' ? 'warning' : 'neutral']">{{ item.anomaly_type }}</span>
                <strong>{{ item.employee_no }} - {{ item.email_masked }}</strong>
              </li>
              <li v-if="hrdAccessAnomalies.length === 0">
                <span class="status success">CLEAR</span>
                <strong>Tidak ada anomali akses pada data yang sedang dimuat.</strong>
              </li>
            </ul>
          </article>

          <article v-if="activeFeatureId === 'hrd-access-audit'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>🎭 Multi-role</span>
                <strong>Akun dengan lebih dari satu role</strong>
              </div>
            </div>
            <ul class="readiness-list">
              <li v-for="item in hrdMultiRoleUsers" :key="item.employee_no">
                <span class="status neutral">{{ item.status }}</span>
                <strong>{{ item.employee_no }} - {{ item.email_masked }} - {{ item.roles.join(', ') }}</strong>
              </li>
              <li v-if="hrdMultiRoleUsers.length === 0">
                <span class="status success">Single role</span>
                <strong>Tidak ada user multi-role pada data yang sedang dimuat.</strong>
              </li>
            </ul>
          </article>

          <article v-if="activeFeatureId === 'hrd-access-audit'" class="task-panel">
            <div class="table-heading">
              <div>
                <span>🔍 Audit ringan</span>
                <strong>Safe event summary</strong>
              </div>
            </div>
            <div class="mini-metrics">
              <article class="mini-metric success"><span>🔑 Session</span><strong>{{ formatNumber(hrdAuditSummary.session) }}</strong></article>
              <article class="mini-metric warning"><span>🔐 RBAC</span><strong>{{ formatNumber(hrdAuditSummary.rbac) }}</strong></article>
              <article class="mini-metric neutral"><span>👤 User role</span><strong>{{ formatNumber(hrdAuditSummary.user_role) }}</strong></article>
              <article class="mini-metric neutral"><span>⚙️ Other</span><strong>{{ formatNumber(hrdAuditSummary.other) }}</strong></article>
            </div>
            <div class="hint-box">
              Metadata audit mentah tidak ditampilkan. Event terakhir: {{ hrdAuditSummary.last_event_at ? formatDateTime(hrdAuditSummary.last_event_at) : '-' }}.
            </div>
            <ul class="readiness-list">
              <li v-for="event in hrdAuditEvents" :key="`${event.action}-${event.created_at}-${event.entity_id}`">
                <span class="status neutral">{{ event.actor_role || 'System' }}</span>
                <strong>{{ event.action }} - {{ event.actor_email_masked }} - {{ event.entity_type }} {{ event.entity_id }}</strong>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <Teleport to="body">
        <section
          v-if="hrdEmployeeEditorOpen"
          class="hrd-employee-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hrd-employee-editor-title"
        >
          <div class="maintenance-scrim" @click="closeHrdEmployeeEditor"></div>
          <form class="hrd-employee-modal-panel" @submit.prevent="saveHrdEmployee">
            <div class="section-title">
              <div>
                <p class="eyebrow">HRD</p>
                <h2 id="hrd-employee-editor-title">
                  {{ hrdEmployeeFormMode === 'EDIT' ? '✏️ Edit data karyawan' : '➕ Tambah karyawan baru' }}
                </h2>
              </div>
              <button class="icon-button" type="button" aria-label="Tutup editor karyawan" @click="closeHrdEmployeeEditor">✖️</button>
            </div>

            <div class="hrd-employee-editor modal-employee-editor">
              <div class="hrd-editor-status">
                <span :class="['status', hrdEmployeeFormMode === 'EDIT' ? 'warning' : 'success']">
                  {{ hrdEmployeeFormMode === 'EDIT' ? '✏️ Mode edit' : '✨ Data baru' }}
                </span>
                <strong>{{ hrdEmployeeFormMode === 'EDIT' ? hrdEmployeeForm.employee_no : 'Tambah karyawan baru' }}</strong>
                <small>Mutasi data karyawan melewati permission `employee_master` dan audit backend/mock.</small>
              </div>

              <div class="hrd-form-group">
                <div class="hrd-form-group-title">
                  <span>🪪 Identitas</span>
                  <strong>Data dasar</strong>
                </div>
                <div class="hrd-form-grid">
                  <label class="field">
                    <span>🆔 ID 5 angka</span>
                    <input v-model="hrdEmployeeForm.employee_no" :readonly="hrdEmployeeFormMode === 'EDIT'" inputmode="numeric" maxlength="5" aria-label="ID karyawan" />
                  </label>
                  <label class="field hrd-span-2">
                    <span>👤 Nama lengkap</span>
                    <input v-model="hrdEmployeeForm.full_name" aria-label="Nama lengkap karyawan" />
                  </label>
                  <label class="field">
                    <span>🏭 Bagian</span>
                    <select v-model="hrdEmployeeForm.bagian_id" aria-label="Bagian karyawan">
                      <option v-for="option in bagianOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>✅ Status</span>
                    <select v-model="hrdEmployeeForm.status_karyawan" aria-label="Status karyawan">
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                      <option value="RESIGN">RESIGN</option>
                      <option value="SUSPEND">SUSPEND</option>
                    </select>
                  </label>
                </div>
              </div>

              <div class="hrd-form-group">
                <div class="hrd-form-group-title">
                  <span>📞 Kontak & akses</span>
                  <strong>Komunikasi dan role</strong>
                </div>
                <div class="hrd-form-grid">
                  <label class="field">
                    <span>📧 Email</span>
                    <input v-model="hrdEmployeeForm.email" type="email" aria-label="Email karyawan" />
                  </label>
                  <label class="field">
                    <span>💬 No WA</span>
                    <input v-model="hrdEmployeeForm.wa_number" inputmode="tel" aria-label="Nomor WhatsApp karyawan" />
                  </label>
                  <div class="field hrd-span-2">
                    <span>🔐 Role akses</span>
                    <div class="hrd-role-checks" role="group" aria-label="Role akses karyawan">
                      <label
                        v-for="role in roleOptions"
                        :key="role"
                        :class="['hrd-role-check', { active: hrdEmployeeForm.roles.includes(role), primary: hrdEmployeeForm.role === role }]"
                      >
                        <input
                          type="checkbox"
                          :checked="hrdEmployeeForm.roles.includes(role)"
                          @change="toggleHrdEmployeeRole(role)"
                        />
                        <span>{{ role }}</span>
                        <small v-if="hrdEmployeeForm.role === role">Utama</small>
                      </label>
                    </div>
                  </div>
                  <label class="field">
                    <span>🧭 Mandor</span>
                    <select v-model="hrdEmployeeForm.mandor_email" aria-label="Pilih mandor">
                      <option value="">Tidak ada mandor</option>
                      <option v-for="option in hrdMandorOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>
                  </label>
                  <label class="field hrd-span-2">
                    <span>📍 Alamat</span>
                    <input v-model="hrdEmployeeForm.address" aria-label="Alamat karyawan" />
                  </label>
                </div>
              </div>
            </div>

            <div v-if="hrdEmployeeError" class="inline-error" role="alert">{{ hrdEmployeeError }}</div>
            <div class="hrd-editor-actions modal-editor-actions">
              <span>{{ hrdEmployeeFormMode === 'EDIT' ? 'Perubahan akan memperbarui direktori karyawan.' : 'Data baru akan masuk ke direktori HRD.' }}</span>
              <div class="form-actions">
                <button class="button secondary compact-button" type="button" :disabled="hrdEmployeeSaving" @click="closeHrdEmployeeEditor">↩️ Batal</button>
                <button class="button primary compact-button" type="submit" :disabled="hrdEmployeeSaving">
                  {{ hrdEmployeeSaving ? '⏳ Menyimpan' : hrdEmployeeFormMode === 'EDIT' ? '💾 Update data' : '💾 Simpan karyawan' }}
                </button>
              </div>
            </div>
          </form>
        </section>
      </Teleport>

      <section v-if="activeFeatureId === 'workspace-help' && activeView !== 'settings'" class="panel help-panel role-workspace" aria-labelledby="workspace-help-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">{{ activeHelpGuide.role }}</p>
            <h2 id="workspace-help-title">❓ Cara penggunaan</h2>
          </div>
          <span class="badge">Panduan role</span>
        </div>

        <div class="help-hero">
          <strong>{{ activeHelpGuide.headline }}</strong>
          <p>{{ activeHelpGuide.process }}</p>
        </div>

        <div class="help-grid">
          <article class="help-card">
            <div class="table-heading">
              <div>
                <span>📋 Langkah kerja</span>
                <strong>Yang harus dilakukan</strong>
              </div>
            </div>
            <ol class="help-list">
              <li v-for="step in activeHelpGuide.steps" :key="step">{{ step }}</li>
            </ol>
          </article>

          <article class="help-card">
            <div class="table-heading">
              <div>
                <span>🛠️ Troubleshooting</span>
                <strong>Jika terjadi masalah</strong>
              </div>
            </div>
            <ul class="help-list">
              <li v-for="item in activeHelpGuide.troubleshooting" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>

        <div class="hint-box">
          Help ini mengikuti role/workspace yang sedang aktif. Ganti role melalui tombol Menu di atas nav jika ingin melihat proses bisnis role lain.
        </div>
      </section>

      <section v-if="activeView === 'settings'" class="panel settings-panel" aria-labelledby="settings-title">
        <div class="section-title">
          <div>
            <p class="eyebrow">User</p>
            <h2 id="settings-title">⚙️ Pengaturan sesi</h2>
          </div>
          <span class="badge">{{ sessionModeLabel }}</span>
        </div>

        <div v-if="sessionPending" class="settings-grid" aria-hidden="true">
          <article v-for="item in [1, 2]" :key="`session-skeleton-${item}`" class="settings-card skeleton-card">
            <span class="skeleton-line short"></span>
            <strong class="skeleton-line wide"></strong>
            <p class="skeleton-line"></p>
          </article>
        </div>

        <div v-else class="settings-grid">
          <article class="settings-card">
            <span>🟢 Session aktif</span>
            <strong>{{ currentSessionLabel }}</strong>
            <p>{{ sessionContext?.email || 'Demo role tidak membutuhkan pergantian email.' }}</p>
          </article>
          <article class="settings-card">
            <span>🛡️ Status auth</span>
            <strong>{{ sessionContext?.auth_mode || 'OFF' }}</strong>
            <p>{{ sessionContext?.is_simulated ? 'Simulasi role aktif untuk demo/trial.' : 'Menggunakan akun Google aktif.' }}</p>
          </article>
        </div>

        <div class="role-switcher" aria-label="Try role">
          <button
            v-for="role in roleSwitcherRoles"
            :key="role"
            type="button"
            :class="['role-button', { active: isRoleButtonActive(role), selected: selectedRole === role }]"
            :aria-pressed="isRoleButtonActive(role)"
            @click="setTryRole(role)"
          >
            <span>{{ roleIcons[role] }}</span>
            <strong>{{ role }}</strong>
            <small>{{ getRoleButtonStatus(role) }}</small>
          </button>
        </div>

        <div v-if="sessionMessage" class="inline-info" role="status">
          {{ sessionMessage }}
        </div>
        <div v-if="sessionError" class="inline-error" role="alert">
          {{ sessionError }}
        </div>

        <div v-if="selectedRole === 'SuperAdmin'" class="superadmin-local-reset">
          <div>
            <span>🔧 SuperAdmin local maintenance</span>
            <strong>Database lokal device</strong>
            <p>Lihat dan bersihkan draft, queue IndexedDB, serta preferensi lokal browser tanpa mengubah data GAS.</p>
          </div>
          <div class="superadmin-local-actions">
            <button class="button secondary compact-button" type="button" @click="inspectSuperAdminLocalData">
              👁️ Lihat data
            </button>
            <button class="button secondary compact-button" type="button" @click="clearSuperAdminLocalStores">
              🗑️ Kosongkan DB
            </button>
            <button class="button danger-button compact-button" type="button" @click="resetSuperAdminIndexedDb">
              🔄 Reset DB
            </button>
            <button class="button danger-button compact-button" type="button" @click="resetSuperAdminLocalData">
              🔄 Reset semua
            </button>
            <button class="button primary compact-button" type="button" @click="reloadAppFromSuperAdmin">
              🔄 Reload
            </button>
          </div>
          <div v-if="localMaintenanceError" class="inline-error" role="alert">
            {{ localMaintenanceError }}
          </div>
          <pre v-if="localMaintenanceSnapshot" class="local-data-preview">{{ JSON.stringify(localMaintenanceSnapshot, null, 2) }}</pre>
        </div>

        <div v-if="selectedRole === 'SuperAdmin'" class="superadmin-maintenance-grid">
          <article class="superadmin-maintenance-card">
            <div>
              <span>⚙️ System configuration</span>
              <strong>Script Properties</strong>
              <p>Kelola status/update/delete/rotate key allowlisted melalui backend RBAC dan audit.</p>
            </div>
            <div class="superadmin-maintenance-meta">
              <span class="status success">{{ maintenanceSummary }}</span>
              <span class="status warning">Secret masked</span>
            </div>
            <button class="button primary" type="button" @click="openMaintenanceConsole">
              💻 Buka console
            </button>
          </article>

          <article class="superadmin-maintenance-card">
            <div>
              <span>🚀 Operational readiness</span>
              <strong>Bootstrap & diagnostics</strong>
              <p>Gunakan toolbar spreadsheet untuk sheet default, seed dev, schema health, dan GAS smoke test.</p>
            </div>
            <div class="superadmin-maintenance-meta">
              <span class="status warning">Spreadsheet toolbar</span>
              <span class="status success">Audit required</span>
            </div>
          </article>

          <article class="superadmin-maintenance-card">
            <div>
              <span>🐛 Debug</span>
              <strong>DevTools console log</strong>
              <p>Aktifkan viewLog untuk mengirim jejak session, role, workspace, dan error ke console bawaan browser.</p>
            </div>
            <div class="superadmin-maintenance-meta">
              <span :class="['status', viewLog ? 'success' : 'warning']">{{ viewLog ? 'viewLog=true' : 'viewLog=false' }}</span>
              <span class="status warning">{{ debugLogs.length }} log</span>
            </div>
            <button class="button primary" type="button" @click="toggleViewLog">
              {{ viewLog ? '🚫 Matikan log' : '✅ Aktifkan log' }}
            </button>
          </article>
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
            ✖️
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
          <div v-if="maintenancePending" class="table-skeleton" aria-hidden="true">
            <span v-for="item in skeletonRows" :key="`property-skeleton-${item}`" class="skeleton-line wide"></span>
          </div>
          <table v-else>
            <thead>
              <tr>
                <th>Key</th>
                <th>Type</th>
                <th>📌 Status</th>
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
                      🆙 Update
                    </button>
                    <button
                      class="button secondary compact-button"
                      type="button"
                      :disabled="isMaintenanceLoading || !property.deletable"
                      @click="deleteMaintenanceProperty(property)"
                    >
                      🗑️ Delete
                    </button>
                    <button
                      class="button primary compact-button"
                      type="button"
                      :disabled="isMaintenanceLoading || !property.rotatable"
                      @click="rotateMaintenanceProperty(property)"
                    >
                      🔄 Rotate
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
