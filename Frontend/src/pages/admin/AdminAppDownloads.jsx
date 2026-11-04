import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  Download,
  Laptop,
  Search,
  RefreshCw,
  Clock,
  ArrowLeft,
  CheckCircle,
  Users,
  Monitor,
  Activity,
  FileDown,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const AdminAppDownloads = () => {
  const [downloads, setDownloads] = useState([]);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [uniqueUsersCount, setUniqueUsersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toast = useToast();

  const fetchDownloads = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const res = await adminApi.getAppDownloads();
      setDownloads(res?.downloads || []);
      setTotalDownloads(res?.total_downloads || 0);
      setUniqueUsersCount(res?.unique_users_count || 0);
    } catch (err) {
      console.error('Failed to fetch desktop app downloads:', err);
      toast.error('Failed to load desktop application downloads');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const filteredDownloads = downloads.filter((dl) => {
    const q = searchQuery.toLowerCase();
    return (
      (dl.name || '').toLowerCase().includes(q) ||
      (dl.email || '').toLowerCase().includes(q) ||
      (dl.course_title || '').toLowerCase().includes(q) ||
      (dl.ip_address || '').toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return <Loader text="Fetching Windows desktop application download logs from MongoDB..." />;
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Link
              to="/admin/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: 'var(--primary)',
                fontSize: '0.85rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} />
              <span>Dashboard Overview</span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(2, 132, 199, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Download size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
                Windows Desktop App Downloads
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Real-time list of candidates who downloaded the official <code>AIAssignmentSetup.exe</code> installer.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => fetchDownloads(true)}
            disabled={isRefreshing}
            style={{
              padding: '0.55rem 1rem',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              transition: 'all var(--transition-fast)',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <Card elevated style={{ position: 'relative', overflow: 'hidden', borderLeft: '3px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total App Downloads</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
              <Download size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.1 }}>
            {totalDownloads}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            All installer download actions
          </div>
        </Card>

        <Card elevated style={{ position: 'relative', overflow: 'hidden', borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Unique Candidates</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
            {uniqueUsersCount}
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#6ee7b7' }}>
            Distinct shortlisted candidates verified
          </div>
        </Card>

        <Card elevated style={{ position: 'relative', overflow: 'hidden', borderLeft: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Client Target</span>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Laptop size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
            Windows 10 / 11
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#818cf8' }}>
            AIAssignmentSetup.exe (x64)
          </div>
        </Card>
      </div>

      {/* Candidates List Table Card */}
      <Card elevated>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
          }}
        >
          <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '440px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by candidate name, email, course, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(0, 0, 0, 0.25)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: '#fff' }}>{filteredDownloads.length}</strong> of{' '}
              <strong style={{ color: '#38bdf8' }}>{totalDownloads}</strong> downloads
            </span>
          </div>
        </div>

        {filteredDownloads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <Download size={48} style={{ margin: '0 auto 1.25rem', opacity: 0.35, color: '#38bdf8' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
              No Application Downloads Found
            </h3>
            <p style={{ fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto', color: '#94a3b8' }}>
              When shortlisted candidates click the download link in their assessment invitation email or candidate dashboard, their identity and installation timestamp will appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th style={{ padding: '0.75rem 0.6rem' }}>Candidate</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Target Course Track</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Download Date & Time</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>IP Address</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Operating Platform</th>
                  <th style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>Application Installer</th>
                </tr>
              </thead>
              <tbody>
                {filteredDownloads.map((dl) => (
                  <tr key={dl.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {/* Candidate */}
                    <td style={{ padding: '0.85rem 0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            flexShrink: 0,
                          }}
                        >
                          {(dl.name || dl.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem' }}>
                            {dl.name || 'Anonymous User'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            {dl.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Course */}
                    <td style={{ padding: '0.85rem 0.6rem' }}>
                      <span style={{ color: '#c7d2fe', fontWeight: 600 }}>
                        {dl.course_title || 'General Assessment'}
                      </span>
                    </td>

                    {/* Downloaded At */}
                    <td style={{ padding: '0.85rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} color="#94a3b8" />
                        <span>
                          {new Date(dl.downloaded_at).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* IP */}
                    <td style={{ padding: '0.85rem 0.6rem' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          background: 'rgba(255, 255, 255, 0.06)',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          color: '#cbd5e1',
                        }}
                      >
                        {dl.ip_address || 'unknown'}
                      </span>
                    </td>

                    {/* Platform / User Agent */}
                    <td
                      style={{
                        padding: '0.85rem 0.6rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        maxWidth: '220px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={dl.user_agent}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Laptop size={14} color="#38bdf8" />
                        <span>
                          {dl.user_agent?.includes('Windows')
                            ? 'Windows Desktop Client'
                            : dl.user_agent
                            ? dl.user_agent.slice(0, 30) + '...'
                            : 'Windows Application'}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.85rem 0.6rem', textAlign: 'right' }}>
                      <Badge variant="success">
                        <CheckCircle size={12} style={{ marginRight: '4px' }} />
                        AIAssignmentSetup.exe
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAppDownloads;
