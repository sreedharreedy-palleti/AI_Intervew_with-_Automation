import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import {
  Users,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Mail,
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
} from 'lucide-react';
import { getResumeUrl } from '../../utils/formatters';

const EnrollmentTable = ({
  filteredApplicants = [],
  searchQuery,
  statusFilter,
  selectedCourseFilter,
  isShortlisted,
  isRejected,
  actionLoadingId,
  openScheduleModalSingle,
  openEditModal,
  handleDeleteEnrollment,
}) => {
  return (
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

                          {student.assignment_datetime && (
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
                              <span>{student.assignment_datetime.replace('T', ' ')}</span>
                              {student.assignment_email_sent_at && (
                                <span
                                  title="Gmail notification sent"
                                  style={{ display: 'inline-flex', alignItems: 'center', color: '#34d399' }}
                                >
                                  <Mail size={11} />
                                </span>
                              )}
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
  );
};

export default EnrollmentTable;
