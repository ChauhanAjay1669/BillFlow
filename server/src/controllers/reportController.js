import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Customer } from '../models/Customer.js';
import { exportDataToExcelBuffer } from '../services/excelService.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const businessId = req.business._id;

    const invoices = await Invoice.find({ businessId });

    let totalRevenue = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    const now = new Date();

    invoices.forEach((inv) => {
      totalRevenue += inv.total || 0;
      paidAmount += inv.paidAmount || 0;
      if (inv.status !== 'Paid' && inv.status !== 'Cancelled') {
        const bal = inv.balanceAmount || 0;
        pendingAmount += bal;
        if (new Date(inv.dueDate) < now) {
          overdueAmount += bal;
        }
      }
    });

    // Recent 5 invoices
    const recentInvoices = await Invoice.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'name phone');

    // Monthly revenue trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.invoiceDate) >= monthStart && new Date(inv.invoiceDate) <= monthEnd
      );

      const rev = monthInvoices.reduce((a, b) => a + (b.total || 0), 0);
      const count = monthInvoices.length;

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: Math.round(rev),
        invoices: count,
      });
    }

    res.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue),
        paidAmount: Math.round(paidAmount),
        pendingAmount: Math.round(pendingAmount),
        overdueAmount: Math.round(overdueAmount),
        totalInvoices: invoices.length,
      },
      charts: {
        monthlyTrend,
        statusBreakdown: {
          paid: invoices.filter((i) => i.status === 'Paid').length,
          pending: invoices.filter((i) => i.status === 'Pending').length,
          overdue: invoices.filter((i) => i.status === 'Overdue' || (new Date(i.dueDate) < now && i.balanceAmount > 0)).length,
          draft: invoices.filter((i) => i.status === 'Draft').length,
          partiallyPaid: invoices.filter((i) => i.status === 'Partially Paid').length,
        },
      },
      recentInvoices,
    });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.business._id;
    const query = { businessId };

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query).populate('customerId', 'name companyName phone');
    const payments = await Payment.find({
      businessId,
      ...(startDate || endDate
        ? {
            paymentDate: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    });

    // GST Breakdown
    const gstSummary = {
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGst: 0,
    };

    invoices.forEach((inv) => {
      gstSummary.taxableAmount += inv.taxableAmount || 0;
      gstSummary.cgst += inv.cgst || 0;
      gstSummary.sgst += inv.sgst || 0;
      gstSummary.igst += inv.igst || 0;
    });
    gstSummary.totalGst = gstSummary.cgst + gstSummary.sgst + gstSummary.igst;

    // Payments by method
    const paymentMethods = {};
    payments.forEach((p) => {
      const m = p.method || 'Other';
      paymentMethods[m] = (paymentMethods[m] || 0) + p.amount;
    });

    // Outstanding by Customer
    const customerDues = {};
    invoices.forEach((inv) => {
      if (inv.balanceAmount > 0) {
        const cName = inv.customerSnapshot?.name || 'Unknown';
        customerDues[cName] = (customerDues[cName] || 0) + inv.balanceAmount;
      }
    });

    const topOutstanding = Object.entries(customerDues)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    res.json({
      success: true,
      gstSummary,
      paymentMethods,
      topOutstanding,
      totalBilled: invoices.reduce((a, b) => a + (b.total || 0), 0),
      totalCollected: payments.reduce((a, b) => a + (b.amount || 0), 0),
      invoiceCount: invoices.length,
      paymentCount: payments.length,
    });
  } catch (error) {
    next(error);
  }
};

export const exportReportExcel = async (req, res, next) => {
  try {
    const { type = 'sales', startDate, endDate } = req.query;
    const businessId = req.business._id;
    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    let exportData = [];
    let filename = 'Report.xlsx';

    if (type === 'sales' || type === 'invoices') {
      const invoices = await Invoice.find({
        businessId,
        ...(startDate || endDate ? { invoiceDate: dateQuery } : {}),
      }).lean();

      exportData = invoices.map((inv, idx) => ({
        '#': idx + 1,
        'Invoice Number': inv.invoiceNumber,
        Customer: inv.customerSnapshot?.name || 'Customer',
        Date: new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
        'Taxable Value': inv.taxableAmount,
        CGST: inv.cgst,
        SGST: inv.sgst,
        IGST: inv.igst,
        Total: inv.total,
        Paid: inv.paidAmount,
        Balance: inv.balanceAmount,
        Status: inv.status,
      }));
      filename = `BillFlow_Sales_Report_${Date.now()}.xlsx`;
    } else if (type === 'payments') {
      const payments = await Payment.find({
        businessId,
        ...(startDate || endDate ? { paymentDate: dateQuery } : {}),
      })
        .populate('invoiceId', 'invoiceNumber')
        .lean();

      exportData = payments.map((p, idx) => ({
        '#': idx + 1,
        'Invoice No': p.invoiceId?.invoiceNumber || '-',
        Date: new Date(p.paymentDate).toLocaleDateString('en-IN'),
        Amount: p.amount,
        Method: p.method,
        Reference: p.reference || '',
        Notes: p.notes || '',
      }));
      filename = `BillFlow_Payment_Report_${Date.now()}.xlsx`;
    }

    const buffer = exportDataToExcelBuffer(exportData, 'Report');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
