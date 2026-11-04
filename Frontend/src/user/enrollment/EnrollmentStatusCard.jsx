import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { CheckCircle, User, Clock, Sparkles, ArrowRight, Calendar, AlertTriangle, Download } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';

const EnrollmentStatusCard = ({ course }) => {
  const { user } = useAuth();
  const isDemoUser =
    Boolean(course.is_demo_interview_access) ||
    user?.email?.trim().toLowerCase() === '23091a32j4@rgmcet.edu.in';

  const hasSchedule = Boolean(course.assignment_datetime);
  const isSubmitted = course.assignment_status === 'submitted';
  const isTerminated = course.assignment_status === 'terminated_violation';

  let isFuture = false;
  let formattedSchedule = null;
  if (hasSchedule) {
    try {
      const schedDate = new Date(course.assignment_datetime);
      if (!isNaN(schedDate.getTime())) {
        isFuture = new Date() < new Date(schedDate.getTime() - 5 * 60 * 1000);
        formattedSchedule = schedDate.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      formattedSchedule = String(course.assignment_datetime);
    }
  }

  return (
    <Card
      key={course.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.85rem',
          }}
        >
          <Badge variant="success">
            <CheckCircle size={12} />
            <span>Application Active</span>
          </Badge>
          <Badge variant="primary">{course.level}</Badge>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.6rem' }}>
          {course.title}
        </h3>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1.25rem',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {course.description}
        </p>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            padding: '0.75rem 0',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <User size={14} color="var(--primary)" />
            <span>{course.instructor}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} color="#06b6d4" />
            <span>{course.duration_weeks} Weeks</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Demo VIP Access for Testing */}
          {isDemoUser && (
            <div
              style={{
                padding: '0.65rem 0.75rem',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.18) 100%)',
                border: '1px solid rgba(129, 140, 248, 0.5)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                marginBottom: '0.35rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#c7d2fe',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <Sparkles size={14} color="#818cf8" />
                <span>Unlimited Free Trial Active (Retake Anytime)</span>
              </div>
              <Link
                to={
                  course.interview_token
                    ? `/interview/${course.interview_token}`
                    : `/interview/start?assignment_token=${course.assignment_token || 'demo'}&course_id=${course.id}`
                }
                className="btn btn-primary btn-block btn-sm"
                style={{
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                <Sparkles size={14} />
                <span>Start Stage 2: AI Interview (Unlimited Trial)</span>
              </Link>
            </div>
          )}

          {course.assignment_token && (
            <>
              {isSubmitted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {(course.assignment_score ?? 0) >= 50 || isDemoUser ? (
                    <div
                      style={{
                        padding: '0.55rem 0.75rem',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        fontSize: '0.82rem',
                        color: '#6ee7b7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                      }}
                    >
                      <Sparkles size={14} color="#10b981" />
                      <span>Selected for Next AI Interview!</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        fontSize: '0.78rem',
                        color: '#fbbf24',
                      }}
                    >
                      Score: {Math.round(course.assignment_score ?? 0)}% (Below 50% cutoff)
                    </div>
                  )}

                  {((course.assignment_score ?? 0) >= 50 || isDemoUser) && !isDemoUser ? (
                    <>
                      <Link
                        to={
                          course.interview_token
                            ? `/interview/${course.interview_token}`
                            : `/interview/start?assignment_token=${course.assignment_token}&course_id=${course.id}`
                        }
                        className="btn btn-primary btn-block btn-sm"
                        style={{
                          textDecoration: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          fontWeight: 700,
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        <Sparkles size={14} />
                        <span>Start Stage 2: AI Interview (Camera & Mic Check)</span>
                      </Link>

                      <Link
                        to={`/assignment/${course.assignment_token}`}
                        className="btn btn-secondary btn-block btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        <span>View Coding Score ({Math.round(course.assignment_score ?? 0)}%)</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      to={`/assignment/${course.assignment_token}`}
                      className="btn btn-secondary btn-block btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <span>View Assessment Result ({Math.round(course.assignment_score ?? 0)}%)</span>
                    </Link>
                  )}
                  {!isDemoUser && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginTop: '2px' }}>
                      Single Attempt Policy: 1/1 Completed
                    </div>
                  )}
                </div>
              ) : isTerminated ? (
                isDemoUser ? (
                  <Link
                    to={`/assignment/${course.assignment_token}`}
                    className="btn btn-secondary btn-block btn-sm"
                    style={{ textDecoration: 'none', color: '#94a3b8' }}
                  >
                    <span>View Prior Coding Test</span>
                  </Link>
                ) : (
                  <Link
                    to={`/assignment/${course.assignment_token}`}
                    className="btn btn-secondary btn-block btn-sm"
                    style={{ textDecoration: 'none', borderColor: '#ef4444', color: '#f87171' }}
                  >
                    <AlertTriangle size={14} />
                    <span>Assessment Locked (Security Breach)</span>
                  </Link>
                )
              ) : !hasSchedule ? (
                <div
                  style={{
                    padding: '0.55rem 0.75rem',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    color: '#fcd34d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock size={13} color="#f59e0b" />
                  <span>Interview: <strong>Pending Admin Schedule</strong></span>
                </div>
              ) : isFuture ? (
                <Link
                  to={`/assignment/${course.assignment_token}`}
                  className="btn btn-secondary btn-block btn-sm"
                  style={{
                    textDecoration: 'none',
                    borderColor: 'rgba(56, 189, 248, 0.5)',
                    color: '#38bdf8',
                  }}
                >
                  <Calendar size={13} color="#38bdf8" />
                  <span>Scheduled: {formattedSchedule} ({course.duration_minutes || 60}m)</span>
                </Link>
              ) : (
                <Link
                  to={`/assignment/${course.assignment_token}`}
                  className="btn btn-primary btn-block btn-sm"
                  style={{
                    textDecoration: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Start AI Technical Interview</span>
                </Link>
              )}

              {/* Dedicated Windows App Download Link */}
              <a
                href={`${API_BASE_URL}/api/v1/assignment/download/app?email=${encodeURIComponent(user?.email || '')}&token=${encodeURIComponent(course.assignment_token || '')}&name=${encodeURIComponent(user?.name || '')}&course=${encodeURIComponent(course.title || '')}`}
                download="AIAssignmentSetup.exe"
                className="btn btn-secondary btn-block btn-sm"
                style={{
                  textDecoration: 'none',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(56, 189, 248, 0.08)',
                }}
              >
                <Download size={13} color="#38bdf8" />
                <span>Download Windows App (.exe)</span>
              </a>
            </>
          )}

          <Link
            to={`/courses/${course.id}`}
            className="btn btn-secondary btn-block btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <span>View Course Details</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default EnrollmentStatusCard;
