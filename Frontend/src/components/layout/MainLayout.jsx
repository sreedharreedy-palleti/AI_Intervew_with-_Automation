import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../common/Navbar';
import { Sparkles, Heart } from 'lucide-react';
import ChatbotWidget from '../../chatbot/ChatbotWidget';

const MainLayout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2.5rem 0',
          background: 'rgba(11, 15, 25, 0.95)',
          marginTop: 'auto',
        }}
      >
        <div
          className="app-container"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} color="#ffffff" />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>HirePulse AI Platform</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Empowering talent with Gemini AI ATS intelligent matching & automated assessment.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem' }}>
            <Link to="/courses" style={{ color: 'var(--text-secondary)' }}>Courses</Link>
          </div>
        </div>
      </footer>

      {/* HirePulse Platform AI Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
};

export default MainLayout;
