import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './src/config/db.js';
import { Invoice } from './src/models/Invoice.js';
import { Business } from './src/models/Business.js';
import { InvoiceTemplate } from './src/models/InvoiceTemplate.js';
import { generateInvoiceHtml, generatePdfBuffer } from './src/services/pdfService.js';
import { resolveTemplate } from './src/controllers/templateController.js';
import fs from 'fs';

async function test() {
  await connectDB();
  const invoice = await Invoice.findById('6ac4e77042db02d5a76dfaf2') || await Invoice.findOne();
  if (!invoice) {
    console.log('No invoice found');
    process.exit(0);
  }
  console.log('Found invoice:', invoice.invoiceNumber);
  const business = await Business.findById(invoice.businessId) || {};
  console.log('Business:', business.businessName, 'logo:', business.logo);
  
  let template = (await resolveTemplate(invoice.templateId, invoice.businessId)) || {};
  
  console.log('Generating HTML...');
  const html = await generateInvoiceHtml(invoice, business, template);
  fs.writeFileSync('test_invoice.html', html);
  console.log('HTML written to test_invoice.html, length:', html.length);
  
  console.log('Generating PDF buffer...');
  const start = Date.now();
  const pdfBuffer = await generatePdfBuffer(html, { pageSize: 'A4' });
  console.log('PDF generated in', Date.now() - start, 'ms, size:', pdfBuffer.length, 'bytes');
  fs.writeFileSync('test_invoice.pdf', pdfBuffer);
  console.log('Saved test_invoice.pdf');
  process.exit(0);
}

test().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
