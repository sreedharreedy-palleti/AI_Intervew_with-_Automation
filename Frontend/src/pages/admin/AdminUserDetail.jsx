import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  ArrowLeft,
  User,
  Mail,
  CheckCircle,
  XCircle,
  BookOpen,
  Calendar,
  Clock,
  Shield,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const AdminUserDetail = () => {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();

  const fetchUserDetail = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getUserDetail(userId);
      setUserData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch candidate profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  if (isLoading) {
    return <Loader text="Loading candidate profile and enrolled courses..." />;
  }

  if (!userData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h3>Candidate Not Found</h3>
        <Link to="/admin/users" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Candidates
        </Link>
      </div>
    );
  }

  const { name, email, role, is_verified, total_enrolled_courses, enrolled_courses = [] } = userData;

  return (
    <div className="animate-fade-in">
      <Link
        to="/admin/users"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Candidate Directory</span>
      </Link>

      {/* Profile Overview Card */}
      <Card elevated style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.75rem',
                fontWeight: 800,
              }}
            >
              {name ? name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{name}</h2>
                <Badge variant={role === 'admin' ? 'warning' : 'primary'}>
                  {role === 'admin' ? 'Administrator' : 'Candidate'}
                </Badge>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Mail size={15} />
                <span>{email}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verification Status</div>
              <div style={{ marginTop: '0.2rem' }}>
                {is_verified ? (
                  <Badge variant="success">
                    <CheckCircle size={13} />
                    <span>Email Verified</span>
                  </Badge>
                ) : (
                  <Badge variant="danger">
                    <XCircle size={13} />
                    <span>Unverified</span>
                  </Badge>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enrolled Tracks</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                {total_enrolled_courses}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Enrolled Courses Table */}
      <Card>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          Enrolled Tracks & Curricula
        </h3>

        {enrolled_courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <BookOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              This candidate has not enrolled in any courses yet.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Course Title</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Instructor</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Level</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Enrollment Date</th>
                </tr>
              </thead>
              <tbody>
                {enrolled_courses.map((c) => (
                  <tr key={c.course_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>{c.title}</td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>{c.instructor}</td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>{c.duration_weeks} wks</td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <Badge variant="primary">{c.level}</Badge>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {formatDate(c.enrolled_at)}
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

export default AdminUserDetail;
