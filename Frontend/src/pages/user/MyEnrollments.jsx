import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Loader from '../../components/common/Loader';
import { Sparkles, BrainCircuit } from 'lucide-react';
import MyEnrollmentsList from '../../user/enrollment/MyEnrollmentsList';

const DEMO_EMAILS = ['23091a32j4@rgmcet.edu.in'];

const MyEnrollments = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();
  const toast = useToast();

  const isDemoAccount =
    Boolean(user?.email && DEMO_EMAILS.includes(user.email.trim().toLowerCase()));

  const fetchEnrolledCourses = async () => {
    setIsLoading(true);
    try {
      const data = await courseApi.getCourses();
      const myCourses = (data || []).filter((c) => c.is_enrolled);
      setEnrolledCourses(myCourses);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch enrollments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  return (
    <div className="page-wrapper">
      <div className="app-container">
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            <Sparkles size={16} />
            <span>Candidate Learning Dashboard</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>My Course Applications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.25rem' }}>
            Courses and tracks you have submitted candidate resumes for.
          </p>
        </div>

        {/* Free AI Interview Demo Experiment Banner for Authorized Test Accounts */}
        {isDemoAccount && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.16) 100%)',
              border: '1px solid rgba(129, 140, 248, 0.45)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a5b4fc',
                }}
              >
                <BrainCircuit size={26} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Unlimited Free Trial Active</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: '#10b981',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    UNLIMITED TRIAL
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#c7d2fe', marginTop: '3px' }}>
                  Account <strong>{user?.email}</strong> is granted unlimited free retries and test sessions for AI Interviews and Coding Assessments. Normal candidate accounts are strictly restricted to 1 attempt.
                </div>
              </div>
            </div>

            <Link
              to="/interview/start"
              className="btn btn-primary"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.45)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 1.25rem',
              }}
            >
              <Sparkles size={16} />
              <span>Launch Live AI Interview</span>
            </Link>
          </div>
        )}

        {/* Content list */}
        {isLoading ? (
          <Loader text="Loading your applications..." />
        ) : (
          <MyEnrollmentsList enrolledCourses={enrolledCourses} />
        )}
      </div>
    </div>
  );
};

export default MyEnrollments;
