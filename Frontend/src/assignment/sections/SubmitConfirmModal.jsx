import React from 'react';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const SubmitConfirmModal = ({
  isOpen,
  onClose,
  assignment,
  testResults,
  isSubmitting,
  handleFinalSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Assessment Submission"
    >
      <div style={{ padding: '0.5rem 0' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          You are about to submit your solutions for both coding problems. Our evaluation engine and
          Gemini AI will test all public and hidden test cases, compile code metrics, and finalize your score.
        </p>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {assignment?.questions?.map((q, idx) => {
            const res = testResults[q.id];
            return (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: idx === 0 ? '0.75rem' : 0,
                }}
              >
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  Question {idx + 1}: {q.title}
                </span>
                {res?.all_passed ? (
                  <Badge variant="success">All Tests Passed</Badge>
                ) : res ? (
                  <Badge variant="warning">{res.passed_tests} / {res.total_tests} Passed</Badge>
                ) : (
                  <Badge variant="default">Untested</Badge>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={onClose}>
            Continue Coding
          </Button>
          <Button
            variant="primary"
            isLoading={isSubmitting}
            onClick={handleFinalSubmit}
          >
            Confirm Final Submission
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SubmitConfirmModal;
