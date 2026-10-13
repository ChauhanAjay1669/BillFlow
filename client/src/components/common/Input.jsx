import React from 'react';

export const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  prefix,
  suffix,
  className = '',
  helperText,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3.5 pointer-events-none text-slate-400 text-sm">
            {prefix}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full min-h-[42px] rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 ease-out focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400 ${
            prefix ? 'pl-9' : ''
          } ${suffix ? 'pr-9' : ''} ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : 'border-slate-300'
          } ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3.5 pointer-events-none text-slate-400 text-sm">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};
