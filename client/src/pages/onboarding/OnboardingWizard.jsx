import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import {
  Building2,
  Receipt,
  Palette,
  FileCog,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
} from 'lucide-react';

export const OnboardingWizard = () => {
  const { business, updateBusinessState, refreshProfile } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Business Info
    businessName: business?.businessName || '',
    businessType: business?.businessType || 'Retail / Trading',
    address: business?.address || '',
    city: business?.city || '',
    state: business?.state || 'Maharashtra',
    country: business?.country || 'India',
    pincode: business?.pincode || '',
    phone: business?.phone || '',
    email: business?.email || '',
    website: business?.website || '',

    // Step 2: Tax Info
    gstin: business?.gstin || '',
    pan: business?.pan || '',
    taxRegistrationType: business?.taxRegistrationType || 'Regular',
    defaultGstRate: business?.defaultGstRate || 18,

    // Step 3: Branding
    logo: business?.logo || '',
    primaryColor: business?.primaryColor || '#2563EB',
    defaultFont: business?.defaultFont || 'Inter',
    signature: business?.signature || '',

    // Step 4: Invoice Settings
    invoicePrefix: business?.invoicePrefix || 'INV',
    invoiceStartNumber: business?.invoiceStartNumber || 1,
    defaultPaymentTerms: business?.defaultPaymentTerms || 'Due on Receipt',
    currency: business?.currency || 'INR',
    dateFormat: business?.dateFormat || 'DD/MM/YYYY',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);
    data.append('type', type);

    try {
      const res = await api.post('/business/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setFormData((prev) => ({ ...prev, [type]: res.data.fileUrl }));
        success(`${type === 'logo' ? 'Logo' : 'Signature'} uploaded successfully!`);
      }
    } catch (err) {
      showError(err.message || 'File upload failed');
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await api.post('/business/onboarding', formData);
      if (res.data.success) {
        updateBusinessState(res.data.business);
        await refreshProfile();
        success('Business setup complete! Welcome to BillFlow.');
        navigate('/dashboard');
      }
    } catch (err) {
      showError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Business Profile', icon: Building2 },
    { num: 2, title: 'Tax Details', icon: Receipt },
    { num: 3, title: 'Branding & Theme', icon: Palette },
    { num: 4, title: 'Invoice Numbering', icon: FileCog },
    { num: 5, title: 'Review & Launch', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-10 px-3.5 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-3xl w-full mx-auto">
        {/* Wizard Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome to Bill<span className="text-blue-600">Flow</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Let's configure your business profile and tax preferences in 5 quick steps.
          </p>

          {/* Stepper Progress Bar */}
          <div className="mt-6 sm:mt-8 flex items-center justify-between relative max-w-xl mx-auto px-2">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 -z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 -z-0 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
            {steps.map((s) => {
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              const Icon = s.icon;
              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-colors shadow-xs ${
                      isPassed
                        ? 'bg-blue-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-white border border-slate-300 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span
                    className={`hidden sm:block text-[10px] font-semibold mt-1.5 ${
                      isCurrent ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-4 sm:p-6 md:p-10">
          {/* STEP 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 1: Business Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Business / Trade Name"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Apex Enterprises"
                  required
                />
                <Select
                  label="Business Type"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  options={[
                    'Retail / Trading',
                    'Manufacturing',
                    'IT & Software Services',
                    'Consulting & Professional Services',
                    'Freelancer / Contractor',
                    'Wholesale & Distribution',
                    'Other',
                  ]}
                />
                <Input
                  label="Business Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                />
                <Input
                  label="Business Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="billing@apex.in"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Registered Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Suite 401, Cyber City"
                  />
                </div>
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Pune"
                />
                <Input
                  label="State (for GST Place of Supply)"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  required
                />
                <Input
                  label="PIN Code"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="411028"
                />
                <Input
                  label="Website (Optional)"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://apex.in"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Tax Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 2: Indian Tax Information (GST / PAN)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="GSTIN (15 Digits)"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="27AAACA9999P1Z5"
                  helperText="Leave blank if unregistered"
                />
                <Input
                  label="PAN (10 Characters)"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  placeholder="AAACA9999P"
                />
                <Select
                  label="Tax Registration Type"
                  name="taxRegistrationType"
                  value={formData.taxRegistrationType}
                  onChange={handleChange}
                  options={['Regular', 'Composition', 'Unregistered', 'Consumer']}
                />
                <Select
                  label="Default GST Rate"
                  name="defaultGstRate"
                  value={formData.defaultGstRate}
                  onChange={handleChange}
                  options={[
                    { label: '18% Standard Goods & Services', value: 18 },
                    { label: '12% Processed Goods', value: 12 },
                    { label: '5% Essential Commodities', value: 5 },
                    { label: '28% Luxury Goods', value: 28 },
                    { label: '0% Nil Rated / Exempt', value: 0 },
                  ]}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Branding */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 3: Branding & Document Aesthetics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Company Logo
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors">
                    {formData.logo ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={formData.logo}
                          alt="Company Logo"
                          className="h-16 object-contain mb-2"
                        />
                        <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                          Replace Logo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'logo')}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Upload Company Logo</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or WEBP up to 5MB</span>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Authorized Signature (Optional)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors">
                    {formData.signature ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={formData.signature}
                          alt="Signature"
                          className="h-16 object-contain mb-2"
                        />
                        <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                          Replace Signature
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'signature')}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Upload Signatory</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Transparent PNG recommended</span>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono uppercase w-32"
                    />
                  </div>
                </div>

                <div>
                  <Select
                    label="Default Invoice Font"
                    name="defaultFont"
                    value={formData.defaultFont}
                    onChange={handleChange}
                    options={['Inter', 'Roboto', 'Poppins', 'Open Sans', 'Lato', 'Montserrat']}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Invoice Settings */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 4: Invoice Prefixes & Formatting
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Invoice Number Prefix"
                  name="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={handleChange}
                  placeholder="e.g. INV or BF"
                  helperText="Appears as INV-0001"
                />
                <Input
                  label="Starting Invoice Number"
                  type="number"
                  name="invoiceStartNumber"
                  value={formData.invoiceStartNumber}
                  onChange={handleChange}
                  placeholder="1"
                />
                <Select
                  label="Default Payment Terms"
                  name="defaultPaymentTerms"
                  value={formData.defaultPaymentTerms}
                  onChange={handleChange}
                  options={[
                    'Due on Receipt',
                    'Net 7 Days',
                    'Net 15 Days',
                    'Net 30 Days',
                    'Net 45 Days',
                    'Net 60 Days',
                  ]}
                />
                <Select
                  label="Currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  options={[
                    { label: 'Indian Rupee (₹ INR)', value: 'INR' },
                    { label: 'US Dollar ($ USD)', value: 'USD' },
                    { label: 'Euro (€ EUR)', value: 'EUR' },
                    { label: 'British Pound (£ GBP)', value: 'GBP' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Review & Launch */}
          {currentStep === 5 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">All Set! Ready to Generate Invoices</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your business profile <b>{formData.businessName}</b> has been configured with GST state{' '}
                <b>{formData.state}</b> and invoice format <b>{formData.invoicePrefix}-0001</b>.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 max-w-md mx-auto text-left text-xs space-y-1.5 text-slate-600">
                <div>
                  <span className="font-semibold text-slate-900">GSTIN:</span>{' '}
                  {formData.gstin || 'Not registered'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Default GST:</span>{' '}
                  {formData.defaultGstRate}%
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Font:</span>{' '}
                  {formData.defaultFont}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Theme Color:</span>{' '}
                  <span
                    className="inline-block w-3 h-3 rounded-full align-middle ml-1"
                    style={{ backgroundColor: formData.primaryColor }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="md"
                onClick={() => setCurrentStep((s) => s - 1)}
                icon={ArrowLeft}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleFinish}
                loading={loading}
              >
                Launch BillFlow Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
