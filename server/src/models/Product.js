import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    hsnSac: {
      type: String,
      default: '',
      trim: true,
    },
    unit: {
      type: String,
      default: 'PCS', // PCS, BOX, KGS, MTR, NOS, SET, HRS
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: 0,
    },
    gstRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxType: {
      type: String,
      enum: ['Exclusive', 'Inclusive'],
      default: 'Exclusive',
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ businessId: 1, name: 1 });
productSchema.index({ businessId: 1, sku: 1 });

export const Product = mongoose.model('Product', productSchema);
