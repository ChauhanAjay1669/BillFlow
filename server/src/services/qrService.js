import QRCode from 'qrcode';

export const generateUpiQrCode = async ({ upiId, businessName, amount, invoiceNumber }) => {
  if (!upiId) return '';
  try {
    const cleanUpi = upiId.trim();
    const cleanName = (businessName || 'Business').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const cleanNote = `Inv ${invoiceNumber || ''}`.trim();
    const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}&am=${amount || 0}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;

    const dataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return dataUrl;
  } catch (err) {
    console.error('Error generating UPI QR:', err);
    return '';
  }
};
