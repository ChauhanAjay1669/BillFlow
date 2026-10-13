import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FileText, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Bill<span className="text-blue-600">Flow</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Modern Billing & Invoicing Engine for Growing Businesses
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-2 sm:px-0">
        <div className="bg-white py-6 sm:py-8 px-5 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/70">
          <Outlet />
        </div>

        {/* Value Prop Badges */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500 font-medium">
          <div className="flex flex-col items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>GST Ready</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Excel Wizard</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>UPI QR & PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
};
