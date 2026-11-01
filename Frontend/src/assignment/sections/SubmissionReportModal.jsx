import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import Badge from '../../components/common/Badge';

const SubmissionReportModal = ({
  submissionReport,
  assignment,
}) => {
  const scoreVal = Math.round(submissionReport?.score ?? 0);
  const isSelectedForInterview = scoreVal >= 50;

  return (
    <div className="assignment-container">
      <div className="results-modal-card">
        <div
          className="score-hero-circle"
          style={{
            borderColor: isSelectedForInterview ? '#10b981' : '#f59e0b',
            boxShadow: isSelectedForInterview ? '0 0 35px rgba(16, 185, 129, 0.35)' : 'none',
          }}
        >
          <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f9fafb' }}>
            {scoreVal}%
          </span>
          <span style={{ fontSize: '0.75rem', color: isSelectedForInterview ? '#6ee7b7' : '#fcd34d', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Score
          </span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Badge
            variant={isSelectedForInterview ? 'success' : 'warning'}
            style={{ marginBottom: '0.75rem', fontSize: '0.82rem', padding: '0.35rem 0.8rem' }}
          >
            {isSelectedForInterview
              ? '★ SELECTED FOR NEXT AI INTERVIEW PROCESS'
              : 'ASSESSMENT COMPLETED (BELOW 50% THRESHOLD)'}
          </Badge>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {isSelectedForInterview
              ? 'Congratulations! Selected for AI Interview'
              : 'Assessment Evaluation Complete'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            {isSelectedForInterview
              ? `Your score of ${scoreVal}% passed the 50% cutoff! You have been selected for the next AI Interview round for ${assignment?.course_title || 'the course'}.`
              : `Candidate: ${assignment?.candidate_name || 'Candidate'} • Course: ${assignment?.course_title || 'Technical Track'}`}
          </p>
        </div>

        {/* Test stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
              {submissionReport.passed_questions ?? assignment?.passed_questions ?? '-'} /{' '}
              {submissionReport.total_questions ?? assignment?.total_questions ?? 2}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Problems Solved
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
              {submissionReport.total_tests_passed ?? '-'} / {submissionReport.total_tests_count ?? '-'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              All Test Cases (Public + Hidden)
            </div>
          </div>
        </div>

        {/* AI Review from Gemini */}
        {submissionReport.ai_review && (
          <div className="ai-review-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BrainCircuit size={20} color="#a855f7" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>
                Gemini AI Code Review
              </h3>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#c084fc',
                  background: 'rgba(168, 85, 247, 0.15)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {submissionReport.ai_review.verdict || 'Evaluated'}
              </span>
            </div>

            <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {submissionReport.ai_review.technical_feedback}
            </p>

            {submissionReport.ai_review.strengths && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem' }}>
                  Key Strengths:
                </div>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {submissionReport.ai_review.strengths.map((str, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                      {str}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {submissionReport.ai_review.areas_for_growth && (
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.35rem' }}>
                  Recommendations:
                </div>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {submissionReport.ai_review.areas_for_growth.map((str, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                      {str}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <Link to="/courses" className="btn btn-secondary">
            Back to Catalog
          </Link>
          <Link to="/my-enrollments" className="btn btn-primary">
            View My Applications
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubmissionReportModal;
