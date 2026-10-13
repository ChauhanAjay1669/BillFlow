import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mail, Lock, KeyRound, ArrowLeft } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: request token, 2: reset password
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        success('Password reset token generated.');
        if (res.data.resetToken) {
          setResetToken(res.data.resetToken);
        }
        setStep(2);
      }
    } catch (err) {
      showError(err.message || 'Failed to request reset token');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken,
        password: newPassword,
      });
      if (res.data.success) {
        success('Password reset successfully! Please sign in with your new password.');
        navigate('/login');
      }
    } catch (err) {
      showError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </Link>
        <h3 className="text-xl font-bold text-slate-900">
          {step === 1 ? 'Reset your password' : 'Create new password'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {step === 1
            ? 'Enter your registered email address to receive reset instructions.'
            : 'Enter the verification token and your new password.'}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <Input
            label="Registered Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            prefix={<Mail className="w-4 h-4 text-slate-400" />}
            required
          />

          <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
            Generate Reset Token
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="Reset Token"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            placeholder="Paste reset token here"
            prefix={<KeyRound className="w-4 h-4 text-slate-400" />}
            required
            helperText="Token provided from your reset request"
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            prefix={<Lock className="w-4 h-4 text-slate-400" />}
            required
          />

          <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
            Set New Password
          </Button>
        </form>
      )}
    </div>
  );
};
