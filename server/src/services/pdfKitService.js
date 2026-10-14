import PDFDocument from 'pdfkit';

/**
 * Extract raw image Buffer from a base64 data URI, local path, or URL.
 */
const getImageBuffer = (imageStr) => {
  if (!imageStr || typeof imageStr !== 'string') return null;
  try {
    if (imageStr.startsWith('data:')) {
      const parts = imageStr.split(',');
      if (parts.length > 1) {
        return Buffer.from(parts[1], 'base64');
      }
    }
  } catch (err) {
    console.warn('[PDFKit] Failed to parse image buffer:', err.message);
  }
  return null;
};

/**
 * Format currency amount
 */
const fmtCurrency = (val, currency = 'INR') => {
  const num = Number(val) || 0;
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format date
 */
const fmtDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Generate a clean, modern, professional invoice PDF using PDFKit.
 * 100% pure JavaScript — zero external binaries, zero Chromium, zero Vercel timeout issues.
 */
export const generatePdfKitInvoice = async (invoice, business, template = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const styles = template.styles || {};
      const primaryColor = styles.primaryColor || business.primaryColor || '#2563EB';
      const textColor = styles.textColor || '#0F172A';
      const mutedColor = '#64748B';
      const borderColor = '#E2E8F0';
      const lightBg = '#F8FAFC';

      const pageSize = template.pageSize === 'A5' ? 'A5' : 'A4';
      const isA5 = pageSize === 'A5';

      const doc = new PDFDocument({
        size: pageSize,
        margin: 36,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const contentWidth = pageWidth - 72; // 36pt margins on both sides

      // ----------------------------------------------------
      // HEADER SECTION: Business Branding & Invoice Metadata
      // ----------------------------------------------------
      let curY = 36;

      // Check for business logo
      const logoBuffer = getImageBuffer(business.logo);
      let logoHeight = 0;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 36, curY, { fit: [140, 50] });
          logoHeight = 55;
        } catch (e) {
          console.warn('[PDFKit] Logo rendering skipped:', e.message);
        }
      }

      const businessY = curY + (logoHeight > 0 ? logoHeight + 4 : 0);

      // Business Info (Left column)
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(primaryColor)
        .text(business.businessName || 'Business Name', 36, businessY, { width: contentWidth * 0.55 });

      doc.font('Helvetica').fontSize(8.5).fillColor(mutedColor);

      const addressLines = [
        business.address,
        [business.city, business.state, business.pincode].filter(Boolean).join(', '),
        business.phone ? `Phone: ${business.phone}` : '',
        business.email ? `Email: ${business.email}` : '',
        business.gstin ? `GSTIN: ${business.gstin}` : '',
        business.pan ? `PAN: ${business.pan}` : '',
      ].filter(Boolean);

      addressLines.forEach((line) => {
        doc.text(line, 36, doc.y + 1.5, { width: contentWidth * 0.55 });
      });

      const leftBottomY = doc.y;

      // Invoice Metadata Box (Right column)
      const metaBoxX = 36 + contentWidth * 0.58;
      const metaBoxWidth = contentWidth * 0.42;

      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(primaryColor)
        .text('TAX INVOICE', metaBoxX, curY, { width: metaBoxWidth, align: 'right' });

      doc.font('Helvetica').fontSize(9).fillColor(textColor);

      const metaY = curY + 28;
      doc.roundedRect(metaBoxX, metaY, metaBoxWidth, 76, 6).fillAndStroke(lightBg, borderColor);

      const printMetaRow = (label, val, yOff, isBold = false) => {
        doc.font('Helvetica').fontSize(8.5).fillColor(mutedColor).text(label, metaBoxX + 10, metaY + yOff);
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5)
          .fillColor(textColor)
          .text(val || '-', metaBoxX + 10, metaY + yOff, { width: metaBoxWidth - 20, align: 'right' });
      };

      printMetaRow('Invoice No:', invoice.invoiceNumber, 8, true);
      printMetaRow('Invoice Date:', fmtDate(invoice.invoiceDate), 24);
      printMetaRow('Due Date:', fmtDate(invoice.dueDate), 40);
      printMetaRow('Place of Supply:', invoice.placeOfSupply || business.state || '-', 56);

      // Advance cursor past the header
      curY = Math.max(leftBottomY, metaY + 84) + 14;

      // Decorative divider
      doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(36, curY).lineTo(36 + contentWidth, curY).stroke();
      curY += 10;

      // ----------------------------------------------------
      // BILL TO / CUSTOMER DETAILS
      // ----------------------------------------------------
      const cust = invoice.customerSnapshot || {};
      const billBoxWidth = contentWidth;

      doc.roundedRect(36, curY, billBoxWidth, 54, 4).fillAndStroke(lightBg, borderColor);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(primaryColor)
        .text('BILLED TO (CUSTOMER):', 46, curY + 6);

      const custName = cust.name || 'Valued Customer';
      const custComp = cust.companyName ? ` (${cust.companyName})` : '';
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(textColor)
        .text(`${custName}${custComp}`, 46, curY + 18);

      const custDetails = [
        cust.address,
        [cust.city, cust.state, cust.pincode].filter(Boolean).join(', '),
        cust.phone ? `Phone: ${cust.phone}` : '',
        cust.email ? `Email: ${cust.email}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      doc.font('Helvetica').fontSize(8).fillColor(mutedColor).text(custDetails, 46, curY + 31, { width: billBoxWidth - 20 });

      const taxDetails = [
        cust.gstin ? `GSTIN: ${cust.gstin}` : '',
        cust.pan ? `PAN: ${cust.pan}` : '',
      ]
        .filter(Boolean)
        .join('   ');

      if (taxDetails) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor).text(taxDetails, 46, curY + 42);
      }

      curY += 64;

      // ----------------------------------------------------
      // ITEMS TABLE
      // ----------------------------------------------------
      const colWidths = {
        idx: 24,
        desc: isA5 ? 140 : 200,
        hsn: 46,
        qty: 40,
        rate: 54,
        tax: 38,
        amount: isA5 ? 65 : 85,
      };

      // Header row
      const tableHeaderHeight = 20;
      doc.rect(36, curY, contentWidth, tableHeaderHeight).fill(primaryColor);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      let colX = 36;

      doc.text('#', colX + 4, curY + 6, { width: colWidths.idx, align: 'center' });
      colX += colWidths.idx;

      doc.text('ITEM / DESCRIPTION', colX + 4, curY + 6, { width: colWidths.desc });
      colX += colWidths.desc;

      doc.text('HSN/SAC', colX, curY + 6, { width: colWidths.hsn, align: 'center' });
      colX += colWidths.hsn;

      doc.text('QTY', colX, curY + 6, { width: colWidths.qty, align: 'right' });
      colX += colWidths.qty;

      doc.text('RATE', colX, curY + 6, { width: colWidths.rate, align: 'right' });
      colX += colWidths.rate;

      doc.text('GST %', colX, curY + 6, { width: colWidths.tax, align: 'right' });
      colX += colWidths.tax;

      doc.text('AMOUNT', colX, curY + 6, { width: colWidths.amount, align: 'right' });

      curY += tableHeaderHeight;

      // Item rows
      const items = invoice.items || [];
      items.forEach((item, index) => {
        // Page break check
        if (curY > pageHeight - 140) {
          doc.addPage();
          curY = 36;
        }

        const isEven = index % 2 === 0;
        const rowHeight = item.description ? 26 : 18;

        if (isEven) {
          doc.rect(36, curY, contentWidth, rowHeight).fill('#F8FAFC');
        }

        doc.strokeColor(borderColor).lineWidth(0.5).moveTo(36, curY + rowHeight).lineTo(36 + contentWidth, curY + rowHeight).stroke();

        doc.font('Helvetica').fontSize(8).fillColor(textColor);
        let rx = 36;

        // Index
        doc.text(String(index + 1), rx + 4, curY + 4, { width: colWidths.idx, align: 'center' });
        rx += colWidths.idx;

        // Name & Description
        doc.font('Helvetica-Bold').text(item.name || 'Item', rx + 4, curY + 4, { width: colWidths.desc - 8, lineBreak: false });
        if (item.description) {
          doc.font('Helvetica').fontSize(7).fillColor(mutedColor).text(item.description, rx + 4, curY + 14, { width: colWidths.desc - 8, lineBreak: false });
          doc.font('Helvetica').fontSize(8).fillColor(textColor);
        }
        rx += colWidths.desc;

        // HSN
        doc.text(item.hsnSac || '-', rx, curY + 4, { width: colWidths.hsn, align: 'center' });
        rx += colWidths.hsn;

        // Quantity
        doc.text(`${item.quantity} ${item.unit || 'PCS'}`, rx, curY + 4, { width: colWidths.qty, align: 'right' });
        rx += colWidths.qty;

        // Rate
        doc.text(fmtCurrency(item.rate), rx, curY + 4, { width: colWidths.rate, align: 'right' });
        rx += colWidths.rate;

        // Tax
        doc.text(`${item.gstRate || 0}%`, rx, curY + 4, { width: colWidths.tax, align: 'right' });
        rx += colWidths.tax;

        // Amount
        doc.font('Helvetica-Bold').text(fmtCurrency(item.amount), rx, curY + 4, { width: colWidths.amount, align: 'right' });

        curY += rowHeight;
      });

      curY += 8;

      // ----------------------------------------------------
      // TOTALS & BANK / QR SECTION
      // ----------------------------------------------------
      if (curY > pageHeight - 160) {
        doc.addPage();
        curY = 36;
      }

      const bottomSectionY = curY;
      const leftColWidth = contentWidth * 0.52;
      const rightColWidth = contentWidth * 0.44;
      const rightColX = 36 + contentWidth * 0.56;

      // Bank Details & Payment QR (Left column)
      const bank = business.bankDetails || {};
      const hasBank = Boolean(bank.bankName || bank.accountNumber || bank.upiId);

      if (hasBank) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('BANK & PAYMENT DETAILS:', 36, bottomSectionY);

        doc.font('Helvetica').fontSize(8).fillColor(textColor);
        let by = bottomSectionY + 12;

        if (bank.bankName) {
          doc.text(`Bank: ${bank.bankName}`, 36, by);
          by += 10;
        }
        if (bank.accountNumber) {
          doc.text(`A/C No: ${bank.accountNumber}`, 36, by);
          by += 10;
        }
        if (bank.ifscCode) {
          doc.text(`IFSC Code: ${bank.ifscCode}`, 36, by);
          by += 10;
        }
        if (bank.accountHolder) {
          doc.text(`Beneficiary: ${bank.accountHolder}`, 36, by);
          by += 10;
        }
        if (bank.upiId) {
          doc.font('Helvetica-Bold').fillColor(primaryColor).text(`UPI ID: ${bank.upiId}`, 36, by);
          by += 10;
        }

        // Embed QR Code if available
        const qrBuffer = getImageBuffer(bank.qrCode);
        if (qrBuffer) {
          try {
            doc.image(qrBuffer, 36 + leftColWidth - 65, bottomSectionY + 2, { fit: [60, 60] });
          } catch (e) {
            console.warn('[PDFKit] QR code render skipped:', e.message);
          }
        }
      }

      // Terms & Conditions (under bank details)
      if (business.termsAndConditions) {
        const termsY = bottomSectionY + 68;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedColor).text('TERMS & CONDITIONS:', 36, termsY);
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(mutedColor)
          .text(business.termsAndConditions, 36, termsY + 9, { width: leftColWidth, height: 35 });
      }

      // Totals Table (Right column)
      let totY = bottomSectionY;
      const printTotalLine = (label, val, isGrand = false, isBold = false) => {
        if (isGrand) {
          doc.rect(rightColX - 6, totY - 3, rightColWidth + 6, 20).fill(primaryColor);
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text(label, rightColX, totY + 2);
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text(val, rightColX, totY + 2, { width: rightColWidth, align: 'right' });
          totY += 24;
        } else {
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(mutedColor).text(label, rightColX, totY);
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(textColor).text(val, rightColX, totY, { width: rightColWidth, align: 'right' });
          totY += 13;
        }
      };

      printTotalLine('Subtotal:', fmtCurrency(invoice.subtotal));

      if (invoice.cgst > 0) printTotalLine('CGST:', fmtCurrency(invoice.cgst));
      if (invoice.sgst > 0) printTotalLine('SGST:', fmtCurrency(invoice.sgst));
      if (invoice.igst > 0) printTotalLine('IGST:', fmtCurrency(invoice.igst));
      if (invoice.discount > 0) printTotalLine('Discount:', `-${fmtCurrency(invoice.discount)}`);
      if (invoice.shipping > 0) printTotalLine('Shipping:', fmtCurrency(invoice.shipping));
      if (invoice.roundOff !== 0) printTotalLine('Round Off:', fmtCurrency(invoice.roundOff));

      printTotalLine('TOTAL AMOUNT:', fmtCurrency(invoice.total), true);

      if (invoice.paidAmount > 0) {
        printTotalLine('Amount Paid:', fmtCurrency(invoice.paidAmount), false, true);
      }
      if (invoice.balanceAmount > 0) {
        printTotalLine('Balance Due:', fmtCurrency(invoice.balanceAmount), false, true);
      }

      // Signatory Section (bottom right)
      const signBuffer = getImageBuffer(business.signature);
      const signY = Math.max(totY + 12, bottomSectionY + 95);

      if (signBuffer) {
        try {
          doc.image(signBuffer, rightColX + rightColWidth - 90, signY - 25, { fit: [85, 30] });
        } catch (e) {
          console.warn('[PDFKit] Signature render skipped:', e.message);
        }
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(textColor)
        .text('Authorized Signatory', rightColX, signY + 8, { width: rightColWidth, align: 'right' });

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(mutedColor)
        .text(business.businessName || '', rightColX, signY + 18, { width: rightColWidth, align: 'right' });

      // ----------------------------------------------------
      // FOOTER
      // ----------------------------------------------------
      const footerY = pageHeight - 25;
      doc
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .moveTo(36, footerY - 5)
        .lineTo(36 + contentWidth, footerY - 5)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(mutedColor)
        .text(business.notes || 'Thank you for your business!', 36, footerY, { align: 'center', width: contentWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
