import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import CourseEnrollModal from './CourseEnrollModal';
import {
  ArrowLeft,
  User,
  Clock,
  Calendar,
  Users,
  Sparkles,
  CheckCircle,
  FileCheck,
  BrainCircuit,
  Award,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const CourseDetail = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const fetchCourse = async () => {
    setIsLoading(true);
    try {
      const data = await courseApi.getCourseDetail(courseId);
      setCourse(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load course details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  if (isLoading) {
    return <Loader fullScreen text="Loading course syllabus..." />;
  }

  if (!course) {
    return (
      <div className="page-wrapper app-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2>Course Not Found</h2>
        <p style={{ margin: '1rem 0 2rem', color: 'var(--text-secondary)' }}>
          The requested course could not be located or has been archived.
        </p>
        <Link to="/courses" className="btn btn-primary">
          Back to Courses Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="app-container">
        {/* Back Navigation */}
        <Link
          to="/courses"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.target.style.color = '#fff')}
          onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={16} />
          <span>Back to All Courses</span>
        </Link>

        {/* Main Header Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <Badge variant="primary">{course.level}</Badge>
              {course.is_enrolled && (
                <Badge variant="success">
                  <CheckCircle size={13} />
                  <span>Enrolled</span>
                </Badge>
              )}
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: '1.25rem',
              }}
            >
              {course.title}
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                marginBottom: '2rem',
                whiteSpace: 'pre-line',
              }}
            >
              {course.description}
            </p>

            {/* AI Screening Process Card */}
            <Card elevated style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <BrainCircuit size={22} color="#a5b4fc" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI ATS Screening Workflow</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                When applying, your uploaded PDF/Word resume is parsed into raw text and analyzed by
                our Gemini AI ATS matching engine.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                    70%+
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Minimum ATS match threshold required to qualify
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginBottom: '0.2rem' }}>
                    Instant
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Real-time skill gaps & strengths feedback
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#06b6d4', marginBottom: '0.2rem' }}>
                    AI Interview
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Automatic link dispatch for shortlisted candidates
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Action Sidebar Card */}
          <div>
            <Card
              style={{
                position: 'sticky',
                top: '90px',
                border: '1px solid var(--border-medium)',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                Track Overview
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={15} /> Instructor
                  </span>
                  <span style={{ fontWeight: 600 }}>{course.instructor}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={15} /> Duration
                  </span>
                  <span style={{ fontWeight: 600 }}>{course.duration_weeks} Weeks</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Award size={15} /> Proficiency
                  </span>
                  <Badge variant="primary">{course.level}</Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={15} /> Enrolled
                  </span>
                  <span style={{ fontWeight: 600 }}>{course.enrolled_count} Candidates</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={15} /> Published
                  </span>
                  <span style={{ fontWeight: 500 }}>{formatDate(course.created_at)}</span>
                </div>
              </div>

              {course.is_enrolled ? (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      padding: '0.85rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      color: '#6ee7b7',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>Application Submitted</span>
                  </div>

                  <Link to="/my-enrollments" className="btn btn-outline btn-block">
                    View My Applications
                  </Link>
                </div>
              ) : (
                <Button
                  variant="primary"
                  block
                  size="lg"
                  onClick={() => setIsEnrollModalOpen(true)}
                  icon={<Sparkles size={18} />}
                >
                  Apply & Evaluate Resume
                </Button>
              )}
            </Card>
          </div>
        </div>

        {/* AI ATS Enrollment Modal */}
        <CourseEnrollModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          course={course}
          onEnrollSuccess={() => {
            fetchCourse();
          }}
        />
      </div>
    </div>
  );
};

export default CourseDetail;
