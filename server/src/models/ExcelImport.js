import mongoose from 'mongoose';

const excelImportSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    mapping: {
      type: Map,
      of: String,
      default: {},
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    successfulRows: {
      type: Number,
      default: 0,
    },
    failedRows: {
      type: Number,
      default: 0,
    },
    generatedInvoicesCount: {
      type: Number,
      default: 0,
    },
    rawRows: {
      type: Array,
      default: undefined,
    },
    errors: [
      {
        row: Number,
        field: String,
        message: String,
        data: mongoose.Schema.Types.Mixed,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

export const ExcelImport = mongoose.model('ExcelImport', excelImportSchema);
