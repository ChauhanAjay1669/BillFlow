import express from 'express';
import {
  uploadAndPreview,
  validateMapping,
  processImportAndGenerate,
  downloadErrorReport,
  downloadZippedInvoices,
} from '../controllers/excelController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);
router.post('/preview', upload.single('file'), uploadAndPreview);
router.post('/validate', validateMapping);
router.post('/generate', processImportAndGenerate);
router.get('/errors/:auditId', downloadErrorReport);
router.post('/zip-invoices', downloadZippedInvoices);

export default router;
