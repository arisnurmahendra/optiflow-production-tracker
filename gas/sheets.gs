var OptiflowSheets = (function () {
  var SPREADSHEET_ID_KEY = 'SPREADSHEET_ID';

  function getSpreadsheet() {
    var scriptProperties = PropertiesService.getScriptProperties();
    var spreadsheetId = scriptProperties.getProperty(SPREADSHEET_ID_KEY);

    if (spreadsheetId) {
      return SpreadsheetApp.openById(spreadsheetId);
    }

    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (activeSpreadsheet) {
      return activeSpreadsheet;
    }

    throw new Error('Missing Script Property SPREADSHEET_ID for standalone Apps Script project.');
  }

  function bootstrap() {
    var spreadsheet = getSpreadsheet();
    var createdSheets = [];
    var initializedHeaders = [];

    OPTIFLOW_REQUIRED_SHEETS.forEach(function (sheetName) {
      var sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        createdSheets.push(sheetName);
      }

      if (sheet.getLastRow() === 0) {
        writeHeader(sheet, OPTIFLOW_SHEET_SCHEMAS[sheetName]);
        initializedHeaders.push(sheetName);
      }

      if (sheetName === 'DEFECT_CATEGORIES' && sheet.getLastRow() === 1) {
        seedDefaultDefectCategories(sheet);
      }
    });

    return OptiflowResponse.success({
      spreadsheet_id: spreadsheet.getId(),
      created_sheets: createdSheets,
      initialized_headers: initializedHeaders,
      schema_health: buildHealthReport(spreadsheet),
    });
  }

  function healthCheck() {
    return OptiflowResponse.success(buildHealthReport(getSpreadsheet()));
  }

  function getRows(sheetName) {
    var sheet = getSpreadsheet().getSheetByName(sheetName);

    if (!sheet || sheet.getLastRow() < 2) {
      return [];
    }

    var headers = readHeader(sheet);
    var rowCount = sheet.getLastRow() - 1;
    var values = sheet.getRange(2, 1, rowCount, headers.length).getValues();

    return values.map(function (row) {
      return headers.reduce(function (record, header, index) {
        record[header] = row[index];
        return record;
      }, {});
    });
  }

  function appendRecord(sheetName, record) {
    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Missing required sheet ' + sheetName + '. Run bootstrapSheets first.');
    }

    var headers = OPTIFLOW_SHEET_SCHEMAS[sheetName];
    var row = headers.map(function (header) {
      return record[header] === undefined ? '' : record[header];
    });

    sheet.appendRow(row);
  }

  function seedDefaultDefectCategories(sheet) {
    OPTIFLOW_DEFAULT_DEFECT_CATEGORIES.forEach(function (category) {
      appendRow(sheet, 'DEFECT_CATEGORIES', {
        defect_category_id: category.defect_category_id,
        defect_name: category.defect_name,
        qcc_factor: category.qcc_factor,
        severity: category.severity,
        status_aktif: category.status_aktif,
        updated_at: new Date().toISOString(),
      });
    });
  }

  function appendRow(sheet, sheetName, record) {
    var headers = OPTIFLOW_SHEET_SCHEMAS[sheetName];
    var row = headers.map(function (header) {
      return record[header] === undefined ? '' : record[header];
    });

    sheet.appendRow(row);
  }

  function writeHeader(sheet, headers) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  function buildHealthReport(spreadsheet) {
    var sheets = [];
    var missingSheets = [];
    var invalidSheets = [];
    var rawLogsFormulaCount = 0;

    OPTIFLOW_REQUIRED_SHEETS.forEach(function (sheetName) {
      var expectedHeaders = OPTIFLOW_SHEET_SCHEMAS[sheetName];
      var sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        missingSheets.push(sheetName);
        invalidSheets.push(sheetName);
        sheets.push({
          sheet: sheetName,
          exists: false,
          valid: false,
          missing_columns: expectedHeaders,
          extra_columns: [],
          order_mismatches: [],
          formula_count: 0,
        });
        return;
      }

      var actualHeaders = readHeader(sheet);
      var headerReport = compareHeaders(expectedHeaders, actualHeaders);
      var formulaCount = sheetName === 'RAW_LOGS' ? countFormulas(sheet) : 0;
      var isValid = headerReport.missing_columns.length === 0
        && headerReport.extra_columns.length === 0
        && headerReport.order_mismatches.length === 0
        && formulaCount === 0;

      if (!isValid) {
        invalidSheets.push(sheetName);
      }

      rawLogsFormulaCount += formulaCount;
      sheets.push({
        sheet: sheetName,
        exists: true,
        valid: isValid,
        missing_columns: headerReport.missing_columns,
        extra_columns: headerReport.extra_columns,
        order_mismatches: headerReport.order_mismatches,
        formula_count: formulaCount,
      });
    });

    return {
      spreadsheet_id: spreadsheet.getId(),
      checked_at: new Date().toISOString(),
      valid: missingSheets.length === 0 && invalidSheets.length === 0 && rawLogsFormulaCount === 0,
      missing_sheets: missingSheets,
      invalid_sheets: invalidSheets,
      raw_logs_formula_count: rawLogsFormulaCount,
      sheets: sheets,
    };
  }

  function readHeader(sheet) {
    var lastColumn = Math.max(sheet.getLastColumn(), 1);
    var values = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    return values.map(function (value) {
      return String(value || '').trim();
    }).filter(function (value) {
      return value !== '';
    });
  }

  function compareHeaders(expectedHeaders, actualHeaders) {
    var missingColumns = expectedHeaders.filter(function (header) {
      return actualHeaders.indexOf(header) === -1;
    });
    var extraColumns = actualHeaders.filter(function (header) {
      return expectedHeaders.indexOf(header) === -1;
    });
    var orderMismatches = [];

    expectedHeaders.forEach(function (header, index) {
      if (actualHeaders[index] && actualHeaders[index] !== header) {
        orderMismatches.push({
          index: index + 1,
          expected: header,
          actual: actualHeaders[index],
        });
      }
    });

    return {
      missing_columns: missingColumns,
      extra_columns: extraColumns,
      order_mismatches: orderMismatches,
    };
  }

  function countFormulas(sheet) {
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      return 0;
    }

    return sheet.getDataRange().getFormulas().reduce(function (count, row) {
      return count + row.filter(function (formula) {
        return formula !== '';
      }).length;
    }, 0);
  }

  return Object.freeze({
    bootstrap: bootstrap,
    appendRecord: appendRecord,
    getRows: getRows,
    healthCheck: healthCheck,
  });
})();
