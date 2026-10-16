import React from 'react';
import { Link } from 'react-router-dom';
import { Search, GraduationCap, CheckCircle, XCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import { formatDate, getResumeUrl } from '../../utils/formatters';

const ApplicantsTableSection = ({
  filteredApplicants,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  totalEnrollments,
  totalShortlisted,
  totalRejected,
  isShortlisted,
  isRejected,
}) => {
  return (
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
  );
};

export default ApplicantsTableSection;
