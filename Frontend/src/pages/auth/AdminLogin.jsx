import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, Lock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { DEMO_CREDENTIALS } from '../../utils/constants';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await loginAdmin(formData);
      if (res?.user?.role === 'admin') {
        toast.success('Admin authentication verified. Welcome to Executive Panel.');
        navigate('/admin/dashboard', { replace: true });
      } else {
        toast.success(`Welcome back, ${res?.user?.name || 'Candidate'}! Opening courses catalog...`);
        navigate('/courses', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check email and password.');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setFormData({
      email: DEMO_CREDENTIALS.ADMIN.email,
      password: DEMO_CREDENTIALS.ADMIN.password,
    });
  };

  const handleInstantAdminLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginAdmin({
        email: DEMO_CREDENTIALS.ADMIN.email,
        password: DEMO_CREDENTIALS.ADMIN.password,
      });
      toast.success('Signed in as Administrator. Welcome to Executive Panel.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Quick admin login failed.');
      toast.error(err.message || 'Access denied');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Administrator Portal"
      subtitle="Restricted access for system management & course administration"
      footerText="Looking for Candidate sign in?"
      footerLinkText="Go to Candidate Portal"
      footerLinkTo="/login"
      isAdminFlow={true}
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Input
          id="email"
          label="Admin Email"
          type="email"
          placeholder="admin@example.com"
          value={formData.email}
          onChange={handleChange}
          required
          icon={<Mail size={16} />}
        />

        <Input
          id="password"
          label="Admin Password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          required
          icon={<Lock size={16} />}
        />

        <Button
          type="submit"
          variant="primary"
          block
          size="lg"
          isLoading={isLoading}
          icon={<ShieldCheck size={18} />}
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          }}
        >
          Sign In as Administrator
        </Button>
      </form>

      {/* Auto-fill Helper for Backend Seed Admin */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '0.75rem',
          background: 'rgba(139, 92, 246, 0.06)',
          border: '1px dashed rgba(139, 92, 246, 0.35)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.75rem', color: '#c084fc', marginBottom: '0.4rem', fontWeight: 600 }}>
          Default Backend Seed Credentials
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <code>admin@example.com</code> / <code>YourAdminPassword123!</code>
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleQuickFill}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.78rem', color: '#c084fc' }}
          >
            <Sparkles size={13} />
            <span>Auto-fill Fields</span>
          </button>
          <button
            type="button"
            onClick={handleInstantAdminLogin}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: '0.78rem',
              color: '#fff',
              background: 'rgba(139, 92, 246, 0.25)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
            }}
          >
            <ShieldCheck size={13} />
            <span>1-Click Instant Admin Sign In</span>
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default AdminLogin;
