import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Sparkles,
  ArrowLeft,
  LogOut,
  ShieldAlert,
  UserCheck,
  Download,
} from 'lucide-react';
import Badge from './Badge';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Overview & Stats',
      icon: <LayoutDashboard size={18} />,
    },
    {
      to: '/admin/enrollments',
      label: 'Course Enrollments',
      icon: <UserCheck size={18} />,
    },
    {
      to: '/admin/courses',
      label: 'Courses & Rosters',
      icon: <BookOpen size={18} />,
    },
    {
      to: '/admin/users',
      label: 'Candidate Management',
      icon: <Users size={18} />,
    },
    {
      to: '/admin/app-downloads',
      label: 'Windows App Downloads',
      icon: <Download size={18} />,
    },
  ];

  return (
    <aside
      style={{
        width: '260px',
        minWidth: '260px',
        maxWidth: '260px',
        height: '100vh',
        maxHeight: '100vh',
        background: '#0d131f',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .sidebar-scrollable-nav::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scrollable-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scrollable-nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 4px;
        }
        .sidebar-scrollable-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>

      {/* Brand Header (Fixed at Top) */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
          }}
        >
          <Sparkles size={20} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Admin Portal</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
            <Badge variant="warning">Super Admin</Badge>
          </div>
        </div>
      </div>

      {/* Navigation List (Scrollable Area) */}
      <nav
        className="sidebar-scrollable-nav"
        style={{
          padding: '1.25rem 0.85rem',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            padding: '0.4rem 0.75rem',
            letterSpacing: '0.05em',
          }}
        >
          Management
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.15))' : 'transparent',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
            })}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            padding: '0.8rem 0.75rem 0.4rem',
            letterSpacing: '0.05em',
          }}
        >
          Quick Links
        </div>

        <Link
          to="/courses"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            transition: 'color var(--transition-fast)',
          }}
        >
          <ArrowLeft size={16} />
          <span>Candidate Catalog</span>
        </Link>
      </nav>

      {/* Footer User Info & Logout (Fixed at Bottom) */}
      <div
        style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.25)',
          flexShrink: 0,
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name || 'Administrator'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm btn-block"
          style={{ justifyContent: 'center' }}
        >
          <LogOut size={15} />
          <span>Exit Admin Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
