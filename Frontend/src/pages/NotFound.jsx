import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div
      style={{
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '1rem',
        }}
      >
        404
      </div>

      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Page Not Located
      </h2>

      <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', marginBottom: '2rem' }}>
        The page you are looking for doesn't exist, has been moved, or requires specific
        privileges.
      </p>

      <Link to="/courses" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem' }}>
        <ArrowLeft size={16} />
        <span>Return to Courses Catalog</span>
      </Link>
    </div>
  );
};

export default NotFound;
