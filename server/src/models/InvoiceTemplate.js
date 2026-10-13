import mongoose from 'mongoose';

const invoiceTemplateSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: false, // null for system default templates
      index: true,
    },
    slug: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    pageSize: {
      type: String,
      enum: ['A4', 'A5', 'Thermal'],
      default: 'A4',
    },
    orientation: {
      type: String,
      enum: ['portrait', 'landscape'],
      default: 'portrait',
    },
    styles: {
      primaryColor: { type: String, default: '#2563EB' },
      secondaryColor: { type: String, default: '#0F172A' },
      accentColor: { type: String, default: '#F1F5F9' },
      textColor: { type: String, default: '#0F172A' },
      fontFamily: { type: String, default: 'Inter' },
      fontSize: { type: String, default: '14px' },
      headerStyle: { type: String, default: 'standard' }, // standard, banner, modern, minimal
      borderStyle: { type: String, default: 'clean' }, // clean, rounded, boxed
      showWatermark: { type: Boolean, default: false },
      watermarkText: { type: String, default: 'PAID' },
    },
    elements: {
      type: Array,
      default: [
        { id: 'logo', name: 'Company Logo', visible: true, order: 1 },
        { id: 'business_info', name: 'Business Information', visible: true, order: 2 },
        { id: 'invoice_meta', name: 'Invoice Number & Date', visible: true, order: 3 },
        { id: 'customer_info', name: 'Customer / Bill To', visible: true, order: 4 },
        { id: 'items_table', name: 'Items Table', visible: true, order: 5 },
        { id: 'totals', name: 'Subtotals & Tax Breakdown', visible: true, order: 6 },
        { id: 'bank_details', name: 'Bank & UPI Details', visible: true, order: 7 },
        { id: 'qr_code', name: 'Payment QR Code', visible: true, order: 8 },
        { id: 'terms', name: 'Terms & Conditions', visible: true, order: 9 },
        { id: 'signature', name: 'Authorized Signatory', visible: true, order: 10 },
        { id: 'footer', name: 'Footer Note', visible: true, order: 11 },
      ],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const InvoiceTemplate = mongoose.model('InvoiceTemplate', invoiceTemplateSchema);
