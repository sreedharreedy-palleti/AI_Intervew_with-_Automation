import React from 'react';
import Card from '../../components/common/Card';
import { BrainCircuit } from 'lucide-react';

const CourseSyllabusSection = () => {
  return (
    <Card elevated style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
        <BrainCircuit size={22} color="#a5b4fc" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI ATS Screening Workflow</h3>
      </div>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        When applying, your uploaded PDF/Word resume is parsed into raw text and analyzed by
        our Ollama ATS matching engine.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.2rem' }}>
            70%+
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Minimum ATS match threshold required to qualify
          </div>
        </div>

        <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginBottom: '0.2rem' }}>
            Instant
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time skill gaps & strengths feedback
          </div>
        </div>

        <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#06b6d4', marginBottom: '0.2rem' }}>
            AI Interview
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Automatic link dispatch for shortlisted candidates
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CourseSyllabusSection;
