import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  CourseEnrollmentBarChart,
  AtsHistogramChart,
  ApplicationStatusDonutChart,
  CurriculumLevelChart,
  IntegrityGaugeChart,
} from '../../admin/dashboard/DashboardGraphs';
import {
  BookOpen,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Search,
  FileText,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart,
  ShieldAlert,
  Activity,
  UserCheck,
  Calendar,
  Layers,
  Download,
  Laptop,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'ROSTERS' | 'ACTIVITY' | 'APP_DOWNLOADS'
  const [appDownloads, setAppDownloads] = useState([]);
  const [appDownloadsLoading, setAppDownloadsLoading] = useState(false);
  const [downloadSearchQuery, setDownloadSearchQuery] = useState('');

  const toast = useToast();
  const navigate = useNavigate();

  const fetchLiveAnalytics = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const analytics = await adminApi.getDashboardAnalytics();
      setData(analytics);
      if (analytics?.app_downloads) {
        setAppDownloads(analytics.app_downloads);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
      toast.error(err.message || 'Failed to fetch live platform analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  const fetchAppDownloads = useCallback(async () => {
    setAppDownloadsLoading(true);
    try {
      const res = await adminApi.getAppDownloads();
      if (res?.downloads) {
        setAppDownloads(res.downloads);
      }
    } catch (err) {
      console.error('Failed to load desktop app downloads:', err);
      toast.error('Failed to load app downloads list');
    } finally {
      setAppDownloadsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLiveAnalytics();
  }, [fetchLiveAnalytics]);

  useEffect(() => {
    if (activeTab === 'APP_DOWNLOADS' && appDownloads.length === 0) {
      fetchAppDownloads();
    }
  }, [activeTab, appDownloads.length, fetchAppDownloads]);

  if (isLoading) {
    return <Loader text="Connecting to MongoDB live analytics and calculating visual telemetry..." />;
  }

  const summary = data?.summary || {
    total_users: 0,
    candidate_users: 0,
    admin_users: 0,
    verified_users: 0,
    total_courses: 0,
    total_enrollments: 0,
    total_shortlisted: 0,
    total_rejected: 0,
    total_pending: 0,
    shortlist_rate: 0,
    avg_ats_score: 0,
    total_assignments: 0,
    completed_assignments: 0,
    in_progress_assignments: 0,
    violation_lockouts: 0,
    total_proctor_frames: 0,
    total_app_downloads: 0,
    unique_app_downloads: 0,
  };

  const coursesBreakdown = data?.courses_breakdown || [];
  const atsDistribution = data?.ats_distribution || {
    tier_90_100: 0,
    tier_80_89: 0,
    tier_70_79: 0,
    tier_50_69: 0,
    tier_below_50: 0,
  };
  const courseLevels = data?.course_levels || {};
  const recentApplicants = data?.recent_applicants || [];

  // Filter recent applicants by search
  const filteredApplicants = recentApplicants.filter((app) => {
    const q = searchQuery.toLowerCase();
    return (
      (app.name || '').toLowerCase().includes(q) ||
      (app.email || '').toLowerCase().includes(q) ||
      (app.course_title || '').toLowerCase().includes(q) ||
      (app.college || '').toLowerCase().includes(q)
    );
  });

  // Filter app downloads by search
  const filteredDownloads = appDownloads.filter((dl) => {
    const q = downloadSearchQuery.toLowerCase();
    return (
      (dl.name || '').toLowerCase().includes(q) ||
      (dl.email || '').toLowerCase().includes(q) ||
      (dl.course_title || '').toLowerCase().includes(q) ||
      (dl.ip_address || '').toLowerCase().includes(q)
    );
  });

  // Calculate highest enrollment course for relative percentage bar scaling
  const maxEnrollments = Math.max(...coursesBreakdown.map((c) => c.enrolled_count), 1);
  const totalAtsEvaluations = Object.values(atsDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <style>{`
        .metric-card-link {
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
          user-select: none;
        }
        .metric-card-link:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
          filter: brightness(1.08);
        }
        .metric-card-link:active {
          transform: translateY(-1px);
        }
      `}</style>

      {/* TOP TIER: 7 LIVE KPI METRIC CARDS (CLICKABLE REDIRECTS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Metric 1: Total Users -> /admin/users */}
        <Card
          elevated
          className="metric-card-link"
          style={{ position: 'relative', overflow: 'hidden' }}
          onClick={() => navigate('/admin/users')}
          title="Click to view and manage candidate & admin accounts"
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Registered Users</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {summary.total_users}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span>Candidates: <strong style={{ color: '#fff' }}>{summary.candidate_users}</strong></span>
            <span>Admins: <strong style={{ color: '#818cf8' }}>{summary.admin_users}</strong></span>
          </div>
        </Card>

        {/* Metric 2: Total Active Courses -> /admin/courses */}
        <Card
          elevated
          className="metric-card-link"
          style={{ position: 'relative', overflow: 'hidden' }}
          onClick={() => navigate('/admin/courses')}
          title="Click to view and manage courses & curricula"
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Active Courses</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <BookOpen size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {summary.total_courses}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#38bdf8' }}>
            Active curricula in public catalog
          </div>
        </Card>

        {/* Metric 3: Total Registered Course Enrollments -> /admin/enrollments */}
        <Card
          elevated
          className="metric-card-link"
          style={{ position: 'relative', overflow: 'hidden' }}
          onClick={() => navigate('/admin/enrollments')}
          title="Click to view all candidate applications & enrollments"
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #c084fc, #a855f7)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Registrations</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
              <GraduationCap size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {summary.total_enrollments}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#c084fc' }}>
            Course applications received
          </div>
        </Card>

        {/* Metric 4: AI Shortlisted Candidates -> /admin/enrollments?status=SHORTLISTED */}
        <Card
          elevated
          className="metric-card-link"
          style={{ position: 'relative', overflow: 'hidden', borderLeft: '3px solid #10b981' }}
          onClick={() => navigate('/admin/enrollments?status=SHORTLISTED')}
          title="Click to view shortlisted candidates (ATS ≥ 70)"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Shortlisted Candidates</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
            {summary.total_shortlisted}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#6ee7b7' }}>
            {summary.shortlist_rate}% qualification rate (ATS ≥ 70)
          </div>
        </Card>

        {/* Metric 5: Average ATS Match Score -> /admin/enrollments */}
        <Card
          elevated
          className="metric-card-link"
          style={{ position: 'relative', overflow: 'hidden', borderLeft: '3px solid #f59e0b' }}
          onClick={() => navigate('/admin/enrollments')}
          title="Click to view candidate ATS score rankings & evaluations"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Average ATS Score</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1.1 }}>
            {summary.avg_ats_score}%
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#fbbf24' }}>
            Gemini AI automated resume benchmark
          </div>
        </Card>

        {/* Metric 6: Proctoring & Integrity Telemetry -> /admin/enrollments */}
        <Card
          elevated
          className="metric-card-link"
          style={{ position: 'relative', overflow: 'hidden', borderLeft: '3px solid #f43f5e' }}
          onClick={() => navigate('/admin/enrollments')}
          title="Click to view scheduled assessments & exam integrity results"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Proctoring Telemetry</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fda4af', lineHeight: 1.1 }}>
            {summary.total_assignments}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#f43f5e' }}>{summary.violation_lockouts}</strong> integrity violations flagged
          </div>
        </Card>

        {/* Metric 7: Windows Desktop App Downloads -> /admin/app-downloads */}
        <Card
          elevated
          className="metric-card-link"
          style={{ position: 'relative', overflow: 'hidden', borderLeft: '3px solid #0284c7' }}
          onClick={() => navigate('/admin/app-downloads')}
          title="Click to view full candidate list who downloaded the Windows desktop application (.exe)"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Windows App Downloads</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
              <Download size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.1 }}>
            {summary.total_app_downloads || 0}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#38bdf8' }}>{summary.unique_app_downloads || 0}</strong> unique candidate{summary.unique_app_downloads === 1 ? '' : 's'} downloaded
          </div>
        </Card>
      </div>

      {/* MIDDLE TIER: VISUAL DATA CHARTS & COMPARISONS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <CourseEnrollmentBarChart
          courses={coursesBreakdown}
          totalEnrollments={summary.total_enrollments}
        />
        <AtsHistogramChart
          atsDistribution={atsDistribution}
          totalEvaluations={totalAtsEvaluations}
          avgAtsScore={summary.avg_ats_score}
        />
      </div>

      {/* THIRD TIER: PLATFORM RATIOS & ASSESSMENT TELEMETRY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <ApplicationStatusDonutChart summary={summary} />
        <CurriculumLevelChart courseLevels={courseLevels} />
        <IntegrityGaugeChart summary={summary} />
      </div>

      {/* MAIN DATA TABLES & ROSTERS SECTION */}
      <Card elevated id="dashboard-tables-section">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
          }}
        >
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: activeTab === 'OVERVIEW' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'OVERVIEW' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <BarChart3 size={15} />
              <span>Live Courses Roster Summary ({coursesBreakdown.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ACTIVITY')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: activeTab === 'ACTIVITY' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'ACTIVITY' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Activity size={15} />
              <span>Recent Registered Candidates ({recentApplicants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('APP_DOWNLOADS')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: activeTab === 'APP_DOWNLOADS' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'APP_DOWNLOADS' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Download size={15} />
              <span>Windows App Downloads ({appDownloads.length || summary.total_app_downloads || 0})</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              to="/admin/enrollments"
              style={{
                fontSize: '0.85rem',
                color: 'var(--primary)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none',
              }}
            >
              <span>Manage Candidates & Schedule Exams</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {activeTab === 'OVERVIEW' ? (
          /* Courses Breakdown Table */
          <div>
            {coursesBreakdown.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                No active courses configured in database.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Course Track Title</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Instructor</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Level</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Registered Candidates</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Shortlisted (ATS ≥ 70)</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Avg ATS Match</th>
                      <th style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursesBreakdown.map((course) => {
                      const shortlistPct =
                        course.enrolled_count > 0
                          ? Math.round((course.shortlisted_count / course.enrolled_count) * 100)
                          : 0;

                      return (
                        <tr key={course.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.85rem 0.6rem', fontWeight: 600, color: '#fff' }}>
                            {course.title}
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem', color: 'var(--text-secondary)' }}>
                            {course.instructor}
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            <Badge variant={course.level === 'Advanced' ? 'warning' : 'primary'}>
                              {course.level}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{course.enrolled_count}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({course.percentage_of_total}% of platform)
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                              {course.shortlisted_count}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                              ({shortlistPct}%)
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            <Badge variant="warning">{course.avg_ats_score}%</Badge>
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem', textAlign: 'right' }}>
                            <Link
                              to={`/admin/courses/${course.id}/roster`}
                              className="btn btn-secondary btn-sm"
                              style={{ textDecoration: 'none', display: 'inline-flex', gap: '0.3rem' }}
                            >
                              <span>View Roster</span>
                              <ArrowRight size={13} />
                            </Link>
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
          /* Recent Candidate Activity Stream */
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1rem',
                padding: '0.6rem 0.8rem',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search candidates by name, email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.85rem',
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>

            {filteredApplicants.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                No candidate registrations matching your filter.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Candidate</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Course Track</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>ATS Match</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Exam Status</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Enrolled At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.map((app, idx) => {
                      const isShort = app.application_status === 'shortlisted' || (app.ats_score && app.ats_score >= 70);

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{app.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{app.email}</div>
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem', color: 'var(--text-secondary)' }}>
                            {app.course_title}
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            {app.ats_score != null ? (
                              <Badge variant={app.ats_score >= 70 ? 'success' : 'danger'}>
                                {app.ats_score}% ATS
                              </Badge>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            <Badge variant={isShort ? 'success' : 'danger'}>
                              {isShort ? 'Shortlisted' : 'Not Shortlisted'}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem' }}>
                            {app.interview_status === 'completed' ? (
                              <Badge variant="success" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                                ★ Interview: {app.interview_verdict || 'Passed'} ({Math.round(app.interview_score || 0)}%)
                              </Badge>
                            ) : app.interview_status === 'in_progress' ? (
                              <Badge variant="primary">
                                AI Interview Live
                              </Badge>
                            ) : app.assignment_status === 'submitted' ? (
                              (app.assignment_score ?? 0) >= 50 ? (
                                <Badge variant="success">
                                  ★ AI Interview Qualified ({Math.round(app.assignment_score ?? 0)}%)
                                </Badge>
                              ) : (
                                <Badge variant="warning">
                                  Score: {Math.round(app.assignment_score ?? 0)}% (&lt;50%)
                                </Badge>
                              )
                            ) : app.assignment_scheduled ? (
                              <Badge variant="primary">
                                <Clock size={11} style={{ marginRight: '3px' }} /> Scheduled
                              </Badge>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Unscheduled</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {formatDate(app.enrolled_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'APP_DOWNLOADS' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '420px' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search by candidate name, email, course, or IP..."
                  value={downloadSearchQuery}
                  onChange={(e) => setDownloadSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Total Downloads: <strong style={{ color: '#38bdf8' }}>{appDownloads.length}</strong> (Unique Candidates: <strong style={{ color: '#10b981' }}>{summary.unique_app_downloads || 0}</strong>)
                </span>
                <Link
                  to="/admin/app-downloads"
                  style={{
                    padding: '0.45rem 0.85rem',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    color: '#818cf8',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Full Screen Page</span>
                </Link>
                <button
                  onClick={fetchAppDownloads}
                  disabled={appDownloadsLoading}
                  style={{
                    padding: '0.45rem 0.85rem',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={13} className={appDownloadsLoading ? 'animate-spin' : ''} />
                  <span>Refresh List</span>
                </button>
              </div>
            </div>

            {filteredDownloads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                <Download size={44} style={{ margin: '0 auto 1rem', opacity: 0.35, color: '#38bdf8' }} />
                <h4 style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  No Windows Application Downloads Recorded
                </h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto', color: '#94a3b8' }}>
                  When shortlisted candidates download <strong>AIAssignmentSetup.exe</strong> from their invitation email or portal, their details, timestamp, and client telemetry will appear here in real time.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Candidate</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Target Course / Track</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Download Time</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Client IP</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Platform</th>
                      <th style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>Application Installer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDownloads.map((dl) => (
                      <tr key={dl.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem 0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                              }}
                            >
                              {(dl.name || dl.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                                {dl.name || 'Anonymous User'}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {dl.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.6rem' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                            {dl.course_title || 'General Assessment'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} color="#94a3b8" />
                            <span>{new Date(dl.downloaded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.6rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
                            {dl.ip_address || 'unknown'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.78rem' }} title={dl.user_agent}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Laptop size={13} color="#38bdf8" />
                            <span>{dl.user_agent?.includes('Windows') ? 'Windows Desktop' : (dl.user_agent ? dl.user_agent.slice(0, 25) + '...' : 'Windows Client')}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.6rem', textAlign: 'right' }}>
                          <Badge variant="success">
                            <CheckCircle size={11} style={{ marginRight: '4px' }} />
                            AIAssignmentSetup.exe
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
