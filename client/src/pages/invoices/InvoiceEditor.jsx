import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import {
  Plus,
  Trash2,
  ArrowLeft,
  FileText,
  User,
  Eye,
  Check,
  Download,
  Share2,
  Sparkles,
} from 'lucide-react';

export const InvoiceEditor = () => {
  const { id } = useParams(); // If present, edit mode
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const { business } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(business?.state || 'Maharashtra');
  const [taxMode, setTaxMode] = useState('auto'); // 'auto' | 'intra' | 'inter'
  const [items, setItems] = useState([
    {
      productId: '',
      name: '',
      sku: '',
      hsnSac: '',
      quantity: 1,
      unit: 'PCS',
      rate: 0,
      discount: 0,
      discountType: 'percentage',
      gstRate: 18,
    },
  ]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState('fixed');
  const [shipping, setShipping] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState(business?.notes || 'Thank you for your business!');
  const [terms, setTerms] = useState(business?.termsAndConditions || '');
  const [templateId, setTemplateId] = useState(business?.defaultTemplateId || 'classic');
  const [templateList, setTemplateList] = useState([]);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load initial dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [custRes, prodRes, tmplRes] = await Promise.all([
          api.get('/customers?limit=100'),
          api.get('/products?limit=100'),
          api.get('/templates'),
        ]);

        if (custRes.data.success) setCustomers(custRes.data.customers);
        if (prodRes.data.success) setProducts(prodRes.data.products);
        if (tmplRes.data.success) {
          const sys = tmplRes.data.systemTemplates || [];
          const custom = tmplRes.data.customTemplates || [];
          const allOptions = [
            ...sys.map((t) => ({
              label: `${t.name} (${t.styles?.primaryColor || '#2563EB'})`,
              value: t.slug,
            })),
            ...custom.map((t) => ({
              label: `★ ${t.name} [Custom] (${t.styles?.primaryColor || '#2563EB'})`,
              value: t._id,
            })),
          ];
          setTemplateList(allOptions);

          if (!id) {
            const defCustom = custom.find((t) => t.isDefault);
            if (defCustom) {
              setTemplateId(defCustom._id);
            } else if (business?.defaultTemplateId) {
              setTemplateId(business.defaultTemplateId);
            }
          }
        }

        // If editing existing invoice
        if (id) {
          const invRes = await api.get(`/invoices/${id}`);
          if (invRes.data.success) {
            const inv = invRes.data.invoice;
            setCustomerId(inv.customerId?._id || inv.customerId || '');
            setInvoiceNumber(inv.invoiceNumber);
            setInvoiceDate(new Date(inv.invoiceDate).toISOString().split('T')[0]);
            setDueDate(new Date(inv.dueDate).toISOString().split('T')[0]);
            setPlaceOfSupply(inv.placeOfSupply || business?.state);
            setTaxMode(inv.isInterState ? 'inter' : 'intra');
            setItems(
              inv.items.map((it) => ({
                productId: it.productId || '',
                name: it.name,
                sku: it.sku || '',
                hsnSac: it.hsnSac || '',
                quantity: it.quantity,
                unit: it.unit || 'PCS',
                rate: it.rate,
                discount: it.discount || 0,
                discountType: it.discountType || 'percentage',
                gstRate: it.gstRate || 18,
              }))
            );
            setOverallDiscount(inv.discount || 0);
            setShipping(inv.shipping || 0);
            setPaidAmount(inv.paidAmount || 0);
            setNotes(inv.notes || '');
            setTerms(inv.terms || '');
            setTemplateId(inv.templateId || 'classic');
          }
        } else {
          // New Invoice: Auto-generate invoice number format preview
          const nextCount = (business?.currentInvoiceCount || 0) + 1;
          setInvoiceNumber(`${business?.invoicePrefix || 'INV'}-${String(nextCount).padStart(4, '0')}`);
        }
      } catch (err) {
        showError(err.message || 'Failed to load editor options');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, business]);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c._id === customerId);
  }, [customers, customerId]);

  // Handle customer change -> update Place of Supply
  useEffect(() => {
    if (selectedCustomer?.state) {
      setPlaceOfSupply(selectedCustomer.state);
    }
  }, [selectedCustomer]);

  // Determine whether this transaction is Inter-State (IGST) or Intra-State (CGST + SGST)
  const isInterState = useMemo(() => {
    if (taxMode === 'inter') return true;
    if (taxMode === 'intra') return false;
    // auto detect
    const bizState = (business?.state || '').trim().toLowerCase();
    const destState = (placeOfSupply || '').trim().toLowerCase();
    return Boolean(bizState && destState && bizState !== destState);
  }, [taxMode, business?.state, placeOfSupply]);

  // Frontend Real-time GST & Invoice Totals Calculator (Identical to backend calculator)
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const computedItems = items.map((item) => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const rate = Math.max(0, Number(item.rate) || 0);
      const lineBase = qty * rate;
      subtotal += lineBase;

      const discountVal = Math.max(0, Number(item.discount) || 0);
      let lineDiscount = 0;
      if (item.discountType === 'fixed') {
        lineDiscount = Math.min(lineBase, discountVal);
      } else {
        lineDiscount = (lineBase * Math.min(100, discountVal)) / 100;
      }

      const taxable = Math.max(0, lineBase - lineDiscount);
      totalTaxable += taxable;

      const gst = Math.max(0, Number(item.gstRate) || 0);
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = (taxable * gst) / 100;
        totalIgst += igst;
      } else {
        const half = gst / 2;
        cgst = (taxable * half) / 100;
        sgst = (taxable * half) / 100;
        totalCgst += cgst;
        totalSgst += sgst;
      }

      return {
        ...item,
        lineBase,
        taxable,
        cgst,
        sgst,
        igst,
        amount: taxable + (isInterState ? igst : cgst + sgst),
      };
    });

    const discNum = Math.max(0, Number(overallDiscount) || 0);
    const finalTaxable = Math.max(0, totalTaxable - discNum);
    const shipNum = Math.max(0, Number(shipping) || 0);

    let finalCgst = totalCgst;
    let finalSgst = totalSgst;
    let finalIgst = totalIgst;

    if (totalTaxable > 0 && discNum > 0) {
      const ratio = finalTaxable / totalTaxable;
      finalCgst *= ratio;
      finalSgst *= ratio;
      finalIgst *= ratio;
    }

    const rawTotal =
      finalTaxable + (isInterState ? finalIgst : finalCgst + finalSgst) + shipNum;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;

    const paidNum = Math.max(0, Number(paidAmount) || 0);
    const balanceDue = Math.max(0, grandTotal - paidNum);

    return {
      computedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxable: Math.round(finalTaxable * 100) / 100,
      cgst: Math.round(finalCgst * 100) / 100,
      sgst: Math.round(finalSgst * 100) / 100,
      igst: Math.round(finalIgst * 100) / 100,
      shipping: shipNum,
      roundOff,
      grandTotal,
      paidAmount: paidNum,
      balanceDue,
    };
  }, [items, isInterState, overallDiscount, shipping, paidAmount]);

  // Items manipulation
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProductSelect = (index, prodId) => {
    const prod = products.find((p) => p._id === prodId);
    if (!prod) return;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: prod._id,
        name: prod.name,
        sku: prod.sku || '',
        hsnSac: prod.hsnSac || '',
        unit: prod.unit || 'PCS',
        rate: prod.sellingPrice || 0,
        gstRate: prod.gstRate || 18,
      };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        name: '',
        sku: '',
        hsnSac: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        discount: 0,
        discountType: 'percentage',
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async (status = 'Pending', shouldGeneratePdf = false) => {
    if (!customerId) {
      showError('Please select a customer for this invoice');
      return;
    }

    if (items.some((it) => !it.name || Number(it.rate) <= 0)) {
      showError('Please ensure all items have a valid name and unit rate');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        placeOfSupply,
        isInterState,
        items: items.map(({ productId, ...rest }) => {
          // Only include productId if it's a valid non-empty string
          const clean = { ...rest };
          if (productId && productId.length === 24) {
            clean.productId = productId;
          }
          return clean;
        }),
        overallDiscount,
        overallDiscountType,
        shipping,
        paidAmount,
        notes,
        terms,
        templateId,
        status,
      };

      let savedInvoiceId = id;
      if (id) {
        const res = await api.put(`/invoices/${id}`, payload);
        if (res.data.success) {
          success('Invoice updated successfully');
          savedInvoiceId = res.data.invoice._id;
        }
      } else {
        const res = await api.post('/invoices', payload);
        if (res.data.success) {
          success('Invoice created successfully');
          savedInvoiceId = res.data.invoice._id;
        }
      }

      if (shouldGeneratePdf) {
        // Download PDF directly
        const pdfRes = await api.get(`/invoices/${savedInvoiceId}/pdf`, { responseType: 'blob' });
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceNumber || 'Invoice'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      navigate(`/invoices/${savedInvoiceId}`);
    } catch (err) {
      showError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading invoice editor..." size="lg" />;
  }

  const fmt = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(val || 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {id ? `Edit Invoice #${invoiceNumber}` : 'New Tax Invoice'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill customer details, items, tax configuration, and payment terms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={Eye}
            onClick={() => setIsPreviewOpen(true)}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave('Draft')}
            loading={saving}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={() => handleSave('Pending', true)}
            loading={saving}
          >
            Save & PDF
          </Button>
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Input
            label="Invoice Number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-0001"
            required
          />
          <Input
            label="Invoice Date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
          <Select
            label="Invoice Template & Color Theme"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            options={
              templateList.length > 0
                ? templateList
                : [
                    { label: 'Classic Corporate (#2563EB)', value: 'classic' },
                    { label: 'Modern Slate (#0EA5E9)', value: 'modern' },
                    { label: 'Minimal Clean (#1E293B)', value: 'minimal' },
                    { label: 'Professional Emerald (#059669)', value: 'professional' },
                    { label: 'GST Tax Standard (#4F46E5)', value: 'gst-standard' },
                    { label: 'Retail Storefront (#D97706)', value: 'retail' },
                    { label: 'Compact POS (Thermal)', value: 'compact' },
                  ]
            }
          />
        </div>

        {/* Customer & Tax Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-slate-100">
          {/* Customer Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Bill To Customer <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                + Add Customer
              </button>
            </div>

            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Select a customer..."
              options={customers.map((c) => ({
                value: c._id,
                label: `${c.name} ${c.companyName ? `(${c.companyName})` : ''} - ${c.city || c.state || ''}`,
              }))}
            />

            {selectedCustomer && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs space-y-1 text-slate-600 animate-fade-in">
                <div className="font-bold text-slate-800">{selectedCustomer.name}</div>
                {selectedCustomer.companyName && (
                  <div className="text-slate-700 font-medium">{selectedCustomer.companyName}</div>
                )}
                <div>{selectedCustomer.address} {selectedCustomer.city} {selectedCustomer.state}</div>
                <div className="text-slate-500">Phone: {selectedCustomer.phone || '-'} | Email: {selectedCustomer.email || '-'}</div>
                {selectedCustomer.gstin && (
                  <div className="font-mono text-slate-700">GSTIN: {selectedCustomer.gstin}</div>
                )}
              </div>
            )}
          </div>

          {/* Place of Supply & Tax Mode */}
          <div className="space-y-4">
            <Input
              label="Place of Supply (Destination State)"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="e.g. Maharashtra or Karnataka"
              helperText="Determines whether CGST+SGST or IGST applies"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                GST Tax Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTaxMode('auto')}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-colors cursor-pointer text-center ${
                    taxMode === 'auto'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Auto ({isInterState ? 'IGST' : 'CGST+SGST'})
                </button>
                <button
                  type="button"
                  onClick={() => setTaxMode('intra')}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-colors cursor-pointer text-center ${
                    taxMode === 'intra'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Intra-State (CGST+SGST)
                </button>
                <button
                  type="button"
                  onClick={() => setTaxMode('inter')}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-colors cursor-pointer text-center ${
                    taxMode === 'inter'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Inter-State (IGST)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-fade-in">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Line Items</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add products or services, quantities, rates, and tax rates.
            </p>
          </div>
          <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddItem}>
            Add Line Item
          </Button>
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto table-responsive-wrapper smooth-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Item Description</th>
                <th className="py-3 px-4 w-28">HSN/SAC</th>
                <th className="py-3 px-4 w-24">Qty</th>
                <th className="py-3 px-4 w-24">Unit</th>
                <th className="py-3 px-4 w-32">Rate (₹)</th>
                <th className="py-3 px-4 w-24">Disc %</th>
                <th className="py-3 px-4 w-28">GST %</th>
                <th className="py-3 px-4 w-32 text-right">Amount (₹)</th>
                <th className="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const comp = calculations.computedItems[idx] || {};
                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-center text-slate-400 font-semibold">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      {products.length > 0 && (
                        <div className="mb-1">
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-600 outline-none"
                          >
                            <option value="">Quick select from catalogue...</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name} (₹{p.sellingPrice})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Item or service title"
                        className="w-full text-xs font-semibold text-slate-800 bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.hsnSac}
                        onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                        placeholder="847160"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono outline-none"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold text-right"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold"
                      >
                        <option value="PCS">PCS</option>
                        <option value="BOX">BOX</option>
                        <option value="KGS">KGS</option>
                        <option value="MTR">MTR</option>
                        <option value="NOS">NOS</option>
                        <option value="SET">SET</option>
                        <option value="HRS">HRS</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold text-right"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-right"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.gstRate}
                        onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold"
                      >
                        <option value="18">18%</option>
                        <option value="12">12%</option>
                        <option value="5">5%</option>
                        <option value="28">28%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ₹{Number(comp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-300 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Item Cards View (< md) */}
        <div className="md:hidden divide-y divide-slate-100 p-3 sm:p-4 space-y-4">
          {items.map((item, idx) => {
            const comp = calculations.computedItems[idx] || {};
            return (
              <div key={idx} className="pt-4 first:pt-0 space-y-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-blue-600">Item #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      ₹{Number(comp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors rounded-lg bg-white border border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {products.length > 0 && (
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 text-slate-700 outline-none"
                  >
                    <option value="">Catalogue preset...</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (₹{p.sellingPrice})
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  placeholder="Item or service title"
                  className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Qty</label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-semibold text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-semibold"
                    >
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="KGS">KGS</option>
                      <option value="MTR">MTR</option>
                      <option value="NOS">NOS</option>
                      <option value="SET">SET</option>
                      <option value="HRS">HRS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-semibold text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Disc %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount}
                      onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">GST %</label>
                    <select
                      value={item.gstRate}
                      onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-semibold"
                    >
                      <option value="18">18%</option>
                      <option value="12">12%</option>
                      <option value="5">5%</option>
                      <option value="28">28%</option>
                      <option value="0">0%</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddItem}>
            Add Another Item
          </Button>
          <div className="text-xs text-slate-400">
            {items.length} item{items.length > 1 ? 's' : ''} in invoice
          </div>
        </div>
      </div>

      {/* Bottom Notes & Totals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
        {/* Notes & Terms */}
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible on invoice..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Terms & Conditions
              </label>
              <textarea
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment and service terms..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-mono transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Calculations & Grand Total Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between py-1 text-slate-600">
            <span>Taxable Subtotal:</span>
            <span className="font-semibold text-slate-900">{fmt(calculations.subtotal)}</span>
          </div>

          {/* Overall Discount Input */}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Overall Discount (₹):</span>
            <div className="w-28 sm:w-32">
              <input
                type="number"
                min="0"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                className="w-full p-1.5 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-rose-600"
              />
            </div>
          </div>

          {/* Tax breakdown */}
          {isInterState ? (
            <div className="flex items-center justify-between py-1 text-slate-600">
              <span>Integrated GST (IGST):</span>
              <span className="font-semibold text-slate-900">{fmt(calculations.igst)}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-1 text-slate-600">
                <span>Central GST (CGST):</span>
                <span className="font-semibold text-slate-900">{fmt(calculations.cgst)}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-slate-600">
                <span>State GST (SGST):</span>
                <span className="font-semibold text-slate-900">{fmt(calculations.sgst)}</span>
              </div>
            </>
          )}

          {/* Shipping Charges */}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Shipping & Handling (₹):</span>
            <div className="w-28 sm:w-32">
              <input
                type="number"
                min="0"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                className="w-full p-1.5 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold"
              />
            </div>
          </div>

          {/* Round Off */}
          {calculations.roundOff !== 0 && (
            <div className="flex items-center justify-between py-1 text-slate-500">
              <span>Round Off:</span>
              <span className="font-mono">
                {calculations.roundOff > 0 ? `+${calculations.roundOff}` : calculations.roundOff}
              </span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex items-center justify-between pt-3 pb-2 border-t-2 border-slate-200 text-sm">
            <span className="font-extrabold text-slate-900">Grand Total:</span>
            <span className="text-xl font-black text-blue-600">{fmt(calculations.grandTotal)}</span>
          </div>

          {/* Paid Amount */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <span className="font-semibold text-emerald-700">Initial Payment Recorded:</span>
            <div className="w-28 sm:w-32">
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                className="w-full p-1.5 text-xs text-right bg-emerald-50 border border-emerald-200 rounded-lg outline-none font-bold text-emerald-700"
              />
            </div>
          </div>

          {/* Balance Due */}
          <div className="flex items-center justify-between py-1 text-rose-600 font-bold">
            <span>Balance Due:</span>
            <span>{fmt(calculations.balanceDue)}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-30 lg:pl-64 animate-slide-up shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="text-xs">
            <span className="text-slate-400">Total:</span>{' '}
            <span className="font-black text-slate-900 text-xs sm:text-sm">{fmt(calculations.grandTotal)}</span>
            <span className="hidden sm:inline text-slate-400 ml-3">Balance:</span>{' '}
            <span className="hidden sm:inline font-bold text-rose-600 text-xs sm:text-sm">{fmt(calculations.balanceDue)}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto">
            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={() => setIsPreviewOpen(true)}
            >
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSave('Draft')}
              loading={saving}
            >
              Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={() => handleSave('Pending', true)}
              loading={saving}
            >
              <span className="hidden sm:inline">Save &amp; Generate PDF</span>
              <span className="sm:hidden">Save &amp; PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Live Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Invoice Preview (#${invoiceNumber})`}
        maxWidth="max-w-4xl"
      >
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-6 text-xs text-slate-800">
          <div className="flex justify-between items-start border-b border-blue-600 pb-4">
            <div>
              <div className="text-lg font-bold text-blue-600">{business?.businessName}</div>
              <div>{business?.address} {business?.city}</div>
              <div>GSTIN: {business?.gstin || 'Unregistered'}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black">TAX INVOICE</div>
              <div className="font-bold"># {invoiceNumber}</div>
              <div>Date: {invoiceDate}</div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl">
            <div className="font-bold text-slate-500 uppercase text-[10px]">Bill To:</div>
            <div className="font-bold text-sm text-slate-900">{selectedCustomer?.name || 'Customer'}</div>
            <div>{selectedCustomer?.companyName}</div>
            <div>{selectedCustomer?.address} {selectedCustomer?.city} {selectedCustomer?.state}</div>
            {selectedCustomer?.gstin && <div>GSTIN: {selectedCustomer.gstin}</div>}
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white text-[11px]">
                <th className="p-2">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">GST</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {calculations.computedItems.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2 font-semibold">{it.name}</td>
                  <td className="p-2 text-right">{it.quantity} {it.unit}</td>
                  <td className="p-2 text-right">{fmt(it.rate)}</td>
                  <td className="p-2 text-right">{it.gstRate}%</td>
                  <td className="p-2 text-right font-bold">{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-right">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{fmt(calculations.subtotal)}</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between">
                  <span>IGST:</span>
                  <span>{fmt(calculations.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>{fmt(calculations.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>{fmt(calculations.sgst)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-2 text-blue-600">
                <span>Grand Total:</span>
                <span>{fmt(calculations.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
