import React from 'react';
import { Sparkles, EyeOff } from 'lucide-react';
import Badge from '../../components/common/Badge';

const ProblemViewer = ({
  question,
  courseTitle,
}) => {
  if (!question) return null;

  return (
    <div className="problem-pane">
      <div className="problem-header">
        <div>
          <h3 className="problem-title">{question.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
            <span
              className={
                question.difficulty.toLowerCase() === 'easy'
                  ? 'badge-difficulty-easy'
                  : question.difficulty.toLowerCase() === 'hard'
                  ? 'badge-difficulty-hard'
                  : 'badge-difficulty-medium'
              }
            >
              {question.difficulty}
            </span>
            <Badge variant="default">{question.category}</Badge>
          </div>
        </div>
      </div>

      {/* AI Personalization Banner */}
      <div className="ai-tailored-banner">
        <Sparkles size={16} color="#a5b4fc" style={{ flexShrink: 0 }} />
        <span>
          Generated specifically from your resume background and the requirements for{' '}
          <strong>{courseTitle}</strong>.
        </span>
      </div>

      {/* Problem Statement */}
      <div>
        <h4 className="problem-section-title">Problem Statement</h4>
        <p className="problem-description-text">{question.problem_statement}</p>
      </div>

      {/* Constraints */}
      {question.constraints && question.constraints.length > 0 && (
        <div>
          <h4 className="problem-section-title">Constraints</h4>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#9ca3af' }}>
            {question.constraints.map((c, idx) => (
              <li key={idx} style={{ marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Public Test Cases Examples */}
      <div>
        <h4 className="problem-section-title">Example Test Cases (Visible)</h4>
        {question.public_test_cases?.map((example, idx) => (
          <div key={idx} className="test-case-example-card">
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '0.5rem' }}>
              Example {idx + 1}
            </div>
            <div className="example-row">
              <strong>Input: </strong>
              <code>{JSON.stringify(example.input)}</code>
            </div>
            <div className="example-row">
              <strong>Expected Output: </strong>
              <code>{JSON.stringify(example.expected_output)}</code>
            </div>
            {example.explanation && (
              <div className="example-row" style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                <em>Explanation: {example.explanation}</em>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hidden Test Cases Security Notice */}
      <div className="hidden-security-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <EyeOff size={16} color="#94a3b8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
            {question.hidden_test_cases_count} Hidden Test Cases Active
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Boundary edge cases and large scale states are evaluated on the backend when you run tests.
          Inputs and expected outputs are confidential during the interview, but your pass/fail status
          is evaluated in real-time.
        </p>
      </div>
    </div>
  );
};

export default ProblemViewer;
