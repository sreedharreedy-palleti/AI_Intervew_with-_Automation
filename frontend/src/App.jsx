import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ResumeScreener from './components/ResumeScreener';
import ProctoredExam from './components/ProctoredExam';
import AdminPortal from './components/AdminPortal';
import ApiDiagnostics from './components/ApiDiagnostics';
import { checkHealthStatus } from './services/api';
import './App.css';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  // Tabs: 'screener' | 'assessment' | 'admin' | 'diagnostics'
  const [activeTab, setActiveTab] = useState('screener');
  
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

  // Check URL parameters on mount (e.g. from invitation email link: ?candidateId=...&role=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const candidateId = searchParams.get('candidateId');
    const role = searchParams.get('role');

    if (candidateId) {
      setExamCandidateData({
        candidateId,
        targetRole: role || 'Candidate'
      });
      setActiveTab('assessment');
      showToast(`Pre-loaded Candidate ID from invitation link: ${candidateId}`, 'info');
    }

    refreshHealth();
    const interval = setInterval(refreshHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handlers for switching views
  const handleStartExamFromScreener = (data) => {
    setExamCandidateData(data);
    setActiveTab('assessment');
    showToast(`Loaded ${data.candidateName || 'Candidate'} into Proctored Exam Room`, 'success');
  };

  const handleLaunchExamForCandidate = (data) => {
    setExamCandidateData(data);
    setActiveTab('assessment');
    showToast(`Exam Room initialized for candidate ID ${data.candidateId}`, 'info');
  };

  return (
    <div className="app-container">
      {/* Top Glass Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthStatus={healthStatus}
        onOpenDiagnostics={() => setActiveTab('diagnostics')}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'screener' && (
          <ResumeScreener
            onStartExam={handleStartExamFromScreener}
            showToast={showToast}
          />
        )}

        {activeTab === 'assessment' && (
          <ProctoredExam
            initialData={examCandidateData}
            showToast={showToast}
            onFinishExam={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortal
            showToast={showToast}
            onLaunchExamForCandidate={handleLaunchExamForCandidate}
          />
        )}

        {activeTab === 'diagnostics' && (
          <ApiDiagnostics
            healthStatus={healthStatus}
            onRefreshHealth={refreshHealth}
            showToast={showToast}
          />
        )}
      </main>

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
