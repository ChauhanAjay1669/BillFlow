import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { Notification } from '../models/Notification.js';

export const getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, invoiceId } = req.query;
    const query = { businessId: req.business._id };

    if (invoiceId) {
      query.invoiceId = invoiceId;
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('invoiceId', 'invoiceNumber total balanceAmount customerSnapshot status')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      payments,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, method, reference, notes } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ success: false, message: 'Invoice ID and payment amount are required' });
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, businessId: req.business._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payVal = Number(amount);
    if (isNaN(payVal) || payVal <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    const payment = await Payment.create({
      businessId: req.business._id,
      invoiceId: invoice._id,
      amount: payVal,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      method: method || 'UPI',
      reference: reference || '',
      notes: notes || '',
    });

    // Update invoice balance and status
    const newPaid = Math.round((invoice.paidAmount + payVal) * 100) / 100;
    const newBalance = Math.max(0, Math.round((invoice.total - newPaid) * 100) / 100);

    invoice.paidAmount = newPaid;
    invoice.balanceAmount = newBalance;
    if (newBalance === 0) {
      invoice.status = 'Paid';
    } else {
      invoice.status = 'Partially Paid';
    }
    await invoice.save();

    // Trigger notification
    await Notification.create({
      businessId: req.business._id,
      userId: req.user._id,
      title: 'Payment Received',
      message: `Received ₹${payVal} for invoice #${invoice.invoiceNumber} via ${method || 'UPI'}`,
      type: 'success',
      link: `/invoices/${invoice._id}`,
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOneAndDelete({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Revert invoice balances
    const invoice = await Invoice.findOne({ _id: payment.invoiceId, businessId: req.business._id });
    if (invoice) {
      const revertedPaid = Math.max(0, Math.round((invoice.paidAmount - payment.amount) * 100) / 100);
      const revertedBalance = Math.round((invoice.total - revertedPaid) * 100) / 100;
      invoice.paidAmount = revertedPaid;
      invoice.balanceAmount = revertedBalance;
      if (revertedPaid === 0) {
        invoice.status = 'Pending';
      } else if (revertedBalance > 0) {
        invoice.status = 'Partially Paid';
      }
      await invoice.save();
    }

    res.json({ success: true, message: 'Payment removed and invoice balances updated' });
  } catch (error) {
    next(error);
  }
};
