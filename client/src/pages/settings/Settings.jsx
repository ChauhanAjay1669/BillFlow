import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { resolveAssetUrl } from '../../api/assetUrl';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import QRCode from 'qrcode';
import {
  Building2,
  FileCog,
  Receipt,
  Palette,
  CreditCard,
  User,
  Database,
  Upload,
  CheckCircle2,
  Sparkles,
  Lock,
  QrCode,
  Trash2,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Info,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-react';

export const Settings = () => {
  const { business, user, updateBusinessState, refreshProfile, seedDemoData } = useAuth();
  const { success, error: showError } = useNotification();

  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [dynamicQrUrl, setDynamicQrUrl] = useState('');
  const [testAmount, setTestAmount] = useState('1000');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Business Profile Form
  const [bizForm, setBizForm] = useState({
    businessName: business?.businessName || '',
    businessType: business?.businessType || 'Retail / Trading',
    phone: business?.phone || '',
    email: business?.email || '',
    website: business?.website || '',
    address: business?.address || '',
    city: business?.city || '',
    state: business?.state || 'Maharashtra',
    pincode: business?.pincode || '',
    country: business?.country || 'India',
    gstin: business?.gstin || '',
    pan: business?.pan || '',
    defaultGstRate: business?.defaultGstRate || 18,
    taxRegistrationType: business?.taxRegistrationType || 'Regular',
    invoicePrefix: business?.invoicePrefix || 'INV',
    defaultPaymentTerms: business?.defaultPaymentTerms || 'Due on Receipt',
    currency: business?.currency || 'INR',
    dateFormat: business?.dateFormat || 'DD/MM/YYYY',
    termsAndConditions: business?.termsAndConditions || '',
    notes: business?.notes || '',
    primaryColor: business?.primaryColor || '#2563EB',
    defaultFont: business?.defaultFont || 'Inter',
    bankDetails: {
      bankName: business?.bankDetails?.bankName || '',
      accountHolderName: business?.bankDetails?.accountHolderName || '',
      accountNumber: business?.bankDetails?.accountNumber || '',
      accountType: business?.bankDetails?.accountType || 'Current',
      ifsc: business?.bankDetails?.ifsc || '',
      branch: business?.bankDetails?.branch || '',
      upiId: business?.bankDetails?.upiId || '',
      qrCode: business?.bankDetails?.qrCode || '',
      qrType: business?.bankDetails?.qrType || 'dynamic',
    },
  });

  // Keep form in sync when business profile updates
  useEffect(() => {
    if (business) {
      setBizForm((prev) => ({
        ...prev,
        businessName: business.businessName || '',
        businessType: business.businessType || 'Retail / Trading',
        phone: business.phone || '',
        email: business.email || '',
        website: business.website || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || 'Maharashtra',
        pincode: business.pincode || '',
        country: business.country || 'India',
        gstin: business.gstin || '',
        pan: business.pan || '',
        defaultGstRate: business.defaultGstRate || 18,
        taxRegistrationType: business.taxRegistrationType || 'Regular',
        invoicePrefix: business.invoicePrefix || 'INV',
        defaultPaymentTerms: business.defaultPaymentTerms || 'Due on Receipt',
        currency: business.currency || 'INR',
        dateFormat: business.dateFormat || 'DD/MM/YYYY',
        termsAndConditions: business.termsAndConditions || '',
        notes: business.notes || '',
        primaryColor: business.primaryColor || '#2563EB',
        defaultFont: business.defaultFont || 'Inter',
        bankDetails: {
          bankName: business.bankDetails?.bankName || '',
          accountHolderName: business.bankDetails?.accountHolderName || '',
          accountNumber: business.bankDetails?.accountNumber || '',
          accountType: business.bankDetails?.accountType || 'Current',
          ifsc: business.bankDetails?.ifsc || '',
          branch: business.bankDetails?.branch || '',
          upiId: business.bankDetails?.upiId || '',
          qrCode: business.bankDetails?.qrCode || '',
          qrType: business.bankDetails?.qrType || 'dynamic',
        },
      }));
    }
  }, [business]);

  // Generate real-time Dynamic UPI QR preview
  useEffect(() => {
    const upi = bizForm.bankDetails.upiId?.trim();
    if (upi) {
      const cleanName = (bizForm.businessName || 'Business').replace(/[^a-zA-Z0-9 ]/g, '').trim();
      const amt = parseFloat(testAmount) || 0;
      const upiUri = `upi://pay?pa=${upi}&pn=${encodeURIComponent(cleanName)}&am=${amt}&cu=INR&tn=Invoice%20Payment`;
      QRCode.toDataURL(upiUri, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setDynamicQrUrl(url))
        .catch((err) => console.error('Failed to generate UPI QR preview:', err));
    } else {
      setDynamicQrUrl('');
    }
  }, [bizForm.bankDetails.upiId, bizForm.businessName, testAmount]);

  // User Profile & Password Form
  const [userForm, setUserForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
  });

  const handleBizChange = (e) => {
    const { name, value } = e.target;
    setBizForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === 'ifsc' ? value.toUpperCase() : value;
    setBizForm((prev) => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [name]: finalValue },
    }));
  };

  const handleSaveBusiness = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      const res = await api.put('/business', bizForm);
      if (res.data.success) {
        updateBusinessState(res.data.business);
        success('Business settings updated successfully');
      }
    } catch (err) {
      showError(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: userForm.name,
        phone: userForm.phone,
      };
      if (userForm.newPassword) {
        payload.currentPassword = userForm.currentPassword;
        payload.password = userForm.newPassword;
      }

      const res = await api.put('/auth/profile', payload);
      if (res.data.success) {
        success('Profile updated successfully');
        setUserForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
        refreshProfile();
      }
    } catch (err) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'qrCode') setIsUploadingQr(true);

    const data = new FormData();
    data.append('file', file);
    data.append('type', type);

    try {
      const res = await api.post('/business/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        updateBusinessState(res.data.business);
        if (type === 'qrCode') {
          setBizForm((prev) => ({
            ...prev,
            bankDetails: {
              ...prev.bankDetails,
              qrCode: res.data.fileUrl,
              qrType: 'custom',
            },
          }));
        }
        const labelMap = {
          logo: 'Company Logo',
          signature: 'Authorized Signature',
          stamp: 'Official Stamp',
          qrCode: 'Bank & UPI QR Code',
        };
        success(`${labelMap[type] || 'Asset'} updated successfully!`);
      }
    } catch (err) {
      showError(err.message || 'File upload failed');
    } finally {
      if (type === 'qrCode') setIsUploadingQr(false);
    }
  };

  const handleRemoveQrCode = async () => {
    setLoading(true);
    try {
      const updatedBank = {
        ...bizForm.bankDetails,
        qrCode: '',
        qrType: bizForm.bankDetails.upiId ? 'dynamic' : 'none',
      };
      const res = await api.put('/business', {
        ...bizForm,
        bankDetails: updatedBank,
      });
      if (res.data.success) {
        updateBusinessState(res.data.business);
        setBizForm((prev) => ({
          ...prev,
          bankDetails: updatedBank,
        }));
        success('Bank & UPI QR Code removed successfully');
      }
    } catch (err) {
      showError(err.message || 'Failed to remove QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSeedDemo = async () => {
    const res = await seedDemoData();
    if (res?.success) {
      window.location.reload();
    }
  };

  const tabs = [
    { key: 'business', label: 'Business Profile', icon: Building2 },
    { key: 'invoice', label: 'Invoice Rules', icon: FileCog },
    { key: 'tax', label: 'GST & Taxes', icon: Receipt },
    { key: 'branding', label: 'Branding & Logo', icon: Palette },
    { key: 'payment', label: 'Bank & UPI QR', icon: CreditCard },
    { key: 'user', label: 'User Account', icon: User },
    { key: 'data', label: 'Data & Demo', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          System Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure business details, GSTIN, payment gateways, and account security.
        </p>
      </div>

      {/* Tabs Pill Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto smooth-scroll p-1.5 sm:p-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === t.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Business Tab */}
        {activeTab === 'business' && (
          <form onSubmit={handleSaveBusiness} className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Business Profile Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business / Firm Name"
                name="businessName"
                value={bizForm.businessName}
                onChange={handleBizChange}
                required
              />
              <Input
                label="Business Type"
                name="businessType"
                value={bizForm.businessType}
                onChange={handleBizChange}
              />
              <Input
                label="Phone"
                name="phone"
                value={bizForm.phone}
                onChange={handleBizChange}
              />
              <Input
                label="Email"
                name="email"
                value={bizForm.email}
                onChange={handleBizChange}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Registered Address"
                  name="address"
                  value={bizForm.address}
                  onChange={handleBizChange}
                />
              </div>
              <Input
                label="City"
                name="city"
                value={bizForm.city}
                onChange={handleBizChange}
              />
              <Input
                label="State (GST Jurisdiction)"
                name="state"
                value={bizForm.state}
                onChange={handleBizChange}
                required
              />
              <Input
                label="PIN Code"
                name="pincode"
                value={bizForm.pincode}
                onChange={handleBizChange}
              />
              <Input
                label="Website"
                name="website"
                value={bizForm.website}
                onChange={handleBizChange}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary" size="md" loading={loading}>
                Save Business Profile
              </Button>
            </div>
          </form>
        )}

        {/* Invoice Rules Tab */}
        {activeTab === 'invoice' && (
          <form onSubmit={handleSaveBusiness} className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Invoice Preferences & Defaults
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Invoice Prefix"
                name="invoicePrefix"
                value={bizForm.invoicePrefix}
                onChange={handleBizChange}
                helperText="Prefixed before numbers, e.g. INV-0001"
              />
              <Select
                label="Default Payment Terms"
                name="defaultPaymentTerms"
                value={bizForm.defaultPaymentTerms}
                onChange={handleBizChange}
                options={[
                  'Due on Receipt',
                  'Net 7 Days',
                  'Net 15 Days',
                  'Net 30 Days',
                  'Net 45 Days',
                  'Net 60 Days',
                ]}
              />
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Default Customer Notes
                </label>
                <textarea
                  rows={2}
                  name="notes"
                  value={bizForm.notes}
                  onChange={handleBizChange}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Default Terms & Conditions
                </label>
                <textarea
                  rows={3}
                  name="termsAndConditions"
                  value={bizForm.termsAndConditions}
                  onChange={handleBizChange}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary" size="md" loading={loading}>
                Save Invoice Rules
              </Button>
            </div>
          </form>
        )}

        {/* Tax Tab */}
        {activeTab === 'tax' && (
          <form onSubmit={handleSaveBusiness} className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              GST & Tax Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GSTIN (15 Alphanumeric Characters)"
                name="gstin"
                value={bizForm.gstin}
                onChange={handleBizChange}
                placeholder="27AAACA9999P1Z5"
              />
              <Input
                label="Permanent Account Number (PAN)"
                name="pan"
                value={bizForm.pan}
                onChange={handleBizChange}
                placeholder="AAACA9999P"
              />
              <Select
                label="GST Registration Type"
                name="taxRegistrationType"
                value={bizForm.taxRegistrationType}
                onChange={handleBizChange}
                options={['Regular', 'Composition', 'Unregistered', 'Consumer']}
              />
              <Select
                label="Default GST Rate"
                name="defaultGstRate"
                value={bizForm.defaultGstRate}
                onChange={handleBizChange}
                options={[
                  { label: '18% Standard GST', value: 18 },
                  { label: '12% Slab', value: 12 },
                  { label: '5% Slab', value: 5 },
                  { label: '28% Slab', value: 28 },
                  { label: '0% Nil Rated', value: 0 },
                ]}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary" size="md" loading={loading}>
                Save Tax Settings
              </Button>
            </div>
          </form>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Brand Assets & Typography
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Company Logo
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
                  {business?.logo ? (
                    <div className="flex flex-col items-center">
                      <img src={resolveAssetUrl(business.logo)} alt="Logo" className="h-16 object-contain mb-2" />
                      <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                        Upload New Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-slate-700 block">Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Signature Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Authorized Signature
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
                  {business?.signature ? (
                    <div className="flex flex-col items-center">
                      <img src={resolveAssetUrl(business.signature)} alt="Signature" className="h-16 object-contain mb-2" />
                      <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                        Upload New Signature
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'signature')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-slate-700 block">Upload Signature</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'signature')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Color & Font */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Primary Theme Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="primaryColor"
                    value={bizForm.primaryColor}
                    onChange={handleBizChange}
                    className="w-10 h-10 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    value={bizForm.primaryColor}
                    onChange={handleBizChange}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono uppercase w-32"
                  />
                </div>
              </div>

              <div>
                <Select
                  label="Default Document Font"
                  name="defaultFont"
                  value={bizForm.defaultFont}
                  onChange={handleBizChange}
                  options={['Inter', 'Roboto', 'Poppins', 'Open Sans', 'Lato', 'Montserrat']}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" variant="primary" size="md" onClick={handleSaveBusiness} loading={loading}>
                Save Branding Settings
              </Button>
            </div>
          </div>
        )}

        {/* Bank & UPI QR Tab */}
        {activeTab === 'payment' && (
          <form onSubmit={handleSaveBusiness} className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Bank Details & UPI Payment QR
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure your bank account details and choose how you want payment QR codes to appear on invoices.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {bizForm.bankDetails.bankName && (bizForm.bankDetails.qrCode || bizForm.bankDetails.upiId) ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready for Payments
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Setup Incomplete
                  </span>
                )}
              </div>
            </div>

            {/* QR Code Display Mode Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Invoice QR Code Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Dynamic QR */}
                <button
                  type="button"
                  onClick={() =>
                    setBizForm((prev) => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, qrType: 'dynamic' },
                    }))
                  }
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    bizForm.bankDetails.qrType === 'dynamic'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Dynamic Smart UPI QR
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Auto-generates QR per bill with exact invoice balance and invoice number for 1-tap customer checkout.
                  </p>
                </button>

                {/* Custom Uploaded QR */}
                <button
                  type="button"
                  onClick={() =>
                    setBizForm((prev) => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, qrType: 'custom' },
                    }))
                  }
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    bizForm.bankDetails.qrType === 'custom'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      Custom Bank / UPI QR Image
                    </span>
                    {bizForm.bankDetails.qrCode && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Upload your printed merchant QR standee (PhonePe, Paytm, BharatPe, or Bank static QR code).
                  </p>
                </button>

                {/* Disabled */}
                <button
                  type="button"
                  onClick={() =>
                    setBizForm((prev) => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, qrType: 'none' },
                    }))
                  }
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    bizForm.bankDetails.qrType === 'none'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      No QR Code
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      Text Only
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Print bank account details in text format only, without displaying any scan-and-pay QR code.
                  </p>
                </button>
              </div>
            </div>

            {/* QR Code Management Grid: Custom Upload & Dynamic Live Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SECTION A: Upload Custom QR Code */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Custom Bank / UPI QR Code Image</h4>
                      <p className="text-[10px] text-slate-500">Merchant standee or bank QR photo</p>
                    </div>
                  </div>
                  {bizForm.bankDetails.qrType === 'custom' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      Active on Invoices
                    </span>
                  )}
                </div>

                {bizForm.bankDetails.qrCode ? (
                  <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col items-center gap-3">
                    <div className="relative group p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <img
                        src={resolveAssetUrl(bizForm.bankDetails.qrCode)}
                        alt="Bank UPI QR Code"
                        className="w-36 h-36 object-contain rounded-lg"
                      />
                    </div>

                    <div className="w-full flex items-center justify-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        Replace Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'qrCode')}
                          disabled={isUploadingQr}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveQrCode}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove QR
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center">
                      Uploaded file: {bizForm.bankDetails.qrCode.split('/').pop()}
                    </p>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-2xl p-6 text-center cursor-pointer block transition-colors group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                      {isUploadingQr ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isUploadingQr ? 'Uploading QR Code...' : 'Click to Upload Bank UPI QR Image'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Supports PhonePe, Google Pay, Paytm, BharatPe, or Bank Merchant Standees (PNG, JPG, SVG, WEBP max 10MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'qrCode')}
                      disabled={isUploadingQr}
                    />
                  </label>
                )}
              </div>

              {/* SECTION B: Dynamic UPI QR Live Preview & Tester */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Dynamic UPI QR (Live Test Preview)</h4>
                      <p className="text-[10px] text-slate-500">Auto-generated from your UPI ID</p>
                    </div>
                  </div>
                  {bizForm.bankDetails.qrType === 'dynamic' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      Active on Invoices
                    </span>
                  )}
                </div>

                {bizForm.bankDetails.upiId?.trim() ? (
                  <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col items-center gap-3">
                    {dynamicQrUrl ? (
                      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <img
                          src={dynamicQrUrl}
                          alt="Dynamic UPI QR"
                          className="w-36 h-36 object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-36 h-36 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                        Generating QR...
                      </div>
                    )}

                    {/* Payee Info & Copy */}
                    <div className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="truncate text-left">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Configured UPI ID</div>
                        <div className="text-xs font-mono font-semibold text-slate-900 truncate">
                          {bizForm.bankDetails.upiId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bizForm.bankDetails.upiId)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer shrink-0"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Live Test Amount Chips */}
                    <div className="w-full space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Test Scan Amount:</span>
                        <span className="font-bold text-blue-600 font-mono">₹{parseFloat(testAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {['100', '500', '1000', '2500'].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTestAmount(amt)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                              testAmount === amt
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 text-center flex items-center gap-1">
                      <Info className="w-3 h-3 text-slate-400 shrink-0" />
                      Scan this QR with PhonePe, GPay, or Paytm to verify your setup!
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-2">
                    <Smartphone className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No UPI ID Configured Yet</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Fill in your <b>UPI ID / VPA</b> in the bank form below to enable automatic instant QR codes on all invoices.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Account Details Form */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Settlement Bank Account Details
                </h4>
                <p className="text-[11px] text-slate-500">
                  These bank details are printed on invoices for customers paying via NEFT, RTGS, IMPS, or net banking.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  name="bankName"
                  value={bizForm.bankDetails.bankName}
                  onChange={handleBankChange}
                  placeholder="e.g. HDFC Bank Ltd, State Bank of India"
                />
                <Input
                  label="Account Holder / Beneficiary Name"
                  name="accountHolderName"
                  value={bizForm.bankDetails.accountHolderName}
                  onChange={handleBankChange}
                  placeholder={bizForm.businessName || 'e.g. Apex Technologies Pvt Ltd'}
                  helperText="Legal name matching your bank account passbook"
                />
                <Input
                  label="Account Number"
                  name="accountNumber"
                  value={bizForm.bankDetails.accountNumber}
                  onChange={handleBankChange}
                  placeholder="e.g. 50200012345678"
                  className="font-mono"
                />
                <Select
                  label="Account Type"
                  name="accountType"
                  value={bizForm.bankDetails.accountType || 'Current'}
                  onChange={handleBankChange}
                  options={[
                    { value: 'Current', label: 'Current Account' },
                    { value: 'Savings', label: 'Savings Account' },
                    { value: 'Cash Credit (CC)', label: 'Cash Credit (CC)' },
                    { value: 'Overdraft (OD)', label: 'Overdraft (OD)' },
                  ]}
                />
                <Input
                  label="IFSC Code"
                  name="ifsc"
                  value={bizForm.bankDetails.ifsc}
                  onChange={handleBankChange}
                  placeholder="e.g. HDFC0000123"
                  className="font-mono uppercase"
                  helperText="11-character bank branch identifier code"
                />
                <Input
                  label="Branch Name"
                  name="branch"
                  value={bizForm.bankDetails.branch}
                  onChange={handleBankChange}
                  placeholder="e.g. Kalyani Nagar Branch, Pune"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="UPI ID / VPA (Virtual Payment Address)"
                    name="upiId"
                    value={bizForm.bankDetails.upiId}
                    onChange={handleBankChange}
                    placeholder="e.g. company@hdfcbank, phonepe@ybl"
                    helperText="Enables dynamic QR codes with exact invoice balance payment on invoices"
                  />
                </div>
              </div>
            </div>

            {/* Live Invoice Preview: How it looks on customer invoices */}
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-100 bg-linear-to-b from-blue-50/40 to-slate-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  Customer Invoice Payment Box (Live Preview)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Matches PDF & Print Layout
                </span>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 text-sm mb-1">
                    {bizForm.bankDetails.bankName || 'Your Bank Name Ltd'}
                  </div>
                  {bizForm.bankDetails.accountHolderName && (
                    <div><span className="text-slate-400 font-medium">A/C Name:</span> <b>{bizForm.bankDetails.accountHolderName}</b></div>
                  )}
                  <div><span className="text-slate-400 font-medium">A/C No:</span> <span className="font-mono font-semibold">{bizForm.bankDetails.accountNumber || '50200012345678'}</span></div>
                  <div><span className="text-slate-400 font-medium">A/C Type:</span> {bizForm.bankDetails.accountType || 'Current'}</div>
                  <div><span className="text-slate-400 font-medium">IFSC:</span> <span className="font-mono font-semibold">{bizForm.bankDetails.ifsc || 'HDFC0000123'}</span></div>
                  {bizForm.bankDetails.branch && (
                    <div><span className="text-slate-400 font-medium">Branch:</span> {bizForm.bankDetails.branch}</div>
                  )}
                  {bizForm.bankDetails.upiId && (
                    <div><span className="text-slate-400 font-medium">UPI ID:</span> <span className="font-mono text-blue-700 font-bold">{bizForm.bankDetails.upiId}</span></div>
                  )}
                </div>

                {/* QR Code preview block */}
                {bizForm.bankDetails.qrType === 'none' ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                    QR Code is disabled for invoices
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 shrink-0">
                    {bizForm.bankDetails.qrType === 'custom' && bizForm.bankDetails.qrCode ? (
                      <img
                        src={resolveAssetUrl(bizForm.bankDetails.qrCode)}
                        alt="Custom QR"
                        className="w-20 h-20 rounded-lg border border-slate-200 object-contain bg-white p-0.5"
                      />
                    ) : dynamicQrUrl ? (
                      <img
                        src={dynamicQrUrl}
                        alt="Dynamic QR"
                        className="w-20 h-20 rounded-lg border border-slate-200 object-contain bg-white p-0.5"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-[10px] text-slate-400 p-1 text-center bg-white">
                        <QrCode className="w-5 h-5 text-slate-300 mb-0.5" />
                        No QR Set
                      </div>
                    )}
                    <div className="text-left text-xs">
                      <div className="font-bold text-slate-900">Scan & Pay via UPI</div>
                      <div className="text-[10px] text-slate-500">GPay, PhonePe, Paytm, BHIM</div>
                      <div className="text-blue-600 font-bold text-xs mt-1">Due: ₹12,499.00</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                All changes are automatically synced across invoices, thermal receipts, and online payment views.
              </p>
              <Button type="submit" variant="primary" size="md" loading={loading}>
                Save Payment Information
              </Button>
            </div>
          </form>
        )}

        {/* User Account Tab */}
        {activeTab === 'user' && (
          <form onSubmit={handleSaveUser} className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              User Profile & Password Security
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />
              <Input
                label="Email (Registered)"
                value={user?.email || ''}
                disabled
                helperText="Email address cannot be changed"
              />
              <Input
                label="Phone"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Change Password
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={userForm.currentPassword}
                  onChange={(e) => setUserForm({ ...userForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                />
                <Input
                  label="New Password"
                  type="password"
                  value={userForm.newPassword}
                  onChange={(e) => setUserForm({ ...userForm, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary" size="md" loading={loading}>
                Update Profile
              </Button>
            </div>
          </form>
        )}

        {/* Data & Demo Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Data Management & Demo Seeding
            </h3>

            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>One-Click Realistic Demo Dataset</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                Load 5 realistic Indian business clients with registered GSTINs, 10 IT hardware & services products with HSN codes, 10 invoices with status variations, and payment records.
              </p>
              <Button
                variant="primary"
                size="md"
                icon={Sparkles}
                onClick={handleSeedDemo}
              >
                Populate Full Demo Dataset
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
