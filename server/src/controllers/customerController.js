import { Customer } from '../models/Customer.js';
import { Invoice } from '../models/Invoice.js';
import { exportDataToExcelBuffer, parseExcelBuffer } from '../services/excelService.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const query = { businessId: req.business._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      customers,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Customer detail stats: total invoices, total billed, total paid, outstanding balance, invoice history
    const invoices = await Invoice.find({
      customerId: customer._id,
      businessId: req.business._id,
    }).sort({ invoiceDate: -1 });

    const totalInvoices = invoices.length;
    const totalBilled = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
    const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
    const outstandingBalance = Math.max(0, totalBilled - totalPaid);

    res.json({
      success: true,
      customer,
      stats: {
        totalInvoices,
        totalBilled,
        totalPaid,
        outstandingBalance,
      },
      invoices,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { name, companyName, email, phone, address, city, state, pincode, gstin, pan, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const customer = await Customer.create({
      businessId: req.business._id,
      name,
      companyName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gstin,
      pan,
      notes,
    });

    res.status(201).json({ success: true, message: 'Customer added successfully', customer });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, businessId: req.business._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer updated successfully', customer });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const exportCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find({ businessId: req.business._id }).lean();
    const exportData = customers.map((c, i) => ({
      'S.No': i + 1,
      Name: c.name,
      'Company Name': c.companyName || '',
      Phone: c.phone || '',
      Email: c.email || '',
      GSTIN: c.gstin || '',
      PAN: c.pan || '',
      Address: c.address || '',
      City: c.city || '',
      State: c.state || '',
      PIN: c.pincode || '',
      Notes: c.notes || '',
    }));

    const buffer = exportDataToExcelBuffer(exportData, 'Customers');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BillFlow_Customers.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const importCustomers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { allRows } = parseExcelBuffer(req.file.buffer || (await import('fs')).readFileSync(req.file.path));

    let importedCount = 0;
    for (const row of allRows) {
      const name = row['Name'] || row['Customer Name'] || row['name'] || row['Customer'];
      if (!name) continue;

      await Customer.create({
        businessId: req.business._id,
        name: String(name).trim(),
        companyName: row['Company Name'] || row['Company'] || '',
        phone: row['Phone'] || row['Mobile'] || '',
        email: row['Email'] || '',
        gstin: row['GSTIN'] || row['GST'] || '',
        pan: row['PAN'] || '',
        address: row['Address'] || '',
        city: row['City'] || '',
        state: row['State'] || '',
        pincode: row['PIN'] || row['Pincode'] || '',
      });
      importedCount++;
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} customers`,
      importedCount,
    });
  } catch (error) {
    next(error);
  }
};
