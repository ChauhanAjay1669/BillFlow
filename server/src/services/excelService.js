import * as XLSX from 'xlsx';

/**
 * Parse an Excel/CSV buffer into row objects and column headers
 */
export const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Excel file has no sheets');
  }

  // Find the best sheet (one that actually contains tabular data)
  let bestRows = [];
  let bestSheetName = sheetNames[0];

  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet || !sheet['!ref']) continue;

    // Read sheet as 2D array of rows to detect header row
    const rowsAsArrays = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rowsAsArrays || rowsAsArrays.length === 0) continue;

    // Detect actual header row (look within first 10 rows)
    let headerRowIndex = 0;
    const headerKeywords = [
      'name',
      'item',
      'product',
      'particular',
      'desc',
      'rate',
      'price',
      'mrp',
      'amount',
      'qty',
      'hsn',
      'sku',
      'code',
      'unit',
      'gst',
    ];

    for (let i = 0; i < Math.min(rowsAsArrays.length, 10); i++) {
      const row = rowsAsArrays[i];
      if (!Array.isArray(row)) continue;
      const nonEmptyCells = row.map((c) => String(c || '').trim()).filter(Boolean);

      // Check if this row contains header-like keywords
      const hasKeyword = nonEmptyCells.some((c) =>
        headerKeywords.some((kw) => c.toLowerCase().includes(kw))
      );

      if (hasKeyword && nonEmptyCells.length >= 2) {
        headerRowIndex = i;
        break;
      }

      // Or if it has 3+ string cells and previous row was empty/title
      if (nonEmptyCells.length >= 3 && i > 0 && (rowsAsArrays[i - 1]?.filter(Boolean).length || 0) <= 1) {
        headerRowIndex = i;
        break;
      }
    }

    // Convert sheet to json array of objects starting from detected header
    const rows = XLSX.utils.sheet_to_json(sheet, {
      range: headerRowIndex,
      defval: '',
      raw: false,
    });

    if (rows.length > bestRows.length) {
      bestRows = rows;
      bestSheetName = name;
    }
  }

  // If none had rows, fall back to first sheet
  const rawRows =
    bestRows.length > 0
      ? bestRows
      : XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: '', raw: false });

  // Get all unique column headers
  const columns = new Set();
  rawRows.forEach((row) => {
    Object.keys(row).forEach((k) => {
      const trimmed = String(k || '').trim();
      if (trimmed && !trimmed.startsWith('__EMPTY')) {
        columns.add(trimmed);
      }
    });
  });

  return {
    sheetNames,
    activeSheet: bestSheetName,
    columns: Array.from(columns),
    totalRows: rawRows.length,
    previewRows: rawRows.slice(0, 10),
    allRows: rawRows,
  };
};

/**
 * Validate mapped row records
 */
export const validateMappedRows = (rows, mapping) => {
  const validRows = [];
  const errors = [];

  // Inverted mapping: appField -> excelColumn
  const fieldToCol = {};
  Object.entries(mapping).forEach(([excelCol, appField]) => {
    if (appField && appField !== 'ignore') {
      fieldToCol[appField] = excelCol;
    }
  });

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header row
    const rowErrors = [];

    const getVal = (field) => {
      const col = fieldToCol[field];
      return col ? String(row[col] || '').trim() : '';
    };

    const customerName = getVal('customerName');
    const invoiceNumber = getVal('invoiceNumber');
    const productName = getVal('productName');
    const quantityStr = getVal('quantity');
    const rateStr = getVal('rate');
    const gstRateStr = getVal('gstRate');

    if (!customerName) {
      rowErrors.push('Customer name is missing');
    }

    if (!productName) {
      rowErrors.push('Product name is missing');
    }

    const qty = Number(quantityStr);
    if (isNaN(qty) || qty <= 0) {
      rowErrors.push(`Invalid quantity: "${quantityStr}" (must be positive number)`);
    }

    const rate = Number(rateStr);
    if (isNaN(rate) || rate < 0) {
      rowErrors.push(`Invalid unit rate: "${rateStr}" (must be non-negative)`);
    }

    if (gstRateStr) {
      const gst = Number(gstRateStr);
      if (isNaN(gst) || gst < 0 || gst > 100) {
        rowErrors.push(`Invalid GST rate: "${gstRateStr}"`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNum,
        messages: rowErrors,
        data: row,
      });
    } else {
      validRows.push({
        rowNum,
        customerName,
        customerPhone: getVal('customerPhone'),
        customerEmail: getVal('customerEmail'),
        customerGstin: getVal('customerGstin'),
        customerAddress: getVal('customerAddress'),
        customerCity: getVal('customerCity'),
        customerState: getVal('customerState'),
        invoiceNumber: invoiceNumber || '',
        invoiceDate: getVal('invoiceDate'),
        dueDate: getVal('dueDate'),
        productName,
        hsnSac: getVal('hsnSac'),
        sku: getVal('sku'),
        unit: getVal('unit') || 'PCS',
        quantity: qty,
        rate: rate,
        discount: Number(getVal('discount')) || 0,
        gstRate: Number(gstRateStr) || 18,
      });
    }
  });

  return { validRows, errors };
};

/**
 * Group flat rows by invoiceNumber (or auto-group by customer if invoiceNumber missing)
 */
export const groupRowsIntoInvoices = (validRows) => {
  const invoiceMap = new Map();

  validRows.forEach((row, idx) => {
    // Generate invoice key: use invoiceNumber or synthesize by customer
    const invoiceKey = row.invoiceNumber || `AUTO-${row.customerName.replace(/\s+/g, '_')}-${Math.floor(idx / 5) + 1}`;

    if (!invoiceMap.has(invoiceKey)) {
      invoiceMap.set(invoiceKey, {
        invoiceNumber: row.invoiceNumber,
        customer: {
          name: row.customerName,
          phone: row.customerPhone,
          email: row.customerEmail,
          gstin: row.customerGstin,
          address: row.customerAddress,
          city: row.customerCity,
          state: row.customerState,
        },
        invoiceDate: row.invoiceDate ? new Date(row.invoiceDate) : new Date(),
        dueDate: row.dueDate ? new Date(row.dueDate) : new Date(Date.now() + 15 * 86400000),
        items: [],
      });
    }

    const group = invoiceMap.get(invoiceKey);
    group.items.push({
      name: row.productName,
      sku: row.sku,
      hsnSac: row.hsnSac,
      unit: row.unit,
      quantity: row.quantity,
      rate: row.rate,
      discount: row.discount,
      gstRate: row.gstRate,
    });
  });

  return Array.from(invoiceMap.values());
};

/**
 * Export arbitrary data array to XLSX buffer
 */
export const exportDataToExcelBuffer = (data, sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
