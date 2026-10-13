import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  Receipt,
  IndianRupee,
  Plus,
  Eye,
  CreditCard,
} from 'lucide-react';

export const CustomerDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error: showError } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/customers/${id}`);
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        showError(err.message || 'Failed to fetch customer details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <LoadingSpinner label="Loading customer profile..." />;
  }

  if (!data?.customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm">Customer profile not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/customers')} className="mt-4">
          Back to Customers
        </Button>
      </div>
    );
  }

  const { customer, stats, invoices = [] } = data;

  const fmt = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="space-y-6">
      {/* Back Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {customer.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {customer.companyName ? `${customer.companyName} • ` : ''}Customer Ledger & Analytics
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => navigate(`/invoices/new?customerId=${customer._id}`)}
        >
          Create Invoice
        </Button>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{customer.phone || 'No phone provided'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{customer.email || 'No email provided'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address & State</div>
          <div className="flex items-start gap-2 text-xs text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              {customer.address ? <div>{customer.address}</div> : null}
              <div>
                {[customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || 'No address specified'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Identification</div>
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-slate-900">GSTIN:</span>{' '}
            <span className="font-mono">{customer.gstin || 'Not registered'}</span>
          </div>
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-slate-900">PAN:</span>{' '}
            <span className="font-mono">{customer.pan || '-'}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs interactive-card">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
            Total Invoices
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats?.totalInvoices || 0}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs interactive-card">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
            Total Billed
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{fmt(stats?.totalBilled)}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs interactive-card">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
            Total Paid
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">{fmt(stats?.totalPaid)}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs interactive-card">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
            Outstanding Balance
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">{fmt(stats?.outstandingBalance)}</div>
        </div>
      </div>

      {/* Invoices History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Invoice History</h3>
            <p className="text-xs text-slate-400 mt-0.5">All billing records for this customer</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoices generated for this customer yet.
          </div>
        ) : (
          <>
            {/* Mobile Cards (< md) */}
            <div className="divide-y divide-slate-100 md:hidden">
              {invoices.map((inv) => (
                <div key={inv._id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/invoices/${inv._id}`}
                      className="font-bold text-slate-900 hover:text-blue-600 text-sm"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <StatusBadge status={inv.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                      <span>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                      <span>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total / Balance</span>
                      <div className="text-xs font-bold text-slate-900">
                        ₹{Number(inv.total || 0).toLocaleString('en-IN')}{' '}
                        {inv.balanceAmount > 0 && (
                          <span className="text-rose-600 font-semibold text-[11px]">
                            (Due: ₹{Number(inv.balanceAmount).toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/invoices/${inv._id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block table-responsive-wrapper smooth-scroll">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-6">Invoice No</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Due Date</th>
                    <th className="py-3 px-6 text-right">Total</th>
                    <th className="py-3 px-6 text-right">Balance Due</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        <Link to={`/invoices/${inv._id}`} className="hover:text-blue-600">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-right font-bold text-slate-900">
                        ₹{Number(inv.total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-right font-semibold text-rose-600">
                        ₹{Number(inv.balanceAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
