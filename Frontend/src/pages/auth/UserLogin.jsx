import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, Lock, LogIn, Sparkles, ShieldCheck } from 'lucide-react';
import { DEMO_CREDENTIALS } from '../../utils/constants';

const UserLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginUser, loginAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/courses';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let res;
      try {
        res = await loginUser(formData);
      } catch (userErr) {
        // If candidate login endpoint failed, fallback to admin login
        try {
          res = await loginAdmin(formData);
        } catch {
          throw userErr;
        }
      }

      // Check role returned from authentication
      const userRole = res?.user?.role;
      if (userRole === 'admin') {
        toast.success(`Welcome Administrator (${res.user?.name || res.user?.email})! Opening Admin Panel...`);
        navigate('/admin/dashboard', { replace: true });
      } else {
        toast.success(`Welcome back, ${res?.user?.name || 'Candidate'}!`);
        navigate(from === '/login' || from === '/admin/login' ? '/courses' : from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your email and password.');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillCandidate = () => {
    setFormData({
      email: DEMO_CREDENTIALS.USER.email,
      password: DEMO_CREDENTIALS.USER.password,
    });
  };

  const handleQuickFillAdmin = () => {
    setFormData({
      email: DEMO_CREDENTIALS.ADMIN.email,
      password: DEMO_CREDENTIALS.ADMIN.password,
    });
  };

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Enter your email & password to access your portal"
      footerText="Don't have an account?"
      footerLinkText="Create candidate account"
      footerLinkTo="/register"
    >
      <form onSubmit={handleSubmit}>
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

        <Input
          id="email"
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          value={formData.email}
          onChange={handleChange}
          required
          icon={<Mail size={16} />}
        />

        <div style={{ position: 'relative' }}>
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            icon={<Lock size={16} />}
          />
          <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--primary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          block
          size="lg"
          isLoading={isLoading}
          icon={<LogIn size={18} />}
        >
          Sign In
        </Button>
      </form>

      {/* Quick Test Demo Helper */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          Quick Demo Credentials
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleQuickFillCandidate}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.78rem', color: 'var(--primary)' }}
          >
            <Sparkles size={13} />
            <span>Candidate Demo</span>
          </button>
          <button
            type="button"
            onClick={handleQuickFillAdmin}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.78rem', color: '#c084fc' }}
          >
            <ShieldCheck size={13} />
            <span>Admin Demo</span>
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default UserLogin;
