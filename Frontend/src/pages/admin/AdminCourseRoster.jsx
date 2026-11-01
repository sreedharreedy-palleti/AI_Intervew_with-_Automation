import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Sparkles,
  Award,
  Trash2,
  Mail,
  Send,
} from 'lucide-react';
import { formatDate, getResumeUrl } from '../../utils/formatters';

const AdminCourseRoster = () => {
  const { courseId } = useParams();
  const [rosterData, setRosterData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({
    assignment_datetime: '',
    duration_minutes: 60,
    assignment_policy: `1. Time Limit: The technical simulation must be completed within 60 minutes.\n2. Browser Requirement: Must be opened and completed exclusively in Google Chrome browser.\n3. Proctoring: Ensure active webcam, microphone, and full-screen browser mode.\n4. Zero Tolerance: Tab switching and external code assistance are strictly prohibited.\n5. Submission: Answers must be submitted before the countdown timer expires.`,
    send_email: true,
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const toast = useToast();

  const fetchRoster = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getCourseEnrolledUsers(courseId);
      setRosterData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch enrolled students roster');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEnrollment = async (userId, candidateName) => {
    if (!window.confirm(`Are you sure you want to remove "${candidateName}" from this course roster?`)) {
      return;
    }

    setActionLoadingId(userId);
    try {
      await adminApi.deleteEnrollment(courseId, userId);
      toast.success(`Enrollment for ${candidateName} removed successfully.`);
      const data = await adminApi.getCourseEnrolledUsers(courseId);
      setRosterData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to delete enrollment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTomorrowDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openScheduleModalSingle = (student) => {
    setScheduleTarget(student);
    setScheduleFormData({
      assignment_datetime: student.assignment_datetime || getTomorrowDefaultDateTime(),
      duration_minutes: student.duration_minutes || 60,
      assignment_policy:
        student.assignment_policy ||
        `1. Time Limit: The technical simulation must be completed within 60 minutes.\n2. Browser Requirement: Must be opened and completed exclusively in Google Chrome browser.\n3. Proctoring: Ensure active webcam, microphone, and full-screen browser mode.\n4. Zero Tolerance: Tab switching and external code assistance are strictly prohibited.\n5. Submission: Answers must be submitted before the countdown timer expires.`,
      send_email: true,
    });
    setIsScheduleModalOpen(true);
  };

  const openScheduleModalBroadcast = () => {
    setScheduleTarget(null);
    setScheduleFormData({
      assignment_datetime: getTomorrowDefaultDateTime(),
      duration_minutes: 60,
      assignment_policy: `1. Time Limit: The technical simulation must be completed within 60 minutes.\n2. Browser Requirement: Must be opened and completed exclusively in Google Chrome browser.\n3. Proctoring: Ensure active webcam, microphone, and full-screen browser mode.\n4. Zero Tolerance: Tab switching and external code assistance are strictly prohibited.\n5. Submission: Answers must be submitted before the countdown timer expires.`,
      send_email: true,
    });
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleFormData.assignment_datetime) {
      toast.error('Please specify the assignment date and time');
      return;
    }

    setScheduleLoading(true);
    try {
      if (scheduleTarget) {
        await adminApi.scheduleCandidateAssignment(
          courseId,
          scheduleTarget.user_id,
          scheduleFormData
        );
        toast.success(
          scheduleFormData.send_email
            ? `Assignment scheduled & Gmail sent to ${scheduleTarget.name}!`
            : `Assignment scheduled successfully for ${scheduleTarget.name}!`
        );
      } else {
        const res = await adminApi.broadcastCourseAssignment(courseId, scheduleFormData);
        toast.success(
          scheduleFormData.send_email
            ? `Assignment scheduled & Gmails sent to ${res.candidates_count || 0} candidate(s)!`
            : `Assignment scheduled for ${res.candidates_count || 0} candidate(s)!`
        );
      }
      setIsScheduleModalOpen(false);
      fetchRoster();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule assignment');
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [courseId]);

  if (isLoading) {
    return <Loader text="Loading applicant roster and resumes..." />;
  }

  if (!rosterData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h3>Course Roster Not Found</h3>
        <Link to="/admin/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Courses
        </Link>
      </div>
    );
  }

  const { course_title, total_enrolled_count = 0, enrolled_users = [] } = rosterData;

  const isShortlisted = (student) =>
    student.application_status === 'shortlisted' || (student.ats_score != null && student.ats_score >= 70);

  const isRejected = (student) =>
    student.application_status === 'rejected' || (student.ats_score != null && student.ats_score < 70);

  const shortlistedCount = enrolled_users.filter(isShortlisted).length;
  const rejectedCount = enrolled_users.filter(isRejected).length;
  const pendingCount = Math.max(0, enrolled_users.length - shortlistedCount - rejectedCount);

  // Filter logic
  const filteredUsers = enrolled_users.filter((student) => {
    const matchesSearch =
      (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.college || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'SHORTLISTED') return isShortlisted(student);
    if (statusFilter === 'NOT_SHORTLISTED') return isRejected(student);
    if (statusFilter === 'PENDING') return !isShortlisted(student) && !isRejected(student);

    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Navigation & Header */}
      <Link
        to="/admin/courses"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Courses List</span>
      </Link>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{course_title}</h2>
            <Badge variant="primary">{total_enrolled_count} Total Enrolled</Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Candidate profiles, ATS scores, and shortlisting status for this course.
          </p>
        </div>

        {shortlistedCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Calendar size={14} />}
            onClick={openScheduleModalBroadcast}
            style={{
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
            }}
          >
            Schedule Course Assignment ({shortlistedCount})
          </Button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <Card style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>Total Enrolled</span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem' }}>
            {total_enrolled_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            All candidate applications
          </div>
        </Card>

        <Card style={{ padding: '1.15rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>Shortlisted</span>
            <CheckCircle size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: '#10b981' }}>
            {shortlistedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>
            ATS Match ≥ 70% (Qualified)
          </div>
        </Card>

        <Card style={{ padding: '1.15rem', borderLeft: '3px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>Not Shortlisted</span>
            <XCircle size={16} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: '#f43f5e' }}>
            {rejectedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '0.2rem' }}>
            ATS Match &lt; 70% (Below threshold)
          </div>
        </Card>

        {pendingCount > 0 && (
          <Card style={{ padding: '1.15rem', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
              <span>Under Review</span>
              <Clock size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: '#f59e0b' }}>
              {pendingCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.2rem' }}>
              Pending ATS evaluation
            </div>
          </Card>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 260px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by candidate name, email, college..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.88rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All (${total_enrolled_count})` },
            { id: 'SHORTLISTED', label: `Shortlisted (${shortlistedCount})` },
            { id: 'NOT_SHORTLISTED', label: `Not Shortlisted (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: statusFilter === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === tab.id ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table */}
      <Card>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Candidates Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'No enrolled candidates match the current filter or search criteria.'
                : 'Candidates who apply and submit their resumes from the catalog will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>College & Year</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>ATS Match</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Shortlist Status</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Enrolled On</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Resume File</th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((student, idx) => {
                  const shortlisted = isShortlisted(student);
                  const rejected = isRejected(student);
                  const isBusy = actionLoadingId === (student.user_id || student.email);

                  return (
                    <tr key={student.user_id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* Candidate Name & Email */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: '0.92rem' }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {student.email}
                        </div>
                      </td>

                      {/* College & Year */}
                      <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <GraduationCap size={15} color="#818cf8" />
                          <span>{student.college || 'N/A'}</span>
                        </div>
                        {student.year && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '1.25rem' }}>
                            Graduation: {student.year}
                          </div>
                        )}
                      </td>

                      {/* ATS Score */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        {student.ats_score != null ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  color: student.ats_score >= 70 ? '#10b981' : '#f43f5e',
                                }}
                              >
                                {student.ats_score}%
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {student.ats_score >= 70 ? 'Pass' : 'Low'}
                              </span>
                            </div>
                            <div
                              style={{
                                width: '70px',
                                height: '5px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                marginTop: '4px',
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
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending</span>
                        )}
                      </td>

                      {/* Shortlist Status */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        {shortlisted ? (
                          <div>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.65rem',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                borderRadius: 'var(--radius-full)',
                                color: '#6ee7b7',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle size={14} color="#10b981" />
                              <span>Shortlisted</span>
                            </div>

                            {student.interview_status === 'completed' ? (
                              <div style={{ marginTop: '0.35rem' }}>
                                <Badge variant="success" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                                  ★ Interview: {student.interview_verdict || 'Completed'} ({Math.round(student.interview_score || 0)}%)
                                </Badge>
                              </div>
                            ) : student.assignment_status === 'submitted' ? (
                              <div style={{ marginTop: '0.35rem' }}>
                                {(student.assignment_score ?? 0) >= 50 ? (
                                  <Badge variant="success" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                                    ★ AI Interview Qualified ({Math.round(student.assignment_score ?? 0)}%)
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                                    Score: {Math.round(student.assignment_score ?? 0)}% (&lt;50%)
                                  </Badge>
                                )}
                              </div>
                            ) : student.assignment_datetime ? (
                              <div
                                style={{
                                  marginTop: '0.35rem',
                                  fontSize: '0.73rem',
                                  color: '#38bdf8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <Calendar size={11} color="#38bdf8" />
                                <span>{student.assignment_datetime.replace('T', ' ')} ({student.duration_minutes || 60}m)</span>
                                {student.assignment_email_sent_at && (
                                  <span
                                    title="Gmail notification sent"
                                    style={{ display: 'inline-flex', alignItems: 'center', color: '#34d399' }}
                                  >
                                    <Mail size={11} />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div
                                style={{
                                  marginTop: '0.35rem',
                                  fontSize: '0.73rem',
                                  color: '#f59e0b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <Clock size={11} color="#f59e0b" />
                                <span>Schedule Pending</span>
                              </div>
                            )}
                          </div>
                        ) : rejected ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.3rem 0.65rem',
                              background: 'rgba(244, 63, 94, 0.12)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              borderRadius: 'var(--radius-full)',
                              color: '#fda4af',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                            }}
                          >
                            <XCircle size={14} color="#f43f5e" />
                            <span>Not Shortlisted</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.3rem 0.65rem',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: 'var(--radius-full)',
                              color: '#fcd34d',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            <Clock size={14} color="#f59e0b" />
                            <span>Under Review</span>
                          </div>
                        )}
                      </td>

                      {/* Enrolled At Date */}
                      <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {formatDate(student.enrolled_at)}
                      </td>

                      {/* Resume Document Link */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        {student.resume_path ? (
                          <a
                            href={getResumeUrl(student.resume_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              color: '#818cf8',
                              borderColor: 'rgba(99, 102, 241, 0.4)',
                              fontSize: '0.78rem',
                            }}
                          >
                            <FileText size={14} />
                            <span>Resume</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No file</span>
                        )}
                      </td>

                      {/* Action buttons (Schedule & Delete) */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          {shortlisted && (
                            <button
                              onClick={() => openScheduleModalSingle(student)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.78rem',
                                color: '#38bdf8',
                                borderColor: 'rgba(56, 189, 248, 0.4)',
                              }}
                              title="Schedule Assignment Date & Time + Send Gmail"
                            >
                              <Calendar size={13} />
                              <span>Schedule</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteEnrollment(student.user_id, student.name)}
                            disabled={isBusy}
                            className="btn btn-secondary btn-sm"
                            style={{
                              color: '#ef4444',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.55rem',
                            }}
                            title="Delete enrollment"
                          >
                            <Trash2 size={13} />
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
      </Card>

      {/* Schedule Assignment Modal */}
      {isScheduleModalOpen && (
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title={
            scheduleTarget
              ? `Schedule Assignment: ${scheduleTarget.name}`
              : `Schedule Assignment for Shortlisted Candidates (${shortlistedCount})`
          }
          maxWidth="640px"
        >
          <form onSubmit={handleScheduleSubmit}>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
              }}
            >
              {scheduleTarget ? (
                <div>
                  <div style={{ fontWeight: 700, color: '#f0f9ff' }}>
                    Candidate: {scheduleTarget.name} ({scheduleTarget.email})
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                    Course Track: <strong style={{ color: '#fff' }}>{course_title}</strong>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, color: '#f0f9ff' }}>
                    Broadcast to All Shortlisted Candidates ({shortlistedCount})
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                    An official Gmail will be dispatched to each shortlisted student with the scheduled date, time, policy rules, and test link.
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Assignment Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleFormData.assignment_datetime}
                  onChange={(e) =>
                    setScheduleFormData({ ...scheduleFormData, assignment_datetime: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="360"
                  required
                  value={scheduleFormData.duration_minutes}
                  onChange={(e) =>
                    setScheduleFormData({ ...scheduleFormData, duration_minutes: Number(e.target.value) })
                  }
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Assignment Policy & Proctoring Guidelines *
              </label>
              <textarea
                rows={5}
                required
                value={scheduleFormData.assignment_policy}
                onChange={(e) =>
                  setScheduleFormData({ ...scheduleFormData, assignment_policy: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Included in the email and candidate portal before launching the assessment simulation.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                marginBottom: '1.5rem',
              }}
            >
              <input
                type="checkbox"
                id="rosterSendGmailCheck"
                checked={scheduleFormData.send_email}
                onChange={(e) =>
                  setScheduleFormData({ ...scheduleFormData, send_email: e.target.checked })
                }
                style={{ marginTop: '0.2rem', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <label htmlFor="rosterSendGmailCheck" style={{ fontSize: '0.82rem', color: '#e5e7eb', cursor: 'pointer' }}>
                <strong style={{ color: '#34d399' }}>Dispatch Gmail Notification Automatically</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                  Sends an official email with scheduled date & time, policy guidelines, and test link.
                </p>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={scheduleLoading}
                icon={<Send size={15} />}
              >
                {scheduleFormData.send_email ? 'Schedule & Send Gmail' : 'Save Schedule'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminCourseRoster;
