import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  Users,
  Package,
  FileSpreadsheet,
  Palette,
  ArrowRight,
  TrendingUp,
  Download,
  Share2,
  Sparkles,
} from 'lucide-react';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { business, seedDemoData } = useAuth();
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSeedDemo = async () => {
    await seedDemoData();
    fetchDashboard();
  };

  if (loading) {
    return <LoadingSpinner label="Loading business metrics..." size="lg" />;
  }

  const summary = data?.summary || {
    totalRevenue: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    totalInvoices: 0,
  };

  const monthlyTrend = data?.charts?.monthlyTrend || [];
  const statusBreakdown = data?.charts?.statusBreakdown || { paid: 0, pending: 0, overdue: 0 };
  const recentInvoices = data?.recentInvoices || [];

  const fmt = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: business?.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);

  const maxRevenueInTrend = Math.max(...monthlyTrend.map((m) => m.revenue), 1000);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs animate-fade-in">
        <div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 sm:mt-1">
            Real-time billing analytics for <span className="font-semibold text-slate-700">{business?.businessName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => navigate('/excel-import')}
          >
            Import Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/invoices/new')}
          >
            New Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between interactive-card animate-slide-up stagger-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 truncate">{fmt(summary.totalRevenue)}</div>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> All time billed
            </div>
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between interactive-card animate-slide-up stagger-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paid Amount
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 truncate">{fmt(summary.paidAmount)}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {summary.totalRevenue > 0
                ? `${Math.round((summary.paidAmount / summary.totalRevenue) * 100)}% collected`
                : '0% collected'}
            </div>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between interactive-card animate-slide-up stagger-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Dues
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 truncate">{fmt(summary.pendingAmount)}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">
              Awaiting settlement
            </div>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between interactive-card animate-slide-up stagger-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Amount
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 truncate">{fmt(summary.overdueAmount)}</div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">
              Requires follow-up
            </div>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between interactive-card animate-slide-up stagger-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{summary.totalInvoices}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Active ledger count
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Strip */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto pb-2 sm:pb-3 sm:flex-wrap smooth-scroll">
        <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider px-1.5 shrink-0">
          Quick Actions:
        </span>
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => navigate('/invoices/new')} className="shrink-0">
          New Invoice
        </Button>
        <Button variant="secondary" size="sm" icon={Users} onClick={() => navigate('/customers')} className="shrink-0">
          Add Customer
        </Button>
        <Button variant="secondary" size="sm" icon={Package} onClick={() => navigate('/products')} className="shrink-0">
          Add Product
        </Button>
        <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={() => navigate('/excel-import')} className="shrink-0">
          Import Excel
        </Button>
        <Button variant="secondary" size="sm" icon={Palette} onClick={() => navigate('/designer')} className="shrink-0">
          Design Invoice
        </Button>
      </div>

      {/* Charts & Status Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue Trend (Last 6 Months)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Billed amount performance over time</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              Monthly Growth
            </span>
          </div>

          <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-4 pt-4 sm:pt-6 px-1 sm:px-2">
            {monthlyTrend.map((m, idx) => {
              const heightPercent = Math.max(10, Math.round((m.revenue / maxRevenueInTrend) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 group min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ₹{(m.revenue / 1000).toFixed(0)}k
                  </div>
                  <div className="w-full max-w-[36px] sm:max-w-[42px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-28 sm:h-36">
                    <div
                      className="bg-blue-600 group-hover:bg-blue-700 transition-all duration-300 rounded-t-xl"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-600 truncate">{m.month}</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 -mt-1 hidden sm:inline">{m.invoices} inv</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice Status Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Invoice Status Breakdown</h3>
            <p className="text-xs text-slate-400 mb-4 sm:mb-6">Ratio of paid vs pending obligations</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid Invoices
                  </span>
                  <span className="text-slate-900 font-bold">{statusBreakdown.paid}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${summary.totalInvoices > 0 ? (statusBreakdown.paid / summary.totalInvoices) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Invoices
                  </span>
                  <span className="text-slate-900 font-bold">{statusBreakdown.pending}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${summary.totalInvoices > 0 ? (statusBreakdown.pending / summary.totalInvoices) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Overdue Invoices
                  </span>
                  <span className="text-slate-900 font-bold">{statusBreakdown.overdue}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${summary.totalInvoices > 0 ? (statusBreakdown.overdue / summary.totalInvoices) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 sm:pt-6 border-t border-slate-100 mt-4 sm:mt-6 flex items-center justify-between">
            <span className="text-xs text-slate-500">View detailed reports</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              Reports <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Invoices Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-fade-in">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Invoices</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest generated tax invoices</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
            View All
          </Button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No invoices generated yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              Create your first invoice manually or populate demo data with 1-click.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button variant="primary" size="sm" onClick={() => navigate('/invoices/new')}>
                Create Invoice
              </Button>
              <Button variant="secondary" size="sm" icon={Sparkles} onClick={handleSeedDemo}>
                Load Demo Invoices
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table (md and up) */}
            <div className="hidden md:block overflow-x-auto table-responsive-wrapper">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-6">Invoice No</th>
                    <th className="py-3 px-6">Customer</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        <span
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                          className="cursor-pointer hover:text-blue-600"
                        >
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-700">
                        {inv.customerSnapshot?.name || inv.customerId?.name || 'Customer'}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-6 text-right font-black text-slate-900">
                        ₹{Number(inv.total || 0).toLocaleString('en-IN')}
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

            {/* Mobile Stacked Cards List (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {recentInvoices.map((inv) => (
                <div
                  key={inv._id}
                  onClick={() => navigate(`/invoices/${inv._id}`)}
                  className="p-4 hover:bg-slate-50/70 active:bg-slate-100 transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 hover:text-blue-600">
                      {inv.invoiceNumber}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">
                      {inv.customerSnapshot?.name || inv.customerId?.name || 'Customer'}
                    </span>
                    <span>
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-black text-slate-900">
                      ₹{Number(inv.total || 0).toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/invoices/${inv._id}`);
                      }}
                      className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                    >
                      View Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
