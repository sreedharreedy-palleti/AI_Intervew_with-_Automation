import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  CheckCircle2, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  X, 
  Save, 
  Mail, 
  Phone, 
  Briefcase, 
  FileText,
  TrendingUp,
  Tag,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Mic,
  Compass,
  Activity
} from 'lucide-react';
import { 
  getDashboardStats, 
  getAllCandidates, 
  getCandidateById, 
  createCandidate, 
  updateCandidate, 
  deleteCandidate,
  getAllProctorSessions
} from '../services/api';

export default function AdminPortal({ showToast, onLaunchExamForCandidate }) {
  // Tabs: 'candidates' | 'proctoring'
  const [portalTab, setPortalTab] = useState('candidates');

  // Stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Candidates & Filters
  const [candidates, setCandidates] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 8 });

  // Proctor Sessions
  const [proctorSessions, setProctorSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Modals
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCandidateForm, setNewCandidateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    targetRole: 'Full Stack React & Node Developer',
    experienceYears: 3,
    expectedSalary: '$90,000 / yr',
    portfolioOrLinkedIn: '',
    jobDescription: '',
    finalAtsScore: 80
  });

  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Fetch Proctor Sessions
  const fetchProctorSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await getAllProctorSessions();
      if (res.success) {
        setProctorSessions(res.sessions || []);
      }
    } catch (err) {
      console.warn('Could not load proctor sessions:', err.message);
    } finally {
      setLoadingSessions(false);
    }
  };


  // Fetch Dashboard Stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getDashboardStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Could not load stats:', err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Candidates List
  const fetchCandidates = async () => {
    setLoadingList(true);
    try {
      const res = await getAllCandidates({
        search,
        role: roleFilter,
        minScore: minScoreFilter,
        page,
        limit: 8
      });
      if (res.success) {
        setCandidates(res.candidates || []);
        setPagination(res.pagination || { total: 0, page: 1, pages: 1, limit: 8 });
      }
    } catch (err) {
      console.error('Failed to load candidate records:', err);
      showToast?.(err.message || 'Failed to load candidates', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProctorSessions();
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [search, roleFilter, minScoreFilter, page]);

  // Handle Inspect Candidate
  const handleInspectCandidate = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await getCandidateById(id);
      if (res.success) {
        setSelectedCandidate(res.candidate);
      }
    } catch (err) {
      showToast?.('Error loading candidate details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Delete Candidate
  const handleDeleteCandidate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete candidate "${name}"?`)) return;
    try {
      await deleteCandidate(id);
      showToast?.(`Candidate deleted successfully`, 'success');
      fetchCandidates();
      fetchStats();
      if (selectedCandidate?._id === id) setSelectedCandidate(null);
    } catch (err) {
      showToast?.('Failed to delete candidate: ' + err.message, 'error');
    }
  };

  // Handle Create Candidate
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createCandidate(newCandidateForm);
      if (res.success) {
        showToast?.('Candidate record created successfully', 'success');
        setIsAddModalOpen(false);
        setNewCandidateForm({
          fullName: '',
          email: '',
          phone: '',
          targetRole: 'Full Stack React & Node Developer',
          experienceYears: 3,
          expectedSalary: '$90,000 / yr',
          portfolioOrLinkedIn: '',
          jobDescription: '',
          finalAtsScore: 80
        });
        fetchCandidates();
        fetchStats();
      }
    } catch (err) {
      showToast?.('Failed to create candidate: ' + err.message, 'error');
    }
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (cand) => {
    setEditingCandidate(cand);
    setEditForm({
      fullName: cand.candidateDetails?.fullName || '',
      email: cand.candidateDetails?.email || '',
      phone: cand.candidateDetails?.phone || '',
      targetRole: cand.candidateDetails?.targetRole || '',
      experienceYears: cand.candidateDetails?.experienceYears || 0,
      expectedSalary: cand.candidateDetails?.expectedSalary || '',
      finalAtsScore: cand.finalAtsScore || 0,
      jobDescription: cand.jobDescription || ''
    });
  };

  // Handle Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        candidateDetails: {
          fullName: editForm.fullName,
          email: editForm.email,
          phone: editForm.phone,
          targetRole: editForm.targetRole,
          experienceYears: Number(editForm.experienceYears) || 0,
          expectedSalary: editForm.expectedSalary
        },
        finalAtsScore: Number(editForm.finalAtsScore) || 0,
        jobDescription: editForm.jobDescription
      };

      const res = await updateCandidate(editingCandidate._id, payload);
      if (res.success) {
        showToast?.('Candidate profile updated', 'success');
        setEditingCandidate(null);
        fetchCandidates();
        fetchStats();
        if (selectedCandidate?._id === editingCandidate._id) {
          setSelectedCandidate(res.data);
        }
      }
    } catch (err) {
      showToast?.('Update failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="admin-wrapper">
      {/* Section Header */}
      <div className="section-header-row">
        <div>
          <div className="badge badge-indigo">
            <LayoutDashboard size={13} />
            <span>Recruiter Intelligence CRM & Proctoring</span>
          </div>
          <h1 className="section-title">Candidate Pipeline & AI Assessment Analytics</h1>
          <p className="section-description">
            Search, filter, inspect, and audit candidate ATS evaluations, real-time 3D camera axis compliance, and exam logs.
          </p>
        </div>

        <div className="admin-top-actions">
          <button 
            type="button" 
            onClick={() => { fetchStats(); fetchCandidates(); fetchProctorSessions(); }} 
            className="btn btn-secondary btn-sm"
            title="Refresh list"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <button 
            type="button" 
            onClick={() => setIsAddModalOpen(true)} 
            className="btn btn-primary btn-sm"
            id="admin-add-candidate-btn"
          >
            <Plus size={16} />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="admin-tab-nav glass-panel">
        <button
          type="button"
          onClick={() => setPortalTab('candidates')}
          className={`admin-subtab-btn ${portalTab === 'candidates' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Candidate ATS Pipeline ({pagination.total || candidates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setPortalTab('proctoring'); fetchProctorSessions(); }}
          className={`admin-subtab-btn ${portalTab === 'proctoring' ? 'active' : ''}`}
        >
          <ShieldCheck size={16} />
          <span>3D Camera Axis & Proctoring Audit ({proctorSessions.length})</span>
        </button>
      </div>

      {portalTab === 'proctoring' ? (
        /* PROCTORING AUDIT SESSIONS VIEW */
        <div className="glass-panel candidates-table-card mt-3">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2 text-cyan">
                <Compass size={18} /> Live & Completed AI Proctoring Sessions
              </h3>
              <p className="text-xs text-muted">Audited with 3D Head Pose tracking, Audio VU level analyzer & Face Recognition</p>
            </div>
            <button
              type="button"
              onClick={fetchProctorSessions}
              className="btn btn-outline btn-xs"
            >
              <RefreshCw size={13} />
              <span>Refresh Sessions</span>
            </button>
          </div>

          {loadingSessions ? (
            <div className="table-loading-state">
              <div className="spinner-small" />
              <span>Fetching proctor audit sessions from MongoDB...</span>
            </div>
          ) : proctorSessions.length === 0 ? (
            <div className="empty-table-state">
              <ShieldAlert size={40} className="text-muted" />
              <h3 className="empty-title">No Proctoring Sessions Recorded</h3>
              <p className="empty-desc">
                Launch exams from the Proctored Exam tab or candidate records to record camera axis and security metrics.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Assessment Role</th>
                    <th>Exam Score</th>
                    <th>3D Axis & Security</th>
                    <th>Violations Logged</th>
                    <th>Session Status</th>
                    <th>Timestamp</th>
                    <th className="text-right">Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {proctorSessions.map((sess) => {
                    const isFlagged = sess.status === 'flagged' || sess.violations?.length >= 3;
                    return (
                      <tr key={sess._id} className="candidate-table-row">
                        <td>
                          <div className="cand-cell-profile">
                            <span className="cand-avatar">
                              {sess.candidateName ? sess.candidateName.charAt(0).toUpperCase() : 'C'}
                            </span>
                            <div>
                              <span className="cand-name">{sess.candidateName || 'Candidate'}</span>
                              <span className="cand-email">ID: {sess.candidateId?.slice(0, 10)}...</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="role-cell-badge">{sess.targetRole || 'Developer'}</span>
                        </td>

                        <td>
                          <span className="text-emerald font-semibold font-mono">
                            {sess.examResult?.score !== undefined ? `${sess.examResult.score}%` : '--'}
                          </span>
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="badge badge-cyan">
                              <Compass size={11} /> Axis: {sess.proctorMetrics?.axisStabilityScore || 95}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={`badge ${sess.violations?.length > 0 ? 'badge-rose' : 'badge-emerald'}`}>
                            {sess.violations?.length || 0} strikes
                          </span>
                        </td>

                        <td>
                          <span className={`badge ${isFlagged ? 'badge-rose' : sess.status === 'completed' ? 'badge-emerald' : 'badge-indigo'}`}>
                            {sess.status?.toUpperCase() || 'IN-PROGRESS'}
                          </span>
                        </td>

                        <td>
                          <span className="date-cell-text">
                            {sess.createdAt ? new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                          </span>
                        </td>

                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSession(sess)}
                            className="btn-table-action action-view"
                            title="Inspect proctoring audit log"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* KPI Stats Cards */}
          <div className="kpi-grid">
            <div className="glass-panel kpi-card">
              <div className="kpi-icon-box bg-indigo-subtle">
                <Users size={22} className="text-indigo" />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Applicants</span>
                <span className="kpi-val">{stats ? stats.totalApplicants : '--'}</span>
              </div>
            </div>

            <div className="glass-panel kpi-card">
              <div className="kpi-icon-box bg-emerald-subtle">
                <Award size={22} className="text-emerald" />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Average ATS Score</span>
                <span className="kpi-val text-emerald">
                  {stats ? `${stats.averageScore}%` : '--'}
                </span>
              </div>
            </div>

            <div className="glass-panel kpi-card">
              <div className="kpi-icon-box bg-cyan-subtle">
                <CheckCircle2 size={22} className="text-cyan" />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Shortlisted Candidates</span>
                <span className="kpi-val text-cyan">
                  {stats ? stats.shortlistedCount : '--'}
                </span>
              </div>
            </div>

            <div className="glass-panel kpi-card">
              <div className="kpi-icon-box bg-amber-subtle">
                <TrendingUp size={22} className="text-amber" />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Shortlist Rate</span>
                <span className="kpi-val text-amber">
                  {stats && stats.totalApplicants > 0
                    ? `${Math.round((stats.shortlistedCount / stats.totalApplicants) * 100)}%`
                    : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Top In-Demand Skills Bar */}
          {stats?.topSkills?.length > 0 && (
            <div className="glass-panel top-skills-panel">
              <span className="skills-panel-title">
                <Sparkles size={15} className="text-indigo" /> Top Detected Skills in Applicant Pool:
              </span>
              <div className="skills-tags-wrap">
                {stats.topSkills.map((s, idx) => (
                  <span key={idx} className="skill-frequency-badge">
                    <strong>{s.skill}</strong>
                    <span className="freq-count">{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="glass-panel admin-filters-bar">
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by candidate name, email, or detected skills..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="filter-search-input"
                id="candidate-search-input"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="clear-search-btn">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-controls">
              <input
                type="text"
                placeholder="Filter Role (e.g. React)"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="form-input filter-role-input"
              />

              <input
                type="number"
                placeholder="Min Score %"
                value={minScoreFilter}
                onChange={(e) => { setMinScoreFilter(e.target.value); setPage(1); }}
                min="0"
                max="100"
                className="form-input filter-score-input"
              />
            </div>
          </div>
        </>
      )}


      {/* Candidates Table */}
      <div className="glass-panel candidates-table-card">
        {loadingList ? (
          <div className="table-loading-state">
            <div className="spinner-small" />
            <span>Fetching applicant records from MongoDB...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="empty-table-state">
            <Users size={40} className="text-muted" />
            <h3 className="empty-title">No Candidates Found</h3>
            <p className="empty-desc">
              {search || roleFilter || minScoreFilter
                ? 'Try adjusting your search filters.'
                : 'Upload resumes in the ATS Screener to populate candidate records.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Candidate Details</th>
                  <th>Target Role</th>
                  <th>Experience</th>
                  <th>ATS Score</th>
                  <th>Detected Skills</th>
                  <th>Created At</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand) => {
                  const details = cand.candidateDetails || {};
                  const isPass = cand.finalAtsScore >= 70;
                  return (
                    <tr key={cand._id} className="candidate-table-row">
                      <td>
                        <div className="cand-cell-profile">
                          <span className="cand-avatar">
                            {details.fullName ? details.fullName.charAt(0).toUpperCase() : 'C'}
                          </span>
                          <div>
                            <span className="cand-name">{details.fullName || 'Anonymous'}</span>
                            <span className="cand-email">{details.email || '--'}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="role-cell-badge">{details.targetRole || '--'}</span>
                      </td>

                      <td>
                        <span className="exp-cell-text">{details.experienceYears || 0} yrs</span>
                      </td>

                      <td>
                        <div className="score-cell-badge">
                          <span className={`score-number ${isPass ? 'score-pass' : 'score-fail'}`}>
                            {cand.finalAtsScore ?? 0}%
                          </span>
                          <span className={`badge ${isPass ? 'badge-emerald' : 'badge-amber'}`}>
                            {isPass ? 'Shortlisted' : 'Low'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="detected-skills-preview">
                          {(cand.detectedSkills || []).slice(0, 3).map((sk, i) => (
                            <span key={i} className="skill-mini-pill">{sk}</span>
                          ))}
                          {(cand.detectedSkills?.length || 0) > 3 && (
                            <span className="skill-mini-more">+{cand.detectedSkills.length - 3}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="date-cell-text">
                          {cand.createdAt ? new Date(cand.createdAt).toLocaleDateString() : '--'}
                        </span>
                      </td>

                      <td>
                        <div className="action-btns-group">
                          <button
                            type="button"
                            onClick={() => handleInspectCandidate(cand._id)}
                            className="action-btn view-btn"
                            title="Inspect Full ATS Profile"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cand)}
                            className="action-btn edit-btn"
                            title="Edit Candidate Record"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCandidate(cand._id, details.fullName)}
                            className="action-btn delete-btn"
                            title="Delete Candidate"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="table-pagination-bar">
            <span className="pagination-info">
              Showing Page {pagination.page} of {pagination.pages} ({pagination.total} total candidates)
            </span>

            <div className="pagination-controls">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={15} />
                <span>Prev</span>
              </button>

              <span className="pagination-current-page">{page}</span>

              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="btn btn-secondary btn-sm"
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------- */}
      {/* MODAL 1: CANDIDATE DETAILED PROFILE INSPECTION           */}
      {/* -------------------------------------------------------- */}
      {selectedCandidate && (
        <div className="modal-backdrop" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-content glass-panel-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">
                  <User size={20} className="text-indigo" />
                  <span>{selectedCandidate.candidateDetails?.fullName}</span>
                </h3>
                <span className="modal-subtitle">
                  ID: <code>{selectedCandidate._id}</code>
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedCandidate(null)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Profile summary row */}
              <div className="profile-top-grid">
                <div className="profile-metric">
                  <span className="label">Applied Role:</span>
                  <span className="val font-bold">{selectedCandidate.candidateDetails?.targetRole}</span>
                </div>
                <div className="profile-metric">
                  <span className="label">ATS Evaluation:</span>
                  <span className={`val font-bold ${selectedCandidate.finalAtsScore >= 70 ? 'text-emerald' : 'text-amber'}`}>
                    {selectedCandidate.finalAtsScore}% Score
                  </span>
                </div>
                <div className="profile-metric">
                  <span className="label">Email Contact:</span>
                  <span className="val">{selectedCandidate.candidateDetails?.email}</span>
                </div>
                <div className="profile-metric">
                  <span className="label">Phone:</span>
                  <span className="val">{selectedCandidate.candidateDetails?.phone}</span>
                </div>
              </div>

              {/* Detected Skills */}
              <div className="modal-section">
                <h4 className="section-subtitle">
                  <Tag size={15} /> Detected Technical Skills ({selectedCandidate.detectedSkills?.length || 0})
                </h4>
                <div className="chips-wrap">
                  {(selectedCandidate.detectedSkills || []).map((sk, i) => (
                    <span key={i} className="skill-chip matched">{sk}</span>
                  ))}
                </div>
              </div>

              {/* Ollama AI Feedback */}
              {selectedCandidate.aiAnalysis && (
                <div className="modal-section ai-insights-card">
                  <h4 className="section-subtitle text-indigo">
                    <Sparkles size={15} /> Ollama AI Evaluation Summary
                  </h4>
                  {selectedCandidate.aiAnalysis.matchSummary && (
                    <p className="ai-summary-quote">
                      "{selectedCandidate.aiAnalysis.matchSummary}"
                    </p>
                  )}
                  {selectedCandidate.aiAnalysis.strengths?.length > 0 && (
                    <div className="insight-block mt-2">
                      <span className="insight-title text-emerald">Strengths:</span>
                      <ul className="insight-list">
                        {selectedCandidate.aiAnalysis.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Resume File Metadata */}
              <div className="modal-section">
                <h4 className="section-subtitle">
                  <FileText size={15} /> Resume Document Metadata
                </h4>
                <p className="text-sm text-secondary">
                  Uploaded File: <strong>{selectedCandidate.fileName}</strong> ({selectedCandidate.fileSize})
                </p>
              </div>

              {/* Launch Exam CTA */}
              <div className="modal-cta-box">
                <button
                  type="button"
                  onClick={() => {
                    const cand = selectedCandidate;
                    setSelectedCandidate(null);
                    onLaunchExamForCandidate?.({
                      candidateId: cand._id,
                      candidateName: cand.candidateDetails?.fullName,
                      targetRole: cand.candidateDetails?.targetRole,
                      atsScore: cand.finalAtsScore
                    });
                  }}
                  className="btn btn-emerald w-full"
                >
                  <ExternalLink size={16} />
                  <span>Launch Proctored Exam for this Candidate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MODAL 2: ADD CANDIDATE MANUALLY                          */}
      {/* -------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content glass-panel-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Plus size={20} className="text-indigo" />
                <span>Create Candidate Record (Admin)</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={newCandidateForm.fullName}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, fullName: e.target.value })}
                    className="form-input"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    value={newCandidateForm.email}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, email: e.target.value })}
                    className="form-input"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone <span className="req">*</span></label>
                  <input
                    type="tel"
                    required
                    value={newCandidateForm.phone}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, phone: e.target.value })}
                    className="form-input"
                    placeholder="+1 555-0192"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Role <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={newCandidateForm.targetRole}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, targetRole: e.target.value })}
                    className="form-input"
                    placeholder="Full Stack Engineer"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={newCandidateForm.experienceYears}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, experienceYears: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ATS Score (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCandidateForm.finalAtsScore}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, finalAtsScore: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Save size={16} />
                  <span>Create Candidate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MODAL 3: EDIT CANDIDATE PROFILE                          */}
      {/* -------------------------------------------------------- */}
      {editingCandidate && (
        <div className="modal-backdrop" onClick={() => setEditingCandidate(null)}>
          <div className="modal-content glass-panel-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Edit3 size={20} className="text-cyan" />
                <span>Edit Candidate Record</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingCandidate(null)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Target Role</label>
                  <input
                    type="text"
                    value={editForm.targetRole}
                    onChange={(e) => setEditForm({ ...editForm, targetRole: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ATS Score (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.finalAtsScore}
                    onChange={(e) => setEditForm({ ...editForm, finalAtsScore: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Save size={16} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MODAL 4: PROCTOR SESSION SECURITY & 3D AXIS AUDIT        */}
      {/* -------------------------------------------------------- */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={() => setSelectedSession(null)}>
          <div className="modal-content glass-panel-elevated modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} className="text-cyan" />
                <div>
                  <h3 className="modal-title">AI Proctoring Security Audit</h3>
                  <span className="text-xs text-muted">Session ID: {selectedSession._id}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSession(null)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="cert-metric-grid mb-4">
                <div className="cert-metric-box">
                  <span className="metric-label">Candidate</span>
                  <span className="metric-value">{selectedSession.candidateName}</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Exam Score</span>
                  <span className="metric-value text-emerald">{selectedSession.examResult?.score ?? '--'}%</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">3D Axis Stability</span>
                  <span className="metric-value text-cyan">{selectedSession.proctorMetrics?.axisStabilityScore || 95}%</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Session Verdict</span>
                  <span className={`metric-value ${selectedSession.status === 'terminated' || selectedSession.violations?.length >= 3 ? 'text-rose' : 'text-emerald'}`}>
                    {selectedSession.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedSession.terminationReason && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/60 rounded-lg mb-4 text-xs">
                  <span className="font-bold text-rose-400 uppercase tracking-wider block mb-1">
                    Auto-Termination Reason:
                  </span>
                  <p className="text-white font-medium">{selectedSession.terminationReason}</p>
                </div>
              )}

              {/* Hardware permissions */}
              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800 mb-4">
                <span className="text-xs text-muted">Hardware Permissions:</span>
                <span className="badge badge-emerald flex items-center gap-1">
                  <Camera size={12} /> Camera 3D Axis: {selectedSession.mediaPermissions?.cameraGranted ? 'Enabled' : 'Disabled'}
                </span>
                <span className="badge badge-indigo flex items-center gap-1">
                  <Mic size={12} /> Microphone: {selectedSession.mediaPermissions?.micGranted ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Violations Log */}
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-amber" /> Violation Security Audit Trail ({selectedSession.violations?.length || 0})
              </h4>

              {(!selectedSession.violations || selectedSession.violations.length === 0) ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Clean session. Zero security or off-axis violations recorded during the assessment.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedSession.violations.map((v, idx) => (
                    <div key={idx} className="p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-rose-400 uppercase tracking-wider block">
                          {v.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-300">{v.details}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : '--'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions mt-4">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="btn btn-secondary btn-sm"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

