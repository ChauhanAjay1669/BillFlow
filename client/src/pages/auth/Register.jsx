import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { User, Building, Mail, Lock } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await register(formData);
    setLoading(false);
    if (res.success) {
      navigate('/onboarding');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">Create your business account</h3>
        <p className="text-xs text-slate-500 mt-1">
          Start generating professional invoices in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Vikram Sharma"
          prefix={<User className="w-4 h-4 text-slate-400" />}
          required
        />

        <Input
          label="Business / Trade Name"
          name="businessName"
          value={formData.businessName}
          onChange={handleChange}
          placeholder="e.g. Sharma Hardware & Tools"
          prefix={<Building className="w-4 h-4 text-slate-400" />}
          required
        />

        <Input
          label="Work Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="accounts@company.in"
          prefix={<Mail className="w-4 h-4 text-slate-400" />}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Minimum 6 characters"
          prefix={<Lock className="w-4 h-4 text-slate-400" />}
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Re-type password"
          prefix={<Lock className="w-4 h-4 text-slate-400" />}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          className="w-full mt-3"
        >
          Create Business Account
        </Button>

        <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
};
