import { Product } from '../models/Product.js';
import { exportDataToExcelBuffer, parseExcelBuffer } from '../services/excelService.js';
import fs from 'fs';

export const getProducts = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 100 } = req.query;
    const query = { businessId: req.business._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { hsnSac: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageLimit = Math.min(Math.max(1, Number(limit) || 100), 1000);
    const pageNum = Math.max(1, Number(page) || 1);

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageLimit)
      .limit(pageLimit);

    res.json({
      success: true,
      products,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageLimit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { name, sku, description, hsnSac, unit, purchasePrice, sellingPrice, gstRate, discount, taxType } = req.body;

    if (!name || sellingPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Product name and selling price are required' });
    }

    const product = await Product.create({
      businessId: req.business._id,
      name,
      sku,
      description,
      hsnSac,
      unit: unit || 'PCS',
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      gstRate: gstRate !== undefined ? Number(gstRate) : 18,
      discount: Number(discount) || 0,
      taxType: taxType || 'Exclusive',
    });

    res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, businessId: req.business._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const exportProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ businessId: req.business._id }).lean();
    const exportData = products.map((p, i) => ({
      'S.No': i + 1,
      Name: p.name,
      SKU: p.sku || '',
      'HSN/SAC': p.hsnSac || '',
      Unit: p.unit || 'PCS',
      'Selling Price': p.sellingPrice,
      'Purchase Price': p.purchasePrice || 0,
      'GST %': p.gstRate,
      'Tax Type': p.taxType || 'Exclusive',
      Description: p.description || '',
    }));

    const buffer = exportDataToExcelBuffer(exportData, 'Products');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BillFlow_Products.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const importProducts = async (req, res, next) => {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    tempFilePath = req.file.path || null;
    const fileBuffer =
      req.file.buffer ||
      (tempFilePath && fs.existsSync(tempFilePath) ? fs.readFileSync(tempFilePath) : null);

    if (!fileBuffer) {
      return res.status(400).json({ success: false, message: 'Could not read uploaded file content' });
    }

    const { allRows, activeSheet } = parseExcelBuffer(fileBuffer);

    if (!allRows || allRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data rows found in the uploaded workbook.',
      });
    }

    // Helper: clean and parse numeric values (handles "₹ 1,500", "1,200.00", "1500/-", etc.)
    const parseNumber = (val, defaultVal = 0) => {
      if (val === undefined || val === null || val === '') return defaultVal;
      if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
      const cleaned = String(val)
        .replace(/[₹$€£,]/g, '')
        .replace(/rs\.?/gi, '')
        .replace(/\/-$/, '')
        .trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? defaultVal : Math.max(0, num);
    };

    // Helper to find value from row by checking a list of possible normalized column names
    const getRowValue = (normalizedRow, candidates) => {
      for (const candidate of candidates) {
        if (normalizedRow[candidate] !== undefined && normalizedRow[candidate] !== '') {
          return normalizedRow[candidate];
        }
      }
      return undefined;
    };

    const ops = [];
    let skippedEmpty = 0;

    for (const row of allRows) {
      // Build normalized row where keys are lowercased and stripped of spaces/punctuation
      const normalizedRow = {};
      Object.keys(row).forEach((k) => {
        const normKey = String(k || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        if (normKey) {
          normalizedRow[normKey] = row[k];
        }
      });

      // Flexible matching for Name
      const rawName =
        getRowValue(normalizedRow, [
          'name',
          'itemname',
          'productname',
          'item',
          'product',
          'particulars',
          'particular',
          'description',
          'itemdescription',
          'productdescription',
          'profile',
          'section',
          'material',
          'title',
          'details',
        ]) || '';

      const name = String(rawName).trim();
      if (!name) {
        skippedEmpty++;
        continue;
      }

      // Flexible matching for Selling Price / Rate
      const rawSellingPrice = getRowValue(normalizedRow, [
        'sellingprice',
        'saleprice',
        'salesprice',
        'price',
        'rate',
        'mrp',
        'amount',
        'unitprice',
        'salerate',
        'basicrate',
        'netrate',
        'rateunit',
        'priceunit',
      ]);
      const sellingPrice = parseNumber(rawSellingPrice, 0);

      // Flexible matching for Purchase Price / Cost
      const rawPurchasePrice = getRowValue(normalizedRow, [
        'purchaseprice',
        'cost',
        'costprice',
        'buyprice',
        'purchaserate',
        'buyrate',
        'purchasecost',
      ]);
      const purchasePrice = parseNumber(rawPurchasePrice, 0);

      // Flexible matching for HSN / SAC
      const rawHsn =
        getRowValue(normalizedRow, [
          'hsnsac',
          'hsn',
          'sac',
          'hsncode',
          'saccode',
          'hsnno',
          'tariff',
          'commoditycode',
        ]) || '';
      const hsnSac = String(rawHsn).trim();

      // Flexible matching for SKU / Code
      const rawSku =
        getRowValue(normalizedRow, [
          'sku',
          'itemcode',
          'productcode',
          'code',
          'barcode',
          'partno',
          'partnumber',
          'itemno',
        ]) || '';
      const sku = String(rawSku).trim();

      // Flexible matching for Unit
      const rawUnit =
        getRowValue(normalizedRow, ['unit', 'uom', 'unittype', 'measurement', 'pkg']) || 'PCS';
      const unit = String(rawUnit).trim().toUpperCase() || 'PCS';

      // Flexible matching for GST Rate
      const rawGst = getRowValue(normalizedRow, [
        'gstrate',
        'gst',
        'gstpercent',
        'taxrate',
        'tax',
        'taxpercent',
        'igst',
        'cgst',
        'vat',
      ]);
      const gstRate = rawGst !== undefined ? parseNumber(rawGst, 18) : 18;

      // Flexible matching for Description
      const rawDesc =
        getRowValue(normalizedRow, [
          'desc',
          'description',
          'details',
          'remarks',
          'notes',
          'specification',
          'specs',
        ]) || '';
      const description = String(rawDesc).trim();

      ops.push({
        updateOne: {
          filter: { businessId: req.business._id, name: name },
          update: {
            $set: {
              businessId: req.business._id,
              name,
              sku,
              hsnSac,
              unit,
              sellingPrice,
              purchasePrice,
              gstRate,
              description,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'No valid products could be extracted. Please ensure the Excel/XLSM sheet has column headers like "Item Name", "Rate" or "Price".',
      });
    }

    // Fast bulkWrite
    const bulkResult = await Product.bulkWrite(ops);
    const addedCount = bulkResult.upsertedCount || 0;
    const updatedCount = bulkResult.modifiedCount || 0;
    const totalCount = ops.length;

    console.log(
      `[Product Import] Sheet "${activeSheet}": processed ${totalCount} items (${addedCount} new, ${updatedCount} updated, ${skippedEmpty} empty skipped)`
    );

    res.json({
      success: true,
      message: `Successfully processed ${totalCount} products (${addedCount} added, ${updatedCount} updated)`,
      totalCount,
      addedCount,
      updatedCount,
      sheetName: activeSheet,
    });
  } catch (error) {
    console.error('[Product Import] Error:', error);
    next(error);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error('[Product Import] Failed to cleanup temp file:', e.message);
      }
    }
  }
};
