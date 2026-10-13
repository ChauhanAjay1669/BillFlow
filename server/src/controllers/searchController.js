import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';

export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, results: { invoices: [], customers: [], products: [] } });
    }

    const term = q.trim();
    const regex = new RegExp(term, 'i');
    const businessId = req.business._id;

    const [invoices, customers, products] = await Promise.all([
      Invoice.find({
        businessId,
        $or: [
          { invoiceNumber: regex },
          { 'customerSnapshot.name': regex },
          { 'customerSnapshot.phone': regex },
          { 'customerSnapshot.gstin': regex },
        ],
      })
        .limit(5)
        .select('invoiceNumber total status customerSnapshot createdAt'),

      Customer.find({
        businessId,
        $or: [
          { name: regex },
          { companyName: regex },
          { phone: regex },
          { email: regex },
          { gstin: regex },
        ],
      })
        .limit(5)
        .select('name companyName phone email gstin city'),

      Product.find({
        businessId,
        $or: [
          { name: regex },
          { sku: regex },
          { hsnSac: regex },
        ],
      })
        .limit(5)
        .select('name sku sellingPrice gstRate unit'),
    ]);

    res.json({
      success: true,
      results: {
        invoices,
        customers,
        products,
      },
    });
  } catch (error) {
    next(error);
  }
};
