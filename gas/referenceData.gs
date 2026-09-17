var OptiflowReferenceData = (function () {
  function getShiftOptions(payload, session) {
    var shifts = OptiflowSheets.getRows('SHIFT_MASTER')
      .filter(function (row) {
        return payload.include_inactive || isTruthy(row.status_aktif);
      })
      .map(function (row) {
        var shiftId = String(row.shift_id || '').trim();
        var shiftName = String(row.shift_name || '').trim();

        return {
          value: shiftId,
          label: shiftName || shiftId,
          shift_id: shiftId,
          shift_name: shiftName,
          start_time: String(row.start_time || ''),
          end_time: String(row.end_time || ''),
          timezone: String(row.timezone || OPTIFLOW_APP.timezone),
          status_aktif: isTruthy(row.status_aktif),
        };
      })
      .sort(function (a, b) {
        return a.value.localeCompare(b.value);
      });

    OptiflowAudit.write('REFERENCE_SHIFT_OPTIONS_READ', session, {
      count: shifts.length,
      include_inactive: payload.include_inactive,
    });

    return OptiflowResponse.success({
      shifts: shifts,
    });
  }

  function getOperatorReferenceData(payload, session) {
    var bagian = buildBagianOptions(payload.include_inactive);
    var lines = OptiflowSheets.getRows('LINE_MASTER')
      .filter(function (row) {
        return payload.include_inactive || isTruthy(row.status_aktif);
      })
      .map(function (row) {
        var lineId = String(row.line_id || '').trim().toUpperCase();
        var lineName = String(row.line_name || '').trim();

        return {
          value: lineId,
          label: lineName ? lineId + ' - ' + lineName : lineId,
          line_id: lineId,
          line_name: lineName,
          area: String(row.area || '').trim(),
          status_aktif: isTruthy(row.status_aktif),
        };
      })
      .filter(function (row) {
        return row.value;
      })
      .sort(compareByValue);
    var shifts = buildShiftOptions(payload.include_inactive);
    var machines = buildMachineOptions(payload.include_inactive);
    var workCategories = buildWorkCategoryOptions(bagian, machines);
    var operators = buildOperatorOptions(payload.include_inactive);

    OptiflowAudit.write('REFERENCE_OPERATOR_DATA_READ', session, {
      bagian_count: bagian.length,
      line_count: lines.length,
      shift_count: shifts.length,
      machine_count: machines.length,
      work_category_count: workCategories.length,
      operator_count: operators.length,
      include_inactive: payload.include_inactive,
    });

    return OptiflowResponse.success({
      reference_mode: 'BAGIAN_WITH_LEGACY_COMPAT',
      bagian: bagian,
      work_categories: workCategories,
      lines: lines,
      shifts: shifts,
      machines: machines,
      operators: operators,
    });
  }

  function buildShiftOptions(includeInactive) {
    return OptiflowSheets.getRows('SHIFT_MASTER')
      .filter(function (row) {
        return includeInactive || isTruthy(row.status_aktif);
      })
      .map(function (row) {
        var shiftId = String(row.shift_id || '').trim();
        var shiftName = String(row.shift_name || '').trim();

        return {
          value: shiftId,
          label: shiftName || shiftId,
          shift_id: shiftId,
          shift_name: shiftName,
          start_time: String(row.start_time || ''),
          end_time: String(row.end_time || ''),
          timezone: String(row.timezone || OPTIFLOW_APP.timezone),
          status_aktif: isTruthy(row.status_aktif),
        };
      })
      .filter(function (row) {
        return row.value;
      })
      .sort(compareByValue);
  }

  function buildBagianOptions(includeInactive) {
    return OptiflowSheets.getRows('BAGIAN_MASTER')
      .filter(function (row) {
        return includeInactive || isTruthy(row.status_aktif);
      })
      .map(function (row) {
        var bagianId = String(row.bagian_id || '').trim().toUpperCase();
        var bagianName = String(row.bagian_name || '').trim();

        return {
          value: bagianId,
          label: bagianName || bagianId,
          bagian_id: bagianId,
          bagian_name: bagianName,
          unit_rate: Number(row.unit_rate || 0),
          monthly_target_unit: Number(row.monthly_target_unit || 0),
          target_salary: Number(row.target_salary || 0),
          status_aktif: isTruthy(row.status_aktif),
        };
      })
      .filter(function (row) {
        return row.value;
      })
      .sort(compareByValue);
  }

  function buildMachineOptions(includeInactive) {
    var seen = {};

    function addMachine(value) {
      var machineId = String(value || '').trim().toUpperCase();
      if (!machineId || machineId === 'ALL') {
        return;
      }

      seen[machineId] = true;
    }

    OptiflowSheets.getRows('TARGET_MASTER')
      .filter(function (row) {
        return includeInactive || isTruthy(row.status_aktif);
      })
      .forEach(function (row) {
        addMachine(row.machine_id);
      });

    OptiflowSheets.getRows('RAW_LOGS').forEach(function (row) {
      addMachine(row.machine_id);
    });

    return Object.keys(seen).sort().map(function (machineId) {
      return {
        value: machineId,
        label: machineId,
        machine_id: machineId,
      };
    });
  }

  function buildWorkCategoryOptions(bagian, machines) {
    return bagian.map(function (row) {
      return {
        value: row.bagian_id,
        label: row.bagian_name || row.bagian_id,
        work_category_id: row.bagian_id,
        work_category_name: row.bagian_name || row.bagian_id,
        bagian_id: row.bagian_id,
        source: 'BAGIAN_MASTER',
        status_aktif: row.status_aktif,
      };
    }).concat(machines.map(function (row) {
      return {
        value: row.machine_id,
        label: row.label,
        work_category_id: row.machine_id,
        work_category_name: row.label,
        legacy_machine_id: row.machine_id,
        source: 'LEGACY_MACHINE',
        status_aktif: true,
      };
    }));
  }

  function buildOperatorOptions(includeInactive) {
    return OptiflowSheets.getRows('USER_ROLES')
      .filter(function (row) {
        return String(row.role || '').trim() === 'Operator';
      })
      .filter(function (row) {
        return includeInactive || isTruthy(row.status_aktif);
      })
      .filter(function (row) {
        return !isTruthy(row.is_deleted);
      })
      .map(function (row) {
        var email = String(row.email || '').trim().toLowerCase();
        var username = String(row.username || '').trim();

        return {
          value: email,
          label: username ? username + ' (' + maskEmail(email) + ')' : maskEmail(email),
          email: email,
          username: username,
          employee_no: String(row.employee_no || row.user_id || '').trim(),
          full_name: String(row.full_name || '').trim(),
          bagian_id: String(row.bagian_id || '').trim().toUpperCase(),
          role: 'Operator',
          status_aktif: isTruthy(row.status_aktif),
        };
      })
      .filter(function (row) {
        return row.value;
      })
      .sort(compareByValue);
  }

  function compareByValue(a, b) {
    return a.value.localeCompare(b.value);
  }

  function maskEmail(email) {
    if (!email || email.indexOf('@') === -1) {
      return '';
    }

    var parts = email.split('@');
    var name = parts[0];
    return name.slice(0, 2) + '***@' + parts[1];
  }

  function isTruthy(value) {
    return value === true || String(value).toUpperCase() === 'TRUE';
  }

  return Object.freeze({
    getOperatorReferenceData: getOperatorReferenceData,
    getShiftOptions: getShiftOptions,
  });
})();
