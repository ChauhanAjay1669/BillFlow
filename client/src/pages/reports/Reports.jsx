import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  BarChart3,
  Download,
  Calendar,
  IndianRupee,
  Receipt,
  Users,
  CreditCard,
  PieChart,
} from 'lucide-react';

export const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month'); // 'today' | 'week' | 'month' | 'year' | 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { business } = useAuth();
  const { success, error: showError } = useNotification();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (dateFilter !== 'all') {
        const now = new Date();
        let start = new Date();

        if (dateFilter === 'today') {
          start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
          start.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          start.setDate(1);
        } else if (dateFilter === 'year') {
          start.setMonth(0, 1);
        }

        params.append('startDate', start.toISOString());
        params.append('endDate', now.toISOString());
      } else if (startDate && endDate) {
        params.append('startDate', new Date(startDate).toISOString());
        params.append('endDate', new Date(endDate).toISOString());
      }

      const res = await api.get(`/reports/analytics?${params.toString()}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateFilter]);

  const handleExportExcel = async (type = 'sales') => {
    try {
      success('Preparing report export...');
      const response = await api.get(`/reports/export?type=${type}`, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BillFlow_${type}_Report_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError('Failed to export report');
    }
  };

  const fmt = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(val || 0);

  const gst = data?.gstSummary || { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0 };
  const methods = data?.paymentMethods || {};
  const topDues = data?.topOutstanding || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Financial & Tax Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            GST liability breakdowns, sales performance, and payment reconciliation.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => handleExportExcel('sales')}
            className="justify-center"
          >
            Export Sales
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => handleExportExcel('payments')}
            className="justify-center"
          >
            Export Payments
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-1.5 sm:gap-2 overflow-x-auto smooth-scroll -mx-1 sm:mx-0">
        <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">
          Period:
        </span>
        {[
          { label: 'This Month', val: 'month' },
          { label: 'Last 7 Days', val: 'week' },
          { label: 'Today', val: 'today' },
          { label: 'This Year', val: 'year' },
          { label: 'All Time', val: 'all' },
        ].map((f) => (
          <button
            key={f.val}
            onClick={() => setDateFilter(f.val)}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              dateFilter === f.val
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Compiling financial analytics..." />
      ) : (
        <>
          {/* Top High-level stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs interactive-card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
                Total Billed
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">{fmt(data?.totalBilled)}</div>
              <div className="text-[11px] text-slate-500 mt-1">{data?.invoiceCount || 0} invoices generated</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs interactive-card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
                Total Collected
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">{fmt(data?.totalCollected)}</div>
              <div className="text-[11px] text-slate-500 mt-1">{data?.paymentCount || 0} payment entries</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs interactive-card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
                Total GST Liability
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-600">{fmt(gst.totalGst)}</div>
              <div className="text-[11px] text-slate-500 mt-1">CGST + SGST + IGST combined</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs interactive-card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
                Net Taxable Turnover
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">{fmt(gst.taxableAmount)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Pre-tax invoice base total</div>
            </div>
          </div>

          {/* GST Tax Breakdown Card */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">GST Summary Breakdown</h3>
                <p className="text-xs text-slate-400">Intra-State (CGST + SGST) vs Inter-State (IGST) totals</p>
              </div>
              <span className="self-start sm:self-auto text-[11px] sm:text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                Tax Audit Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Taxable Value</span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">{fmt(gst.taxableAmount)}</div>
              </div>

              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Central GST (CGST)</span>
                <div className="text-base sm:text-lg font-black text-blue-600 mt-1">{fmt(gst.cgst)}</div>
              </div>

              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">State GST (SGST)</span>
                <div className="text-base sm:text-lg font-black text-blue-600 mt-1">{fmt(gst.sgst)}</div>
              </div>

              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Integrated GST (IGST)</span>
                <div className="text-base sm:text-lg font-black text-purple-600 mt-1">{fmt(gst.igst)}</div>
              </div>
            </div>
          </div>

          {/* 2-Column: Payment Methods & Outstanding Dues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Collections by Payment Method</h3>
              <div className="space-y-3 pt-2">
                {Object.keys(methods).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No payment entries in this period.</p>
                ) : (
                  Object.entries(methods).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                      <span className="text-xs font-bold text-slate-800">{method}</span>
                      <span className="text-xs font-black text-emerald-600">{fmt(amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Outstanding Dues */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Highest Outstanding Receivables</h3>
              <div className="space-y-2 pt-2">
                {topDues.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No outstanding debts.</p>
                ) : (
                  topDues.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl text-xs"
                    >
                      <span className="font-bold text-slate-800 truncate">{item.name}</span>
                      <span className="font-black text-rose-600">{fmt(item.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
