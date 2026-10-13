import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Search, FileText, Users, Package, ArrowRight, Loader2, X } from 'lucide-react';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ invoices: [], customers: [], products: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({ invoices: [], customers: [], products: [] });

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ invoices: [], customers: [], products: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        if (res.data.success) {
          setResults(res.data.results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url) => {
    onClose();
    navigate(url);
  };

  if (!isOpen) return null;

  const totalResults =
    (results.invoices?.length || 0) +
    (results.customers?.length || 0) +
    (results.products?.length || 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl z-10 overflow-hidden flex flex-col max-h-[75vh] animate-scale-in">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoices, customers, products, GSTIN, phone..."
            className="w-full text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-4">
          {!query.trim() && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type to search across all invoices, customers, and inventory items.
            </div>
          )}

          {query.trim() && !loading && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching records found for "{query}".
            </div>
          )}

          {/* Invoices */}
          {results.invoices?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Invoices
              </div>
              <div className="space-y-1">
                {results.invoices.map((inv) => (
                  <div
                    key={inv._id}
                    onClick={() => handleSelect(`/invoices/${inv._id}`)}
                    className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 rounded-xl cursor-pointer group transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {inv.customerSnapshot?.name} &bull; ₹{inv.total?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {results.customers?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Customers
              </div>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => handleSelect(`/customers/${c._id}`)}
                    className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 rounded-xl cursor-pointer group transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.phone || c.email || 'No contact'} {c.gstin ? `&bull; GST: ${c.gstin}` : ''}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {results.products?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Products
              </div>
              <div className="space-y-1">
                {results.products.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => handleSelect(`/products`)}
                    className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 rounded-xl cursor-pointer group transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        SKU: {p.sku || '-'} &bull; ₹{p.sellingPrice?.toLocaleString('en-IN')} (GST {p.gstRate}%)
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigation: Click or Enter</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
