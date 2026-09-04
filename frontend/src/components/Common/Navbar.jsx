import React, { useState } from 'react';
import './Navbar.css';
import { 
  FileText, 
  ShieldCheck, 
  LayoutDashboard, 
  Cpu, 
  Sparkles,
  Server,
  User,
  LogOut,
  ChevronDown,
  LogIn,
  Shield,
  UserCheck
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  healthStatus, 
  onOpenDiagnostics,
  currentUser,
  onOpenAuth,
  onLogout
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isNodeOnline = healthStatus?.node?.online;
  const isPythonOnline = healthStatus?.python?.online;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'recruiter';

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Brand Logo */}
        <div className="navbar-brand" onClick={() => setActiveTab('screener')}>
          <div className="brand-icon-wrapper">
            <Sparkles className="brand-sparkle" size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-title">HirePulse <span className="brand-ai">AI</span></span>
            <span className="brand-subtitle">ATS & Proctoring Platform</span>
          </div>
        </div>

        {/* Header navigation tailored to the active area */}
        {currentUser && isAdmin && (
          <nav className="navbar-tabs" aria-label="Main Navigation">
            {activeTab === 'admin' && (
              <button
                type="button"
                className="nav-tab"
                onClick={() => setActiveTab('diagnostics')}
                id="nav-tab-diagnostics"
              >
                <Cpu size={16} />
                <span>Diagnostics Room</span>
              </button>
            )}
            {activeTab === 'diagnostics' && (
              <button
                type="button"
                className="nav-tab"
                onClick={() => setActiveTab('admin')}
                id="nav-tab-admin"
              >
                <LayoutDashboard size={16} />
                <span>Back to Admin Portal</span>
              </button>
            )}
          </nav>
        )}

        {/* Right Section: Server Status + User Auth Controls */}
        <div className="navbar-actions flex items-center gap-3">
          {/* Server Connectivity Indicator */}
          <div 
            className={`server-status-pill ${isNodeOnline ? 'status-online' : 'status-offline'} hidden sm:flex`}
            onClick={onOpenDiagnostics}
            title={`Express Backend (:5000): ${isNodeOnline ? 'Connected' : 'Offline'} | Python (:8000): ${isPythonOnline ? 'Connected' : 'Offline'}`}
          >
            <span className="status-dot"></span>
            <Server size={14} />
            <span className="status-label">
              {isNodeOnline ? ':5000 Live' : 'Offline'}
            </span>
          </div>

          {/* User Auth Profile Pill or Login Trigger */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 py-1.5 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isAdmin ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white' : 'bg-gradient-to-tr from-cyan-500 to-emerald-500 text-slate-950'
                }`}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                    <span className="max-w-[110px] truncate">{currentUser.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                      isAdmin ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-none truncate max-w-[120px]">
                    {currentUser.email}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-semibold text-white">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        isAdmin ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        Role: {currentUser.role}
                      </span>
                      {currentUser.targetRole && (
                        <span className="text-[10px] text-slate-400 truncate">
                          • {currentUser.targetRole}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab('admin'); setIsUserMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs text-indigo-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                    >
                      <Shield size={14} /> Open Recruiter & Admin Portal
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { onOpenAuth(); setIsUserMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <UserCheck size={14} /> Switch Account / Re-login
                  </button>

                  <button
                    type="button"
                    onClick={() => { onLogout(); setIsUserMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors border-t border-slate-800"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 py-1.5 px-3.5 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <LogIn size={14} />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
