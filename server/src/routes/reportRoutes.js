import express from 'express';
import { getDashboardSummary, getReports, exportReportExcel } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/dashboard', getDashboardSummary);
router.get('/analytics', getReports);
router.get('/export', exportReportExcel);

export default router;
