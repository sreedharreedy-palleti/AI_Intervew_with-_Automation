import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import Badge from '../../components/common/Badge';

const SubmissionReportModal = ({
  submissionReport,
  assignment,
}) => {
  const isPassing = (submissionReport?.score ?? 0) >= 60;

  return (
    <div className="assignment-container">
      <div className="results-modal-card">
        <div className="score-hero-circle">
          <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f9fafb' }}>
            {Math.round(submissionReport?.score ?? 0)}%
          </span>
          <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Score
          </span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Badge variant={isPassing ? 'success' : 'warning'} style={{ marginBottom: '0.75rem' }}>
            {isPassing ? 'Technical Assessment Satisfied' : 'Review in Progress'}
          </Badge>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Assessment Evaluation Complete
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Candidate: <strong>{assignment?.candidate_name}</strong> • Course: <strong>{assignment?.course_title}</strong>
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

        {/* AI Review from Ollama */}
        {submissionReport.ai_review && (
          <div className="ai-review-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BrainCircuit size={20} color="#a855f7" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>
                Ollama AI Code Review (Llama 3)
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
