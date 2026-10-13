import express from 'express';
import { seedDemoData } from '../controllers/seedController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.post('/demo', seedDemoData);

export default router;
