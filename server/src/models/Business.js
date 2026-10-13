import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    businessType: {
      type: String,
      default: 'Retail / Trading',
    },
    logo: {
      type: String,
      default: '',
    },
    signature: {
      type: String,
      default: '',
    },
    stamp: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: 'Maharashtra',
    },
    country: {
      type: String,
      default: 'India',
    },
    pincode: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    gstin: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    pan: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    taxRegistrationType: {
      type: String,
      enum: ['Regular', 'Composition', 'Unregistered', 'Consumer'],
      default: 'Regular',
    },
    defaultGstRate: {
      type: Number,
      default: 18,
    },
    primaryColor: {
      type: String,
      default: '#2563EB',
    },
    defaultFont: {
      type: String,
      default: 'Inter',
    },
    defaultTemplateId: {
      type: String,
      default: 'classic',
    },
    invoicePrefix: {
      type: String,
      default: 'INV',
    },
    invoiceStartNumber: {
      type: Number,
      default: 1,
    },
    currentInvoiceCount: {
      type: Number,
      default: 0,
    },
    defaultPaymentTerms: {
      type: String,
      default: 'Due on Receipt',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountType: { type: String, default: 'Current' },
      ifsc: { type: String, default: '' },
      branch: { type: String, default: '' },
      upiId: { type: String, default: '' },
      qrCode: { type: String, default: '' },
      qrType: { type: String, enum: ['dynamic', 'custom', 'none'], default: 'dynamic' },
    },
    termsAndConditions: {
      type: String,
      default: '1. Goods once sold will not be taken back or exchanged.\n2. Invoice payment is due within the stipulated period.\n3. Subject to local jurisdiction only.',
    },
    notes: {
      type: String,
      default: 'Thank you for your business!',
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Business = mongoose.model('Business', businessSchema);
