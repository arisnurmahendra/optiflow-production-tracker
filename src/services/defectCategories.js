export const defaultDefectCategories = Object.freeze([
  {
    defect_category_id: 'DEF-SOLDER-THIN',
    defect_name: 'Solder tipis',
    qcc_factor: 'Method',
    severity: 'MEDIUM',
    status_aktif: true,
  },
  {
    defect_category_id: 'DEF-SOLDER-BRIDGE',
    defect_name: 'Solder bridge',
    qcc_factor: 'Machine',
    severity: 'HIGH',
    status_aktif: true,
  },
  {
    defect_category_id: 'DEF-COMPONENT-MISS',
    defect_name: 'Komponen missing',
    qcc_factor: 'Material',
    severity: 'HIGH',
    status_aktif: true,
  },
  {
    defect_category_id: 'DEF-VISUAL-SCRATCH',
    defect_name: 'Visual scratch',
    qcc_factor: 'Environment',
    severity: 'LOW',
    status_aktif: true,
  },
  {
    defect_category_id: 'DEF-POLARITY-REVERSE',
    defect_name: 'Polaritas terbalik',
    qcc_factor: 'Man',
    severity: 'CRITICAL',
    status_aktif: true,
  },
  {
    defect_category_id: 'DEF-COLD-SOLDER',
    defect_name: 'Cold solder',
    qcc_factor: 'Method',
    severity: 'HIGH',
    status_aktif: true,
  },
]);

let runtimeDefectCategories = [...defaultDefectCategories];

export const defectCategories = defaultDefectCategories;

export const defectOptions = Object.freeze([
  { value: '', label: 'Tidak ada defect' },
  ...defaultDefectCategories
    .filter((category) => category.status_aktif)
    .map((category) => ({
      value: category.defect_category_id,
      label: `${category.defect_name} - ${category.qcc_factor}`,
      severity: category.severity,
      qcc_factor: category.qcc_factor,
    })),
]);

export function setDefectCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    runtimeDefectCategories = [...defaultDefectCategories];
    return runtimeDefectCategories;
  }

  runtimeDefectCategories = categories
    .map(normalizeDefectCategory)
    .filter(Boolean);

  if (runtimeDefectCategories.length === 0) {
    runtimeDefectCategories = [...defaultDefectCategories];
  }

  return runtimeDefectCategories;
}

export function getDefectCategories() {
  return [...runtimeDefectCategories];
}

export function getDefectOptions() {
  return [
    { value: '', label: 'Tidak ada defect' },
    ...runtimeDefectCategories
      .filter((category) => category.status_aktif)
      .map((category) => ({
        value: category.defect_category_id,
        label: `${category.defect_name} - ${category.qcc_factor}`,
        severity: category.severity,
        qcc_factor: category.qcc_factor,
      })),
  ];
}

export function getDefectCategory(defectCategoryId) {
  return runtimeDefectCategories.find((category) =>
    category.status_aktif && category.defect_category_id === defectCategoryId,
  ) || null;
}

export function isActiveDefectCategory(defectCategoryId) {
  return Boolean(getDefectCategory(defectCategoryId));
}

export function createParetoRejectSummary(items) {
  const buckets = new Map();

  items.forEach((item) => {
    const payload = item.payload || item;
    const reject = Number(payload.perolehan_reject || 0);
    const defectCategoryId = payload.defect_category_id || '';

    if (reject <= 0 || !defectCategoryId) {
      return;
    }

    const category = getDefectCategory(defectCategoryId);
    const key = category ? category.defect_category_id : defectCategoryId;
    const current = buckets.get(key) || {
      defect_category_id: key,
      defect_name: category ? category.defect_name : 'Kategori tidak dikenal',
      qcc_factor: category ? category.qcc_factor : 'Unknown',
      severity: category ? category.severity : 'UNKNOWN',
      reject_total: 0,
      count: 0,
    };

    current.reject_total += reject;
    current.count += 1;
    buckets.set(key, current);
  });

  const totalReject = [...buckets.values()].reduce((total, item) => total + item.reject_total, 0);

  return [...buckets.values()]
    .sort((a, b) => b.reject_total - a.reject_total || a.defect_name.localeCompare(b.defect_name))
    .map((item) => ({
      ...item,
      pareto_percent: totalReject > 0 ? Math.round((item.reject_total / totalReject) * 1000) / 10 : 0,
    }));
}

function normalizeDefectCategory(category) {
  if (!category || typeof category !== 'object') {
    return null;
  }

  const defectCategoryId = String(category.defect_category_id || '').trim().toUpperCase();
  const defectName = String(category.defect_name || '').trim();
  const qccFactor = String(category.qcc_factor || '').trim();
  const severity = String(category.severity || '').trim().toUpperCase();

  if (!defectCategoryId || !defectName || !qccFactor || !severity) {
    return null;
  }

  return {
    defect_category_id: defectCategoryId,
    defect_name: defectName,
    qcc_factor: qccFactor,
    severity,
    status_aktif: category.status_aktif === true || String(category.status_aktif).toUpperCase() === 'TRUE',
    updated_at: String(category.updated_at || ''),
  };
}
