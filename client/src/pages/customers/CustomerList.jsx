import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

export const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    notes: '',
  });

  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers?limit=1000&search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setCustomers(res.data.customers);
        setTotalCount(res.data.total ?? res.data.customers.length);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      companyName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstin: '',
      pan: '',
      notes: '',
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (customer, e) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      companyName: customer.companyName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      gstin: customer.gstin || '',
      pan: customer.pan || '',
      notes: customer.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (customer, e) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setIsDeleteOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (isEditOpen && selectedCustomer) {
        const res = await api.put(`/customers/${selectedCustomer._id}`, formData);
        if (res.data.success) {
          success('Customer updated successfully');
          setIsEditOpen(false);
          fetchCustomers();
        }
      } else {
        const res = await api.post('/customers', formData);
        if (res.data.success) {
          success('Customer created successfully');
          setIsAddOpen(false);
          fetchCustomers();
        }
      }
    } catch (err) {
      showError(err.message || 'Operation failed');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await api.delete(`/customers/${selectedCustomer._id}`);
      if (res.data.success) {
        success('Customer removed successfully');
        setIsDeleteOpen(false);
        fetchCustomers();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete customer');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/customers/export', { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BillFlow_Customers_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      success('Customers exported to Excel');
    } catch (err) {
      showError(err.message || 'Failed to export');
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
      const res = await api.post('/customers/import', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        success(res.data.message || 'Customers imported successfully');
        fetchCustomers();
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to import customers');
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
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage client profiles, GSTIN details, and outstanding balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <label className={`cursor-pointer ${isImporting ? 'opacity-70 pointer-events-none' : ''}`}>
            <span className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs">
              {isImporting ? (
                <>
                  <Upload className="w-4 h-4 text-blue-600 animate-spin" /> Importing Data...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-500" /> Import Excel / CSV
                </>
              )}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
              className="hidden"
              onChange={handleImportExcel}
              disabled={isImporting}
            />
          </label>

          <Button variant="outline" size="md" icon={Download} onClick={handleExportExcel}>
            Export Excel
          </Button>

          <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, phone, email, GSTIN..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:bg-white transition-colors min-h-[40px]"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 self-end sm:self-auto">
          Total: <span className="text-slate-900">{totalCount || customers.length}</span> clients
        </div>
      </div>

      {/* Customer Table & Mobile Cards */}
      {loading ? (
        <LoadingSpinner label="Loading customer directory..." />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add a new customer profile or import an existing customer list via Excel."
          actionLabel="Add Customer"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-fade-in">
          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto table-responsive-wrapper smooth-scroll">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Customer Name</th>
                  <th className="py-3.5 px-6">Company</th>
                  <th className="py-3.5 px-6">Phone / Email</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">GSTIN</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customers.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/customers/${c._id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600">
                        {c.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 font-medium">
                      {c.companyName || '-'}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="text-slate-800 font-semibold">{c.phone || '-'}</div>
                      <div className="text-slate-400 text-[11px]">{c.email || ''}</div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {c.city ? `${c.city}, ` : ''}{c.state || '-'}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600">
                      {c.gstin || '-'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c._id}`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleOpenEdit(c, e)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleOpenDelete(c, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Customer"
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

          {/* Mobile Stacked Cards (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {customers.map((c) => (
              <div
                key={c._id}
                onClick={() => navigate(`/customers/${c._id}`)}
                className="p-4 hover:bg-slate-50/70 active:bg-slate-100 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900 hover:text-blue-600">
                    {c.name}
                  </span>
                  {c.companyName && (
                    <span className="text-xs text-slate-500 font-medium truncate max-w-[140px]">
                      {c.companyName}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{c.phone || 'No phone'}</span>
                  <span>{c.city ? `${c.city}, ` : ''}{c.state || ''}</span>
                </div>

                {c.gstin && (
                  <div className="text-[11px] font-mono text-slate-500">
                    GSTIN: <span className="text-slate-700 font-semibold">{c.gstin}</span>
                  </div>
                )}

                <div
                  className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => navigate(`/customers/${c._id}`)}
                    className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="View Customer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleOpenEdit(c, e)}
                    className="p-2 text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleOpenDelete(c, e)}
                    className="p-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Customer' : 'Add New Customer'}
        subtitle="Customer details will be auto-filled during invoice creation"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              required
            />
            <Input
              label="Company / Business Name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Sharma Infotech"
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98220 11223"
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="rahul@sharma.in"
            />
            <div className="sm:col-span-2">
              <Input
                label="Street Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Plot 42, MIDC Industrial Area"
              />
            </div>
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Mumbai"
            />
            <Input
              label="State (for GST determination)"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="Maharashtra"
              required
            />
            <Input
              label="PIN Code"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="400093"
            />
            <Input
              label="GSTIN"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder="27AABCS1429B1ZB"
            />
            <Input
              label="PAN"
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              placeholder="AABCS1429B"
            />
            <div className="sm:col-span-2">
              <Input
                label="Notes / Remarks"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special credit terms or payment instructions"
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
              {isEditOpen ? 'Save Changes' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Profile?"
        message={`Are you sure you want to delete ${selectedCustomer?.name}? Associated invoices will keep their snapshot.`}
        confirmLabel="Yes, Delete"
      />
    </div>
  );
};
