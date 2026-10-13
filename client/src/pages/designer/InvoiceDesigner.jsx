import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { resolveAssetUrl } from '../../api/assetUrl';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Palette,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Save,
  RotateCcw,
  Printer,
  Sparkles,
  Layers,
  Sliders,
  Type,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const InvoiceDesigner = () => {
  const { business, updateBusinessState } = useAuth();
  const { success, error: showError } = useNotification();

  // Template Styles
  const [styles, setStyles] = useState({
    primaryColor: business?.primaryColor || '#2563EB',
    textColor: '#0F172A',
    accentColor: '#F8FAFC',
    fontFamily: business?.defaultFont || 'Inter',
    fontSize: '12px',
    headerStyle: 'standard', // 'standard' | 'banner' | 'minimal' | 'receipt'
    borderStyle: 'clean', // 'clean' | 'rounded' | 'boxed' | 'dashed'
    showWatermark: false,
    watermarkText: 'TAX INVOICE',
    pageSize: 'A4', // 'A4' | 'A5' | 'Thermal'
  });

  // Template Elements and their visibilities & order
  const [elements, setElements] = useState([
    { id: 'logo', name: 'Company Logo', visible: true, order: 1 },
    { id: 'business_info', name: 'Business Information', visible: true, order: 2 },
    { id: 'invoice_meta', name: 'Invoice Number & Date', visible: true, order: 3 },
    { id: 'customer_info', name: 'Customer / Bill To', visible: true, order: 4 },
    { id: 'items_table', name: 'Line Items Table', visible: true, order: 5 },
    { id: 'totals', name: 'Subtotals & Tax Breakdown', visible: true, order: 6 },
    { id: 'bank_details', name: 'Bank & UPI Details', visible: true, order: 7 },
    { id: 'qr_code', name: 'UPI Payment QR Code', visible: true, order: 8 },
    { id: 'terms', name: 'Terms & Conditions', visible: true, order: 9 },
    { id: 'signature', name: 'Authorized Signatory', visible: true, order: 10 },
    { id: 'footer', name: 'Footer Note', visible: true, order: 11 },
  ]);

  // Selected element for active properties
  const [selectedElementId, setSelectedElementId] = useState('totals');

  // Save Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('My Custom Layout');
  const [templateDescription, setTemplateDescription] = useState('Custom styled business invoice');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Zoom scale
  const [zoom, setZoom] = useState(1);

  // Toggle element visibility
  const toggleVisibility = (id) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el))
    );
  };

  // Move element order
  const moveElement = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= elements.length) return;

    setElements((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIdx];
      copy[newIdx] = temp;
      return copy.map((el, i) => ({ ...el, order: i + 1 }));
    });
  };

  const isVisible = (id) => {
    const el = elements.find((e) => e.id === id);
    return el ? el.visible : true;
  };

  // Color presets
  const colorPresets = [
    { label: 'Royal Blue', hex: '#2563EB' },
    { label: 'Emerald Forest', hex: '#059669' },
    { label: 'Indigo Velvet', hex: '#4F46E5' },
    { label: 'Amber Gold', hex: '#D97706' },
    { label: 'Crimson Slate', hex: '#DC2626' },
    { label: 'Deep Charcoal', hex: '#1E293B' },
  ];

  // Font options
  const fontOptions = ['Inter', 'Roboto', 'Poppins', 'Open Sans', 'Lato', 'Montserrat'];

  const handleSaveCustomTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/templates', {
        name: templateName,
        description: templateDescription,
        pageSize: styles.pageSize,
        styles,
        elements,
        isDefault,
      });

      if (res.data.success) {
        if (isDefault) {
          updateBusinessState({
            primaryColor: styles.primaryColor,
            defaultFont: styles.fontFamily,
            defaultTemplateId: res.data.template?._id,
          });
        }
        success('Custom template saved successfully!');
        setIsSaveModalOpen(false);
      }
    } catch (err) {
      showError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToBusiness = async () => {
    try {
      const res = await api.put('/business', {
        primaryColor: styles.primaryColor,
        defaultFont: styles.fontFamily,
      });
      if (res.data.success) {
        updateBusinessState(res.data.business);
        success('Applied theme styles to business defaults!');
      }
    } catch (err) {
      showError('Failed to apply styles');
    }
  };

  const isThermal = styles.pageSize === 'Thermal';

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Visual Invoice Designer</h1>
            <p className="text-xs text-slate-400">
              Customize fonts, colors, branding positions, and layout elements in real-time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => setStyles({ ...styles, pageSize: 'A4' })}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                styles.pageSize === 'A4' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              A4 Full
            </button>
            <button
              onClick={() => setStyles({ ...styles, pageSize: 'A5' })}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                styles.pageSize === 'A5' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              A5 Half
            </button>
            <button
              onClick={() => setStyles({ ...styles, pageSize: 'Thermal' })}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                styles.pageSize === 'Thermal' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              80mm POS
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleApplyToBusiness} className="flex-1 sm:flex-initial justify-center">
            Apply Default
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={() => setIsSaveModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center"
          >
            Save Template
          </Button>
        </div>
      </div>

      {/* 3-Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL 1: Elements Navigator (Left) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Elements
            </span>
            <span className="text-[11px] text-slate-400">Visibility & Order</span>
          </div>

          <div className="space-y-1.5">
            {elements.map((el, idx) => (
              <div
                key={el.id}
                onClick={() => setSelectedElementId(el.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                  selectedElementId === el.id
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold'
                    : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(el.id);
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      el.visible ? 'text-blue-600 hover:bg-blue-100' : 'text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {el.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`truncate ${!el.visible ? 'line-through text-slate-400' : ''}`}>
                    {el.name}
                  </span>
                </div>

                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    disabled={idx === 0}
                    onClick={() => moveElement(idx, -1)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === elements.length - 1}
                    onClick={() => moveElement(idx, 1)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL 2: Live Canvas Preview (Center) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div
            className={`w-full bg-white shadow-xl border border-slate-200/80 rounded-2xl p-4 sm:p-6 md:p-8 transition-all duration-200 overflow-hidden relative ${
              isThermal ? 'max-w-[340px]' : 'max-w-2xl'
            }`}
            style={{
              fontFamily: `'${styles.fontFamily}', sans-serif`,
              color: styles.textColor,
            }}
          >
            {/* Watermark Overlay */}
            {styles.showWatermark && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none opacity-5 rotate-[-30deg]">
                <span className="text-6xl font-black uppercase tracking-widest text-slate-900">
                  {styles.watermarkText || 'PAID'}
                </span>
              </div>
            )}

            {isThermal ? (
              /* Thermal Receipt Layout Preview */
              <div className="text-[11px] leading-tight space-y-2 text-center text-slate-900 font-mono">
                {isVisible('logo') && (
                  <div className="font-bold text-sm">{business?.businessName || 'APEX STORE'}</div>
                )}
                {isVisible('business_info') && (
                  <div className="text-[10px] text-slate-600">
                    <div>{business?.address || 'Shop 12, Market Road'}</div>
                    <div>GSTIN: {business?.gstin || '27AAACA9999P1Z5'}</div>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-400 my-2" />
                {isVisible('invoice_meta') && (
                  <div className="text-left text-[10px] space-y-0.5">
                    <div><b>Inv:</b> INV-SAMPLE-001</div>
                    <div><b>Date:</b> 06 Oct 2026</div>
                  </div>
                )}
                {isVisible('customer_info') && (
                  <div className="text-left text-[10px] border-b border-dashed border-slate-300 pb-1">
                    <div><b>Cust:</b> Rahul Sharma (Walk-in)</div>
                  </div>
                )}
                {isVisible('items_table') && (
                  <div className="space-y-1 text-left text-[10px] py-1">
                    <div className="flex justify-between"><span>Wireless Mouse x 1</span><span>₹949</span></div>
                    <div className="flex justify-between"><span>Cat6 Cable x 1</span><span>₹890</span></div>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-400 my-2" />
                {isVisible('totals') && (
                  <div className="space-y-0.5 text-right text-[10px]">
                    <div className="flex justify-between"><span>Subtotal:</span><span>₹1,558.00</span></div>
                    <div className="flex justify-between"><span>GST 18%:</span><span>₹281.00</span></div>
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                      <span>Total:</span><span>₹1,839.00</span>
                    </div>
                  </div>
                )}
                {isVisible('qr_code') && (
                  <div className="py-2 border-t border-dashed border-slate-300">
                    <div className="text-[10px] font-bold">UPI Payment QR</div>
                    <div className="w-20 h-20 bg-slate-100 border border-slate-300 mx-auto rounded my-1 flex items-center justify-center text-[9px] text-slate-400">
                      [UPI QR]
                    </div>
                  </div>
                )}
                {isVisible('footer') && (
                  <div className="text-[9px] text-slate-400 mt-2">Thank you! Visit again.</div>
                )}
              </div>
            ) : (
              /* A4 / A5 Layout Preview */
              <div className="space-y-5 text-xs">
                {/* Header Section */}
                <div
                  className={`flex justify-between items-start gap-4 pb-4 border-b-2`}
                  style={{ borderColor: styles.primaryColor }}
                >
                  <div>
                    {isVisible('logo') && (
                      <div
                        className="font-bold text-lg mb-1 tracking-tight"
                        style={{ color: styles.primaryColor }}
                      >
                        {business?.businessName || 'Apex Technologies Pvt Ltd'}
                      </div>
                    )}
                    {isVisible('business_info') && (
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>{business?.address || 'Tower B, Godrej Cyber City, Pune'}</div>
                        <div>Phone: {business?.phone || '+91 98765 43210'}</div>
                        <div><b>GSTIN:</b> {business?.gstin || '27AAACA9999P1Z5'}</div>
                      </div>
                    )}
                  </div>

                  {isVisible('invoice_meta') && (
                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900 uppercase">
                        TAX INVOICE
                      </div>
                      <div className="font-bold" style={{ color: styles.primaryColor }}>
                        # INV-SAMPLE-001
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        <div><b>Date:</b> 06 Oct 2026</div>
                        <div><b>Due Date:</b> 21 Oct 2026</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Section */}
                {isVisible('customer_info') && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Bill To</div>
                      <div className="font-bold text-slate-800 text-xs">Rahul Sharma</div>
                      <div className="text-[11px] text-slate-500">Sharma Infotech Solutions, Mumbai</div>
                      <div className="text-[11px] text-slate-500 font-mono">GSTIN: 27AABCS1429B1ZB</div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <div><b>Place of Supply:</b> Maharashtra</div>
                      <div><b>Tax:</b> Intra-State (CGST + SGST)</div>
                    </div>
                  </div>
                )}

                {/* Items Table */}
                {isVisible('items_table') && (
                  <div className="table-responsive-wrapper smooth-scroll rounded-xl border border-slate-200/80">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr
                          className="text-white text-[10px] uppercase font-bold"
                          style={{ backgroundColor: styles.primaryColor }}
                        >
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">GST</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 font-semibold">Dell UltraSharp 27" 4K Monitor</td>
                          <td className="p-2 text-right">1 PCS</td>
                          <td className="p-2 text-right">₹54,999</td>
                          <td className="p-2 text-right">18%</td>
                          <td className="p-2 text-right font-bold">₹64,898.82</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="p-2 font-semibold">Logitech MX Master 3S Mouse</td>
                          <td className="p-2 text-right">2 PCS</td>
                          <td className="p-2 text-right">₹9,495</td>
                          <td className="p-2 text-right">18%</td>
                          <td className="p-2 text-right font-bold">₹22,408.20</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals & Bank Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-3">
                    {isVisible('bank_details') && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] space-y-0.5 text-slate-600">
                        <div className="font-bold text-slate-800">Bank Details</div>
                        <div>{business?.bankDetails?.bankName || 'HDFC Bank Ltd'} &bull; A/C: {business?.bankDetails?.accountNumber || '50200012345678'}</div>
                        <div>IFSC: {business?.bankDetails?.ifsc || 'HDFC0000123'} &bull; Branch: {business?.bankDetails?.branch || 'Pune'}</div>
                        {business?.bankDetails?.upiId && <div className="text-blue-600 font-semibold">UPI: {business.bankDetails.upiId}</div>}
                      </div>
                    )}

                    {isVisible('qr_code') && (
                      <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-xl bg-white">
                        {business?.bankDetails?.qrCode ? (
                          <img
                            src={resolveAssetUrl(business.bankDetails.qrCode)}
                            alt="Bank UPI QR"
                            className="w-14 h-14 rounded border border-slate-300 object-contain p-0.5 bg-white"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                            [UPI QR]
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">
                          <div className="font-bold text-slate-800">Instant UPI Payment</div>
                          <div>Scan with GPay or PhonePe</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isVisible('totals') && (
                    <div className="space-y-1 text-right text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Taxable Amount:</span><span>₹73,989.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>CGST 9%:</span><span>₹6,659.01</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>SGST 9%:</span><span>₹6,659.01</span>
                      </div>
                      <div
                        className="flex justify-between font-black text-sm pt-2 border-t-2"
                        style={{ color: styles.primaryColor, borderColor: styles.primaryColor }}
                      >
                        <span>Grand Total:</span><span>₹87,307.00</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Signature & Terms */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  {isVisible('terms') ? (
                    <div className="text-[10px] text-slate-400">
                      <b>Terms:</b> Goods once sold will not be returned. Interest @ 18% charged on delayed payment.
                    </div>
                  ) : <div />}

                  {isVisible('signature') ? (
                    <div className="text-right flex flex-col items-end">
                      <div className="inline-flex flex-col items-center text-center min-w-[140px]">
                        <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Signature)
                        </div>
                        <div className="w-full border-t border-slate-300 pt-1">
                          <div className="text-[11px] font-bold text-slate-700">
                            Authorized Signatory
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : <div />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 3: Properties Inspector (Right) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" /> Styling Controls
            </span>
          </div>

          {/* Primary Color Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.primaryColor}
                onChange={(e) => setStyles({ ...styles, primaryColor: e.target.value })}
                className="w-9 h-9 rounded-xl border border-slate-200 p-0.5 cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={styles.primaryColor}
                onChange={(e) => setStyles({ ...styles, primaryColor: e.target.value })}
                className="w-full text-xs font-mono uppercase rounded-xl border border-slate-300 p-2"
              />
            </div>

            {/* Presets */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {colorPresets.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setStyles({ ...styles, primaryColor: c.hex })}
                  className="w-7 h-7 rounded-lg border border-slate-200 transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Typography Font */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Typography Font Family</label>
            <select
              value={styles.fontFamily}
              onChange={(e) => setStyles({ ...styles, fontFamily: e.target.value })}
              className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 outline-none focus:border-blue-600"
            >
              {fontOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Watermark Control */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Watermark Text</label>
              <input
                type="checkbox"
                checked={styles.showWatermark}
                onChange={(e) => setStyles({ ...styles, showWatermark: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
            {styles.showWatermark && (
              <input
                type="text"
                value={styles.watermarkText}
                onChange={(e) => setStyles({ ...styles, watermarkText: e.target.value })}
                placeholder="e.g. PAID or TAX INVOICE"
                className="w-full text-xs p-2 rounded-xl border border-slate-300 uppercase font-bold"
              />
            )}
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save as Custom Template"
        subtitle="This template will be selectable during invoice creation"
      >
        <form onSubmit={handleSaveCustomTemplate} className="space-y-4">
          <Input
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Modern Slate Dark"
            required
          />

          <Input
            label="Description"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Layout style for corporate clients"
          />

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 pt-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Set as default template for all new invoices</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>
              Save Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
