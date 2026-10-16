import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, KeyRound, User, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

const UserRegister = () => {
  // Step 1: Email, Step 2: OTP, Step 3: Name & Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { registerUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.sendRegistrationOtp(email);
      toast.success(res.message || `OTP sent to ${email}`);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please provide a valid 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.verifyRegistrationOtp(email, otp);
      toast.success(res.message || 'Email verified successfully!');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
      toast.error(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!name || !password) return;

    setIsLoading(true);
    setError('');

    try {
      await registerUser({ name, email, password, role: 'user' });
      toast.success('Registration completed! Welcome to HirePulse AI.');
      navigate('/courses', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
      toast.error(err.message || 'Registration error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Candidate Account"
      subtitle={
        step === 1
          ? 'Step 1/3: Enter your email to receive a verification code'
          : step === 2
          ? 'Step 2/3: Enter the 6-digit code sent to your email'
          : 'Step 3/3: Set up your candidate profile credentials'
      }
      footerText="Already have an account?"
      footerLinkText="Sign in here"
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

      {/* STEP 1: Email Form */}
      {step === 1 && (
        <form onSubmit={handleSendOtp}>
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="candidate@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            required
            icon={<Mail size={16} />}
            helperText="A 6-digit verification code will be dispatched to this email."
          />

          <Button
            type="submit"
            variant="primary"
            block
            size="lg"
            isLoading={isLoading}
            icon={<ArrowRight size={18} />}
          >
            Send Verification Code
          </Button>
        </form>
      )}

      {/* STEP 2: Verify OTP Form */}
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
            Verification code sent to <strong>{email}</strong>
          </div>

          <Input
            id="otp"
            label="6-Digit Verification Code"
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
            helperText="Check your inbox or spam folder."
          />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
              disabled={isLoading}
            >
              Change Email
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

      {/* STEP 3: Complete Registration */}
      {step === 3 && (
        <form onSubmit={handleCompleteRegistration}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: '#6ee7b7',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Email <strong>{email}</strong> verified successfully!</span>
          </div>

          <Input
            id="name"
            label="Full Name"
            placeholder="e.g. Alex Morgan"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            required
            icon={<User size={16} />}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            required
            icon={<Lock size={16} />}
            helperText="Use a secure password for your candidate account."
          />

          <Button
            type="submit"
            variant="primary"
            block
            size="lg"
            isLoading={isLoading}
            icon={<CheckCircle2 size={18} />}
          >
            Complete Registration
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default UserRegister;
