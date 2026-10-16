import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck } from 'lucide-react';

const AuthLayout = ({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkTo,
  isAdminFlow = false,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
      }}
    >
      {/* Top Floating Logo */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '2rem',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: isAdminFlow
              ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)',
          }}
        >
          {isAdminFlow ? <ShieldCheck size={24} color="#fff" /> : <Sparkles size={24} color="#fff" />}
        </div>
        <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          HirePulse <span className="gradient-text">{isAdminFlow ? 'Admin' : 'AI'}</span>
        </span>
      </Link>

      {/* Main Glass Card */}
      <div
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {children}

        {(footerText || footerLinkText) && (
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
            }}
          >
            {footerText}{' '}
            {footerLinkText && (
              <Link
                to={footerLinkTo}
                style={{
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {footerLinkText}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
