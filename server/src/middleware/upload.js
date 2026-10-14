import multer from 'multer';
import path from 'path';

// Use memoryStorage so uploads work seamlessly in serverless (e.g. Vercel, AWS Lambda)
// without attempting to write to read-only container file systems (EROFS).
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Supported: PNG, JPG, WEBP, SVG, XLSX, XLS, XLSM, XLSB, CSV`), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

