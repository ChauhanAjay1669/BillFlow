import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  FileText,
  IndianRupee,
  Receipt,
  Download,
} from 'lucide-react';

export const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'UPI',
    reference: '',
    notes: '',
  });

  const { success, error: showError } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, invRes] = await Promise.all([
        api.get('/payments'),
        api.get('/invoices?status=Pending&limit=100'),
      ]);

      if (payRes.data.success) setPayments(payRes.data.payments);
      if (invRes.data.success) setInvoices(invRes.data.invoices);
    } catch (err) {
      showError(err.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      invoiceId: invoices[0]?._id || '',
      amount: invoices[0]?.balanceAmount || '',
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'UPI',
      reference: '',
      notes: '',
    });
    setIsAddOpen(true);
  };

  const handleInvoiceSelect = (invId) => {
    const inv = invoices.find((i) => i._id === invId);
    setFormData((prev) => ({
      ...prev,
      invoiceId: invId,
      amount: inv ? inv.balanceAmount : prev.amount,
    }));
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/payments', formData);
      if (res.data.success) {
        success('Payment recorded successfully');
        setIsAddOpen(false);
        fetchData();
      }
    } catch (err) {
      showError(err.message || 'Operation failed');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await api.delete(`/payments/${selectedPayment._id}`);
      if (res.data.success) {
        success('Payment removed and balance reverted');
        setIsDeleteOpen(false);
        fetchData();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete payment');
    }
  };

  const fmt = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(val || 0);

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Payments Received
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track transactions, settlements, and payment methods.
          </p>
        </div>

        <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
          Record Payment
        </Button>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 interactive-card">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Collections Recorded
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {fmt(totalCollected)}
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total: <span className="text-slate-900 font-bold">{payments.length}</span> payment logs
        </div>
      </div>

      {/* Payments Table / Cards */}
      {loading ? (
        <LoadingSpinner label="Loading payment logs..." />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded yet"
          description="Record full or partial receipts against outstanding invoices."
          actionLabel="Record Payment"
          onAction={handleOpenAdd}
        />
      ) : (
        <>
          {/* Mobile Payment Cards (< md) */}
          <div className="space-y-3 md:hidden">
            {payments.map((p) => (
              <div
                key={p._id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3 interactive-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {p.invoiceId ? (
                        <Link
                          to={`/invoices/${p.invoiceId._id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 text-sm"
                        >
                          #{p.invoiceId.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-900 text-sm">Invoice</span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[10px]">
                        {p.method}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {p.invoiceId?.customerSnapshot?.name || 'Customer'}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPayment(p);
                      setIsDeleteOpen(true);
                    }}
                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-xl border border-slate-200 transition-colors"
                    title="Delete and revert balance"
                    aria-label="Delete payment log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date & Ref</span>
                    <span className="text-slate-600">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {p.reference && (
                      <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                        Ref: {p.reference}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount</span>
                    <span className="font-black text-emerald-600 text-base">{fmt(p.amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Payments Table (>= md) */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="table-responsive-wrapper smooth-scroll">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-6">Payment Date</th>
                    <th className="py-3.5 px-6">Invoice #</th>
                    <th className="py-3.5 px-6">Customer</th>
                    <th className="py-3.5 px-6">Method</th>
                    <th className="py-3.5 px-6">Reference / UTR</th>
                    <th className="py-3.5 px-6 text-right">Amount</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 text-slate-600">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        {p.invoiceId ? (
                          <Link
                            to={`/invoices/${p.invoiceId._id}`}
                            className="hover:text-blue-600"
                          >
                            {p.invoiceId.invoiceNumber}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-700">
                        {p.invoiceId?.customerSnapshot?.name || 'Customer'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[11px]">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">
                        {p.reference || '-'}
                      </td>
                      <td className="py-3.5 px-6 text-right font-black text-emerald-600 text-sm">
                        {fmt(p.amount)}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete and revert balance"
                          aria-label="Delete payment log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Payment Receipt"
        subtitle="Log a collection against an existing pending invoice"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <Select
            label="Select Pending Invoice *"
            value={formData.invoiceId}
            onChange={(e) => handleInvoiceSelect(e.target.value)}
            required
            options={invoices.map((inv) => ({
              value: inv._id,
              label: `#${inv.invoiceNumber} - ${inv.customerSnapshot?.name || 'Customer'} (Due: ₹${inv.balanceAmount})`,
            }))}
          />

          <Input
            label="Payment Amount (₹) *"
            type="number"
            min="1"
            step="any"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="5000"
            required
          />

          <Input
            label="Payment Date *"
            type="date"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            required
          />

          <Select
            label="Payment Method *"
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
            options={['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque', 'Other']}
          />

          <Input
            label="Reference Number / Transaction ID"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="e.g. UTR / UPI Ref / Cheque No"
          />

          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional remarks..."
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Payment Log
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment Record?"
        message={`Deleting this ₹${selectedPayment?.amount} payment will increase the unpaid balance on invoice ${selectedPayment?.invoiceId?.invoiceNumber}.`}
        confirmLabel="Yes, Delete & Revert"
      />
    </div>
  );
};
