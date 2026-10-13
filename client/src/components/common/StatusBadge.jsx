import React from 'react';

export const StatusBadge = ({ status }) => {
  const norm = (status || '').toLowerCase().trim();

  const styles = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
    overdue: 'bg-rose-50 text-rose-700 border-rose-200/80',
    'partially paid': 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    draft: 'bg-slate-100 text-slate-700 border-slate-200/80',
    sent: 'bg-blue-50 text-blue-700 border-blue-200/80',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200/80',
  };

  const dots = {
    paid: 'bg-emerald-500',
    pending: 'bg-amber-500',
    overdue: 'bg-rose-500',
    'partially paid': 'bg-indigo-500',
    draft: 'bg-slate-400',
    sent: 'bg-blue-500',
    cancelled: 'bg-gray-400',
  };

  const currentStyle = styles[norm] || 'bg-slate-50 text-slate-600 border-slate-200';
  const currentDot = dots[norm] || 'bg-slate-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentStyle}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />
      {status || 'Unknown'}
    </span>
  );
};
