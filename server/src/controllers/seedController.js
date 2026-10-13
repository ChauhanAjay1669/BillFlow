import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Business } from '../models/Business.js';
import { calculateInvoiceTotals } from '../services/calculator.js';

export const seedDemoData = async (req, res, next) => {
  try {
    const business = req.business;
    const userId = req.user._id;

    // 1. Update business details with realistic demo data
    business.businessName = business.businessName && business.businessName !== 'My Company' ? business.businessName : 'Apex Technologies Pvt Ltd';
    business.businessType = 'IT Hardware & Cloud Solutions';
    business.address = 'Tower B, 4th Floor, Godrej Cyber City';
    business.city = 'Pune';
    business.state = 'Maharashtra';
    business.country = 'India';
    business.pincode = '411028';
    business.phone = '+91 98765 43210';
    business.email = 'billing@apextech.in';
    business.website = 'https://apextech.in';
    business.gstin = '27AAACA9999P1Z5';
    business.pan = 'AAACA9999P';
    business.bankDetails = {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0000123',
      branch: 'Kalyani Nagar Branch',
      upiId: 'apextech@hdfcbank',
    };
    business.isOnboarded = true;
    await business.save();

    // 2. Seed 5 Customers
    const customerData = [
      {
        name: 'Rahul Sharma',
        companyName: 'Sharma Infotech Solutions',
        phone: '9822011223',
        email: 'rahul@sharmainfotech.com',
        gstin: '27AABCS1429B1ZB',
        address: 'Plot 42, MIDC Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400093',
      },
      {
        name: 'Priya Sundaram',
        companyName: 'Quantum Byte Labs',
        phone: '9845033445',
        email: 'accounts@quantumbyte.io',
        gstin: '29ABCDE1234F1Z5',
        address: '100 Feet Ring Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka', // Inter-State for Pune business
        pincode: '560038',
      },
      {
        name: 'Amitabh Verma',
        companyName: 'Verma Logistics & Retail',
        phone: '9711099887',
        email: 'finance@vermalogistics.com',
        gstin: '07AAACV4455C1ZY',
        address: 'Barakhamba Road, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi', // Inter-State
        pincode: '110001',
      },
      {
        name: 'Neha Deshmukh',
        companyName: 'Sahyadri Creative Studio',
        phone: '9923055667',
        email: 'neha@sahyadricreative.in',
        gstin: '27AADCS8899K1Z2',
        address: 'FC Road, Deccan Gymkhana',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411004',
      },
      {
        name: 'Karthik Raja',
        companyName: 'Kavery Digital Networks',
        phone: '9444022331',
        email: 'karthik@kaverynetworks.com',
        gstin: '33AABCK7766D1ZX',
        address: 'OMR IT Expressway',
        city: 'Chennai',
        state: 'Tamil Nadu', // Inter-State
        pincode: '600096',
      },
    ];

    const customers = [];
    for (const c of customerData) {
      let cust = await Customer.findOne({ businessId: business._id, name: c.name });
      if (!cust) {
        cust = await Customer.create({ ...c, businessId: business._id });
      }
      customers.push(cust);
    }

    // 3. Seed 10 Products
    const productData = [
      {
        name: 'Dell UltraSharp 27" 4K Monitor',
        sku: 'DEL-U2723QE',
        hsnSac: '847160',
        unit: 'PCS',
        purchasePrice: 42000,
        sellingPrice: 54999,
        gstRate: 18,
      },
      {
        name: 'Logitech MX Master 3S Wireless Mouse',
        sku: 'LOG-MXM3S',
        hsnSac: '847160',
        unit: 'PCS',
        purchasePrice: 7200,
        sellingPrice: 9495,
        gstRate: 18,
      },
      {
        name: 'Mechanical Ergonomic Keyboard RGB',
        sku: 'KB-MECH-PRO',
        hsnSac: '847160',
        unit: 'PCS',
        purchasePrice: 3800,
        sellingPrice: 5200,
        gstRate: 18,
      },
      {
        name: 'Cisco Gigabit 24-Port Managed Switch',
        sku: 'CISCO-CBS250',
        hsnSac: '851762',
        unit: 'PCS',
        purchasePrice: 28000,
        sellingPrice: 36500,
        gstRate: 18,
      },
      {
        name: 'Cat6 UTP Ethernet Cable 305m Roll',
        sku: 'CAB-CAT6-305',
        hsnSac: '854449',
        unit: 'BOX',
        purchasePrice: 6500,
        sellingPrice: 8900,
        gstRate: 18,
      },
      {
        name: 'Enterprise Cloud Backup License (1 Yr)',
        sku: 'SVC-CLD-BCK',
        hsnSac: '998313',
        unit: 'NOS',
        purchasePrice: 12000,
        sellingPrice: 18500,
        gstRate: 18,
      },
      {
        name: 'Network Infrastructure Setup & Audit',
        sku: 'SVC-NET-SETUP',
        hsnSac: '998319',
        unit: 'HRS',
        purchasePrice: 1500,
        sellingPrice: 3500,
        gstRate: 18,
      },
      {
        name: 'Seagate 4TB IronWolf NAS Hard Drive',
        sku: 'ST-4000VN006',
        hsnSac: '847170',
        unit: 'PCS',
        purchasePrice: 8500,
        sellingPrice: 11200,
        gstRate: 18,
      },
      {
        name: 'APC Smart-UPS 1500VA LCD 230V',
        sku: 'APC-SMT1500I',
        hsnSac: '850440',
        unit: 'PCS',
        purchasePrice: 38000,
        sellingPrice: 48900,
        gstRate: 18,
      },
      {
        name: 'Jabra Evolve2 65 Wireless Headset',
        sku: 'JAB-EV265',
        hsnSac: '851830',
        unit: 'PCS',
        purchasePrice: 14000,
        sellingPrice: 18990,
        gstRate: 18,
      },
    ];

    const products = [];
    for (const p of productData) {
      let prod = await Product.findOne({ businessId: business._id, sku: p.sku });
      if (!prod) {
        prod = await Product.create({ ...p, businessId: business._id });
      }
      products.push(prod);
    }

    // 4. Seed 10 Invoices
    const demoInvoicesSpecs = [
      { custIdx: 0, prodIndices: [0, 1], qtys: [2, 2], status: 'Paid', daysAgo: 25 },
      { custIdx: 1, prodIndices: [3, 4], qtys: [1, 2], status: 'Paid', daysAgo: 20 },
      { custIdx: 2, prodIndices: [8, 7], qtys: [1, 4], status: 'Partially Paid', daysAgo: 14, paidFraction: 0.5 },
      { custIdx: 3, prodIndices: [6, 2], qtys: [10, 3], status: 'Pending', daysAgo: 10 },
      { custIdx: 4, prodIndices: [5, 9], qtys: [2, 3], status: 'Pending', daysAgo: 7 },
      { custIdx: 0, prodIndices: [1, 2], qtys: [3, 2], status: 'Overdue', daysAgo: 35, dueAgo: 20 },
      { custIdx: 1, prodIndices: [0, 8], qtys: [1, 1], status: 'Paid', daysAgo: 5 },
      { custIdx: 2, prodIndices: [4, 7], qtys: [3, 2], status: 'Pending', daysAgo: 3 },
      { custIdx: 3, prodIndices: [5], qtys: [1], status: 'Draft', daysAgo: 2 },
      { custIdx: 4, prodIndices: [3, 9, 1], qtys: [1, 2, 2], status: 'Partially Paid', daysAgo: 1, paidFraction: 0.4 },
    ];

    const invoices = [];
    for (let i = 0; i < demoInvoicesSpecs.length; i++) {
      const spec = demoInvoicesSpecs[i];
      const customer = customers[spec.custIdx];
      const invNum = `INV-DEMO-${String(i + 1).padStart(3, '0')}`;

      let invoice = await Invoice.findOne({ businessId: business._id, invoiceNumber: invNum });
      if (invoice) continue;

      const invoiceDate = new Date(Date.now() - spec.daysAgo * 86400000);
      const dueDate = spec.dueAgo
        ? new Date(Date.now() - spec.dueAgo * 86400000)
        : new Date(invoiceDate.getTime() + 15 * 86400000);

      const items = spec.prodIndices.map((pIdx, idx) => {
        const prod = products[pIdx];
        const qty = spec.qtys[idx] || 1;
        return {
          productId: prod._id,
          name: prod.name,
          sku: prod.sku,
          hsnSac: prod.hsnSac,
          unit: prod.unit,
          quantity: qty,
          rate: prod.sellingPrice,
          discount: 0,
          gstRate: prod.gstRate,
        };
      });

      const isInterState = business.state.toLowerCase() !== (customer.state || '').toLowerCase();
      const totals = calculateInvoiceTotals({
        items,
        isInterState,
        shipping: 500,
      });

      let paid = 0;
      if (spec.status === 'Paid') {
        paid = totals.total;
      } else if (spec.status === 'Partially Paid') {
        paid = Math.round(totals.total * (spec.paidFraction || 0.5));
      }

      invoice = await Invoice.create({
        businessId: business._id,
        customerId: customer._id,
        customerSnapshot: {
          name: customer.name,
          companyName: customer.companyName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          gstin: customer.gstin,
        },
        invoiceNumber: invNum,
        invoiceDate,
        dueDate,
        placeOfSupply: customer.state,
        isInterState,
        items: totals.items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        shipping: totals.shipping,
        roundOff: totals.roundOff,
        total: totals.total,
        paidAmount: paid,
        balanceAmount: Math.max(0, totals.total - paid),
        status: spec.status,
        templateId: i % 2 === 0 ? 'classic' : 'modern',
        createdBy: userId,
      });

      // Record payments if paid > 0
      if (paid > 0) {
        await Payment.create({
          businessId: business._id,
          invoiceId: invoice._id,
          amount: paid,
          paymentDate: new Date(invoiceDate.getTime() + 2 * 86400000),
          method: i % 2 === 0 ? 'UPI' : 'Bank Transfer',
          reference: `DEMO-PAY-${i + 1000}`,
        });
      }

      invoices.push(invoice);
    }

    res.json({
      success: true,
      message: 'Demo dataset seeded successfully! Explore your Dashboard, Customers, Products, and Invoices.',
      customersCount: customers.length,
      productsCount: products.length,
      invoicesCount: invoices.length,
    });
  } catch (error) {
    next(error);
  }
};
