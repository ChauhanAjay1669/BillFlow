import { Customer } from '../models/Customer.js';
import { Invoice } from '../models/Invoice.js';
import { exportDataToExcelBuffer, parseExcelBuffer } from '../services/excelService.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 100 } = req.query;
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

    const pageLimit = Math.min(Math.max(1, Number(limit) || 100), 1000);
    const pageNum = Math.max(1, Number(page) || 1);

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageLimit)
      .limit(pageLimit);

    res.json({
      success: true,
      customers,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageLimit) || 1,
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

    const fileBuffer =
      req.file.buffer ||
      (req.file.path ? (await import('fs')).readFileSync(req.file.path) : null);

    if (!fileBuffer) {
      return res.status(400).json({ success: false, message: 'Unable to read uploaded file content' });
    }

    const { allRows } = parseExcelBuffer(fileBuffer);

    if (!allRows || allRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data rows found in the uploaded file.',
      });
    }

    // Helper: find value from normalized row by candidate keys
    const getRowValue = (normRow, candidates) => {
      for (const cand of candidates) {
        if (
          normRow[cand] !== undefined &&
          normRow[cand] !== null &&
          String(normRow[cand]).trim() !== ''
        ) {
          return String(normRow[cand]).trim();
        }
      }
      return '';
    };

    // Pre-fetch existing customers to match existing records and avoid duplicates
    const existingCustomers = await Customer.find({ businessId: req.business._id })
      .select('_id name phone email')
      .lean();

    const existingByName = new Map();
    existingCustomers.forEach((c) => {
      if (c.name) existingByName.set(c.name.trim().toLowerCase(), c._id);
    });

    const ops = [];
    const seenNames = new Set();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedEmpty = 0;

    for (const row of allRows) {
      // Build normalized row (lowercase keys stripped of spaces and special chars)
      const normRow = {};
      Object.keys(row).forEach((k) => {
        const normKey = String(k || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        if (normKey) normRow[normKey] = row[k];
      });

      // Name resolution: support First Name + Last Name, Customer Name, or fallback
      const firstName = getRowValue(normRow, ['firstname', 'fname', 'first']);
      const lastName = getRowValue(normRow, ['lastname', 'lname', 'last', 'surname']);
      let name = getRowValue(normRow, [
        'name',
        'customername',
        'customer',
        'clientname',
        'client',
        'partyname',
        'party',
        'fullname',
        'contactname',
        'billingname',
      ]);

      if (!name && (firstName || lastName)) {
        name = `${firstName} ${lastName}`.trim();
      }

      const companyName = getRowValue(normRow, [
        'companyname',
        'company',
        'organization',
        'org',
        'businessname',
        'business',
        'firm',
        'firmname',
      ]);

      const email = getRowValue(normRow, [
        'email',
        'emailaddress',
        'mail',
        'emailid',
      ]).toLowerCase();

      // If still no name, fallback to company name or email prefix
      if (!name) {
        name = companyName || (email ? email.split('@')[0] : '');
      }

      if (!name) {
        skippedEmpty++;
        continue;
      }

      const nameKey = name.toLowerCase();
      if (seenNames.has(nameKey)) {
        // Skip duplicate records within the exact same file
        continue;
      }
      seenNames.add(nameKey);

      const phone = getRowValue(normRow, [
        'phone',
        'phone1',
        'mobile',
        'phonenumber',
        'contact',
        'contactnumber',
        'cell',
        'telephone',
        'mobileno',
        'phone2',
      ]);

      const gstin = getRowValue(normRow, [
        'gstin',
        'gst',
        'gstno',
        'taxid',
        'vat',
      ]).toUpperCase();

      const pan = getRowValue(normRow, [
        'pan',
        'panno',
        'pannumber',
      ]).toUpperCase();

      const address = getRowValue(normRow, [
        'address',
        'street',
        'address1',
        'streetaddress',
        'location',
        'addressline1',
        'addressline2',
      ]);

      const city = getRowValue(normRow, ['city', 'town', 'district']);
      const state = getRowValue(normRow, ['state', 'province', 'region']);
      const pincode = getRowValue(normRow, [
        'pincode',
        'pin',
        'postalcode',
        'zip',
        'zipcode',
        'postcode',
      ]);

      const country = getRowValue(normRow, ['country', 'nation']);
      const website = getRowValue(normRow, ['website', 'web', 'site']);
      const notesField = getRowValue(normRow, ['notes', 'note', 'description', 'remarks', 'comment']);
      const extraNotes = [
        country ? `Country: ${country}` : '',
        website ? `Website: ${website}` : '',
        notesField,
      ]
        .filter(Boolean)
        .join(' | ');

      const customerData = {
        name,
        companyName,
        phone,
        email,
        gstin,
        pan,
        address,
        city,
        state,
        pincode,
        notes: extraNotes,
      };

      if (existingByName.has(nameKey)) {
        ops.push({
          updateOne: {
            filter: { _id: existingByName.get(nameKey), businessId: req.business._id },
            update: { $set: customerData },
          },
        });
        updatedCount++;
      } else {
        ops.push({
          insertOne: {
            document: {
              ...customerData,
              businessId: req.business._id,
            },
          },
        });
        addedCount++;
      }
    }

    if (ops.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid customers found in file. Ensure headers include Name, First Name, Company, or Phone.',
      });
    }

    // High performance bulk write in a single DB round-trip
    await Customer.bulkWrite(ops);

    const totalProcessed = ops.length;
    res.json({
      success: true,
      message: `Successfully processed ${totalProcessed} customers (${addedCount} added, ${updatedCount} updated)`,
      importedCount: totalProcessed,
      addedCount,
      updatedCount,
      skippedEmpty,
    });
  } catch (error) {
    console.error('[Customer Import] Error:', error);
    next(error);
  }
};
