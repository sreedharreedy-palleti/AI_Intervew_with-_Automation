import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Copy, Check, RefreshCw, Compass } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { useToast } from '../../hooks/useToast';

const ChromeRequiredCard = ({ currentBrowser = 'Non-Chrome Browser', onRecheck }) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success('Assessment link copied! Please paste and open in Google Chrome.');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="assignment-container" style={{ maxWidth: '680px', margin: '3.5rem auto', padding: '0 1rem' }}>
      <Card
        elevated
        style={{
          padding: '2.75rem 2rem',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          background: 'rgba(15, 23, 42, 0.95)',
          textAlign: 'center',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Warning Icon Badge */}
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#f87171',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.15)',
          }}
        >
          <ShieldAlert size={40} />
        </div>

        <Badge variant="warning" style={{ marginBottom: '1rem', padding: '0.4rem 1rem' }}>
          Restricted Assessment Environment
        </Badge>

        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f8fafc' }}>
          Google Chrome Browser Required
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto 1.75rem' }}>
          This AI Technical Coding Assessment is configured to run <strong style={{ color: '#fff' }}>exclusively in Google Chrome</strong>.
          <br />
          We detected that you are currently using <span style={{ color: '#fca5a5', fontWeight: 700 }}>{currentBrowser}</span>.
        </p>

        {/* Steps Box */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            borderRadius: '12px',
            padding: '1.4rem',
            marginBottom: '1.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#93c5fd',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.75rem',
            }}
          >
            <Compass size={16} /> Instructions to Open Exam in Chrome:
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.75 }}>
            <li>Copy the assessment link below.</li>
            <li>Launch the official <strong>Google Chrome</strong> browser on your device.</li>
            <li>Paste this URL directly into Chrome's address bar and hit Enter.</li>
            <li>No software download is required — the full interactive coding sandbox executes directly inside Chrome.</li>
          </ol>
        </div>

        {/* Direct Link & Copy Row */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            readOnly
            value={currentUrl}
            style={{
              flex: '1 1 260px',
              padding: '0.75rem 1rem',
              background: 'rgba(3, 7, 18, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#93c5fd',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />
          <Button
            type="button"
            variant="primary"
            onClick={handleCopyLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Link Copied!' : 'Copy Exam Link'}
          </Button>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {onRecheck && (
            <Button
              type="button"
              variant="secondary"
              onClick={onRecheck}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={15} /> Re-check Browser
            </Button>
          )}
          <Link to="/my-enrollments" className="btn btn-secondary">
            Return to My Enrollments
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ChromeRequiredCard;
