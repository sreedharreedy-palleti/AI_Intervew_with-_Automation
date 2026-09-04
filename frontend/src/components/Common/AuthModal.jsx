import React, { useState } from 'react';
import './AuthModal.css';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ShieldCheck,
  Users
} from 'lucide-react';
import { registerUser, loginUser } from '../../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, showToast, initialMode = 'register' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State: 1) Name, 2) Gmail, 3) Password
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        // 1. Validate 1) Name, 2) Gmail, 3) Password
        if (!formData.name.trim()) {
          throw new Error('Please enter your full name');
        }
        if (!formData.email.trim()) {
          throw new Error('Please enter your Gmail / email address');
        }
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters in length');
        }

        const res = await registerUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password
        });

        if (res && res.success && res.user) {
          showToast?.(`Welcome ${res.user.name}! Account created successfully.`, 'success');
          onAuthSuccess?.(res.user, res.token);
          onClose();
        } else {
          throw new Error(res?.error || 'Registration failed');
        }
      } else {
        // Sign In with 1) Gmail, 2) Password
        if (!formData.email.trim() || !formData.password) {
          throw new Error('Please enter your Gmail and password to log in');
        }

        const res = await loginUser({
          email: formData.email.trim(),
          password: formData.password
        });

        if (res && res.success && res.user) {
          showToast?.(`Welcome back, ${res.user.name}!`, 'success');
          onAuthSuccess?.(res.user, res.token);
          onClose();
        } else {
          throw new Error(res?.error || 'Login failed. Please check your credentials.');
        }
      }
    } catch (err) {
      console.error('Auth submit error:', err);
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // One-click demo for Admin
  const handleQuickDemoAdmin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await loginUser({
        email: 'admin@hirepulse.ai',
        password: 'Admin@123'
      });
      if (res && res.success && res.user) {
        showToast?.('Logged in as Administrator (admin@hirepulse.ai)', 'success');
        onAuthSuccess?.(res.user, res.token);
        onClose();
      }
    } catch {
      try {
        const regRes = await registerUser({
          name: 'System Administrator',
          email: 'admin@hirepulse.ai',
          password: 'Admin@123',
          role: 'admin'
        });
        if (regRes && regRes.success && regRes.user) {
          showToast?.('Logged in as Administrator', 'success');
          onAuthSuccess?.(regRes.user, regRes.token);
          onClose();
        }
      } catch (e) {
        setErrorMsg('Admin demo login failed: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // One-click demo for Candidate
  const handleQuickDemoCandidate = async () => {
    setLoading(true);
    setErrorMsg('');
    const demoEmail = 'candidate.demo@hirepulse.ai';
    try {
      const res = await loginUser({
        email: demoEmail,
        password: 'Candidate@123'
      });
      if (res && res.success && res.user) {
        showToast?.('Logged in as Candidate Demo', 'success');
        onAuthSuccess?.(res.user, res.token);
        onClose();
      }
    } catch {
      try {
        const regRes = await registerUser({
          name: 'Alex Morgan',
          email: demoEmail,
          password: 'Candidate@123',
          role: 'candidate'
        });
        if (regRes && regRes.success && regRes.user) {
          showToast?.('Logged in as Candidate Demo', 'success');
          onAuthSuccess?.(regRes.user, regRes.token);
          onClose();
        }
      } catch (e) {
        setErrorMsg('Candidate demo login failed: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="auth-modal-card relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'register' ? 'Create Your Account' : 'Sign In to Your Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'register'
              ? 'Enter your name, Gmail address, and password to start'
              : 'Sign in with your registered Gmail and password'}
          </p>
        </div>

        {/* Tab Switcher (Sign In vs Create Account) */}
        <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setMode('register'); setErrorMsg(''); }}
          >
            Create Account
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setMode('login'); setErrorMsg(''); }}
          >
            Sign In
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Clean Form: 1) Name, 2) Gmail, 3) Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1) Full Name (only required for registration) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">1) Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Enter your name (e.g. Nani)"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* 2) Gmail / Email Address */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {mode === 'register' ? '2) Gmail / Email Address' : '1) Gmail / Email Address'}
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                placeholder="rnani7046@gmail.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* 3) Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {mode === 'register' ? '3) Password' : '2) Password'}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Action Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 ${
              mode === 'register'
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 hover:opacity-95 shadow-cyan-500/20'
                : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white hover:opacity-95 shadow-indigo-500/20'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <>
                <span>{mode === 'register' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider & 1-Click Instant Demo Credentials */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="text-center mb-2.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Instant Demo Access
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickDemoAdmin}
              disabled={loading}
              className="p-2 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs mb-0.5">
                <ShieldCheck size={13} className="group-hover:scale-110 transition-transform" />
                <span>Admin Login</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">admin@hirepulse.ai</span>
            </button>

            <button
              type="button"
              onClick={handleQuickDemoCandidate}
              disabled={loading}
              className="p-2 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs mb-0.5">
                <Users size={13} className="group-hover:scale-110 transition-transform" />
                <span>Demo Candidate</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">candidate.demo@...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
