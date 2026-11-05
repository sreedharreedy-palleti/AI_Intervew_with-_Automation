import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Search,
  Filter,
  FileText,
  ExternalLink,
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Calendar,
  Mail,
  Send,
  AlertCircle,
  Download,
} from 'lucide-react';
import { formatDate, getResumeUrl } from '../../utils/formatters';

const AdminEnrollments = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') || 'ALL').toUpperCase();

  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(
    ['ALL', 'SHORTLISTED', 'NOT_SHORTLISTED'].includes(initialStatus) ? initialStatus : 'ALL'
  );
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Manual Enroll Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollFormData, setEnrollFormData] = useState({
    course_id: '',
    name: '',
    email: '',
    college: '',
    year: '2025',
    ats_score: 80,
    application_status: 'shortlisted',
  });
  const [enrollLoading, setEnrollLoading] = useState(false);

  // Edit Candidate Modal State (Full CRUD)
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    college: '',
    year: '2025',
    ats_score: 75,
    application_status: 'shortlisted',
    unique_code: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Schedule Assignment Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null); // null = broadcast
  const [scheduleTargetCourseId, setScheduleTargetCourseId] = useState('');
  const [scheduleFormData, setScheduleFormData] = useState({
    assignment_datetime: '',
    duration_minutes: 60,
    assignment_policy: `1. Time Limit: The technical simulation must be completed within 60 minutes.\n2. Browser Requirement: Must be opened and completed exclusively in Google Chrome browser.\n3. Proctoring: Ensure active webcam, microphone, and full-screen browser mode.\n4. Zero Tolerance: Tab switching and external code assistance are strictly prohibited.\n5. Submission: Answers must be submitted before the countdown timer expires.`,
    send_email: true,
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const toast = useToast();

  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.listCourses();
      setCourses(data || []);
      if (data && data.length > 0 && !enrollFormData.course_id) {
        setEnrollFormData((prev) => ({ ...prev, course_id: data[0].id }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load course enrollments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  useEffect(() => {
    const qStatus = (searchParams.get('status') || '').toUpperCase();
    if (['ALL', 'SHORTLISTED', 'NOT_SHORTLISTED'].includes(qStatus)) {
      setStatusFilter(qStatus);
    }
  }, [searchParams]);

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

  const totalEnrollments = allApplicants.length;
  const totalShortlisted = allApplicants.filter(isShortlisted).length;
  const totalRejected = allApplicants.filter(isRejected).length;
  const totalPending = Math.max(0, totalEnrollments - totalShortlisted - totalRejected);


  // Delete Enrollment
  const handleDeleteEnrollment = async (courseId, userId, candidateName) => {
    if (!window.confirm(`Are you sure you want to remove "${candidateName}" from this course enrollment?`)) {
      return;
    }

    const actionKey = `del-${courseId}-${userId}`;
    setActionLoadingId(actionKey);
    try {
      await adminApi.deleteEnrollment(courseId, userId);
      toast.success(`Enrollment for ${candidateName} deleted successfully.`);
      const updated = await adminApi.listCourses();
      setCourses(updated || []);
    } catch (err) {
      toast.error(err.message || 'Failed to remove enrollment');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit Manual Enrollment
  const handleManualEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!enrollFormData.course_id) {
      toast.error('Please select a course');
      return;
    }

    setEnrollLoading(true);
    try {
      await adminApi.manualEnrollCandidate(enrollFormData.course_id, {
        name: enrollFormData.name,
        email: enrollFormData.email,
        college: enrollFormData.college,
        year: enrollFormData.year,
        ats_score: Number(enrollFormData.ats_score),
        application_status: enrollFormData.application_status,
      });

      toast.success(`Candidate ${enrollFormData.name} enrolled successfully!`);
      setIsEnrollModalOpen(false);
      setEnrollFormData({
        course_id: courses[0]?.id || '',
        name: '',
        email: '',
        college: '',
        year: '2025',
        ats_score: 80,
        application_status: 'shortlisted',
      });
      const updated = await adminApi.listCourses();
      setCourses(updated || []);
    } catch (err) {
      toast.error(err.message || 'Failed to enroll candidate');
    } finally {
      setEnrollLoading(false);
    }
  };

  // Submit Full Candidate Edit (UPDATE CRUD to Database)
  const handleEditStatusSubmit = async (e, proceedToSchedule = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingStudent) return;

    setEditLoading(true);
    try {
      await adminApi.updateEnrollmentStatus(
        editingStudent.course_id,
        editingStudent.user_id,
        {
          name: editFormData.name,
          email: editFormData.email,
          college: editFormData.college,
          year: editFormData.year,
          ats_score: Number(editFormData.ats_score),
          application_status: editFormData.application_status,
          unique_code: editFormData.unique_code,
        }
      );
      toast.success(`Step 1 Completed: Candidate "${editFormData.name}" updated!`);
      const targetStudent = { ...editingStudent, ...editFormData };
      setEditingStudent(null);
      const updated = await adminApi.listCourses();
      setCourses(updated || []);

      if (proceedToSchedule) {
        openScheduleModalSingle(targetStudent);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update candidate');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      email: student.email || '',
      college: student.college || '',
      year: student.year || '2025',
      ats_score: student.ats_score != null ? student.ats_score : (isShortlisted(student) ? 75 : 50),
      application_status: isShortlisted(student) ? 'shortlisted' : isRejected(student) ? 'rejected' : 'pending',
      unique_code: student.unique_code || '',
    });
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
    setScheduleTargetCourseId(student.course_id);
    setScheduleFormData({
      assignment_datetime: student.assignment_datetime || getTomorrowDefaultDateTime(),
      duration_minutes: student.duration_minutes || 60,
      assignment_policy:
        student.assignment_policy ||
        `1. Time Limit: The technical simulation must be completed within 60 minutes.\n2. Proctoring: Ensure active webcam, microphone, and full-screen browser mode.\n3. Zero Tolerance: Tab switching and external code assistance are strictly prohibited.\n4. Submission: Answers must be submitted before the countdown timer expires.`,
      send_email: true,
    });
    setIsScheduleModalOpen(true);
  };

  const openScheduleModalBroadcast = (courseId = null) => {
    setScheduleTarget(null);
    const targetCId = courseId || (selectedCourseFilter !== 'ALL' ? selectedCourseFilter : courses[0]?.id || '');
    setScheduleTargetCourseId(targetCId);
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
    const submissionPayload = {
      ...scheduleFormData,
      duration_minutes: Number(scheduleFormData.duration_minutes) || 60,
    };
    try {
      if (scheduleTarget) {
        // Single candidate scheduling
        await adminApi.scheduleCandidateAssignment(
          scheduleTarget.course_id,
          scheduleTarget.user_id,
          submissionPayload
        );
        toast.success(
          scheduleFormData.send_email
            ? `Assignment scheduled & Gmail sent to ${scheduleTarget.name}!`
            : `Assignment scheduled successfully for ${scheduleTarget.name}!`
        );
      } else {
        // Bulk course broadcast scheduling
        if (!scheduleTargetCourseId) {
          toast.error('Please select a course for batch scheduling');
          return;
        }
        const res = await adminApi.broadcastCourseAssignment(
          scheduleTargetCourseId,
          submissionPayload
        );
        toast.success(
          scheduleFormData.send_email
            ? `Assignment scheduled & Gmail sent to ${res.candidates_count || 0} candidate(s)!`
            : `Assignment scheduled for ${res.candidates_count || 0} candidate(s)!`
        );
      }
      setIsScheduleModalOpen(false);
      const updated = await adminApi.listCourses();
      setCourses(updated || []);
    } catch (err) {
      toast.error(err.message || 'Failed to schedule assignment');
    } finally {
      setScheduleLoading(false);
    }
  };

  // Filter candidates
  const filteredApplicants = allApplicants.filter((student) => {
    const matchesSearch =
      (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.course_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.college || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCourseFilter !== 'ALL' && student.course_id !== selectedCourseFilter) {
      return false;
    }

    if (statusFilter === 'SHORTLISTED') return isShortlisted(student);
    if (statusFilter === 'NOT_SHORTLISTED') return isRejected(student);
    if (statusFilter === 'PENDING') return !isShortlisted(student) && !isRejected(student);

    return true;
  });

  if (isLoading) {
    return <Loader text="Loading all course enrollments and shortlisting data..." />;
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Course Enrollments & Shortlist Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage student course registrations, update shortlist statuses, and control admission rosters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Calendar size={14} />}
            onClick={() => openScheduleModalBroadcast()}
            style={{
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
            }}
          >
            Schedule Batch Assignment
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus size={15} />}
            onClick={() => setIsEnrollModalOpen(true)}
          >
            Manual Enroll Student
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={fetchEnrollments}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>Total Enrolled</span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem' }}>
            {totalEnrollments}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Across {courses.length} active courses
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>Shortlisted</span>
            <CheckCircle size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#10b981' }}>
            {totalShortlisted}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>
            ATS Match ≥ 70% ({totalEnrollments > 0 ? Math.round((totalShortlisted / totalEnrollments) * 100) : 0}% qualified)
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '3px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>Not Shortlisted</span>
            <XCircle size={16} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#f43f5e' }}>
            {totalRejected}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '0.2rem' }}>
            ATS Match &lt; 70% (Below threshold)
          </div>
        </Card>

        {totalPending > 0 && (
          <Card style={{ padding: '1.25rem', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
              <span>Under Review</span>
              <Clock size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#f59e0b' }}>
              {totalPending}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.2rem' }}>
              Pending evaluation
            </div>
          </Card>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flex: '1 1 260px',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search candidate name, email, college, course..."
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

          {/* Filter by Course Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Course:</span>
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              style={{
                background: '#151d2f',
                color: '#fff',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Courses ({courses.length})</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course.enrolled_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
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
                  padding: '0.4rem 0.75rem',
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
      </Card>

      {/* Enrollments Master Table with CRUD Actions */}
      <Card>
        {filteredApplicants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Enrollments Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {searchQuery || statusFilter !== 'ALL' || selectedCourseFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter options.'
                : 'No candidate course applications have been registered yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Enrolled Course</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>College / University</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>ATS Match</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Shortlist Status</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Resume</th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplicants.map((student, idx) => {
                  const shortlisted = isShortlisted(student);
                  const rejected = isRejected(student);
                  const actionKey = `${student.course_id}-${student.user_id}`;
                  const isRowLoading = actionLoadingId === actionKey || actionLoadingId === `del-${actionKey}`;

                  return (
                    <tr
                      key={`${student.course_id}-${student.user_id}-${idx}`}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      {/* Candidate Avatar & Details */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              flexShrink: 0,
                            }}
                          >
                            {student.name ? student.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: '0.92rem' }}>
                              {student.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {student.email}
                            </div>
                            {student.app_downloaded && (
                              <div
                                style={{
                                  marginTop: '0.2rem',
                                  fontSize: '0.72rem',
                                  color: '#34d399',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 600,
                                }}
                                title="Candidate downloaded AIAssignmentSetup.exe"
                              >
                                <Download size={11} color="#10b981" />
                                <span>Desktop App Downloaded</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <Link
                          to={`/admin/courses/${student.course_id}/roster`}
                          style={{
                            color: '#c084fc',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}
                        >
                          {student.course_title}
                        </Link>
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
                                width: '65px',
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
                                padding: '0.25rem 0.65rem',
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
                              padding: '0.25rem 0.65rem',
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
                              padding: '0.25rem 0.65rem',
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
                              gap: '0.35rem',
                              color: '#818cf8',
                              borderColor: 'rgba(99, 102, 241, 0.4)',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.55rem',
                            }}
                          >
                            <FileText size={13} />
                            <span>View</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No file</span>
                        )}
                      </td>

                      {/* Sequential Step-by-Step Action Buttons */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          {/* Step 1: Edit Details & Status */}
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            title="Step 1: Edit & Verify Candidate Status & Score"
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.78rem',
                              color: '#c084fc',
                              borderColor: 'rgba(192, 132, 252, 0.4)',
                              background: 'rgba(192, 132, 252, 0.08)',
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Step 1: Edit</span>
                          </button>

                          {/* Step 2: Schedule Assignment Date & Time */}
                          {shortlisted ? (
                            <button
                              type="button"
                              onClick={() => openScheduleModalSingle(student)}
                              title="Step 2: Schedule Assignment Date & Time + Send Gmail"
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.78rem',
                                color: '#38bdf8',
                                borderColor: 'rgba(56, 189, 248, 0.4)',
                                background: student.assignment_datetime ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.08)',
                              }}
                            >
                              <Calendar size={13} />
                              <span>{student.assignment_datetime ? 'Step 2: Reschedule' : 'Step 2: Schedule'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditModal(student)}
                              title="Step 2: Shortlist Candidate in Step 1 to unlock scheduling"
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                                background: 'rgba(255, 255, 255, 0.03)',
                                opacity: 0.65,
                                cursor: 'not-allowed',
                              }}
                            >
                              <Calendar size={13} />
                              <span>Step 2: Schedule</span>
                            </button>
                          )}

                          {/* Delete Enrollment Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteEnrollment(student.course_id, student.user_id, student.name)}
                            disabled={isRowLoading}
                            title="Delete / Remove Enrollment"
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '0.3rem 0.55rem',
                              fontSize: '0.75rem',
                              color: '#fda4af',
                              borderColor: 'rgba(244, 63, 94, 0.3)',
                              background: 'rgba(244, 63, 94, 0.06)',
                            }}
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

      {/* MODAL 1: Manual Candidate Enrollment (CREATE CRUD) */}
      {isEnrollModalOpen && (
        <Modal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          title="Manual Candidate Course Enrollment"
        >
          <form onSubmit={handleManualEnrollSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Select Course *
              </label>
              <select
                value={enrollFormData.course_id}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, course_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="name"
              label="Candidate Full Name *"
              placeholder="e.g. Jane Doe"
              value={enrollFormData.name}
              onChange={(e) => setEnrollFormData({ ...enrollFormData, name: e.target.value })}
              required
            />

            <Input
              id="email"
              type="email"
              label="Candidate Email *"
              placeholder="candidate@example.com"
              value={enrollFormData.email}
              onChange={(e) => setEnrollFormData({ ...enrollFormData, email: e.target.value })}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <Input
                id="college"
                label="College / University"
                placeholder="e.g. Stanford University"
                value={enrollFormData.college}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, college: e.target.value })}
              />

              <Input
                id="year"
                label="Graduation Year"
                placeholder="2025"
                value={enrollFormData.year}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, year: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <Input
                id="ats_score"
                type="number"
                label="ATS Match Score (0 - 100)"
                value={enrollFormData.ats_score}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, ats_score: e.target.value })}
                min="0"
                max="100"
              />

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Shortlist Status *
                </label>
                <select
                  value={enrollFormData.application_status}
                  onChange={(e) => setEnrollFormData({ ...enrollFormData, application_status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="shortlisted">Shortlisted (Qualified)</option>
                  <option value="rejected">Not Shortlisted (Rejected)</option>
                  <option value="pending">Under Review (Pending)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Button type="button" variant="secondary" onClick={() => setIsEnrollModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={enrollLoading}>
                Enroll Candidate
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Step 1 of 2 - Edit Candidate Details & Status */}
      {editingStudent && (
        <Modal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          title={`Step 1 of 2: Verify & Edit Candidate: ${editingStudent.name}`}
        >
          <form onSubmit={(e) => handleEditStatusSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Step Stepper Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              background: 'rgba(192, 132, 252, 0.08)',
              border: '1px solid rgba(192, 132, 252, 0.25)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontWeight: 700 }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#c084fc',
                  color: '#0b0f19',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}>1</span>
                <span>Step 1: Candidate Verification & Status</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Next ➜ Step 2: Schedule Assignment
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Course: <strong style={{ color: '#fff' }}>{editingStudent.course_title}</strong>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Input
                id="editName"
                label="Candidate Full Name *"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
              <Input
                id="editEmail"
                type="email"
                label="Email Address *"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Input
                id="editCollege"
                label="College / Institute"
                value={editFormData.college}
                onChange={(e) => setEditFormData({ ...editFormData, college: e.target.value })}
                placeholder="e.g. Stanford University"
              />
              <Input
                id="editYear"
                label="Graduation Year"
                value={editFormData.year}
                onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                placeholder="e.g. 2025"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Application Status *
                </label>
                <select
                  value={editFormData.application_status}
                  onChange={(e) => setEditFormData({ ...editFormData, application_status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="shortlisted">Shortlisted (Passed threshold)</option>
                  <option value="rejected">Not Shortlisted (Rejected)</option>
                  <option value="pending">Under Review / Pending</option>
                </select>
              </div>

              <Input
                id="editAtsScore"
                type="number"
                label="ATS Match Score (%) *"
                value={editFormData.ats_score}
                onChange={(e) => setEditFormData({ ...editFormData, ats_score: e.target.value })}
                min="0"
                max="100"
                required
              />
            </div>

            <Input
              id="editUniqueCode"
              label="Unique Exam Code"
              value={editFormData.unique_code}
              onChange={(e) => setEditFormData({ ...editFormData, unique_code: e.target.value })}
              placeholder="e.g. EXAM-482910"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingStudent(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" isLoading={editLoading}>
                Save Step 1 Only
              </Button>
              {editFormData.application_status === 'shortlisted' && (
                <Button
                  type="button"
                  variant="primary"
                  isLoading={editLoading}
                  onClick={(e) => handleEditStatusSubmit(e, true)}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    borderColor: '#38bdf8',
                  }}
                >
                  Save & Next: Schedule (Step 2) ➜
                </Button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Step 2 of 2 - Schedule Technical Assignment & Send Gmail */}
      {isScheduleModalOpen && (
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title={
            scheduleTarget
              ? `Step 2 of 2: Schedule Assignment: ${scheduleTarget.name}`
              : 'Step 2: Schedule Assignment for Shortlisted Candidates'
          }
          maxWidth="640px"
        >
          <form onSubmit={handleScheduleSubmit}>
            {/* Step Stepper Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.82rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 700 }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#38bdf8',
                  color: '#0b0f19',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}>2</span>
                <span>Step 2: Assignment Date, Time & Gmail Invitation</span>
              </div>
              <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                ✓ Step 1 Verified
              </div>
            </div>

            {/* Target summary banner */}
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
                    Course Track: <strong style={{ color: '#fff' }}>{scheduleTarget.course_title}</strong>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, color: '#f0f9ff' }}>
                    Broadcast to Shortlisted Candidates
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                    The assignment link, scheduled date & time, and policy rules will be emailed via Gmail to all shortlisted candidates.
                  </div>
                </div>
              )}
            </div>

            {/* Course select if batch */}
            {!scheduleTarget && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Select Course Cohort *
                </label>
                <select
                  value={scheduleTargetCourseId}
                  onChange={(e) => setScheduleTargetCourseId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.enrolled_count || 0} students)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date and Time + Duration */}
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
                  placeholder="60"
                  value={scheduleFormData.duration_minutes ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setScheduleFormData({ ...scheduleFormData, duration_minutes: '' });
                    } else {
                      const parsed = parseInt(val, 10);
                      setScheduleFormData({
                        ...scheduleFormData,
                        duration_minutes: isNaN(parsed) ? '' : parsed,
                      });
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (isNaN(parsed) || parsed < 1) {
                      setScheduleFormData({ ...scheduleFormData, duration_minutes: 60 });
                    }
                  }}
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

            {/* Assignment Policy & Guidelines */}
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

            {/* Gmail Notification Checkbox */}
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
                id="sendGmailCheck"
                checked={scheduleFormData.send_email}
                onChange={(e) =>
                  setScheduleFormData({ ...scheduleFormData, send_email: e.target.checked })
                }
                style={{ marginTop: '0.2rem', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <label htmlFor="sendGmailCheck" style={{ fontSize: '0.82rem', color: '#e5e7eb', cursor: 'pointer' }}>
                <strong style={{ color: '#34d399' }}>Dispatch Gmail Notification Automatically</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                  Sends an official email to the candidate(s) with scheduled date & time, policy rules, and test simulation link.
                </p>
              </label>
            </div>

            {/* Actions */}
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

export default AdminEnrollments;
