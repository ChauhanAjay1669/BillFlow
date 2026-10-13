import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateUpiQrCode } from './qrService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Convert a local image path (like /uploads/logo.jpg) to a base64 data URI.
 * This is essential because Puppeteer renders HTML in-memory without a web server,
 * so relative paths like "/uploads/..." are unreachable. Base64 data URIs are embedded
 * directly in the HTML and always render correctly.
 *
 * Also handles absolute URLs (http/https) and existing data URIs.
 */
const imageToBase64DataUri = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return '';

  // Already a data URI — return as is
  if (imagePath.startsWith('data:')) return imagePath;

  // HTTP/HTTPS URL — we cannot reliably fetch these during server-side PDF generation
  // without making the generation async-network-dependent. For remote URLs we return them
  // as-is and let Puppeteer attempt to load them (it CAN load http URLs).
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Local relative path like /uploads/filename.jpg
  try {
    let localPath;
    if (imagePath.startsWith('/uploads/')) {
      localPath = path.join(UPLOADS_DIR, imagePath.replace('/uploads/', ''));
    } else if (imagePath.startsWith('uploads/')) {
      localPath = path.join(UPLOADS_DIR, imagePath.replace('uploads/', ''));
    } else {
      // Try as absolute path
      localPath = path.resolve(imagePath);
    }

    if (!fs.existsSync(localPath)) {
      console.warn(`[PDF] Image file not found: ${localPath} (original: ${imagePath})`);
      return '';
    }

    const fileBuffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
    };
    const mime = mimeTypes[ext] || 'image/png';
    const base64 = fileBuffer.toString('base64');

    console.log(`[PDF] Converted image to base64: ${imagePath} (${fileBuffer.length} bytes, ${mime})`);
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error(`[PDF] Failed to convert image to base64: ${imagePath}`, err.message);
    return '';
  }
};

/**
 * Generate PDF-ready invoice HTML with all images embedded as base64 data URIs.
 */
export const generateInvoiceHtml = async (invoice, business, template = {}) => {
  const styles = template.styles || {};
  const primaryColor = styles.primaryColor || business.primaryColor || '#2563EB';
  const textColor = styles.textColor || '#0F172A';
  const fontFamily = styles.fontFamily || business.defaultFont || 'Inter';
  const pageSize = template.pageSize || 'A4';
  const isThermal = pageSize === 'Thermal';

  // Convert logo and signature to base64 for Puppeteer rendering
  const logoDataUri = imageToBase64DataUri(business.logo);
  const signatureDataUri = imageToBase64DataUri(business.signature);

  console.log(`[PDF] Generating HTML for invoice ${invoice.invoiceNumber}`);
  console.log(`[PDF] Logo: ${business.logo} → ${logoDataUri ? 'base64 OK' : 'EMPTY/MISSING'}`);
  console.log(`[PDF] Signature: ${business.signature} → ${signatureDataUri ? 'base64 OK' : 'EMPTY/MISSING'}`);

  // Format currency
  const fmt = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: invoice.currency || 'INR',
      minimumFractionDigits: 2,
    }).format(Number(val) || 0);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Generate QR if business has UPI ID or custom QR code uploaded
  let upiQrCodeUrl = '';
  const qrType = business?.bankDetails?.qrType || (business?.bankDetails?.qrCode ? 'custom' : 'dynamic');

  if (qrType === 'custom' && business?.bankDetails?.qrCode) {
    upiQrCodeUrl = imageToBase64DataUri(business.bankDetails.qrCode);
  } else if (qrType !== 'none' && business?.bankDetails?.upiId) {
    upiQrCodeUrl = await generateUpiQrCode({
      upiId: business.bankDetails.upiId,
      businessName: business.businessName,
      amount: invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.total,
      invoiceNumber: invoice.invoiceNumber,
    });
  } else if (qrType !== 'none' && business?.bankDetails?.qrCode) {
    // Fallback to custom uploaded QR if dynamic not configured
    upiQrCodeUrl = imageToBase64DataUri(business.bankDetails.qrCode);
  }

  const itemsRows = (invoice.items || [])
    .map(
      (item, idx) => `
    <tr class="item-row">
      <td class="text-center">${idx + 1}</td>
      <td>
        <div class="item-name">${item.name}</div>
        ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
      </td>
      <td class="text-center">${item.hsnSac || '-'}</td>
      <td class="text-right">${item.quantity} ${item.unit || 'PCS'}</td>
      <td class="text-right">${fmt(item.rate)}</td>
      ${item.discount ? `<td class="text-right">${item.discount}%</td>` : `<td class="text-right">-</td>`}
      <td class="text-right">${item.gstRate}%</td>
      <td class="text-right font-semibold">${fmt(item.amount)}</td>
    </tr>
  `
    )
    .join('');

  if (isThermal) {
    // Thermal receipt layout (80mm width)
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: ${fontFamily}, system-ui, -apple-system, sans-serif;
            font-size: 11px;
            color: #000;
            margin: 0;
            padding: 4px;
            width: 72mm;
            line-height: 1.3;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .divider { border-top: 1px dashed #444; margin: 6px 0; }
          .item-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .item-table th { border-bottom: 1px solid #000; text-align: left; padding: 2px 0; }
          .item-table td { padding: 3px 0; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .qr-img { width: 120px; height: 120px; margin: 6px auto; display: block; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="font-bold" style="font-size: 14px;">${business.businessName || 'INVOICE'}</div>
          <div>${business.address || ''} ${business.city || ''}</div>
          <div>Phone: ${business.phone || '-'}</div>
          ${business.gstin ? `<div>GSTIN: ${business.gstin}</div>` : ''}
        </div>
        <div class="divider"></div>
        <div style="font-size: 10px;">
          <div><b>Invoice:</b> ${invoice.invoiceNumber}</div>
          <div><b>Date:</b> ${formatDate(invoice.invoiceDate)}</div>
          <div><b>Customer:</b> ${invoice.customerSnapshot?.name || 'Walk-in Customer'}</div>
          ${invoice.customerSnapshot?.phone ? `<div><b>Phone:</b> ${invoice.customerSnapshot.phone}</div>` : ''}
        </div>
        <div class="divider"></div>
        <table class="item-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.items || [])
              .map(
                (item) => `
              <tr>
                <td>${item.name}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${item.rate}</td>
                <td class="text-right">${item.amount}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="totals-row"><span>Subtotal:</span><span>${fmt(invoice.subtotal)}</span></div>
        ${invoice.cgst ? `<div class="totals-row"><span>CGST:</span><span>${fmt(invoice.cgst)}</span></div>` : ''}
        ${invoice.sgst ? `<div class="totals-row"><span>SGST:</span><span>${fmt(invoice.sgst)}</span></div>` : ''}
        ${invoice.igst ? `<div class="totals-row"><span>IGST:</span><span>${fmt(invoice.igst)}</span></div>` : ''}
        ${invoice.discount ? `<div class="totals-row"><span>Discount:</span><span>-${fmt(invoice.discount)}</span></div>` : ''}
        ${invoice.roundOff ? `<div class="totals-row"><span>Round Off:</span><span>${invoice.roundOff > 0 ? '+' : ''}${invoice.roundOff}</span></div>` : ''}
        <div class="divider"></div>
        <div class="totals-row font-bold" style="font-size: 13px;"><span>TOTAL:</span><span>${fmt(invoice.total)}</span></div>
        <div class="totals-row"><span>Paid:</span><span>${fmt(invoice.paidAmount)}</span></div>
        <div class="totals-row font-bold"><span>Balance Due:</span><span>${fmt(invoice.balanceAmount)}</span></div>
        ${
          upiQrCodeUrl
            ? `
          <div class="divider"></div>
          <div class="text-center font-bold">Scan to Pay via UPI</div>
          <img src="${upiQrCodeUrl}" class="qr-img" />
        `
            : ''
        }
        <div class="divider"></div>
        <div class="text-center" style="font-size: 9px; margin-top: 6px;">${business.notes || 'Thank you for your visit!'}</div>
      </body>
      </html>
    `;
  }

  // Full A4 / A5 Layout
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Invoice - ${invoice.invoiceNumber}</title>
      <style>
        /* Embed fonts using @import — Puppeteer can load these over the network */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600&family=Poppins:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap');

        @page {
          size: ${pageSize === 'A5' ? 'A5' : 'A4'} portrait;
          margin: 14mm 12mm 14mm 12mm;
        }
        * { box-sizing: border-box; }
        body {
          font-family: '${fontFamily}', 'Inter', 'Segoe UI', system-ui, sans-serif;
          color: ${textColor};
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 2px solid ${primaryColor};
          margin-bottom: 20px;
        }
        .logo-box {
          max-width: 180px;
          max-height: 70px;
          object-fit: contain;
          margin-bottom: 8px;
        }
        .business-title {
          font-size: 22px;
          font-weight: 700;
          color: ${primaryColor};
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        .meta-title {
          font-size: 24px;
          font-weight: 800;
          color: #0F172A;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: right;
          margin-bottom: 6px;
        }
        .badge-status {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        .badge-paid { background: #DCFCE7; color: #166534; }
        .badge-pending { background: #FEF3C7; color: #92400E; }
        .badge-overdue { background: #FEE2E2; color: #991B1B; }
        .badge-partially-paid { background: #E0E7FF; color: #3730A3; }
        .badge-draft { background: #F1F5F9; color: #475569; }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
          background: #F8FAFC;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
        }
        .section-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .customer-name {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 4px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
        }
        .info-label { color: #64748B; }
        .info-val { font-weight: 600; color: #0F172A; }

        /* Items Table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .items-table th {
          background-color: ${primaryColor};
          color: #ffffff;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }
        .items-table td {
          padding: 10px 10px;
          border-bottom: 1px solid #E2E8F0;
          vertical-align: top;
        }
        .item-row:nth-child(even) {
          background-color: #F8FAFC;
        }
        .item-name { font-weight: 600; color: #0F172A; }
        .item-desc { font-size: 11px; color: #64748B; margin-top: 2px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-semibold { font-weight: 600; }

        /* Bottom Section */
        .bottom-section {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .payment-box {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 14px;
          background: #FFFFFF;
        }
        .qr-section {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #CBD5E1;
        }
        .qr-image {
          width: 90px;
          height: 90px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
        }
        .totals-table {
          width: 100%;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 5px 8px;
          text-align: right;
        }
        .totals-table .label {
          color: #64748B;
          text-align: left;
        }
        .totals-table .val {
          font-weight: 600;
          color: #0F172A;
        }
        .grand-total-row {
          background-color: ${primaryColor}15;
          border-top: 2px solid ${primaryColor};
          border-bottom: 2px solid ${primaryColor};
        }
        .grand-total-row td {
          padding: 8px 8px;
          font-size: 15px;
          font-weight: 800;
          color: ${primaryColor};
        }

        /* Signatures & Footer */
        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
          align-items: flex-end;
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
        }
        .terms-box {
          font-size: 10px;
          color: #64748B;
          white-space: pre-line;
        }
        .signature-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
        }
        .signature-wrapper {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 180px;
        }
        .signature-img {
          height: 52px;
          max-width: 160px;
          object-fit: contain;
          margin-bottom: 6px;
          display: block;
        }
        .signature-placeholder {
          height: 52px;
        }
        .signature-line {
          width: 100%;
          border-top: 1.5px solid #64748B;
          margin-bottom: 4px;
        }
        .signatory-label {
          font-size: 11px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 2px;
        }
        .signatory-sub {
          font-size: 10px;
          color: #64748B;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div>
          ${logoDataUri ? `<img src="${logoDataUri}" class="logo-box" alt="Logo" />` : ''}
          <div class="business-title">${business.businessName || 'Business Name'}</div>
          <div style="color: #64748B; font-size: 11px;">
            ${business.address ? `<div>${business.address}, ${business.city || ''} - ${business.pincode || ''}</div>` : ''}
            <div>Phone: ${business.phone || '-'} | Email: ${business.email || '-'}</div>
            ${business.gstin ? `<div><b>GSTIN:</b> ${business.gstin} | <b>PAN:</b> ${business.pan || '-'}</div>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="meta-title">TAX INVOICE</div>
          <div style="font-size: 14px; font-weight: 700; color: ${primaryColor};"># ${invoice.invoiceNumber}</div>
          <div style="margin-top: 4px;">
            <span class="badge-status badge-${(invoice.status || 'pending').toLowerCase().replace(' ', '-')}">
              ${invoice.status || 'Pending'}
            </span>
          </div>
        </div>
      </div>

      <div class="details-grid">
        <div>
          <div class="section-label">Bill To</div>
          <div class="customer-name">${invoice.customerSnapshot?.name || 'Customer'}</div>
          ${invoice.customerSnapshot?.companyName ? `<div style="font-weight: 600; color: #475569;">${invoice.customerSnapshot.companyName}</div>` : ''}
          <div style="color: #64748B; font-size: 11px; margin-top: 2px;">
            ${invoice.customerSnapshot?.address ? `<div>${invoice.customerSnapshot.address}, ${invoice.customerSnapshot.city || ''}</div>` : ''}
            <div>Phone: ${invoice.customerSnapshot?.phone || '-'}</div>
            ${invoice.customerSnapshot?.email ? `<div>Email: ${invoice.customerSnapshot.email}</div>` : ''}
            ${invoice.customerSnapshot?.gstin ? `<div><b>GSTIN:</b> ${invoice.customerSnapshot.gstin}</div>` : ''}
          </div>
        </div>

        <div>
          <div class="section-label">Invoice Details</div>
          <div class="info-row"><span class="info-label">Invoice Date:</span><span class="info-val">${formatDate(invoice.invoiceDate)}</span></div>
          <div class="info-row"><span class="info-label">Due Date:</span><span class="info-val">${formatDate(invoice.dueDate)}</span></div>
          <div class="info-row"><span class="info-label">Place of Supply:</span><span class="info-val">${invoice.placeOfSupply || business.state || '-'}</span></div>
          <div class="info-row"><span class="info-label">Tax Type:</span><span class="info-val">${invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</span></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 35px;">#</th>
            <th>Item / Description</th>
            <th class="text-center" style="width: 75px;">HSN/SAC</th>
            <th class="text-right" style="width: 70px;">Qty</th>
            <th class="text-right" style="width: 90px;">Rate</th>
            <th class="text-right" style="width: 60px;">Disc</th>
            <th class="text-right" style="width: 60px;">GST</th>
            <th class="text-right" style="width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="bottom-section">
        <div>
          <div class="payment-box">
            <div class="section-label">Bank & Payment Information</div>
            ${
              business.bankDetails?.bankName
                ? `
              <div style="font-size: 11px; color: #334155; line-height: 1.5;">
                <div><b>Bank Name:</b> ${business.bankDetails.bankName}</div>
                ${business.bankDetails.accountHolderName ? `<div><b>A/C Name:</b> ${business.bankDetails.accountHolderName}</div>` : ''}
                <div><b>A/C No:</b> ${business.bankDetails.accountNumber}</div>
                ${business.bankDetails.accountType ? `<div><b>A/C Type:</b> ${business.bankDetails.accountType}</div>` : ''}
                <div><b>IFSC Code:</b> ${business.bankDetails.ifsc}</div>
                ${business.bankDetails.branch ? `<div><b>Branch:</b> ${business.bankDetails.branch}</div>` : ''}
                ${business.bankDetails.upiId ? `<div><b>UPI ID:</b> ${business.bankDetails.upiId}</div>` : ''}
              </div>
            `
                : '<div style="color: #94A3B8; font-size: 11px;">Payment via UPI / Bank Transfer</div>'
            }

            ${
              upiQrCodeUrl
                ? `
              <div class="qr-section">
                <img src="${upiQrCodeUrl}" class="qr-image" alt="UPI QR" />
                <div style="font-size: 10px; color: #475569;">
                  <div style="font-weight: 700; color: #0F172A; margin-bottom: 2px;">Scan & Pay via UPI</div>
                  <div>GPay, PhonePe, Paytm, BHIM</div>
                  <div style="color: ${primaryColor}; font-weight: 600; margin-top: 4px;">Due: ${fmt(invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.total)}</div>
                </div>
              </div>
            `
                : ''
            }
          </div>

          ${
            invoice.notes
              ? `
            <div style="margin-top: 12px; font-size: 11px; color: #475569;">
              <b>Note:</b> ${invoice.notes}
            </div>
          `
              : ''
          }
        </div>

        <div>
          <table class="totals-table">
            <tr>
              <td class="label">Taxable Subtotal</td>
              <td class="val">${fmt(invoice.subtotal)}</td>
            </tr>
            ${
              invoice.discount > 0
                ? `
              <tr>
                <td class="label">Total Discount</td>
                <td class="val" style="color: #DC2626;">-${fmt(invoice.discount)}</td>
              </tr>
            `
                : ''
            }
            ${
              invoice.isInterState
                ? `
              <tr>
                <td class="label">Integrated GST (IGST)</td>
                <td class="val">${fmt(invoice.igst)}</td>
              </tr>
            `
                : `
              <tr>
                <td class="label">Central GST (CGST)</td>
                <td class="val">${fmt(invoice.cgst)}</td>
              </tr>
              <tr>
                <td class="label">State GST (SGST)</td>
                <td class="val">${fmt(invoice.sgst)}</td>
              </tr>
            `
            }
            ${
              invoice.shipping > 0
                ? `
              <tr>
                <td class="label">Shipping / Delivery</td>
                <td class="val">${fmt(invoice.shipping)}</td>
              </tr>
            `
                : ''
            }
            ${
              invoice.roundOff !== 0
                ? `
              <tr>
                <td class="label">Round Off</td>
                <td class="val">${invoice.roundOff > 0 ? '+' : ''}${invoice.roundOff}</td>
              </tr>
            `
                : ''
            }
            <tr class="grand-total-row">
              <td class="label" style="color: ${primaryColor}; font-weight: 700;">Grand Total</td>
              <td class="val" style="color: ${primaryColor};">${fmt(invoice.total)}</td>
            </tr>
            <tr>
              <td class="label">Amount Paid</td>
              <td class="val" style="color: #16A34A;">${fmt(invoice.paidAmount)}</td>
            </tr>
            <tr style="border-top: 1px solid #E2E8F0;">
              <td class="label" style="font-weight: 700; color: #0F172A;">Balance Due</td>
              <td class="val" style="font-weight: 800; color: #DC2626; font-size: 13px;">${fmt(invoice.balanceAmount)}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="footer-grid">
        <div class="terms-box">
          <div style="font-weight: 700; color: #475569; margin-bottom: 3px;">Terms & Conditions</div>
          ${invoice.terms || business.termsAndConditions || '1. Goods once sold will not be returned.\\n2. Interest @ 18% p.a. will be charged for delayed payments.'}
        </div>
        <div class="signature-box">
          <div class="signature-wrapper">
            ${signatureDataUri ? `<img src="${signatureDataUri}" class="signature-img" alt="Signature" />` : '<div class="signature-placeholder"></div>'}
            <div class="signature-line"></div>
            <div class="signatory-label">For ${business.businessName || 'Authorized Signatory'}</div>
            <div class="signatory-sub">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate PDF buffer using Puppeteer.
 *
 * Key fixes:
 * 1. Uses 'domcontentloaded' instead of 'networkidle0' to prevent hanging
 *    on unreachable resources (local file paths that don't exist in Puppeteer's context).
 * 2. All images are already embedded as base64 data URIs, so no network requests needed for them.
 * 3. Google Fonts are loaded via @import in CSS, and we wait for them explicitly.
 * 4. Comprehensive error handling with detailed logging.
 */
export const generatePdfBuffer = async (html, options = {}) => {
  let browser;
  try {
    console.log('[PDF] Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();

    // Set a reasonable viewport for consistent rendering
    await page.setViewport({ width: 794, height: 1123 }); // A4 at 96dpi

    // Set content and wait for DOM to be ready
    // Using 'domcontentloaded' instead of 'networkidle0' because:
    // - All images are base64 data URIs (no network needed)
    // - networkidle0 can hang if any resource is unreachable
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for fonts and images to load (give them time but don't block forever)
    await page.evaluate(() => {
      return Promise.race([
        document.fonts?.ready || Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    });

    // Small additional delay to ensure rendering is complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('[PDF] Generating PDF buffer...');
    const pdfResult = await page.pdf({
      format: options.pageSize === 'A5' ? 'A5' : options.pageSize === 'Thermal' ? undefined : 'A4',
      width: options.pageSize === 'Thermal' ? '80mm' : undefined,
      printBackground: true,
      preferCSSPageSize: true,
      margin:
        options.pageSize === 'Thermal'
          ? { top: '3mm', bottom: '3mm', left: '3mm', right: '3mm' }
          : { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    // Convert Uint8Array returned by modern Puppeteer into a Node Buffer
    const pdfBuffer = Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult);

    console.log(`[PDF] PDF generated successfully. Size: ${pdfBuffer.length} bytes`);

    // Validate the PDF starts with correct header
    if (pdfBuffer.length < 100) {
      throw new Error(`Generated PDF is suspiciously small: ${pdfBuffer.length} bytes`);
    }

    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      throw new Error(`Generated file is not a valid PDF. Header: ${header}`);
    }

    return pdfBuffer;
  } catch (err) {
    console.error('[PDF] Error generating PDF:', err.message);
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch((e) => console.error('[PDF] Error closing browser:', e.message));
    }
  }
};
