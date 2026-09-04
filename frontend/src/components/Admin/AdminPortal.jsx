import React, { useState, useEffect } from 'react';
import './AdminPortal.css';
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  CheckCircle2, 
  Search, 
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
  FileText,
  TrendingUp,
  Tag,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Mic,
  Compass,
  User,
  Code,
  Shield,
  KeyRound,
  UserCheck,
  UserPlus,
  Lock,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import { 
  getDashboardStats, 
  getAllCandidates, 
  getCandidateById, 
  createCandidate, 
  updateCandidate, 
  deleteCandidate,
  getAllProctorSessions,
  getAllRegisteredUsers,
  updateUserRole,
  deleteUserAccount
} from '../../services/api';

export default function AdminPortal({ showToast, onLaunchExamForCandidate, currentUser, onOpenAuth }) {
  // Tabs: 'candidates' | 'proctoring' | 'users'
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

  // Registered Users State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ total: 0, page: 1, pages: 1, limit: 8 });
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // Candidate Modals & Forms
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

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'recruiter';

  // -------------------------------------------------------------
  // Fetch Registered Users List
  // -------------------------------------------------------------
  const fetchUsersList = async () => {
    setLoadingUsers(true);
    try {
      const res = await getAllRegisteredUsers({
        search: userSearch,
        role: userRoleFilter,
        page: userPage,
        limit: 8
      });
      if (res && res.success) {
        setUsersList(res.users || []);
        setUserPagination(res.pagination || { total: res.users?.length || 0, page: 1, pages: 1, limit: 8 });
      }
    } catch {
      // Handled cleanly with resilient fallback in api.js
    } finally {
      setLoadingUsers(false);
    }
  };

  // -------------------------------------------------------------
  // Fetch Proctor Sessions
  // -------------------------------------------------------------
  const fetchProctorSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await getAllProctorSessions();
      if (res.success) {
        setProctorSessions(res.sessions || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingSessions(false);
    }
  };

  // -------------------------------------------------------------
  // Fetch Dashboard Stats
  // -------------------------------------------------------------
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getDashboardStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingStats(false);
    }
  };

  // -------------------------------------------------------------
  // Fetch Candidates List
  // -------------------------------------------------------------
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
    if (portalTab === 'candidates') {
      fetchCandidates();
    } else if (portalTab === 'users') {
      fetchUsersList();
    } else if (portalTab === 'proctoring') {
      fetchProctorSessions();
    }
  }, [portalTab]);

  useEffect(() => {
    fetchCandidates();
  }, [search, roleFilter, minScoreFilter, page]);

  useEffect(() => {
    if (portalTab === 'users') {
      fetchUsersList();
    }
  }, [userSearch, userRoleFilter, userPage]);

  // -------------------------------------------------------------
  // User Management Actions (Promote / Delete)
  // -------------------------------------------------------------
  const handlePromoteOrChangeRole = async (userId, newRole) => {
    try {
      const res = await updateUserRole(userId, { role: newRole });
      if (res.success) {
        showToast?.(`User role updated to ${newRole.toUpperCase()}`, 'success');
        fetchUsersList();
        if (selectedUserDetail && selectedUserDetail._id === userId) {
          setSelectedUserDetail(res.user);
        }
      }
    } catch (err) {
      showToast?.(`Failed to update user role: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user account for "${userName}"?`)) return;
    try {
      const res = await deleteUserAccount(userId);
      if (res.success) {
        showToast?.(`User account "${userName}" deleted successfully`, 'success');
        fetchUsersList();
        if (selectedUserDetail && selectedUserDetail._id === userId) {
          setSelectedUserDetail(null);
        }
      }
    } catch (err) {
      showToast?.(`Failed to delete user: ${err.message}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // Candidate Actions
  // -------------------------------------------------------------
  const handleInspectCandidate = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await getCandidateById(id);
      if (res.success) {
        setSelectedCandidate(res.candidate);
      }
    } catch (err) {
      showToast?.('Failed to fetch candidate details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateCandidate = async (e) => {
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
      showToast?.(err.message || 'Failed to create candidate', 'error');
    }
  };

  const handleStartEdit = (cand) => {
    setEditingCandidate(cand);
    setEditForm({
      candidateDetails: { ...cand.candidateDetails },
      finalAtsScore: cand.finalAtsScore,
      jobDescription: cand.jobDescription || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateCandidate(editingCandidate._id, editForm);
      if (res.success) {
        showToast?.('Candidate updated successfully', 'success');
        setEditingCandidate(null);
        fetchCandidates();
        fetchStats();
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to update candidate', 'error');
    }
  };

  const handleDeleteCandidate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete candidate record for ${name || 'this candidate'}?`)) return;
    try {
      const res = await deleteCandidate(id);
      if (res.success) {
        showToast?.('Candidate deleted successfully', 'success');
        fetchCandidates();
        fetchStats();
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to delete candidate', 'error');
    }
  };

  return (
    <div className="admin-portal-container">
      {/* Admin Access Status Notice */}
      {!isAdmin && (
        <div className="mb-4 p-3 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Administrator Access Portal</span>
              <span className="text-[11px] text-slate-400">
                You are viewing the recruiter dashboard. Sign in as Admin to manage user accounts & role permissions.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="py-1.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-md"
          >
            <KeyRound size={13} />
            <span>Admin Sign In</span>
          </button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="admin-header-section">
        <div>
          <div className="badge badge-indigo">
            <LayoutDashboard size={13} />
            <span>Recruiter Intelligence CRM & Admin Portal</span>
          </div>
          <h1 className="section-title">Candidate Pipeline, User Accounts & AI Proctoring</h1>
          <p className="section-description">
            Audit registered user accounts, manage candidate ATS scores, and inspect real-time 3D camera axis compliance.
          </p>
        </div>

        <div className="admin-top-actions">
          <button 
            type="button" 
            onClick={() => { fetchStats(); fetchCandidates(); fetchProctorSessions(); fetchUsersList(); }} 
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

      {/* KPI Overview Metrics Cards */}
      <div className="admin-stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper icon-cyan">
            <Users size={22} />
          </div>
          <div>
            <span className="stat-label">Total Applicants & Resumes</span>
            <h3 className="stat-value">{stats ? stats.totalApplicants : '--'}</h3>
            <span className="stat-trend trend-positive">
              <TrendingUp size={12} /> Live in MongoDB
            </span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper icon-indigo">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="stat-label">Registered Accounts</span>
            <h3 className="stat-value">{userPagination.total || usersList.length || '--'}</h3>
            <span className="stat-trend trend-positive">
              <ShieldCheck size={12} /> RBAC Protected
            </span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper icon-emerald">
            <Award size={22} />
          </div>
          <div>
            <span className="stat-label">Average ATS Match Score</span>
            <h3 className="stat-value">{stats ? `${stats.averageScore}%` : '--'}</h3>
            <span className="stat-trend">Overall Candidate Average</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper icon-amber">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="stat-label">Proctored Exam Sessions</span>
            <h3 className="stat-value">{proctorSessions.length}</h3>
            <span className="stat-trend trend-positive">
              <CheckCircle2 size={12} /> Vision & Audio Audited
            </span>
          </div>
        </div>
      </div>

      {/* Admin 3-Way Tab Switcher */}
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
          onClick={() => { setPortalTab('users'); fetchUsersList(); }}
          className={`admin-subtab-btn ${portalTab === 'users' ? 'active' : ''}`}
        >
          <UserCheck size={16} />
          <span>Registered User Accounts ({userPagination.total || usersList.length})</span>
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: REGISTERED USER ACCOUNTS (RBAC MANAGEMENT)             */}
      {/* ------------------------------------------------------------- */}
      {portalTab === 'users' && (
        <div className="glass-panel candidates-table-card mt-3">
          {/* Top Filter Bar for Users */}
          <div className="table-controls-bar">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search users by name, email, target role..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                className="search-input"
              />
            </div>

            <div className="filter-controls-group">
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
                className="filter-select"
              >
                <option value="">All Account Roles</option>
                <option value="candidate">Candidate</option>
                <option value="admin">Administrator</option>
                <option value="recruiter">Recruiter</option>
              </select>

              <button
                type="button"
                onClick={fetchUsersList}
                className="btn btn-secondary btn-sm"
                title="Refresh user accounts"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="table-loading-state">
              <div className="spinner-small" />
              <span>Loading user accounts from database...</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="empty-table-state">
              <Users size={40} className="text-muted" />
              <h3 className="empty-title">No User Accounts Found</h3>
              <p className="empty-desc">
                {userSearch || userRoleFilter
                  ? 'No registered users match your search filters.'
                  : 'No users have registered yet. Click "Sign In / Register" in the top bar to create accounts.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User / Candidate</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Specialization / Target Role</th>
                    <th>Account Status</th>
                    <th>Registered Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const isUserAdmin = u.role === 'admin' || u.role === 'recruiter';
                    return (
                      <tr key={u._id || u.id} className="table-row hover:bg-slate-900/60 transition-colors">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isUserAdmin ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white' : 'bg-gradient-to-tr from-cyan-500 to-emerald-500 text-slate-950'
                            }`}>
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-slate-100 block">{u.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono">ID: {u._id || u.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-slate-300 font-mono text-xs">{u.email}</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            isUserAdmin ? 'badge-indigo font-bold' : 'badge-cyan'
                          }`}>
                            {isUserAdmin ? <Shield size={11} className="inline mr-1" /> : <User size={11} className="inline mr-1" />}
                            {u.role ? u.role.toUpperCase() : 'CANDIDATE'}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-slate-300">{u.targetRole || 'Full Stack Developer'}</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            u.status === 'active' ? 'badge-emerald' : 'badge-rose'
                          }`}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-slate-400">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="table-actions-cell justify-end">
                            {/* Inspect User */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserDetail(u)}
                              className="action-icon-btn action-view"
                              title="View user details"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Promote / Demote Role */}
                            {u.role === 'admin' ? (
                              <button
                                type="button"
                                onClick={() => handlePromoteOrChangeRole(u._id || u.id, 'candidate')}
                                className="action-icon-btn action-edit text-amber"
                                title="Demote to Candidate role"
                              >
                                <User size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePromoteOrChangeRole(u._id || u.id, 'admin')}
                                className="action-icon-btn action-edit text-indigo-400"
                                title="Promote to Administrator"
                              >
                                <ShieldCheck size={15} />
                              </button>
                            )}

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u._id || u.id, u.name)}
                              className="action-icon-btn action-delete"
                              title="Delete user account"
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

          {/* User Pagination */}
          {userPagination.pages > 1 && (
            <div className="table-pagination">
              <span className="pagination-info">
                Page {userPagination.page} of {userPagination.pages} ({userPagination.total} users)
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage(userPage - 1)}
                  className="btn btn-secondary btn-xs"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  type="button"
                  disabled={userPage >= userPagination.pages}
                  onClick={() => setUserPage(userPage + 1)}
                  className="btn btn-secondary btn-xs"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CANDIDATE ATS PIPELINE (EXISTING)                       */}
      {/* ------------------------------------------------------------- */}
      {portalTab === 'candidates' && (
        <div className="glass-panel candidates-table-card mt-3">
          {/* Top Filter & Search Controls Bar */}
          <div className="table-controls-bar">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search candidates by name, email, or detected skills..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="search-input"
              />
            </div>

            <div className="filter-controls-group">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="filter-select"
              >
                <option value="">All Roles</option>
                <option value="React">React Developer</option>
                <option value="Node">Node.js Engineer</option>
                <option value="Python">Python AI / ML</option>
                <option value="Full Stack">Full Stack Developer</option>
              </select>

              <select
                value={minScoreFilter}
                onChange={(e) => { setMinScoreFilter(e.target.value); setPage(1); }}
                className="filter-select"
              >
                <option value="">All ATS Scores</option>
                <option value="80">Score &ge; 80% (High Match)</option>
                <option value="60">Score &ge; 60% (Medium Match)</option>
                <option value="40">Score &ge; 40% (Low Match)</option>
              </select>
            </div>
          </div>

          {/* Candidates Data Table */}
          {loadingList ? (
            <div className="table-loading-state">
              <div className="spinner-small" />
              <span>Loading candidate records from database...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="empty-table-state">
              <Users size={40} className="text-muted" />
              <h3 className="empty-title">No Candidates Found</h3>
              <p className="empty-desc">
                {search || roleFilter || minScoreFilter
                  ? 'No candidates match your active search filters.'
                  : 'Start screening resumes in the ATS tab or click "Add Candidate" above.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Target Role</th>
                    <th>ATS Score</th>
                    <th>Skills Detected</th>
                    <th>Status / Verdict</th>
                    <th>Date Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((cand) => {
                    const score = cand.finalAtsScore || 0;
                    const isHigh = score >= 75;
                    const isMed = score >= 50 && score < 75;

                    return (
                      <tr key={cand._id} className="table-row">
                        <td>
                          <div className="candidate-name-cell">
                            <span className="candidate-name-text">
                              {cand.candidateDetails?.fullName || 'Anonymous Candidate'}
                            </span>
                            <span className="candidate-email-text">
                              {cand.candidateDetails?.email || 'No email provided'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="text-role-tag">
                            {cand.candidateDetails?.targetRole || 'Not specified'}
                          </span>
                        </td>
                        <td>
                          <div className="score-pill-container">
                            <div className={`score-badge ${isHigh ? 'score-high' : isMed ? 'score-med' : 'score-low'}`}>
                              {score}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="skills-tags-cluster">
                            {(cand.detectedSkills || []).slice(0, 3).map((sk, i) => (
                              <span key={i} className="mini-skill-tag">{sk}</span>
                            ))}
                            {(cand.detectedSkills || []).length > 3 && (
                              <span className="mini-skill-tag tag-more">
                                +{(cand.detectedSkills || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`verdict-pill ${
                            cand.aiAnalysis?.verdict?.toLowerCase().includes('shortlist') || score >= 75
                              ? 'verdict-shortlisted'
                              : 'verdict-review'
                          }`}>
                            {cand.aiAnalysis?.verdict || (score >= 75 ? 'Shortlisted' : 'Under Review')}
                          </span>
                        </td>
                        <td>
                          <span className="text-date-tag">
                            {new Date(cand.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="table-actions-cell justify-end">
                            <button
                              type="button"
                              onClick={() => handleInspectCandidate(cand._id)}
                              className="action-icon-btn action-view"
                              title="Inspect full candidate report"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(cand)}
                              className="action-icon-btn action-edit"
                              title="Edit candidate ATS details"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCandidate(cand._id, cand.candidateDetails?.fullName)}
                              className="action-icon-btn action-delete"
                              title="Delete candidate record"
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

          {/* Candidate Pagination */}
          {pagination.pages > 1 && (
            <div className="table-pagination">
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} records)
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="btn btn-secondary btn-xs"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="btn btn-secondary btn-xs"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PROCTORING AUDIT SESSIONS (EXISTING)                    */}
      {/* ------------------------------------------------------------- */}
      {portalTab === 'proctoring' && (
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
                  {proctorSessions.map((sess) => (
                    <tr key={sess._id} className="table-row">
                      <td>
                        <div className="candidate-name-cell">
                          <span className="candidate-name-text">{sess.candidateName || 'Candidate'}</span>
                          <span className="candidate-email-text font-mono">Session ID: {sess._id}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-role-tag">{sess.targetRole || 'Full Stack'}</span>
                      </td>
                      <td>
                        <span className={`font-mono font-bold text-sm ${sess.examResult?.score >= 80 ? 'text-emerald' : 'text-cyan'}`}>
                          {sess.examResult?.score !== undefined ? `${sess.examResult.score}%` : '--'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${sess.status === 'terminated' ? 'badge-rose' : 'badge-emerald'}`}>
                          {sess.status === 'terminated' ? 'Axis Deviation / Flagged' : 'Axis Compliant (Center)'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${sess.violations?.length > 0 ? 'badge-amber' : 'badge-emerald'}`}>
                          {sess.violations?.length || 0} Events
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${sess.status === 'terminated' ? 'badge-rose' : 'badge-emerald'}`}>
                          {sess.status?.toUpperCase() || 'COMPLETED'}
                        </span>
                      </td>
                      <td>
                        <span className="text-date-tag">
                          {sess.createdAt ? new Date(sess.createdAt).toLocaleTimeString() : '--'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSession(sess)}
                          className="btn btn-secondary btn-xs"
                        >
                          <Eye size={13} /> View Audit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MODAL 0: USER ACCOUNT DETAILS & RBAC MODAL               */}
      {/* -------------------------------------------------------- */}
      {selectedUserDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedUserDetail(null)}>
          <div className="modal-content glass-panel-elevated modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
                  {selectedUserDetail.name ? selectedUserDetail.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="modal-title">{selectedUserDetail.name}</h3>
                  <span className="text-xs text-muted font-mono">{selectedUserDetail.email}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedUserDetail(null)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Account Role</span>
                  <span className={`badge ${
                    selectedUserDetail.role === 'admin' ? 'badge-indigo font-bold' : 'badge-cyan'
                  }`}>
                    {selectedUserDetail.role?.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Account Status</span>
                  <span className="badge badge-emerald uppercase font-bold">
                    {selectedUserDetail.status || 'ACTIVE'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><Briefcase size={14} /> Target Specialization:</span>
                  <span className="text-white font-medium">{selectedUserDetail.targetRole || 'Full Stack Developer'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><Phone size={14} /> Phone:</span>
                  <span className="text-white font-mono">{selectedUserDetail.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><Mail size={14} /> Email Address:</span>
                  <span className="text-white font-mono">{selectedUserDetail.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><Shield size={14} /> User ID:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{selectedUserDetail._id || selectedUserDetail.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5"><RefreshCw size={14} /> Joined Date:</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {selectedUserDetail.createdAt ? new Date(selectedUserDetail.createdAt).toLocaleString() : 'Recent'}
                  </span>
                </div>
              </div>

              {/* Role Actions */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
                <span className="text-xs font-semibold text-indigo-300 block mb-2">Role Management</span>
                <div className="flex items-center gap-2">
                  {selectedUserDetail.role !== 'admin' ? (
                    <button
                      type="button"
                      onClick={() => handlePromoteOrChangeRole(selectedUserDetail._id || selectedUserDetail.id, 'admin')}
                      className="btn btn-primary btn-xs flex items-center gap-1.5"
                    >
                      <ShieldCheck size={13} /> Promote to Admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePromoteOrChangeRole(selectedUserDetail._id || selectedUserDetail.id, 'candidate')}
                      className="btn btn-secondary btn-xs flex items-center gap-1.5"
                    >
                      <User size={13} /> Change to Candidate
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUserDetail._id || selectedUserDetail.id, selectedUserDetail.name)}
                    className="btn btn-outline btn-xs text-rose-400 hover:bg-rose-500/20"
                  >
                    <Trash2 size={13} /> Delete Account
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-actions mt-4">
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="btn btn-secondary btn-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MODAL 1: CANDIDATE INSPECTION DETAILS MODAL              */}
      {/* -------------------------------------------------------- */}
      {selectedCandidate && (
        <div className="modal-backdrop" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-content glass-panel-elevated modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {selectedCandidate.candidateDetails?.fullName || 'Candidate Details'}
                </h3>
                <span className="modal-subtitle">
                  {selectedCandidate.candidateDetails?.targetRole || 'Specialization'} • ATS Score: {selectedCandidate.finalAtsScore}%
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

            <div className="modal-body space-y-4">
              {/* Profile Overview Pill */}
              <div className="cert-metric-grid">
                <div className="cert-metric-box">
                  <span className="metric-label">Email Address</span>
                  <span className="metric-value font-mono text-xs">{selectedCandidate.candidateDetails?.email || '--'}</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Phone</span>
                  <span className="metric-value font-mono text-xs">{selectedCandidate.candidateDetails?.phone || '--'}</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Experience</span>
                  <span className="metric-value">{selectedCandidate.candidateDetails?.experienceYears || 0} Years</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">ATS Score</span>
                  <span className={`metric-value ${selectedCandidate.finalAtsScore >= 75 ? 'text-emerald' : 'text-amber'}`}>
                    {selectedCandidate.finalAtsScore}%
                  </span>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Tag size={13} className="text-cyan" /> Detected Technical Skills ({selectedCandidate.detectedSkills?.length || 0})
                </h4>
                <div className="skills-tags-cluster">
                  {(selectedCandidate.detectedSkills || []).map((sk, i) => (
                    <span key={i} className="mini-skill-tag">{sk}</span>
                  ))}
                </div>
              </div>

              {/* Launch Exam Shortcut */}
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-cyan-300 block">Proctored Coding Round</span>
                  <span className="text-[11px] text-slate-400">Launch AI proctored assessment for this candidate.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLaunchExamForCandidate?.({
                      candidateId: selectedCandidate._id,
                      candidateName: selectedCandidate.candidateDetails?.fullName,
                      targetRole: selectedCandidate.candidateDetails?.targetRole
                    });
                    setSelectedCandidate(null);
                  }}
                  className="btn btn-primary btn-xs flex items-center gap-1"
                >
                  <Sparkles size={13} /> Launch Exam
                </button>
              </div>
            </div>

            <div className="modal-actions mt-4">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="btn btn-secondary btn-sm"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MODAL 2: ADD CANDIDATE MODAL                             */}
      {/* -------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content glass-panel-elevated modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Candidate Record</h3>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCandidate}>
              <div className="modal-body space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={newCandidateForm.fullName}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="sarah@example.com"
                      value={newCandidateForm.email}
                      onChange={(e) => setNewCandidateForm({ ...newCandidateForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                    <input
                      type="text"
                      required
                      placeholder="+1 (555) 019-2834"
                      value={newCandidateForm.phone}
                      onChange={(e) => setNewCandidateForm({ ...newCandidateForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Role</label>
                  <input
                    type="text"
                    required
                    value={newCandidateForm.targetRole}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, targetRole: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      value={newCandidateForm.experienceYears}
                      onChange={(e) => setNewCandidateForm({ ...newCandidateForm, experienceYears: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ATS Score (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newCandidateForm.finalAtsScore}
                      onChange={(e) => setNewCandidateForm({ ...newCandidateForm, finalAtsScore: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions mt-4">
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
                  <Save size={16} /> Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MODAL 3: EDIT CANDIDATE MODAL                            */}
      {/* -------------------------------------------------------- */}
      {editingCandidate && (
        <div className="modal-backdrop" onClick={() => setEditingCandidate(null)}>
          <div className="modal-content glass-panel-elevated modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Candidate Record</h3>
              <button 
                type="button" 
                onClick={() => setEditingCandidate(null)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.candidateDetails?.fullName || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      candidateDetails: { ...editForm.candidateDetails, fullName: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Role</label>
                  <input
                    type="text"
                    required
                    value={editForm.candidateDetails?.targetRole || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      candidateDetails: { ...editForm.candidateDetails, targetRole: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ATS Score (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.finalAtsScore ?? 80}
                      onChange={(e) => setEditForm({ ...editForm, finalAtsScore: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      value={editForm.candidateDetails?.experienceYears ?? 0}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        candidateDetails: { ...editForm.candidateDetails, experienceYears: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions mt-4">
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
                  <Save size={16} /> Save Changes
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

            <div className="modal-body space-y-4">
              <div className="cert-metric-grid">
                <div className="cert-metric-box">
                  <span className="metric-label">Candidate</span>
                  <span className="metric-value">{selectedSession.candidateName}</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Coding Score</span>
                  <span className="metric-value text-emerald">{selectedSession.examResult?.score ?? '--'}%</span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Test Cases Passed</span>
                  <span className="metric-value text-cyan">
                    {selectedSession.examResult?.totalTestCasesPassed ?? (selectedSession.examResult?.score ? '100%' : '--')}
                    {selectedSession.examResult?.totalTestCases ? ` / ${selectedSession.examResult.totalTestCases}` : ''}
                  </span>
                </div>
                <div className="cert-metric-box">
                  <span className="metric-label">Session Verdict</span>
                  <span className={`metric-value ${selectedSession.status === 'terminated' || selectedSession.violations?.length >= 3 ? 'text-rose' : 'text-emerald'}`}>
                    {selectedSession.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedSession.terminationReason && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/60 rounded-lg text-xs">
                  <span className="font-bold text-rose-400 uppercase tracking-wider block mb-1">
                    Auto-Termination Reason:
                  </span>
                  <p className="text-white font-medium">{selectedSession.terminationReason}</p>
                </div>
              )}

              {/* Hardware permissions */}
              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-xs text-muted">Hardware Permissions:</span>
                <span className="badge badge-emerald flex items-center gap-1">
                  <Camera size={12} /> Camera 3D Axis: {selectedSession.mediaPermissions?.cameraGranted ? 'Enabled' : 'Disabled'}
                </span>
                <span className="badge badge-indigo flex items-center gap-1">
                  <Mic size={12} /> Microphone: {selectedSession.mediaPermissions?.micGranted ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Violations Log */}
              <div>
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
