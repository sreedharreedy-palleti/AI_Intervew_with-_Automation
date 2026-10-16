import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import CourseEnrollModal from './CourseEnrollModal';
import {
  BookOpen,
  Clock,
  User,
  Users,
  Search,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';

const CourseCatalog = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null);

  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // If user searched admin in URL (e.g. localhost:5173/courses?search=admin or ?admin or ?q=admin)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || params.get('q') || '';
    if (params.has('admin') || searchParam.toLowerCase().includes('admin')) {
      navigate('/admin');
    } else if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [location.search, navigate]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await courseApi.getCourses();
      setCourses(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load courses catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEnrollSuccess = () => {
    fetchCourses();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim().toLowerCase();
      if (q === 'admin' || q === '/admin') {
        navigate('/admin');
      }
    }
  };

  // Filter courses by search and level
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel =
      selectedLevel === 'All' ||
      course.level?.toLowerCase() === selectedLevel.toLowerCase();

    return matchesSearch && matchesLevel;
  });

  const getLevelVariant = (level) => {
    const l = level?.toLowerCase();
    if (l === 'beginner') return 'success';
    if (l === 'intermediate') return 'warning';
    if (l === 'advanced') return 'danger';
    return 'primary';
  };

  return (
    <div className="page-wrapper">
      <div className="app-container">
        {/* Hero Section */}
        <section
          style={{
            textAlign: 'center',
            padding: '3rem 1rem 4rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-full)',
              color: '#a5b4fc',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <Sparkles size={15} />
            <span>AI-Driven Technical Assessment & Interview Tracks</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
              lineHeight: 1.15,
            }}
          >
            Advance Your Career with{' '}
            <span className="gradient-text">Intelligent Tracks</span>
          </h1>

          <p
            style={{
              maxWidth: '680px',
              margin: '0 auto 2.5rem',
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
            }}
          >
            Explore high-impact engineering courses. Upload your resume for real-time ATS scoring
            and unlock AI-powered interview evaluations.
          </p>

          {/* Search & Filter Bar */}
          <div
            className="glass-panel"
            style={{
              maxWidth: '780px',
              margin: '0 auto',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.75rem',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                flex: '1 1 300px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.4rem 0.75rem',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search courses, skills, or instructors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  width: '100%',
                }}
              />
            </div>

            {/* Level Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Filter size={15} color="var(--text-muted)" style={{ marginRight: '4px' }} />
              {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background:
                      selectedLevel === lvl
                        ? 'var(--primary)'
                        : 'rgba(255, 255, 255, 0.05)',
                    color: selectedLevel === lvl ? '#fff' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Course Catalog Grid */}
        {isLoading ? (
          <Loader text="Loading available courses..." />
        ) : filteredCourses.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3rem',
              textAlign: 'center',
              maxWidth: '520px',
              margin: '2rem auto',
            }}
          >
            <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Courses Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {searchQuery || selectedLevel !== 'All'
                ? 'Try adjusting your search criteria or filter options.'
                : 'No courses are currently available. Check back soon or create one in the Admin portal!'}
            </p>
          </div>
        ) : (
          <div className="grid-cards">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Course Header */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <Badge variant={getLevelVariant(course.level)}>{course.level}</Badge>
                    {course.is_enrolled && (
                      <Badge variant="success" className="animate-fade-in">
                        <CheckCircle size={12} />
                        <span>Enrolled</span>
                      </Badge>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      marginBottom: '0.65rem',
                      lineHeight: 1.3,
                    }}
                  >
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

                {/* Course Meta Info */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      padding: '0.85rem 0',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={14} color="#10b981" />
                      <span>{course.enrolled_count} Enrolled</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <Link
                      to={`/courses/${course.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, textDecoration: 'none' }}
                    >
                      <span>Details</span>
                    </Link>

                    {course.is_enrolled ? (
                      <Link
                        to="/my-enrollments"
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1.5, textDecoration: 'none' }}
                      >
                        <CheckCircle size={14} />
                        <span>View Status</span>
                      </Link>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        style={{ flex: 1.5 }}
                        onClick={() => setSelectedCourseForEnroll(course)}
                        icon={<Sparkles size={14} />}
                      >
                        Apply with Resume
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal for AI ATS Enrollment */}
        {selectedCourseForEnroll && (
          <CourseEnrollModal
            isOpen={!!selectedCourseForEnroll}
            onClose={() => setSelectedCourseForEnroll(null)}
            course={selectedCourseForEnroll}
            onEnrollSuccess={handleEnrollSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default CourseCatalog;
