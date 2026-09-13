var OptiflowBagianMaster = (function () {
  var SHEET_NAME = 'BAGIAN_MASTER';

  function list(payload, session) {
    var includeInactive = Boolean(payload.include_inactive);
    var bagian = OptiflowSheets.getRows(SHEET_NAME)
      .map(normalizeRow)
      .filter(function (item) {
        return includeInactive || item.status_aktif;
      })
      .sort(function (a, b) {
        return a.bagian_name.localeCompare(b.bagian_name);
      });

    OptiflowAudit.write('BAGIAN_MASTER_LIST_READ', session, {
      include_inactive: includeInactive,
      count: bagian.length,
    });

    return OptiflowResponse.success({
      bagian: bagian,
    });
  }

  function upsert(payload, session) {
    var now = new Date().toISOString();
    var incoming = payload.bagian;
    var existingRows = OptiflowSheets.getRows(SHEET_NAME).map(normalizeRow);
    var existing = existingRows.find(function (row) {
      return row.bagian_id === incoming.bagian_id;
    });

    OptiflowAuth.requirePermission(session, 'bagian_master', existing ? 'update' : 'create');

    var record = {
      bagian_id: incoming.bagian_id,
      bagian_name: incoming.bagian_name,
      description: incoming.description,
      unit_rate: incoming.unit_rate,
      monthly_target_unit: incoming.monthly_target_unit,
      target_salary: incoming.target_salary,
      status_aktif: incoming.status_aktif,
      created_by: existing ? existing.created_by : session.email,
      updated_by: session.email,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
    };
    var nextRows = existingRows.map(function (row) {
      return row.bagian_id === record.bagian_id ? record : row;
    });

    if (!existing) {
      nextRows.push(record);
    }

    OptiflowSheets.replaceDataRows(SHEET_NAME, nextRows);
    OptiflowAudit.write(existing ? 'BAGIAN_MASTER_UPDATED' : 'BAGIAN_MASTER_CREATED', session, {
      bagian_id: record.bagian_id,
      unit_rate: record.unit_rate,
      monthly_target_unit: record.monthly_target_unit,
      target_salary: record.target_salary,
      status_aktif: record.status_aktif,
    });

    return OptiflowResponse.success({
      bagian: record,
      created: !existing,
    });
  }

  function deactivate(payload, session) {
    var now = new Date().toISOString();
    var found = false;
    var nextRows = OptiflowSheets.getRows(SHEET_NAME).map(normalizeRow).map(function (row) {
      if (row.bagian_id !== payload.bagian_id) {
        return row;
      }

      found = true;
      return Object.assign({}, row, {
        status_aktif: false,
        updated_by: session.email,
        updated_at: now,
      });
    });

    if (!found) {
      throw new Error('Bagian was not found.');
    }

    OptiflowSheets.replaceDataRows(SHEET_NAME, nextRows);
    OptiflowAudit.write('BAGIAN_MASTER_DEACTIVATED', session, {
      bagian_id: payload.bagian_id,
    });

    return OptiflowResponse.success({
      bagian_id: payload.bagian_id,
      status_aktif: false,
    });
  }

  function seedDefaults(payload, session) {
    var inserted = OptiflowSheets.seedMissingDefaultBagianMaster();

    OptiflowAudit.write('BAGIAN_MASTER_SEEDED', session, {
      inserted_count: inserted.length,
      inserted: inserted.join(','),
    });

    return OptiflowResponse.success({
      inserted: inserted,
      bagian: OptiflowSheets.getRows(SHEET_NAME).map(normalizeRow),
    });
  }

  function normalizeRow(row) {
    return {
      bagian_id: String(row.bagian_id || '').trim().toUpperCase(),
      bagian_name: String(row.bagian_name || '').trim(),
      description: String(row.description || '').trim(),
      unit_rate: Number(row.unit_rate || 0),
      monthly_target_unit: Number(row.monthly_target_unit || 0),
      target_salary: Number(row.target_salary || 0),
      status_aktif: row.status_aktif === true || String(row.status_aktif).toUpperCase() === 'TRUE',
      created_by: String(row.created_by || '').trim().toLowerCase(),
      updated_by: String(row.updated_by || '').trim().toLowerCase(),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
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
