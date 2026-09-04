var OptiflowDefectCategories = (function () {
  var SHEET_NAME = 'DEFECT_CATEGORIES';

  function list(payload, session) {
    var includeInactive = Boolean(payload.include_inactive);
    var categories = OptiflowSheets.getRows(SHEET_NAME)
      .map(normalizeRow)
      .filter(function (category) {
        return includeInactive || category.status_aktif;
      })
      .sort(function (a, b) {
        return a.defect_name.localeCompare(b.defect_name);
      });

    OptiflowAudit.write('DEFECT_CATEGORY_LIST_READ', session, {
      include_inactive: includeInactive,
      count: categories.length,
    });

    return OptiflowResponse.success({
      categories: categories,
    });
  }

  function upsert(payload, session) {
    var now = new Date().toISOString();
    var category = {
      defect_category_id: payload.category.defect_category_id,
      defect_name: payload.category.defect_name,
      qcc_factor: payload.category.qcc_factor,
      severity: payload.category.severity,
      status_aktif: payload.category.status_aktif,
      updated_at: now,
    };
    var existing = OptiflowSheets.getRows(SHEET_NAME);
    var found = false;
    var nextRows = existing.map(function (row) {
      if (String(row.defect_category_id || '').trim().toUpperCase() !== category.defect_category_id) {
        return row;
      }

      found = true;
      return category;
    });

    if (!found) {
      nextRows.push(category);
    }

    OptiflowSheets.replaceDataRows(SHEET_NAME, nextRows);
    OptiflowAudit.write(found ? 'DEFECT_CATEGORY_UPDATED' : 'DEFECT_CATEGORY_CREATED', session, {
      defect_category_id: category.defect_category_id,
      qcc_factor: category.qcc_factor,
      severity: category.severity,
      status_aktif: category.status_aktif,
    });

    return OptiflowResponse.success({
      category: category,
      created: !found,
    });
  }

  function deactivate(payload, session) {
    var now = new Date().toISOString();
    var found = false;
    var nextRows = OptiflowSheets.getRows(SHEET_NAME).map(function (row) {
      if (String(row.defect_category_id || '').trim().toUpperCase() !== payload.defect_category_id) {
        return row;
      }

      found = true;
      return {
        defect_category_id: String(row.defect_category_id || '').trim().toUpperCase(),
        defect_name: String(row.defect_name || '').trim(),
        qcc_factor: String(row.qcc_factor || '').trim(),
        severity: String(row.severity || '').trim().toUpperCase(),
        status_aktif: false,
        updated_at: now,
      };
    });

    if (!found) {
      throw new Error('Defect category was not found.');
    }

    OptiflowSheets.replaceDataRows(SHEET_NAME, nextRows);
    OptiflowAudit.write('DEFECT_CATEGORY_DEACTIVATED', session, {
      defect_category_id: payload.defect_category_id,
    });

    return OptiflowResponse.success({
      defect_category_id: payload.defect_category_id,
      status_aktif: false,
    });
  }

  function seedDefaults(payload, session) {
    var inserted = OptiflowSheets.seedMissingDefaultDefectCategories();

    OptiflowAudit.write('DEFECT_CATEGORY_SEEDED', session, {
      inserted_count: inserted.length,
      inserted: inserted.join(','),
    });

    return OptiflowResponse.success({
      inserted: inserted,
      categories: OptiflowSheets.getRows(SHEET_NAME).map(normalizeRow),
    });
  }

  function normalizeRow(row) {
    return {
      defect_category_id: String(row.defect_category_id || '').trim().toUpperCase(),
      defect_name: String(row.defect_name || '').trim(),
      qcc_factor: String(row.qcc_factor || '').trim(),
      severity: String(row.severity || '').trim().toUpperCase(),
      status_aktif: row.status_aktif === true || String(row.status_aktif).toUpperCase() === 'TRUE',
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : '',
    };
  }

  return Object.freeze({
    deactivate: deactivate,
    list: list,
    seedDefaults: seedDefaults,
    upsert: upsert,
  });
})();
