import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  Edit2,
  Trash2,
  Tag,
} from 'lucide-react';

export const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    hsnSac: '',
    unit: 'PCS',
    purchasePrice: '',
    sellingPrice: '',
    gstRate: 18,
    discount: 0,
    taxType: 'Exclusive',
  });

  const { success, error: showError } = useNotification();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products?search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      hsnSac: '',
      unit: 'PCS',
      purchasePrice: '',
      sellingPrice: '',
      gstRate: 18,
      discount: 0,
      taxType: 'Exclusive',
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name || '',
      sku: p.sku || '',
      description: p.description || '',
      hsnSac: p.hsnSac || '',
      unit: p.unit || 'PCS',
      purchasePrice: p.purchasePrice || '',
      sellingPrice: p.sellingPrice || '',
      gstRate: p.gstRate !== undefined ? p.gstRate : 18,
      discount: p.discount || 0,
      taxType: p.taxType || 'Exclusive',
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (p) => {
    setSelectedProduct(p);
    setIsDeleteOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (isEditOpen && selectedProduct) {
        const res = await api.put(`/products/${selectedProduct._id}`, formData);
        if (res.data.success) {
          success('Product updated successfully');
          setIsEditOpen(false);
          fetchProducts();
        }
      } else {
        const res = await api.post('/products', formData);
        if (res.data.success) {
          success('Product created successfully');
          setIsAddOpen(false);
          fetchProducts();
        }
      }
    } catch (err) {
      showError(err.message || 'Operation failed');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await api.delete(`/products/${selectedProduct._id}`);
      if (res.data.success) {
        success('Product removed successfully');
        setIsDeleteOpen(false);
        fetchProducts();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete product');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/products/export', { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BillFlow_Products_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      success('Products exported to Excel');
    } catch (err) {
      showError(err.message || 'Export failed');
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again triggers onChange
    e.target.value = '';

    const data = new FormData();
    data.append('file', file);

    try {
      setIsImporting(true);
      const res = await api.post('/products/import', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        success(res.data.message || 'Products imported successfully');
        fetchProducts();
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to import products';
      showError(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Products & Services
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your items catalogue, selling prices, HSN/SAC codes, and GST slabs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <label className={`cursor-pointer flex-1 sm:flex-initial ${isImporting ? 'opacity-60 pointer-events-none' : ''}`}>
            <span className="inline-flex items-center justify-center gap-2 w-full px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
              <Upload className={`w-4 h-4 text-slate-500 ${isImporting ? 'animate-bounce' : ''}`} />
              <span className="truncate">{isImporting ? 'Importing...' : 'Import Excel'}</span>
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
              className="hidden"
              disabled={isImporting}
              onChange={handleImportExcel}
            />
          </label>

          <Button variant="outline" size="md" icon={Download} onClick={handleExportExcel} className="flex-1 sm:flex-initial justify-center">
            Export
          </Button>

          <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd} className="w-full sm:w-auto justify-center">
            Add Item
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, HSN/SAC..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:bg-white transition-colors"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 text-right sm:text-left">
          Total: <span className="text-slate-900 font-bold">{products.length}</span> items
        </div>
      </div>

      {/* Product Table / Cards */}
      {loading ? (
        <LoadingSpinner label="Loading items catalogue..." />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products or services yet"
          description="Add items to your catalogue to quickly populate invoice line items."
          actionLabel="Add Item"
          onAction={handleOpenAdd}
        />
      ) : (
        <>
          {/* Mobile Product Cards (< md) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {products.map((p) => (
              <div
                key={p._id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3 interactive-card"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] shrink-0">
                      {p.gstRate}% GST
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2.5 flex-wrap text-[11px]">
                    {p.sku && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono font-medium">
                        SKU: {p.sku}
                      </span>
                    )}
                    {p.hsnSac && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                        HSN: {p.hsnSac}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold">
                      {p.unit || 'PCS'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Selling Price</div>
                    <div className="text-base font-black text-slate-900">
                      ₹{Number(p.sellingPrice || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-600 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100 rounded-xl border border-slate-200 transition-colors"
                      title="Edit Item"
                      aria-label="Edit item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(p)}
                      className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-xl border border-slate-200 transition-colors"
                      title="Delete Item"
                      aria-label="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Product Table (>= md) */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="table-responsive-wrapper smooth-scroll">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-6">Item Name</th>
                    <th className="py-3.5 px-6">SKU / Code</th>
                    <th className="py-3.5 px-6">HSN/SAC</th>
                    <th className="py-3.5 px-6 text-center">Unit</th>
                    <th className="py-3.5 px-6 text-right">Selling Price</th>
                    <th className="py-3.5 px-6 text-center">GST Slab</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-600 font-semibold">
                        {p.sku || '-'}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">
                        {p.hsnSac || '-'}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-[10px] text-slate-700">
                          {p.unit || 'PCS'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-black text-slate-900">
                        ₹{Number(p.sellingPrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {p.gstRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Item"
                            aria-label="Edit item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Item"
                            aria-label="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Item' : 'Add Item to Catalogue'}
        subtitle="Configure pricing, HSN/SAC code, and tax rate"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Product / Service Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dell UltraSharp 27-inch 4K Monitor"
                required
              />
            </div>
            <Input
              label="SKU / Item Code"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g. DEL-U2723QE"
            />
            <Input
              label="HSN / SAC Code"
              value={formData.hsnSac}
              onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
              placeholder="e.g. 847160"
              helperText="For Goods (HSN) or Services (SAC)"
            />
            <Select
              label="Measurement Unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              options={[
                'PCS',
                'BOX',
                'KGS',
                'MTR',
                'NOS',
                'SET',
                'HRS',
                'DAYS',
                'PKT',
                'LTR',
              ]}
            />
            <Select
              label="GST Tax Rate (%)"
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
              options={[
                { label: '18% Standard', value: 18 },
                { label: '12% Slab', value: 12 },
                { label: '5% Slab', value: 5 },
                { label: '28% Slab', value: 28 },
                { label: '0% Nil Rated', value: 0 },
              ]}
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              placeholder="54999"
              required
            />
            <Input
              label="Purchase / Cost Price (₹)"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              placeholder="42000"
            />
            <div className="sm:col-span-2">
              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed specifications or terms"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {isEditOpen ? 'Save Changes' : 'Save Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Item?"
        message={`Are you sure you want to delete ${selectedProduct?.name}? This will not affect existing invoices.`}
        confirmLabel="Yes, Delete"
      />
    </div>
  );
};
