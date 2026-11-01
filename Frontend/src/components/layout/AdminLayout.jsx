import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { Bell, Sparkles } from 'lucide-react';
import ChatbotWidget from '../../chatbot/ChatbotWidget';

const AdminLayout = () => {
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.includes('/admin/enrollments')) return 'Course Enrollments & Shortlisting';
    if (location.pathname.includes('/admin/courses')) return 'Course & Roster Management';
    if (location.pathname.includes('/admin/users')) return 'Candidate & User Administration';
    if (location.pathname.includes('/admin/ai-assistant')) return 'AI Intelligence Assistant';
    return 'Executive Admin Dashboard';
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: '#090d16',
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          maxHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Top Header Bar */}
        <header
          style={{
            height: '70px',
            minHeight: '70px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(13, 19, 31, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{getPageTitle()}</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Backend API Live Interface & Real-time Management
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-full)',
                color: '#6ee7b7',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <span>FastAPI Connected</span>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main style={{ flex: 1, padding: '2rem', minWidth: 0 }}>
          <Outlet />
        </main>

        {/* HirePulse Platform AI Chatbot Widget */}
        <ChatbotWidget />
      </div>
    </div>
  );
};

export default AdminLayout;
