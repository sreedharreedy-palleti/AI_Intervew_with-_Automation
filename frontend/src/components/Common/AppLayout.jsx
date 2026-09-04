import React, { useState, useEffect } from 'react';
import {
  Navbar,
  ResumeScreener,
  ProctoredExam,
  AdminPortal,
  ApiDiagnostics,
  AuthModal,
  ErrorBoundary
} from '../../App.jsx';
import { checkHealthStatus, getStoredUser, getCurrentUser, clearAuthToken } from '../../services/api';
import './AppLayout.css';
import { CheckCircle2, AlertCircle, Info, Sparkles, ArrowRight } from 'lucide-react';

export default function AppLayout() {
  // Tabs: 'screener' | 'assessment' | 'admin' | 'diagnostics'
  const [activeTab, setActiveTab] = useState('screener');
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'

  // Assessment exam launch preloaded data
  const [examCandidateData, setExamCandidateData] = useState(null);

  // Health Status
  const [healthStatus, setHealthStatus] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const refreshHealth = async () => {
    try {
      const status = await checkHealthStatus();
      setHealthStatus(status);
    } catch {
      // Ignore background error
    }
  };

  // Refresh current user session from token
  const refreshUserSession = async () => {
    try {
      const res = await getCurrentUser();
      if (res.user) {
        setCurrentUser(res.user);
      }
    } catch {
      // Token expired or invalid
    }
  };

  // Route tab changes and update URL bar dynamically
  const changeTabAndUrl = (tab) => {
    setActiveTab(tab);
    if (tab === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else if (tab === 'diagnostics') {
      window.history.pushState(null, '', '/diagnostics');
    } else if (tab === 'assessment') {
      const search = window.location.search;
      window.history.pushState(null, '', `/assessment${search}`);
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  // Check URL parameters and intercept routing on mount & popstate
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const candidateId = searchParams.get('candidateId');
      const role = searchParams.get('role');

      if (path === '/admin') {
        setActiveTab('admin');
        if (!getStoredUser()) {
          handleOpenAuth('login');
          showToast('Admin authentication required for access', 'info');
        }
      } else if (path === '/diagnostics') {
        setActiveTab('diagnostics');
      } else if (path.startsWith('/assessment') || candidateId) {
        setActiveTab('assessment');
        if (candidateId) {
          setExamCandidateData({
            candidateId,
            targetRole: role || 'Candidate'
          });
        }
      } else {
        setActiveTab('screener');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    
    // Initial run
    handleLocationChange();

    refreshHealth();
    refreshUserSession();
    const interval = setInterval(refreshHealth, 15000);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  // Inactivity timeout auto-lockout (5 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    let timeoutId;

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        showToast('You have been automatically logged out due to inactivity', 'error');
      }, INACTIVITY_TIMEOUT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [currentUser]);

  // Auth Handlers
  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      changeTabAndUrl('admin');
    } else {
      changeTabAndUrl('screener');
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    showToast('You have been signed out successfully', 'info');
    changeTabAndUrl('screener');
  };

  // Handlers for switching views
  const handleStartExamFromScreener = (data) => {
    setExamCandidateData(data);
    changeTabAndUrl('assessment');
    showToast(`Loaded ${data.candidateName || 'Candidate'} into Proctored Exam Room`, 'success');
  };

  const handleLaunchExamForCandidate = (data) => {
    setExamCandidateData(data);
    changeTabAndUrl('assessment');
    showToast(`Exam Room initialized for candidate ID ${data.candidateId}`, 'info');
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'recruiter';

  return (
    <div className="app-container">
      {/* Top Glass Navbar - Hidden during active proctored exam */}
      {activeTab !== 'assessment' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={changeTabAndUrl}
          healthStatus={healthStatus}
          onOpenDiagnostics={() => changeTabAndUrl('diagnostics')}
          currentUser={currentUser}
          onOpenAuth={() => handleOpenAuth('login')}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area with Error Boundary Protection */}
      <main className={`main-content ${activeTab === 'assessment' ? 'exam-mode-layout' : ''}`}>
        <ErrorBoundary>
          {!currentUser && activeTab !== 'assessment' ? (
            <div className="auth-gate-container">
              <div className="auth-gate-card">
                <div className="auth-gate-icon">
                  <Sparkles size={32} />
                </div>
                <h2 className="auth-gate-title">
                  {window.location.pathname === '/admin' ? 'Admin Portal Access Locked' : 'HirePulse AI Platform Locked'}
                </h2>
                <p className="auth-gate-desc">
                  {window.location.pathname === '/admin'
                    ? 'Access to the administrator and recruiter portal requires admin authentication. Please sign in with an admin Gmail address.'
                    : 'To access the ATS Resume Screener, Proctored Coding Rounds, and AI insights, please sign in or register.'}
                </p>
                <div className="auth-gate-actions">
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('login')}
                    className="btn btn-primary"
                  >
                    <span>Sign In to Account</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('register')}
                    className="btn btn-secondary"
                  >
                    <span>Create New Account</span>
                  </button>
                </div>
                {window.location.pathname === '/admin' && (
                  <div className="auth-gate-tip">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>Tip: Registered accounts with a Gmail containing <strong>"admin"</strong> automatically get Admin privileges.</span>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'admin' && !isAdmin ? (
            <div className="auth-gate-container">
              <div className="auth-gate-card error-gate">
                <div className="auth-gate-icon error-icon">
                  <AlertCircle size={32} />
                </div>
                <h2 className="auth-gate-title text-rose-400">Access Denied</h2>
                <p className="auth-gate-desc">
                  You are currently logged in as a candidate (<strong>{currentUser.email}</strong>). The admin portal is restricted to recruiter and administrator accounts only.
                </p>
                <div className="auth-gate-actions">
                  <button
                    type="button"
                    onClick={() => changeTabAndUrl('screener')}
                    className="btn btn-primary"
                  >
                    <span>Go to Candidate Screener</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('login')}
                    className="btn btn-secondary"
                  >
                    <span>Switch to Admin Account</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'screener' && (
                <ResumeScreener
                  onStartExam={handleStartExamFromScreener}
                  showToast={showToast}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'assessment' && (
                <ProctoredExam
                  initialData={examCandidateData}
                  showToast={showToast}
                  onFinishExam={() => changeTabAndUrl(isAdmin ? 'admin' : 'screener')}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPortal
                  showToast={showToast}
                  onLaunchExamForCandidate={handleLaunchExamForCandidate}
                  currentUser={currentUser}
                  onOpenAuth={() => handleOpenAuth('login')}
                />
              )}

              {activeTab === 'diagnostics' && (
                <ApiDiagnostics
                  healthStatus={healthStatus}
                  onRefreshHealth={refreshHealth}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        showToast={showToast}
        initialMode={authModalMode}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
