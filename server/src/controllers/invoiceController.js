import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Business } from '../models/Business.js';
import { Payment } from '../models/Payment.js';
import { InvoiceTemplate } from '../models/InvoiceTemplate.js';
import { Notification } from '../models/Notification.js';
import { calculateInvoiceTotals } from '../services/calculator.js';
import { generateInvoiceHtml, generatePdfBuffer } from '../services/pdfService.js';
import { generatePdfKitInvoice } from '../services/pdfKitService.js';
import { resolveTemplate } from './templateController.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

export const getInvoices = async (req, res, next) => {
  try {
    const { search = '', status, customerId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = { businessId: req.business._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.companyName': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customerId', 'name companyName phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      invoices,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.business._id,
    }).populate('customerId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Get associated payments
    const payments = await Payment.find({
      invoiceId: invoice._id,
      businessId: req.business._id,
    }).sort({ paymentDate: -1 });

    // Resolve template with full styles and colors
    const template = (await resolveTemplate(invoice.templateId, req.business._id)) || {};

    res.json({
      success: true,
      invoice,
      payments,
      business: req.business,
      template,
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const {
      customerId,
      invoiceNumber: customInvoiceNumber,
      invoiceDate,
      dueDate,
      placeOfSupply,
      items,
      overallDiscount,
      overallDiscountType,
      shipping,
      paidAmount = 0,
      notes,
      terms,
      templateId,
    } = req.body;

    if (!customerId || !isValidObjectId(customerId)) {
      return res.status(400).json({ success: false, message: 'Please select a valid customer' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one line item' });
    }

    const customer = await Customer.findOne({ _id: customerId, businessId: req.business._id });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const business = req.business;

    // Determine State and Inter-State taxation
    const destinationState = placeOfSupply || customer.state || business.state;
    const isInterState =
      Boolean(business.state && destinationState) &&
      business.state.trim().toLowerCase() !== destinationState.trim().toLowerCase();

    // Generate Invoice Number if not provided
    let invoiceNumber = customInvoiceNumber;
    if (!invoiceNumber) {
      const nextCount = (business.currentInvoiceCount || 0) + 1;
      const paddedNum = String(nextCount).padStart(4, '0');
      invoiceNumber = `${business.invoicePrefix || 'INV'}-${paddedNum}`;

      await Business.findByIdAndUpdate(business._id, {
        $inc: { currentInvoiceCount: 1 },
      });
    }

    // Run Backend Calculation Engine
    const totals = calculateInvoiceTotals({
      items,
      isInterState,
      overallDiscount,
      overallDiscountType,
      shipping,
      paidAmount,
    });

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
        pincode: customer.pincode,
        gstin: customer.gstin,
        pan: customer.pan,
      },
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000),
      placeOfSupply: destinationState,
      isInterState,
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      discountType: overallDiscountType || 'fixed',
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      shipping: totals.shipping,
      roundOff: totals.roundOff,
      total: totals.total,
      paidAmount: totals.paidAmount,
      balanceAmount: totals.balanceAmount,
      status: req.body.status || totals.status,
      notes: notes || business.notes,
      terms: terms || business.termsAndConditions,
      templateId: templateId || 'classic',
      currency: business.currency || 'INR',
      currencySymbol: business.currencySymbol || '₹',
      createdBy: req.user._id,
    });

    // If an initial payment was recorded at time of invoice creation
    if (totals.paidAmount > 0) {
      await Payment.create({
        businessId: business._id,
        invoiceId: invoice._id,
        amount: totals.paidAmount,
        paymentDate: invoice.invoiceDate,
        method: req.body.paymentMethod || 'UPI',
        reference: req.body.paymentReference || 'Initial payment',
      });
    }

    // Create system notification
    await Notification.create({
      businessId: business._id,
      userId: req.user._id,
      title: 'Invoice Created',
      message: `Invoice #${invoice.invoiceNumber} created for ${customer.name} (₹${invoice.total})`,
      type: 'success',
      link: `/invoices/${invoice._id}`,
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const existing = await Invoice.findOne({ _id: req.params.id, businessId: req.business._id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const {
      customerId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      placeOfSupply,
      items,
      overallDiscount,
      overallDiscountType,
      shipping,
      paidAmount,
      notes,
      terms,
      templateId,
      status,
    } = req.body;

    const business = req.business;
    let customerSnapshot = existing.customerSnapshot;

    if (customerId && String(customerId) !== String(existing.customerId)) {
      const cust = await Customer.findOne({ _id: customerId, businessId: business._id });
      if (cust) {
        customerSnapshot = {
          name: cust.name,
          companyName: cust.companyName,
          email: cust.email,
          phone: cust.phone,
          address: cust.address,
          city: cust.city,
          state: cust.state,
          pincode: cust.pincode,
          gstin: cust.gstin,
          pan: cust.pan,
        };
      }
    }

    const destinationState = placeOfSupply || customerSnapshot.state || business.state;
    const isInterState =
      Boolean(business.state && destinationState) &&
      business.state.trim().toLowerCase() !== destinationState.trim().toLowerCase();

    // Recalculate
    const totals = calculateInvoiceTotals({
      items: items || existing.items,
      isInterState,
      overallDiscount: overallDiscount !== undefined ? overallDiscount : existing.discount,
      overallDiscountType: overallDiscountType || existing.discountType,
      shipping: shipping !== undefined ? shipping : existing.shipping,
      paidAmount: paidAmount !== undefined ? paidAmount : existing.paidAmount,
    });

    existing.customerId = customerId || existing.customerId;
    existing.customerSnapshot = customerSnapshot;
    if (invoiceNumber) existing.invoiceNumber = invoiceNumber;
    if (invoiceDate) existing.invoiceDate = new Date(invoiceDate);
    if (dueDate) existing.dueDate = new Date(dueDate);
    existing.placeOfSupply = destinationState;
    existing.isInterState = isInterState;
    existing.items = totals.items;
    existing.subtotal = totals.subtotal;
    existing.discount = totals.discount;
    existing.taxableAmount = totals.taxableAmount;
    existing.cgst = totals.cgst;
    existing.sgst = totals.sgst;
    existing.igst = totals.igst;
    existing.shipping = totals.shipping;
    existing.roundOff = totals.roundOff;
    existing.total = totals.total;
    existing.paidAmount = totals.paidAmount;
    existing.balanceAmount = totals.balanceAmount;
    existing.status = status || totals.status;
    if (notes !== undefined) existing.notes = notes;
    if (terms !== undefined) existing.terms = terms;
    if (templateId) existing.templateId = templateId;

    await existing.save();

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: existing,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Delete associated payments
    await Payment.deleteMany({ invoiceId: invoice._id, businessId: req.business._id });

    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const duplicateInvoice = async (req, res, next) => {
  try {
    const original = await Invoice.findOne({ _id: req.params.id, businessId: req.business._id });
    if (!original) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const business = req.business;
    const nextCount = (business.currentInvoiceCount || 0) + 1;
    const paddedNum = String(nextCount).padStart(4, '0');
    const newNumber = `${business.invoicePrefix || 'INV'}-${paddedNum}`;

    await Business.findByIdAndUpdate(business._id, { $inc: { currentInvoiceCount: 1 } });

    const duplicate = await Invoice.create({
      businessId: business._id,
      customerId: original.customerId,
      customerSnapshot: original.customerSnapshot,
      invoiceNumber: newNumber,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 15 * 86400000),
      placeOfSupply: original.placeOfSupply,
      isInterState: original.isInterState,
      items: original.items,
      subtotal: original.subtotal,
      discount: original.discount,
      discountType: original.discountType,
      taxableAmount: original.taxableAmount,
      cgst: original.cgst,
      sgst: original.sgst,
      igst: original.igst,
      shipping: original.shipping,
      roundOff: original.roundOff,
      total: original.total,
      paidAmount: 0,
      balanceAmount: original.total,
      status: 'Draft',
      notes: original.notes,
      terms: original.terms,
      templateId: original.templateId,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Duplicated invoice as ${newNumber}`,
      invoice: duplicate,
    });
  } catch (error) {
    next(error);
  }
};

export const generatePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const business = req.business;
    const template = (await resolveTemplate(invoice.templateId, req.business._id)) || {};

    console.log(
      `[PDF] Generating PDF for invoice ${invoice.invoiceNumber} with template: "${template.name || 'Default'}" (Color: ${template.styles?.primaryColor || business.primaryColor || '#2563EB'})...`
    );

    let pdfBuffer = null;

    // 1. Try Puppeteer first (when Chromium is available, e.g. local dev)
    try {
      const html = await generateInvoiceHtml(invoice, business, template);
      if (html && html.length >= 100) {
        pdfBuffer = await generatePdfBuffer(html, {
          pageSize: template.pageSize || req.query.pageSize || 'A4',
        });
      }
    } catch (puppeteerErr) {
      console.warn(
        '[PDF] Puppeteer browser unavailable (serverless / cloud environment), falling back to PDFKit engine:',
        puppeteerErr.message
      );
    }

    // 2. Serverless fallback: pure-JavaScript PDFKit engine (zero Chromium, fast, reliable on Vercel)
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.log(`[PDF] Generating PDF using serverless PDFKit engine for ${invoice.invoiceNumber}...`);
      pdfBuffer = await generatePdfKitInvoice(invoice, business, template);
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('[PDF] Generated PDF buffer is empty');
      return res.status(500).json({ success: false, message: 'PDF generation returned empty result' });
    }

    // Sanitize filename — remove characters invalid for Windows filenames
    const customerSlug = (invoice.customerSnapshot?.name || 'Customer')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    const filename = `${invoice.invoiceNumber}-${customerSlug}.pdf`;

    console.log(`[PDF] Sending PDF: ${filename} (${pdfBuffer.length} bytes)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.end(pdfBuffer);
  } catch (error) {
    console.error('[PDF] PDF generation failed:', error.message, error.stack);
    // Ensure we return JSON error, not a corrupted binary response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: `PDF generation failed: ${error.message || 'Unknown error'}`,
      });
    }
    next(error);
  }
};

export const shareWhatsApp = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customerName = invoice.customerSnapshot?.name || 'Valued Customer';
    const invoiceNumber = invoice.invoiceNumber;
    const amount = Number(invoice.total || 0).toLocaleString('en-IN');
    const phone = (invoice.customerSnapshot?.phone || '').replace(/[^0-9]/g, '');

    const message = `Hello ${customerName},\n\nPlease find your invoice *${invoiceNumber}* from *${req.business.businessName}*.\n\nTotal Amount: *₹${amount}*\nBalance Due: *₹${Number(invoice.balanceAmount || 0).toLocaleString('en-IN')}*\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}\n\nThank you for your business.`;

    let whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (phone && phone.length >= 10) {
      const fullPhone = phone.length === 10 ? `91${phone}` : phone;
      whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    }

    res.json({
      success: true,
      message,
      whatsappUrl,
      customerPhone: phone,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, businessId: req.business._id },
      { $set: { status } },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, message: `Status updated to ${status}`, invoice });
  } catch (error) {
    next(error);
  }
};
