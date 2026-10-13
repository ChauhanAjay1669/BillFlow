import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './src/config/db.js';
import { Invoice } from './src/models/Invoice.js';
import { Business } from './src/models/Business.js';

async function check() {
  await connectDB();
  const inv = await Invoice.findById('6ac4e77042db02d5a76dfaf2');
  console.log('Invoice found:', inv ? {
    id: inv._id.toString(),
    number: inv.invoiceNumber,
    businessId: inv.businessId?.toString(),
    itemsCount: inv.items?.length,
    templateId: inv.templateId
  } : 'NOT FOUND');
  
  if (inv) {
    const biz = await Business.findById(inv.businessId);
    console.log('Business:', biz ? {
      name: biz.businessName,
      logo: biz.logo,
      signature: biz.signature,
      stamp: biz.stamp
    } : 'NOT FOUND');
  }
  process.exit(0);
}
check().catch(console.error);
