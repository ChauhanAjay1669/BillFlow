import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { resolveAssetUrl } from '../../api/assetUrl';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Download,
  Printer,
  Share2,
  CreditCard,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Phone,
  Mail,
  Building,
  Calendar,
  AlertCircle,
  CopyCheck,
  Plus,
} from 'lucide-react';

export const InvoiceDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Payment Modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // WhatsApp Share Modal state
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const { business } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) {
        setData(res.data);
        const inv = res.data.invoice;
        const biz = res.data.business || business;
        const tmpl = res.data.template;

        // Determine QR code: custom uploaded QR or dynamic UPI QR
        const qrType = biz?.bankDetails?.qrType || (biz?.bankDetails?.qrCode ? 'custom' : 'dynamic');
        if (qrType === 'custom' && biz?.bankDetails?.qrCode) {
          setQrCodeUrl(resolveAssetUrl(biz.bankDetails.qrCode));
        } else if (qrType !== 'none' && biz?.bankDetails?.upiId) {
          const due = inv.balanceAmount > 0 ? inv.balanceAmount : inv.total;
          const upiUri = `upi://pay?pa=${biz.bankDetails.upiId.trim()}&pn=${encodeURIComponent(
            biz.businessName || 'Business'
          )}&am=${due}&cu=INR&tn=${encodeURIComponent(`Inv ${inv.invoiceNumber}`)}`;

          QRCode.toDataURL(upiUri, { width: 160, margin: 1 })
            .then((url) => setQrCodeUrl(url))
            .catch((err) => console.error('QR Gen error', err));
        } else if (qrType !== 'none' && biz?.bankDetails?.qrCode) {
          setQrCodeUrl(resolveAssetUrl(biz.bankDetails.qrCode));
        } else {
          setQrCodeUrl('');
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      success('Generating high-resolution PDF...');
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
        timeout: 60000, // PDF generation can take time
      });

      const blob = response.data;

      // Check if the response is actually a JSON error disguised as blob
      // (happens when server returns 500 with JSON but responseType is 'blob')
      if (blob.type && blob.type.includes('application/json')) {
        const errorText = await blob.text();
        try {
          const errorJson = JSON.parse(errorText);
          showError(errorJson.message || 'PDF generation failed on server');
        } catch {
          showError('PDF generation failed. Please try again.');
        }
        return;
      }

      // Validate blob size
      if (!blob || blob.size === 0) {
        showError('Downloaded PDF is empty. Please try again.');
        return;
      }

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const customerName = (data.invoice.customerSnapshot?.name || 'Customer')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.invoice.invoiceNumber}-${customerName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF download error:', err);
      showError(err.message || 'Failed to download PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amountNum = Number(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError('Please enter a valid payment amount');
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await api.post('/payments', {
        invoiceId: id,
        amount: amountNum,
        method: paymentMethod,
        reference: paymentReference,
        notes: paymentNotes,
      });

      if (res.data.success) {
        success('Payment recorded successfully');
        setIsPaymentOpen(false);
        setPaymentAmount('');
        setPaymentReference('');
        fetchInvoice();
      }
    } catch (err) {
      showError(err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await api.post(`/invoices/${id}/duplicate`);
      if (res.data.success) {
        success(res.data.message);
        navigate(`/invoices/${res.data.invoice._id}`);
      }
    } catch (err) {
      showError(err.message || 'Failed to duplicate invoice');
    }
  };

  const getWhatsAppMessage = () => {
    if (!data?.invoice) return '';
    const inv = data.invoice;
    const custName = inv.customerSnapshot?.name || 'Valued Customer';
    const amount = Number(inv.total || 0).toLocaleString('en-IN');
    const balance = Number(inv.balanceAmount || 0).toLocaleString('en-IN');
    const dueDate = new Date(inv.dueDate).toLocaleDateString('en-IN');
    return `Hello ${custName},\n\nPlease find your invoice *${inv.invoiceNumber}* from *${business?.businessName}*.\n\nTotal Amount: *₹${amount}*\nBalance Due: *₹${balance}*\nDue Date: ${dueDate}\n\nThank you for your business.`;
  };

  const handleOpenWhatsAppWeb = () => {
    const inv = data.invoice;
    const phone = (inv.customerSnapshot?.phone || '').replace(/[^0-9]/g, '');
    const message = getWhatsAppMessage();
    let url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (phone && phone.length >= 10) {
      const fullPhone = phone.length === 10 ? `91${phone}` : phone;
      url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    }
    window.open(url, '_blank');
  };

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(getWhatsAppMessage());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
    success('Message copied to clipboard');
  };

  if (loading) {
    return <LoadingSpinner label="Loading invoice details..." size="lg" />;
  }

  if (!data?.invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm">Invoice not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/invoices')} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const { invoice, payments = [] } = data;
  const biz = data.business || business;
  const tmpl = data.template || {};
  const primaryColor = tmpl?.styles?.primaryColor || biz?.primaryColor || '#2563EB';
  const fontFamily = tmpl?.styles?.fontFamily || biz?.defaultFont || 'Inter';

  const fmt = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: invoice.currency || 'INR',
      minimumFractionDigits: 2,
    }).format(val || 0);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-16">
      {/* Action Bar (Hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            aria-label="Back to invoice list"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-400">
              Created on {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {invoice.balanceAmount > 0 && (
            <Button
              variant="primary"
              size="sm"
              icon={CreditCard}
              onClick={() => {
                setPaymentAmount(invoice.balanceAmount);
                setIsPaymentOpen(true);
              }}
            >
              Record Payment
            </Button>
          )}

          <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint}>
            Print
          </Button>

          <Button variant="outline" size="sm" icon={Download} onClick={handleDownloadPdf}>
            Download PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Share2}
            onClick={() => setIsWhatsAppOpen(true)}
          >
            WhatsApp
          </Button>

          <Button variant="secondary" size="sm" icon={Copy} onClick={handleDuplicate}>
            Duplicate
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Edit}
            onClick={() => navigate(`/invoices/${invoice._id}/edit`)}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Invoice Document Canvas (Visible both on screen and in print) */}
      <div
        className="print-area bg-white p-4 sm:p-8 lg:p-12 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-lg text-xs leading-relaxed text-slate-800 animate-fade-in"
        style={{ fontFamily: `'${fontFamily}', sans-serif` }}
      >
        {/* Header */}
        <div
          className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 pb-6"
          style={{ borderColor: primaryColor }}
        >
          <div>
            {biz?.logo && (
              <img
                src={resolveAssetUrl(biz.logo)}
                alt="Logo"
                className="h-14 max-w-[200px] object-contain mb-3"
              />
            )}
            <h2
              className="text-xl font-black tracking-tight"
              style={{ color: primaryColor }}
            >
              {biz?.businessName || 'Business Name'}
            </h2>
            <div className="text-slate-500 text-xs space-y-0.5 mt-1">
              {biz?.address && <div>{biz.address}, {biz.city} - {biz.pincode}</div>}
              <div>Phone: {biz?.phone || '-'} | Email: {biz?.email || '-'}</div>
              {biz?.gstin && <div><b>GSTIN:</b> {biz.gstin} | <b>PAN:</b> {biz.pan || '-'}</div>}
            </div>
          </div>

          <div className="sm:text-right">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider">
              TAX INVOICE
            </h3>
            <div
              className="text-sm font-bold mt-1"
              style={{ color: primaryColor }}
            >
              # {invoice.invoiceNumber}
            </div>
            <div className="mt-2 text-xs space-y-0.5 text-slate-600">
              <div><b>Date:</b> {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
              <div><b>Due Date:</b> {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>
              <div><b>Place of Supply:</b> {invoice.placeOfSupply || biz?.state || '-'}</div>
            </div>
          </div>
        </div>

        {/* Customer Snapshot */}
        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Bill To / Buyer
            </div>
            <div className="text-sm font-bold text-slate-900">
              {invoice.customerSnapshot?.name || 'Customer'}
            </div>
            {invoice.customerSnapshot?.companyName && (
              <div className="font-semibold text-slate-700">
                {invoice.customerSnapshot.companyName}
              </div>
            )}
            <div className="text-slate-500 mt-1">
              {invoice.customerSnapshot?.address ? `${invoice.customerSnapshot.address}, ` : ''}
              {[invoice.customerSnapshot?.city, invoice.customerSnapshot?.state, invoice.customerSnapshot?.pincode].filter(Boolean).join(', ')}
            </div>
            <div className="text-slate-500">Phone: {invoice.customerSnapshot?.phone || '-'}</div>
            {invoice.customerSnapshot?.gstin && (
              <div className="font-mono text-slate-700 font-semibold mt-0.5">
                GSTIN: {invoice.customerSnapshot.gstin}
              </div>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Payment Terms & Status
            </div>
            <div>
              <span className="text-slate-500">Tax Type:</span>{' '}
              <b>{invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</b>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>{' '}
              <span className="font-bold text-slate-900">{invoice.status}</span>
            </div>
            <div>
              <span className="text-slate-500">Total Billed:</span>{' '}
              <b>{fmt(invoice.total)}</b>
            </div>
            <div>
              <span className="text-slate-500">Balance Due:</span>{' '}
              <b className="text-rose-600">{fmt(invoice.balanceAmount)}</b>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto table-responsive-wrapper smooth-scroll mb-6">
          <table className="w-full text-left border-collapse text-xs min-w-[580px] sm:min-w-0">
            <thead>
              <tr
                className="text-white font-bold uppercase text-[11px]"
                style={{ backgroundColor: primaryColor }}
              >
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Disc</th>
                <th className="py-2.5 px-3 text-right">GST</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items?.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                  <td className="py-3 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    {item.description && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{item.hsnSac || '-'}</td>
                  <td className="py-3 px-3 text-right font-medium">{item.quantity} {item.unit || 'PCS'}</td>
                  <td className="py-3 px-3 text-right">{fmt(item.rate)}</td>
                  <td className="py-3 px-3 text-right">{item.discount ? `${item.discount}%` : '-'}</td>
                  <td className="py-3 px-3 text-right font-semibold">{item.gstRate}%</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Bank/QR on Left, Totals on Right */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div>
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bank & Payment Details
              </div>
              {biz?.bankDetails?.bankName ? (
                <div className="space-y-1 text-slate-700 text-xs">
                  <div><b>Bank:</b> {biz.bankDetails.bankName}</div>
                  {biz.bankDetails.accountHolderName && <div><b>A/C Name:</b> {biz.bankDetails.accountHolderName}</div>}
                  <div><b>A/C No:</b> {biz.bankDetails.accountNumber}</div>
                  {biz.bankDetails.accountType && <div><b>A/C Type:</b> {biz.bankDetails.accountType}</div>}
                  <div><b>IFSC:</b> {biz.bankDetails.ifsc}</div>
                  {biz.bankDetails.branch && <div><b>Branch:</b> {biz.bankDetails.branch}</div>}
                  {biz.bankDetails.upiId && <div><b>UPI ID:</b> {biz.bankDetails.upiId}</div>}
                </div>
              ) : (
                <div className="text-slate-400 text-xs">Payment via UPI or Bank Transfer</div>
              )}

              {qrCodeUrl && (
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <img src={qrCodeUrl} alt="Bank UPI QR" className="w-24 h-24 rounded-lg border border-slate-200 p-1 object-contain bg-white shrink-0" />
                  <div className="text-xs text-slate-600">
                    <div className="font-bold text-slate-900">Scan & Pay via UPI</div>
                    <div>GPay, PhonePe, Paytm, BHIM</div>
                    <div className="text-blue-600 font-semibold mt-1">
                      Due: {fmt(invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.total)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {invoice.notes && (
              <div className="mt-3 text-xs text-slate-500">
                <b>Note:</b> {invoice.notes}
              </div>
            )}
          </div>

          <div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-semibold text-slate-900">{fmt(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between py-1 text-rose-600 font-medium">
                  <span>Total Discount:</span>
                  <span>-{fmt(invoice.discount)}</span>
                </div>
              )}

              {invoice.isInterState ? (
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-semibold text-slate-900">{fmt(invoice.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Central GST (CGST):</span>
                    <span className="font-semibold text-slate-900">{fmt(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>State GST (SGST):</span>
                    <span className="font-semibold text-slate-900">{fmt(invoice.sgst)}</span>
                  </div>
                </>
              )}

              {invoice.shipping > 0 && (
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Shipping & Delivery:</span>
                  <span className="font-semibold text-slate-900">{fmt(invoice.shipping)}</span>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">
                    {invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}
                  </span>
                </div>
              )}

              <div
                className="flex justify-between py-2.5 border-t-2 border-b-2 text-sm font-black"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <span>Grand Total:</span>
                <span className="text-base">{fmt(invoice.total)}</span>
              </div>

              <div className="flex justify-between py-1 font-semibold text-emerald-700">
                <span>Amount Paid:</span>
                <span>{fmt(invoice.paidAmount)}</span>
              </div>

              <div className="flex justify-between py-1 text-sm font-black text-rose-600 border-t border-slate-200 pt-2">
                <span>Balance Due:</span>
                <span>{fmt(invoice.balanceAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 items-end gap-6">
          <div className="text-[10px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-600 uppercase">Terms & Conditions</div>
            <div className="whitespace-pre-line leading-relaxed">
              {invoice.terms || biz?.termsAndConditions || 'Payment is due upon receipt.'}
            </div>
          </div>

          <div className="sm:text-right flex flex-col sm:items-end">
            <div className="inline-flex flex-col items-center text-center min-w-[180px]">
              {biz?.signature ? (
                <img
                  src={resolveAssetUrl(biz.signature)}
                  alt="Signature"
                  className="h-14 max-w-[160px] object-contain mb-2 block"
                />
              ) : (
                <div className="h-14" />
              )}
              <div className="w-full border-t border-slate-400 pt-1.5">
                <div className="text-xs font-bold text-slate-800">
                  For {biz?.businessName || 'Authorized Signatory'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Card (Hidden when printing) */}
      <div className="no-print bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Recorded Payments</h3>
          {invoice.balanceAmount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => {
                setPaymentAmount(invoice.balanceAmount);
                setIsPaymentOpen(true);
              }}
            >
              Record Payment
            </Button>
          )}
        </div>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No payments recorded against this invoice yet.</p>
        ) : (
          <div className="overflow-x-auto table-responsive-wrapper smooth-scroll">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2.5 px-4">Payment Date</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Reference No</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td className="py-2.5 px-4 text-slate-600">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{p.method}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{p.reference || '-'}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                      {fmt(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Record Payment"
        subtitle={`Invoice #${invoice.invoiceNumber} • Balance Due: ${fmt(invoice.balanceAmount)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Payment Amount (₹)"
            type="number"
            min="1"
            step="any"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder={String(invoice.balanceAmount)}
            required
          />

          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque', 'Other']}
          />

          <Input
            label="Transaction / Reference Number (Optional)"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="e.g. UPI Ref / UTR / Cheque Number"
          />

          <Input
            label="Notes"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Additional remarks..."
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={recordingPayment}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* WhatsApp Share Modal */}
      <Modal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        title="Share Invoice via WhatsApp"
        subtitle={`Send instant invoice details to ${invoice.customerSnapshot?.name || 'Customer'}`}
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs space-y-2">
            <div className="font-bold text-emerald-900">Message Preview:</div>
            <div className="whitespace-pre-line text-emerald-800 font-mono bg-white p-3 rounded-xl border border-emerald-200">
              {getWhatsAppMessage()}
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            Clicking <b>Open WhatsApp</b> will launch WhatsApp Web or the native WhatsApp app with this pre-filled message and customer phone number.
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              icon={copiedMessage ? CopyCheck : Copy}
              onClick={handleCopyWhatsAppMessage}
            >
              {copiedMessage ? 'Copied!' : 'Copy Text'}
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={Share2}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleOpenWhatsAppWeb}
            >
              Open WhatsApp
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
