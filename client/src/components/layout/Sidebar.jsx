import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  FileSpreadsheet,
  Palette,
  LayoutTemplate,
  CreditCard,
  BarChart3,
  Settings,
  Sparkles,
  LogOut,
  X,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { business, logout, seedDemoData } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose?.();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Excel Import', path: '/excel-import', icon: FileSpreadsheet, badge: 'New' },
    { label: 'Invoice Designer', path: '/designer', icon: Palette },
    { label: 'Templates', path: '/templates', icon: LayoutTemplate },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleDemoClick = async () => {
    const res = await seedDemoData();
    if (res?.success) {
      navigate('/dashboard');
      if (onClose) onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden animate-fade-in cursor-pointer"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 max-w-[85vw] bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-220 cubic-bezier(0.16, 1, 0.3, 1) lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                Bill<span className="text-blue-600">Flow</span>
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest -mt-0.5">
                Pro Invoicing
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu drawer"
            className="p-2 text-slate-400 hover:text-slate-600 lg:hidden rounded-xl hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business Selector / Info */}
        <div className="px-4 py-3 mx-3 my-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {business?.businessName?.slice(0, 2) || 'BF'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-800 truncate">
              {business?.businessName || 'My Business'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {business?.gstin ? `GST: ${business.gstin}` : 'GST Not Configured'}
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Demo Data Callout & Logout */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <button
            onClick={handleDemoClick}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Data</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50/60 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
