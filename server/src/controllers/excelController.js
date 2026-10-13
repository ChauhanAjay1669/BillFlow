import { parseExcelBuffer, validateMappedRows, groupRowsIntoInvoices, exportDataToExcelBuffer } from '../services/excelService.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Invoice } from '../models/Invoice.js';
import { ExcelImport } from '../models/ExcelImport.js';
import { Notification } from '../models/Notification.js';
import { calculateInvoiceTotals } from '../services/calculator.js';
import { generateInvoiceHtml, generatePdfBuffer } from '../services/pdfService.js';
import archiver from 'archiver';
import fs from 'fs';

export const uploadAndPreview = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const parsed = parseExcelBuffer(fileBuffer);

    res.json({
      success: true,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
      columns: parsed.columns,
      totalRows: parsed.totalRows,
      previewRows: parsed.previewRows,
    });
  } catch (error) {
    next(error);
  }
};

export const validateMapping = async (req, res, next) => {
  try {
    const { filePath, mapping } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ success: false, message: 'Uploaded file not found or expired' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const { allRows } = parseExcelBuffer(fileBuffer);

    const { validRows, errors } = validateMappedRows(allRows, mapping);

    res.json({
      success: true,
      totalRows: allRows.length,
      validRowsCount: validRows.length,
      errorCount: errors.length,
      errors: errors.slice(0, 50), // Send first 50 errors for display
    });
  } catch (error) {
    next(error);
  }
};

export const processImportAndGenerate = async (req, res, next) => {
  try {
    const { filePath, mapping, fileName } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ success: false, message: 'Uploaded file not found' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const { allRows } = parseExcelBuffer(fileBuffer);
    const { validRows, errors } = validateMappedRows(allRows, mapping);

    const business = req.business;
    const invoiceGroups = groupRowsIntoInvoices(validRows);

    let generatedInvoices = [];
    let failedGroups = 0;

    for (const group of invoiceGroups) {
      try {
        // 1. Resolve or create Customer
        let customer = await Customer.findOne({
          businessId: business._id,
          $or: [
            { name: { $regex: `^${group.customer.name.trim()}$`, $options: 'i' } },
            ...(group.customer.phone ? [{ phone: group.customer.phone.trim() }] : []),
          ],
        });

        if (!customer) {
          customer = await Customer.create({
            businessId: business._id,
            name: group.customer.name,
            phone: group.customer.phone || '',
            email: group.customer.email || '',
            gstin: group.customer.gstin || '',
            address: group.customer.address || '',
            city: group.customer.city || '',
            state: group.customer.state || '',
          });
        }

        // 2. Prepare Items
        const processedItems = [];
        for (const itm of group.items) {
          // Resolve product
          let product = await Product.findOne({
            businessId: business._id,
            name: { $regex: `^${itm.name.trim()}$`, $options: 'i' },
          });

          if (!product) {
            product = await Product.create({
              businessId: business._id,
              name: itm.name,
              sku: itm.sku || '',
              hsnSac: itm.hsnSac || '',
              unit: itm.unit || 'PCS',
              sellingPrice: itm.rate,
              gstRate: itm.gstRate || 18,
            });
          }

          processedItems.push({
            productId: product._id,
            name: product.name,
            sku: product.sku,
            hsnSac: product.hsnSac || itm.hsnSac,
            unit: itm.unit || product.unit || 'PCS',
            quantity: itm.quantity,
            rate: itm.rate,
            discount: itm.discount || 0,
            gstRate: itm.gstRate || product.gstRate || 18,
          });
        }

        // 3. Tax & Inter-State calculation
        const destState = group.customer.state || customer.state || business.state;
        const isInterState =
          Boolean(business.state && destState) &&
          business.state.trim().toLowerCase() !== destState.trim().toLowerCase();

        const totals = calculateInvoiceTotals({
          items: processedItems,
          isInterState,
          overallDiscount: 0,
          shipping: 0,
          paidAmount: 0,
        });

        // 4. Invoice Number
        let invoiceNum = group.invoiceNumber;
        if (!invoiceNum) {
          const nextCount = (business.currentInvoiceCount || 0) + 1;
          invoiceNum = `${business.invoicePrefix || 'INV'}-${String(nextCount).padStart(4, '0')}`;
          business.currentInvoiceCount = nextCount;
          await business.save();
        }

        // Prevent duplicate invoice number error
        const existingInvoice = await Invoice.findOne({
          businessId: business._id,
          invoiceNumber: invoiceNum,
        });

        if (existingInvoice) {
          invoiceNum = `${invoiceNum}-R${Math.floor(Math.random() * 1000)}`;
        }

        const invoice = await Invoice.create({
          businessId: business._id,
          customerId: customer._id,
          customerSnapshot: {
            name: customer.name,
            companyName: customer.companyName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            gstin: customer.gstin,
          },
          invoiceNumber: invoiceNum,
          invoiceDate: group.invoiceDate,
          dueDate: group.dueDate,
          placeOfSupply: destState,
          isInterState,
          items: totals.items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxableAmount: totals.taxableAmount,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          shipping: totals.shipping,
          roundOff: totals.roundOff,
          total: totals.total,
          paidAmount: 0,
          balanceAmount: totals.total,
          status: 'Pending',
          templateId: 'classic',
          createdBy: req.user._id,
        });

        generatedInvoices.push(invoice);
      } catch (err) {
        console.error('Error creating invoice from group:', err);
        failedGroups++;
      }
    }

    // Save audit record
    const auditRecord = await ExcelImport.create({
      businessId: business._id,
      fileName: fileName || 'Imported File',
      fileType: 'spreadsheet',
      mapping,
      totalRows: allRows.length,
      successfulRows: validRows.length,
      failedRows: errors.length,
      generatedInvoicesCount: generatedInvoices.length,
      errors: errors.map((e) => ({
        row: e.row,
        message: e.messages.join('; '),
        data: e.data,
      })),
      status: 'completed',
    });

    // Notify user
    await Notification.create({
      businessId: business._id,
      userId: req.user._id,
      title: 'Excel Import Completed',
      message: `Generated ${generatedInvoices.length} invoices successfully. (${errors.length} row errors)`,
      type: 'success',
      link: '/invoices',
    });

    res.json({
      success: true,
      message: `Successfully generated ${generatedInvoices.length} invoices!`,
      summary: {
        totalExcelRows: allRows.length,
        validRows: validRows.length,
        rowErrors: errors.length,
        invoicesGenerated: generatedInvoices.length,
        failedGroups,
      },
      auditId: auditRecord._id,
      generatedInvoices: generatedInvoices.map((inv) => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerSnapshot?.name,
        total: inv.total,
        status: inv.status,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const downloadErrorReport = async (req, res, next) => {
  try {
    const { auditId } = req.params;
    const record = await ExcelImport.findOne({ _id: auditId, businessId: req.business._id });

    if (!record || !record.errors || record.errors.length === 0) {
      return res.status(404).json({ success: false, message: 'No errors found for this import' });
    }

    const errorRows = record.errors.map((e) => ({
      'Row Number': e.row,
      'Error Message': e.message,
      ...(e.data || {}),
    }));

    const buffer = exportDataToExcelBuffer(errorRows, 'Import Errors');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BillFlow_Import_Errors.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const downloadZippedInvoices = async (req, res, next) => {
  try {
    const { invoiceIds } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No invoices selected for download' });
    }

    const invoices = await Invoice.find({
      _id: { $in: invoiceIds },
      businessId: req.business._id,
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=BillFlow_Invoices_Bundle.zip');

    archive.pipe(res);

    for (const inv of invoices) {
      try {
        const html = await generateInvoiceHtml(inv, req.business, {});
        const pdf = await generatePdfBuffer(html, { pageSize: 'A4' });
        const name = `${inv.invoiceNumber}-${(inv.customerSnapshot?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        archive.append(pdf, { name });
      } catch (e) {
        console.error(`Failed to generate PDF for ${inv.invoiceNumber}:`, e);
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};
