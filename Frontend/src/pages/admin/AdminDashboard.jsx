import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  BookOpen,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  ShieldCheck,
  Award,
  Search,
  FileText,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { formatDate, getResumeUrl } from '../../utils/formatters';

const AdminDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('APPLICANTS'); // 'APPLICANTS' | 'COURSES'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const toast = useToast();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [coursesData, usersData] = await Promise.all([
        adminApi.listCourses(),
        adminApi.listUsers(),
      ]);
      setCourses(coursesData || []);
      setUsers(usersData || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch admin stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return <Loader text="Calculating system statistics and loading rosters..." />;
  }

  // Aggregate all enrolled candidates across all courses
  const allApplicants = courses.flatMap((course) =>
    (course.enrolled_students || []).map((student) => ({
      ...student,
      course_id: course.id,
      course_title: course.title,
    }))
  );

  const isShortlisted = (s) =>
    s.application_status === 'shortlisted' || (s.ats_score != null && s.ats_score >= 70);

  const isRejected = (s) =>
    s.application_status === 'rejected' || (s.ats_score != null && s.ats_score < 70);

  const totalCourses = courses.length;
  const totalUsers = users.length;
  const totalEnrollments = allApplicants.length;
  const totalShortlisted = allApplicants.filter(isShortlisted).length;
  const totalRejected = allApplicants.filter(isRejected).length;

  // Filter applicants
  const filteredApplicants = allApplicants.filter((applicant) => {
    const matchesSearch =
      (applicant.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant.course_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant.college || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'SHORTLISTED') return isShortlisted(applicant);
    if (statusFilter === 'NOT_SHORTLISTED') return isRejected(applicant);
    if (statusFilter === 'PENDING') return !isShortlisted(applicant) && !isRejected(applicant);

    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Platform Intelligence Overview</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Live metrics from MongoDB database, enrolled applicants, and AI ATS shortlisting.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/courses" className="btn btn-primary btn-sm">
            <Plus size={15} />
            <span>Manage Courses</span>
          </Link>
          <Link to="/admin/users" className="btn btn-secondary btn-sm">
            <Users size={15} />
            <span>Manage Candidates</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-metrics">
        <Card elevated>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Courses</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <BookOpen size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalCourses}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#818cf8', marginTop: '0.25rem' }}>
            Active curricula in catalog
          </div>
        </Card>

        <Card elevated>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Enrolled Applicants</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalEnrollments}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#c084fc', marginTop: '0.25rem' }}>
            Course enrollments received
          </div>
        </Card>

        <Card elevated style={{ borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Shortlisted Candidates</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
            {totalShortlisted}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6ee7b7', marginTop: '0.25rem' }}>
            ATS Match ≥ 70% ({totalEnrollments > 0 ? Math.round((totalShortlisted / totalEnrollments) * 100) : 0}% qualified)
          </div>
        </Card>

        <Card elevated style={{ borderLeft: '3px solid #f43f5e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Not Shortlisted</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af' }}>
              <XCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f43f5e' }}>
            {totalRejected}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fda4af', marginTop: '0.25rem' }}>
            ATS Match &lt; 70% threshold
          </div>
        </Card>
      </div>

      {/* Main Section with Tab Switcher */}
      <Card style={{ marginTop: '2rem' }}>
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
          {/* View Mode Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('APPLICANTS')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: activeTab === 'APPLICANTS' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'APPLICANTS' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Users size={15} />
              <span>All Enrolled Candidates & Shortlist Status ({totalEnrollments})</span>
            </button>

            <button
              onClick={() => setActiveTab('COURSES')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: activeTab === 'COURSES' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'COURSES' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <BookOpen size={15} />
              <span>Courses Roster Summary ({courses.length})</span>
            </button>
          </div>

          <Link to="/admin/courses" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Manage All Courses</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {activeTab === 'APPLICANTS' ? (
          <div>
            {/* Search and Filters */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                marginBottom: '1rem',
                padding: '0.65rem 0.85rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 240px' }}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search by candidate name, email, course title..."
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

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[
                  { id: 'ALL', label: `All (${totalEnrollments})` },
                  { id: 'SHORTLISTED', label: `Shortlisted (${totalShortlisted})` },
                  { id: 'NOT_SHORTLISTED', label: `Not Shortlisted (${totalRejected})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      background: statusFilter === tab.id ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                      color: statusFilter === tab.id ? '#818cf8' : 'var(--text-muted)',
                      border: statusFilter === tab.id ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Enrolled Applicants Table */}
            {filteredApplicants.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2.5rem' }}>
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No candidates found matching the selected filter.'
                  : 'No course enrollments found yet.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.65rem' }}>Candidate</th>
                      <th style={{ padding: '0.75rem 0.65rem' }}>Enrolled Course</th>
                      <th style={{ padding: '0.75rem 0.65rem' }}>College / University</th>
                      <th style={{ padding: '0.75rem 0.65rem' }}>ATS Match</th>
                      <th style={{ padding: '0.75rem 0.65rem' }}>Shortlist Status</th>
                      <th style={{ padding: '0.75rem 0.65rem' }}>Date</th>
                      <th style={{ padding: '0.75rem 0.65rem', textAlign: 'right' }}>Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.map((student, idx) => {
                      const shortlisted = isShortlisted(student);
                      const rejected = isRejected(student);

                      return (
                        <tr key={`${student.course_id}-${student.user_id}-${idx}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {/* Candidate info */}
                          <td style={{ padding: '0.85rem 0.65rem' }}>
                            <div style={{ fontWeight: 700, color: '#f9fafb' }}>{student.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{student.email}</div>
                          </td>

                          {/* Course title */}
                          <td style={{ padding: '0.85rem 0.65rem' }}>
                            <Link
                              to={`/admin/courses/${student.course_id}/roster`}
                              style={{ color: '#c084fc', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                              {student.course_title}
                            </Link>
                          </td>

                          {/* College */}
                          <td style={{ padding: '0.85rem 0.65rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <GraduationCap size={14} color="#818cf8" />
                              <span>{student.college || 'N/A'}</span>
                            </div>
                            {student.year && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '1.15rem' }}>
                                Class of {student.year}
                              </div>
                            )}
                          </td>

                          {/* ATS Score */}
                          <td style={{ padding: '0.85rem 0.65rem' }}>
                            {student.ats_score != null ? (
                              <div>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: '0.92rem',
                                    color: student.ats_score >= 70 ? '#10b981' : '#f43f5e',
                                  }}
                                >
                                  {student.ats_score}%
                                </span>
                                <div
                                  style={{
                                    width: '60px',
                                    height: '4px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    marginTop: '3px',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${Math.min(100, student.ats_score)}%`,
                                      height: '100%',
                                      background: student.ats_score >= 70 ? '#10b981' : '#f43f5e',
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Pending</span>
                            )}
                          </td>

                          {/* Shortlist Status */}
                          <td style={{ padding: '0.85rem 0.65rem' }}>
                            {shortlisted ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.25rem 0.6rem',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  borderRadius: 'var(--radius-full)',
                                  color: '#6ee7b7',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                }}
                              >
                                <CheckCircle size={13} color="#10b981" />
                                <span>Shortlisted</span>
                              </div>
                            ) : rejected ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.25rem 0.6rem',
                                  background: 'rgba(244, 63, 94, 0.12)',
                                  border: '1px solid rgba(244, 63, 94, 0.3)',
                                  borderRadius: 'var(--radius-full)',
                                  color: '#fda4af',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                }}
                              >
                                <XCircle size={13} color="#f43f5e" />
                                <span>Not Shortlisted</span>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.25rem 0.6rem',
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: 'var(--radius-full)',
                                  color: '#fcd34d',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                <Clock size={13} color="#f59e0b" />
                                <span>Under Review</span>
                              </div>
                            )}
                          </td>

                          {/* Date */}
                          <td style={{ padding: '0.85rem 0.65rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {formatDate(student.enrolled_at)}
                          </td>

                          {/* Resume Link */}
                          <td style={{ padding: '0.85rem 0.65rem', textAlign: 'right' }}>
                            {student.resume_path ? (
                              <a
                                href={getResumeUrl(student.resume_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  color: '#818cf8',
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.55rem',
                                }}
                              >
                                <FileText size={13} />
                                <span>Resume</span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No file</span>
                            )}
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
          /* Courses Summary Table */
          <div>
            {courses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                No courses found in database.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Course Title</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Instructor</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Duration</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Level</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Enrolled Applicants</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>{course.title}</td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>{course.instructor}</td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>{course.duration_weeks} wks</td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <Badge variant="primary">{course.level}</Badge>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <Badge variant="success">{course.enrolled_count} candidates</Badge>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                          <Link
                            to={`/admin/courses/${course.id}/roster`}
                            className="btn btn-secondary btn-sm"
                            style={{ textDecoration: 'none' }}
                          >
                            <span>View Roster</span>
                            <ArrowRight size={13} />
                          </Link>
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
