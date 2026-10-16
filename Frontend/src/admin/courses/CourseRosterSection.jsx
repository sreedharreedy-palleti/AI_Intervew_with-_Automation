import React from 'react';
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
  Trash2,
} from 'lucide-react';
import { formatDate, getResumeUrl } from '../../utils/formatters';

const CourseRosterSection = ({
  filteredUsers = [],
  searchQuery,
  statusFilter,
  isShortlisted,
  isRejected,
  actionLoadingId,
  openScheduleModalSingle,
  handleDeleteEnrollment,
}) => {
  return (
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
  );
};

export default CourseRosterSection;
