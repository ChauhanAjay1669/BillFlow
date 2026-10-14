import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  Printer,
  Copy,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  MoreVertical,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const { business } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await api.get(`/invoices?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.invoices);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleDeleteConfirm = async () => {
    try {
      const res = await api.delete(`/invoices/${selectedInvoice._id}`);
      if (res.data.success) {
        success('Invoice deleted successfully');
        setIsDeleteOpen(false);
        fetchInvoices();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete invoice');
    }
  };

  const handleDuplicate = async (invoice, e) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/invoices/${invoice._id}/duplicate`);
      if (res.data.success) {
        success(res.data.message);
        fetchInvoices();
      }
    } catch (err) {
      showError(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDownloadPdf = async (invoice, e) => {
    e.stopPropagation();
    try {
      success('Preparing PDF download...');
      const response = await api.get(`/invoices/${invoice._id}/pdf`, { responseType: 'blob' });
      const blob = response.data;

      // Check if server returned a JSON error disguised as a blob
      if (blob.type && blob.type.includes('application/json')) {
        const errorText = await blob.text();
        try {
          const errJson = JSON.parse(errorText);
          showError(errJson.message || 'Failed to generate PDF');
        } catch {
          showError('Failed to generate PDF');
        }
        return;
      }

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const customerName = (invoice.customerSnapshot?.name || 'Customer')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}-${customerName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('PDF downloaded successfully!');
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to generate PDF');
    }
  };

  const handleShareWhatsApp = async (invoice, e) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/invoices/${invoice._id}/whatsapp`);
      if (res.data.success && res.data.whatsappUrl) {
        window.open(res.data.whatsappUrl, '_blank');
      }
    } catch (err) {
      showError(err.message || 'Failed to generate WhatsApp share link');
    }
  };

  const handleBatchZip = async () => {
    if (selectedIds.length === 0) return;
    try {
      success('Generating bundle zip of selected invoices...');
      const response = await api.post(
        '/excel/zip-invoices',
        { invoiceIds: selectedIds },
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BillFlow_Invoices_Bundle_${Date.now()}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError(err.message || 'Failed to zip invoices');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((i) => i._id));
    }
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const statusTabs = [
    { label: 'All Invoices', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Partially Paid', value: 'Partially Paid' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Overdue', value: 'Overdue' },
    { label: 'Draft', value: 'Draft' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, track, print, and share GST compliant invoices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="md"
              icon={Download}
              onClick={handleBatchZip}
            >
              Download Selected ({selectedIds.length}) ZIP
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => navigate('/invoices/new')}
          >
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4 animate-fade-in">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 smooth-scroll">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 min-h-[36px] ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number, customer name, phone..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:bg-white transition-colors min-h-[40px]"
            />
          </div>

          <div className="text-xs font-semibold text-slate-500 self-end sm:self-auto">
            Showing <span className="text-slate-900">{invoices.length}</span> invoices
          </div>
        </div>
      </div>

      {/* Invoice Table & Mobile Cards */}
      {loading ? (
        <LoadingSpinner label="Loading invoice history..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Create a manual invoice or import orders via the Excel wizard."
          actionLabel="Create First Invoice"
          onAction={() => navigate('/invoices/new')}
        />
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-fade-in">
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto table-responsive-wrapper">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === invoices.length && invoices.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Invoice No</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    onClick={() => navigate(`/invoices/${inv._id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(inv._id)}
                        onChange={(e) => handleToggleSelect(inv._id, e)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-blue-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {inv.customerSnapshot?.name || inv.customerId?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      ₹{Number(inv.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      ₹{Number(inv.balanceAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleDownloadPdf(inv, e)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleShareWhatsApp(inv, e)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Share WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDuplicate(inv, e)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/invoices/${inv._id}/edit`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(inv);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {invoices.map((inv) => (
              <div
                key={inv._id}
                onClick={() => navigate(`/invoices/${inv._id}`)}
                className="p-4 hover:bg-slate-50/70 active:bg-slate-100 transition-colors cursor-pointer space-y-2.5"
              >
                {/* Header row: Checkbox + Number + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(inv._id)}
                      onChange={(e) => handleToggleSelect(inv._id, e)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-bold text-sm text-slate-900 hover:text-blue-600">
                      {inv.invoiceNumber}
                    </span>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>

                {/* Customer and Date */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {inv.customerSnapshot?.name || inv.customerId?.name || 'Customer'}
                  </span>
                  <span>
                    {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>

                {/* Amounts: Total & Balance */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Total Amount</span>
                    <span className="font-black text-sm text-slate-900">
                      ₹{Number(inv.total || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {inv.balanceAmount > 0 && (
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] block">Balance Due</span>
                      <span className="font-bold text-sm text-rose-600">
                        ₹{Number(inv.balanceAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Quick Action Strip */}
                <div
                  className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => handleDownloadPdf(inv, e)}
                    className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleShareWhatsApp(inv, e)}
                    className="p-2 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Share WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(inv, e)}
                    className="p-2 text-slate-500 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Duplicate Invoice"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/invoices/${inv._id}/edit`)}
                    className="p-2 text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Edit Invoice"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setIsDeleteOpen(true);
                    }}
                    className="p-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice?"
        message={`Are you sure you want to permanently delete invoice ${selectedInvoice?.invoiceNumber}? Associated payment logs will also be removed.`}
        confirmLabel="Yes, Delete"
      />
    </div>
  );
};
