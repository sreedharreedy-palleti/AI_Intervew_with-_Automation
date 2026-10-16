import React from 'react';
import { Lock, KeyRound } from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const SecurityLockModal = ({
  assignment,
  unlockUsername,
  setUnlockUsername,
  unlockCode,
  setUnlockCode,
  handleUnlock,
  isVerifying,
  verifyError,
}) => {
  return (
    <div className="assignment-container" style={{ maxWidth: '680px', marginTop: '2.5rem' }}>
      <Card elevated style={{ padding: '2.5rem', border: '1px solid rgba(99, 102, 241, 0.4)', background: 'rgba(15, 23, 42, 0.85)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Lock size={32} />
          </div>
          <Badge variant="primary" style={{ marginBottom: '0.75rem' }}>
            Candidate Verification
          </Badge>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f8fafc' }}>
            Access Your AI Coding Assessment
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto' }}>
            Please enter your Username and Unique Exam Code from your invitation email to begin your coding assessment.
          </p>
        </div>

        {/* Verification Form */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <KeyRound size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f3f4f6' }}>
              Unlock Online Assessment with Credentials
            </h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Enter the <strong>Username</strong> and <strong>Unique Exam Number</strong> received in your Gmail invitation:
          </p>

          {verifyError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              {verifyError}
            </div>
          )}

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Candidate Username / Email:
              </label>
              <input
                type="text"
                placeholder="e.g. candidate@example.com"
                value={unlockUsername}
                onChange={(e) => setUnlockUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Unique Exam Passcode / Number:
              </label>
              <input
                type="text"
                placeholder="e.g. EXAM-849201"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  outline: 'none',
                }}
                required
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              disabled={isVerifying}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem' }}
            >
              {isVerifying ? 'Verifying Credentials...' : 'Verify & Unlock Assessment'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default SecurityLockModal;
