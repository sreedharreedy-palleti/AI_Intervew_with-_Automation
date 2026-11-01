import React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle,
  BrainCircuit,
  MessageSquare,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Smartphone,
  Users,
  Volume2,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

const InterviewReport = ({ report }) => {
  const overallScore = Math.round(report.overall_score || 0);
  const verdict = report.hiring_verdict || 'Hire';
  const isHire = verdict.includes('Hire');

  return (
    <div style={{ maxWidth: '880px', margin: '2rem auto', padding: '0 1rem', paddingBottom: '4rem' }}>
      <Card elevated style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: isHire
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, #f59e0b, #d97706)',
          }}
        />

        {/* Hero Score & Verdict */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: `3px solid ${isHire ? '#10b981' : '#f59e0b'}`,
              boxShadow: isHire ? '0 0 35px rgba(16, 185, 129, 0.35)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <span style={{ fontSize: '2.6rem', fontWeight: 800, color: '#f9fafb', lineHeight: 1 }}>
              {overallScore}%
            </span>
            <span style={{ fontSize: '0.72rem', color: isHire ? '#6ee7b7' : '#fcd34d', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>
              Final Score
            </span>
          </div>

          <Badge
            variant={isHire ? 'success' : 'warning'}
            style={{ fontSize: '0.9rem', padding: '0.4rem 1rem', marginBottom: '0.65rem' }}
          >
            ★ VERDICT: {verdict.toUpperCase()}
          </Badge>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#fff' }}>
            AI Technical Interview Complete
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Candidate: <strong style={{ color: '#fff' }}>{report.candidate_name}</strong> • Course Track: <strong style={{ color: '#fff' }}>{report.course_title}</strong>
          </p>
        </div>

        {/* Subscore Competencies */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2.25rem',
          }}
        >
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>
              {Math.round(report.technical_score || overallScore)}%
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Technical Depth & Architecture
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc' }}>
              {Math.round(report.communication_score || overallScore)}%
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Communication & Reasoning
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
              {Math.round(report.problem_solving_score || overallScore)}%
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Problem Solving & Scaling
            </div>
          </div>
        </div>

        {/* Executive Summary Box */}
        {report.executive_summary && (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#a5b4fc', fontWeight: 700 }}>
              <BrainCircuit size={18} />
              <span>Gemini AI Executive Evaluation</span>
            </div>
            <p style={{ fontSize: '0.94rem', color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>
              {report.executive_summary}
            </p>
          </div>
        )}

        {/* AI Proctoring & Integrity Audit Card */}
        {(() => {
          const proctor = report.proctor_summary || {};
          const mobileCount = proctor.mobile_phone || 0;
          const multiFacesCount = proctor.multifaces || 0;
          const soundCount = proctor.second_person_sound || 0;
          const totalViolations = (proctor.total_violations || 0) + (report.proctor_violations_count || 0);
          const isClean = totalViolations === 0;

          return (
            <div
              style={{
                background: isClean ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                border: `1px solid ${isClean ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: isClean ? '#6ee7b7' : '#fca5a5' }}>
                  {isClean ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                  <span>AI Proctoring Integrity Audit</span>
                </div>
                <Badge variant={isClean ? 'success' : 'danger'}>
                  {isClean ? '100% Verified Authentic' : `${totalViolations} Infractions Flagged`}
                </Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    <Smartphone size={13} />
                    <span>Mobile Phone</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: mobileCount === 0 ? '#6ee7b7' : '#f87171' }}>
                    {mobileCount === 0 ? 'Clean (0 Flagged)' : `${mobileCount} Detected`}
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    <Users size={13} />
                    <span>Multi-Faces Presence</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: multiFacesCount === 0 ? '#6ee7b7' : '#f87171' }}>
                    {multiFacesCount === 0 ? 'Single Candidate' : `${multiFacesCount} Flagged`}
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    <Volume2 size={13} />
                    <span>Second Person Sound</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: soundCount === 0 ? '#6ee7b7' : '#fbbf24' }}>
                    {soundCount === 0 ? 'Clean Audio Feed' : `${soundCount} Flagged`}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Strengths & Growth Areas Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {report.key_strengths && report.key_strengths.length > 0 && (
            <div style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                <CheckCircle size={16} />
                <span>Demonstrated Strengths:</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {report.key_strengths.map((str, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>{str}</li>
                ))}
              </ul>
            </div>
          )}

          {report.growth_recommendations && report.growth_recommendations.length > 0 && (
            <div style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                <TrendingUp size={16} />
                <span>Recommended Growth Areas:</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {report.growth_recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Question-by-Question Breakdown */}
        {report.detailed_question_reviews && report.detailed_question_reviews.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
              Interview Question Reviews ({report.detailed_question_reviews.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {report.detailed_question_reviews.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>
                      Question {idx + 1}: {q.topic}
                    </span>
                    <Badge variant={q.score >= 70 ? 'success' : 'warning'}>
                      Score: {q.score}%
                    </Badge>
                  </div>
                  <p style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    {q.question_text}
                  </p>
                  {q.candidate_answer && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                      "{q.candidate_answer}"
                    </div>
                  )}
                  {q.feedback && (
                    <p style={{ fontSize: '0.82rem', color: '#93c5fd', margin: 0 }}>
                      AI Feedback: {q.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          <Link to="/courses" className="btn btn-secondary">
            Back to Course Catalog
          </Link>
          <Link to="/my-enrollments" className="btn btn-primary">
            View My Applications Portal
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default InterviewReport;

