import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Layers,
  Sparkles,
  FileText,
  PackageCheck,
} from 'lucide-react';

export const ExcelImportWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Column Mapping state: { [excelColumn]: appField }
  const [mapping, setMapping] = useState({});

  // Validation results
  const [validationResult, setValidationResult] = useState(null);

  // Import generation results
  const [importSummary, setImportSummary] = useState(null);

  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const appFields = [
    { key: 'ignore', label: '-- Ignore this column --' },
    { key: 'customerName', label: 'Customer Name *' },
    { key: 'customerPhone', label: 'Customer Phone' },
    { key: 'customerEmail', label: 'Customer Email' },
    { key: 'customerGstin', label: 'Customer GSTIN' },
    { key: 'customerAddress', label: 'Customer Address' },
    { key: 'customerCity', label: 'Customer City' },
    { key: 'customerState', label: 'Customer State' },
    { key: 'invoiceNumber', label: 'Invoice Number (for grouping)' },
    { key: 'invoiceDate', label: 'Invoice Date' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'productName', label: 'Product / Item Name *' },
    { key: 'sku', label: 'SKU / Item Code' },
    { key: 'hsnSac', label: 'HSN / SAC Code' },
    { key: 'unit', label: 'Unit (e.g. PCS)' },
    { key: 'quantity', label: 'Quantity *' },
    { key: 'rate', label: 'Unit Price / Rate *' },
    { key: 'discount', label: 'Discount Amount or %' },
    { key: 'gstRate', label: 'GST Rate % (e.g. 18)' },
  ];

  // Smart Auto-Mapping rule
  const autoMapColumns = (cols) => {
    const newMapping = {};
    cols.forEach((col) => {
      const lower = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('customer') || lower.includes('client') || lower.includes('buyer') || lower === 'name') {
        newMapping[col] = 'customerName';
      } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) {
        newMapping[col] = 'customerPhone';
      } else if (lower.includes('email') || lower.includes('mail')) {
        newMapping[col] = 'customerEmail';
      } else if (lower.includes('gstin') || lower.includes('gstno') || lower.includes('gst')) {
        newMapping[col] = 'customerGstin';
      } else if (lower.includes('address') || lower.includes('street')) {
        newMapping[col] = 'customerAddress';
      } else if (lower.includes('city')) {
        newMapping[col] = 'customerCity';
      } else if (lower.includes('state')) {
        newMapping[col] = 'customerState';
      } else if (lower.includes('invoiceno') || lower.includes('invno') || lower.includes('billno') || lower === 'invoice') {
        newMapping[col] = 'invoiceNumber';
      } else if (lower.includes('invoicedate') || lower.includes('billdate') || lower === 'date') {
        newMapping[col] = 'invoiceDate';
      } else if (lower.includes('duedate')) {
        newMapping[col] = 'dueDate';
      } else if (lower.includes('product') || lower.includes('item') || lower.includes('description') || lower === 'particulars') {
        newMapping[col] = 'productName';
      } else if (lower.includes('sku') || lower.includes('code')) {
        newMapping[col] = 'sku';
      } else if (lower.includes('hsn') || lower.includes('sac')) {
        newMapping[col] = 'hsnSac';
      } else if (lower.includes('unit') || lower.includes('uom')) {
        newMapping[col] = 'unit';
      } else if (lower.includes('qty') || lower.includes('quantity')) {
        newMapping[col] = 'quantity';
      } else if (lower.includes('rate') || lower.includes('price') || lower.includes('unitprice') || lower.includes('mrp')) {
        newMapping[col] = 'rate';
      } else if (lower.includes('discount') || lower.includes('disc')) {
        newMapping[col] = 'discount';
      } else if (lower.includes('tax') || lower.includes('gstrate') || lower.includes('gstpercent')) {
        newMapping[col] = 'gstRate';
      } else {
        newMapping[col] = 'ignore';
      }
    });
    setMapping(newMapping);
  };

  // Step 1: Upload File
  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await api.post('/excel/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setFileData(res.data);
        autoMapColumns(res.data.columns);
        setCurrentStep(2);
        success(`Parsed ${res.data.totalRows} rows from ${res.data.fileName}`);
      }
    } catch (err) {
      showError(err.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> 4: Validate Mappings
  const handleValidate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/excel/validate', {
        filePath: fileData.filePath,
        mapping,
      });

      if (res.data.success) {
        setValidationResult(res.data);
        setCurrentStep(4);
      }
    } catch (err) {
      showError(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Process and Generate Invoices
  const handleImportAndGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/excel/generate', {
        filePath: fileData.filePath,
        fileName: fileData.fileName,
        mapping,
      });

      if (res.data.success) {
        setImportSummary(res.data);
        setCurrentStep(5);
        success(res.data.message);
      }
    } catch (err) {
      showError(err.message || 'Import generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Download Sample Template for easy user testing
  const handleDownloadSample = () => {
    const sampleRows = [
      {
        'Invoice No': 'INV-2026-001',
        'Customer Name': 'Apex Digital Solutions',
        Phone: '9822011223',
        Email: 'contact@apexdigital.in',
        City: 'Mumbai',
        State: 'Maharashtra',
        GSTIN: '27AABCS1429B1ZB',
        'Product Name': 'Dell UltraSharp 27" Monitor',
        'HSN Code': '847160',
        Quantity: 2,
        Unit: 'PCS',
        'Unit Rate': 45000,
        Discount: 5,
        'GST Rate': 18,
      },
      {
        'Invoice No': 'INV-2026-001', // Grouped with above invoice!
        'Customer Name': 'Apex Digital Solutions',
        Phone: '9822011223',
        Email: 'contact@apexdigital.in',
        City: 'Mumbai',
        State: 'Maharashtra',
        GSTIN: '27AABCS1429B1ZB',
        'Product Name': 'Logitech MX Master 3S Mouse',
        'HSN Code': '847160',
        Quantity: 2,
        Unit: 'PCS',
        'Unit Rate': 8999,
        Discount: 0,
        'GST Rate': 18,
      },
      {
        'Invoice No': 'INV-2026-002',
        'Customer Name': 'Bengaluru Cloud Services',
        Phone: '9845012345',
        Email: 'billing@bengalurucloud.com',
        City: 'Bengaluru',
        State: 'Karnataka',
        GSTIN: '29ABCDE1234F1Z5',
        'Product Name': 'Cisco 24-Port Gigabit Switch',
        'HSN Code': '851762',
        Quantity: 1,
        Unit: 'PCS',
        'Unit Rate': 32000,
        Discount: 10,
        'GST Rate': 18,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, 'BillFlow_Sample_MultiLine_Invoices.xlsx');
    success('Downloaded sample multi-item invoice template');
  };

  // Download Error Report
  const handleDownloadErrors = async () => {
    if (!importSummary?.auditId) return;
    try {
      const response = await api.get(`/excel/errors/${importSummary.auditId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BillFlow_Import_Errors_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError('No error report file available');
    }
  };

  const steps = [
    '1. Upload File',
    '2. Data Preview',
    '3. Column Mapping',
    '4. Validation Check',
    '5. Batch Invoices',
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Excel Import & Batch Invoice Wizard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Import spreadsheets (.xlsx, .xls, .csv), map fields, and generate grouped invoices automatically.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={Download}
          onClick={handleDownloadSample}
        >
          Download Sample Template (.xlsx)
        </Button>
      </div>

      {/* Stepper Progress */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 text-center text-xs font-bold">
          {steps.map((st, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <div
                key={idx}
                className={`p-2 sm:p-2.5 rounded-xl border transition-colors ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                {st}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Upload */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-8 md:p-12 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-6">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Upload Invoices Spreadsheet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Upload customer and product records. Rows with identical <b>Invoice Number</b> will automatically be grouped into a single multi-item invoice.
            </p>

            <label className="block border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 p-6 sm:p-8 rounded-2xl transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <span className="text-xs font-bold text-slate-800 block">
                Click to browse or drag & drop spreadsheet
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Supported formats: .xlsx, .xls, .csv (Max 10MB)
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Preview */}
      {currentStep === 2 && fileData && (
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Step 2: Spreadsheet Preview</h3>
              <p className="text-xs text-slate-400">
                File: <b className="text-slate-700">{fileData.fileName}</b> &bull; Total Rows: <b className="text-slate-700">{fileData.totalRows}</b> &bull; Columns: <b className="text-slate-700">{fileData.columns?.length}</b>
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setCurrentStep(3)}>
              Proceed to Mapping <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          <div className="table-responsive-wrapper smooth-scroll border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  {fileData.columns?.map((col, idx) => (
                    <th key={idx} className="p-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fileData.previewRows?.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50">
                    {fileData.columns?.map((col, cIdx) => (
                      <td key={cIdx} className="p-3 whitespace-nowrap text-slate-700">
                        {String(row[col] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button variant="primary" size="md" onClick={() => setCurrentStep(3)}>
              Continue to Column Mapping
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Column Mapping */}
      {currentStep === 3 && fileData && (
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Step 3: Map Excel Columns</h3>
              <p className="text-xs text-slate-400">
                Match each column from your file to the corresponding application field.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={() => autoMapColumns(fileData.columns)}
            >
              Auto-Map Again
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fileData.columns?.map((col) => (
              <div
                key={col}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 truncate">{col}</div>
                  <div className="text-[10px] text-slate-400">Excel Column Header</div>
                </div>

                <div className="w-full sm:w-56">
                  <select
                    value={mapping[col] || 'ignore'}
                    onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 sm:p-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-600 text-slate-800"
                  >
                    {appFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setCurrentStep(2)}>
              Back to Preview
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleValidate}
              loading={loading}
            >
              Validate Mappings <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Validation */}
      {currentStep === 4 && validationResult && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Step 4: Data Validation Report</h3>
            <p className="text-xs text-slate-400">
              Checking row integrity, missing required values, and positive pricing amounts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div className="text-2xl font-black text-slate-900">
                {validationResult.totalRows}
              </div>
              <div className="text-xs font-semibold text-slate-500">Total Rows</div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
              <div className="text-2xl font-black text-emerald-700">
                {validationResult.validRowsCount}
              </div>
              <div className="text-xs font-semibold text-emerald-600">Valid Rows Ready</div>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-center">
              <div className="text-2xl font-black text-rose-700">
                {validationResult.errorCount}
              </div>
              <div className="text-xs font-semibold text-rose-600">Issues Detected</div>
            </div>
          </div>

          {validationResult.errorCount > 0 && (
            <div className="border border-rose-200 bg-rose-50/50 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4" />
                <span>Found {validationResult.errorCount} row error(s):</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs text-rose-700">
                {validationResult.errors?.map((err, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-rose-200/60 font-mono text-[11px]">
                    <b>Row {err.row}:</b> {err.messages?.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setCurrentStep(3)}>
              Back to Mapping
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={PackageCheck}
              onClick={handleImportAndGenerate}
              loading={loading}
              disabled={validationResult.validRowsCount === 0}
            >
              Generate All Invoices ({validationResult.validRowsCount} Valid Rows)
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Success Summary */}
      {currentStep === 5 && importSummary && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h3 className="text-xl font-bold text-slate-900">Invoices Generated Successfully!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {importSummary.message}
          </p>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Generated Invoices:</span>
              <div className="text-xl font-bold text-emerald-600">
                {importSummary.summary?.invoicesGenerated}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Total Valid Rows:</span>
              <div className="text-xl font-bold text-slate-900">
                {importSummary.summary?.validRows}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
            {importSummary.summary?.rowErrors > 0 && (
              <Button
                variant="outline"
                size="md"
                icon={Download}
                onClick={handleDownloadErrors}
              >
                Download Error Report
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              icon={FileText}
              onClick={() => navigate('/invoices')}
            >
              View Invoices
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
