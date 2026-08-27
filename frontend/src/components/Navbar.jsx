import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  LayoutDashboard, 
  Cpu, 
  Activity, 
  Sparkles,
  Server
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, healthStatus, onOpenDiagnostics }) {
  const isNodeOnline = healthStatus?.node?.online;
  const isPythonOnline = healthStatus?.python?.online;

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

        {/* Navigation Tabs */}
        <nav className="navbar-tabs" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'screener' ? 'active' : ''}`}
            onClick={() => setActiveTab('screener')}
            id="nav-tab-screener"
          >
            <FileText size={18} />
            <span>Resume ATS Screener</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'assessment' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessment')}
            id="nav-tab-assessment"
          >
            <ShieldCheck size={18} />
            <span>Proctored Exam Room</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            id="nav-tab-admin"
          >
            <LayoutDashboard size={18} />
            <span>Recruiter CRM</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
            id="nav-tab-diagnostics"
          >
            <Cpu size={18} />
            <span>API Diagnostics</span>
          </button>
        </nav>

        {/* Server Connectivity Indicator */}
        <div className="navbar-actions">
          <div 
            className={`server-status-pill ${isNodeOnline ? 'status-online' : 'status-offline'}`}
            onClick={onOpenDiagnostics}
            title={`Express Backend (:5000): ${isNodeOnline ? 'Connected' : 'Offline'} | Python (:8000): ${isPythonOnline ? 'Connected' : 'Offline'}`}
          >
            <span className="status-dot"></span>
            <Server size={14} />
            <span className="status-label">
              {isNodeOnline ? 'Localhost :5000 Live' : 'Backend Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
