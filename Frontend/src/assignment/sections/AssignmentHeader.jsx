import React from 'react';
import { BrainCircuit, Clock, Send } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const AssignmentHeader = ({
  courseTitle,
  candidateName,
  timeLeft,
  formatTime,
  onSubmitClick,
}) => {
  return (
    <div className="assignment-header">
      <div className="assignment-meta-left">
        <div className="assignment-icon-badge">
          <BrainCircuit size={24} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
              {courseTitle || 'AI Technical Assessment'}
            </h2>
            <Badge variant="success">Shortlisted Candidate</Badge>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Candidate: <strong style={{ color: '#e5e7eb' }}>{candidateName}</strong> • Powered by Ollama & Llama 3
          </p>
        </div>
      </div>

      <div className="assignment-header-actions">
        {/* Live countdown timer */}
        <div className={`timer-pill ${timeLeft < 600 ? 'warning' : ''}`}>
          <Clock size={16} />
          <span>{formatTime(timeLeft)}</span>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Send size={16} />}
          onClick={onSubmitClick}
        >
          Submit Assessment
        </Button>
      </div>
    </div>
  );
};

export default AssignmentHeader;
