import express from 'express';
import { getPayments, createPayment, deletePayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getPayments);
router.post('/', createPayment);
router.delete('/:id', deletePayment);

export default router;
