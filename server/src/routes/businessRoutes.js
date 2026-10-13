import express from 'express';
import { getBusiness, updateBusiness, uploadAsset, completeOnboarding } from '../controllers/businessController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);
router.get('/', getBusiness);
router.put('/', updateBusiness);
router.post('/upload', upload.single('file'), uploadAsset);
router.post('/onboarding', completeOnboarding);

export default router;
