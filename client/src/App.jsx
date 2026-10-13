import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastContainer } from './components/common/ToastContainer';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AuthLayout } from './components/layout/AuthLayout';

// Auth & Onboarding
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';

// App Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { InvoiceList } from './pages/invoices/InvoiceList';
import { InvoiceEditor } from './pages/invoices/InvoiceEditor';
import { InvoiceDetail } from './pages/invoices/InvoiceDetail';
import { CustomerList } from './pages/customers/CustomerList';
import { CustomerDetail } from './pages/customers/CustomerDetail';
import { ProductList } from './pages/products/ProductList';
import { ExcelImportWizard } from './pages/excel/ExcelImportWizard';
import { InvoiceDesigner } from './pages/designer/InvoiceDesigner';
import { TemplateGallery } from './pages/templates/TemplateGallery';
import { PaymentList } from './pages/payments/PaymentList';
import { Reports } from './pages/reports/Reports';
import { Settings } from './pages/settings/Settings';

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            {/* Onboarding Wizard */}
            <Route path="/onboarding" element={<OnboardingWizard />} />

            {/* Protected Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Invoices */}
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceEditor />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/edit" element={<InvoiceEditor />} />

              {/* Customers */}
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />

              {/* Products */}
              <Route path="/products" element={<ProductList />} />

              {/* Excel Import */}
              <Route path="/excel-import" element={<ExcelImportWizard />} />

              {/* Designer & Templates */}
              <Route path="/designer" element={<InvoiceDesigner />} />
              <Route path="/templates" element={<TemplateGallery />} />

              {/* Payments & Reports */}
              <Route path="/payments" element={<PaymentList />} />
              <Route path="/reports" element={<Reports />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/:tab" element={<Settings />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}
