import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ label = 'Loading...', size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center w-full">
      <Loader2 className={`${sizes[size] || sizes.md} animate-spin text-blue-600 mb-3`} />
      {label && <p className="text-xs font-medium text-slate-500">{label}</p>}
    </div>
  );
};
