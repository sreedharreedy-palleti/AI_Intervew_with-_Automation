import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { useToast } from '../../hooks/useToast';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, KeyRound, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toast = useToast();
  const navigate = useNavigate();

  // Step 1: Send recovery OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.forgotPasswordSendOtp(email);
      toast.success(res.message || 'Password reset OTP dispatched.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send recovery OTP.');
      toast.error(err.message || 'Reset request failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify recovery OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please provide a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.forgotPasswordVerifyOtp(email, otp);
      toast.success(res.message || 'OTP verified! Now choose a new password.');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Update password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.forgotPasswordReset(email, newPassword);
      toast.success(res.message || 'Password updated successfully!');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
      toast.error(err.message || 'Password update failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle={
        step === 1
          ? 'Step 1/3: Enter account email for reset code'
          : step === 2
          ? 'Step 2/3: Enter the 6-digit code sent to your email'
          : 'Step 3/3: Choose your new password'
      }
      footerText="Remembered your password?"
      footerLinkText="Back to Login"
      footerLinkTo="/login"
    >
      {/* Progress Dots */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          marginBottom: '1.75rem',
        }}
      >
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              width: s === step ? '28px' : '10px',
              height: '8px',
              borderRadius: 'var(--radius-full)',
              background: s <= step ? 'var(--primary)' : 'var(--border-subtle)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          {error}
        </div>
      )}

      {/* STEP 1: Send OTP */}
      {step === 1 && (
        <form onSubmit={handleSendOtp}>
          <Input
            id="email"
            label="Account Email"
            type="email"
            placeholder="candidate@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            required
            icon={<Mail size={16} />}
          />

          <Button
            type="submit"
            variant="primary"
            block
            size="lg"
            isLoading={isLoading}
            icon={<ArrowRight size={18} />}
          >
            Send Reset Code
          </Button>
        </form>
      )}

      {/* STEP 2: Verify OTP */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp}>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid var(--border-accent)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: '#a5b4fc',
            }}
          >
            Reset code sent to <strong>{email}</strong>
          </div>

          <Input
            id="otp"
            label="6-Digit Reset Code"
            type="text"
            placeholder="123456"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ''));
              if (error) setError('');
            }}
            required
            icon={<KeyRound size={16} />}
          />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              style={{ flex: 1 }}
              isLoading={isLoading}
              icon={<CheckCircle2 size={18} />}
            >
              Verify Code
            </Button>
          </div>
        </form>
      )}

      {/* STEP 3: Reset Password */}
      {step === 3 && (
        <form onSubmit={handleUpdatePassword}>
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (error) setError('');
            }}
            required
            icon={<Lock size={16} />}
          />

          <Button
            type="submit"
            variant="primary"
            block
            size="lg"
            isLoading={isLoading}
            icon={<CheckCircle2 size={18} />}
          >
            Save New Password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
