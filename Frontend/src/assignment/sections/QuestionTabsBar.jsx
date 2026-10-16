import React from 'react';
import { Code2, CheckCircle } from 'lucide-react';

const QuestionTabsBar = ({
  questions = [],
  activeQIndex,
  setActiveQIndex,
  testResults = {},
}) => {
  return (
    <div className="question-tabs-bar">
      {questions.map((q, index) => {
        const qResult = testResults[q.id];
        const isPassed = qResult?.all_passed;

        return (
          <button
            key={q.id}
            className={`question-tab-btn ${activeQIndex === index ? 'active' : ''}`}
            onClick={() => setActiveQIndex(index)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Code2 size={18} color={activeQIndex === index ? '#818cf8' : 'var(--text-muted)'} />
              <span>
                Question {index + 1}: {q.title}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                className={
                  q.difficulty.toLowerCase() === 'easy'
                    ? 'badge-difficulty-easy'
                    : q.difficulty.toLowerCase() === 'hard'
                    ? 'badge-difficulty-hard'
                    : 'badge-difficulty-medium'
                }
              >
                {q.difficulty}
              </span>
              {isPassed && (
                <CheckCircle size={16} color="#34d399" title="All tests passed" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuestionTabsBar;
