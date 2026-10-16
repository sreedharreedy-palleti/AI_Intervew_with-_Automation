import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  BookOpen,
  Clock,
  User,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const MyEnrollments = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();
  const toast = useToast();

  const fetchEnrolledCourses = async () => {
    setIsLoading(true);
    try {
      const data = await courseApi.getCourses();
      const myCourses = data.filter((c) => c.is_enrolled);
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
        <div style={{ marginBottom: '2.5rem' }}>
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

        {/* Content list */}
        {isLoading ? (
          <Loader text="Loading your applications..." />
        ) : enrolledCourses.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              maxWidth: '560px',
              margin: '2rem auto',
            }}
          >
            <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.25rem' }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.65rem' }}>
              No Active Applications Yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              You haven't enrolled in any tracks yet. Browse the catalog, upload your resume, and let
              AI screen your qualifications.
            </p>
            <Link to="/courses" className="btn btn-primary">
              <Sparkles size={16} />
              <span>Explore Courses Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="grid-cards">
            {enrolledCourses.map((course) => (
              <Card
                key={course.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <Badge variant="success">
                      <CheckCircle size={12} />
                      <span>Application Active</span>
                    </Badge>
                    <Badge variant="primary">{course.level}</Badge>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                    {course.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '1.25rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {course.description}
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      padding: '0.75rem 0',
                      borderTop: '1px solid var(--border-subtle)',
                      borderBottom: '1px solid var(--border-subtle)',
                      marginBottom: '1.25rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User size={14} color="var(--primary)" />
                      <span>{course.instructor}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} color="#06b6d4" />
                      <span>{course.duration_weeks} Weeks</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {course.assignment_token && (
                      <Link
                        to={`/assignment/${course.assignment_token}`}
                        className="btn btn-primary btn-block btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        <Sparkles size={14} />
                        <span>
                          {course.assignment_status === 'submitted'
                            ? `View Assessment Result (${Math.round(course.assignment_score ?? 0)}%)`
                            : 'Take AI Technical Assessment'}
                        </span>
                      </Link>
                    )}

                    <Link
                      to={`/courses/${course.id}`}
                      className="btn btn-secondary btn-block btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <span>View Course Details</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEnrollments;
