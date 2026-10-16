import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseApi } from '../services/courseApi';
import { useToast } from '../../hooks/useToast';
import Loader from '../../components/common/Loader';
import { ArrowLeft } from 'lucide-react';

import CourseDetailHeader from '../detail/CourseDetailHeader';
import CourseSyllabusSection from '../detail/CourseSyllabusSection';
import CoursePrerequisitesSection from '../detail/CoursePrerequisitesSection';
import CourseEnrollModal from '../enrollment/CourseEnrollModal';

const CourseDetail = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const toast = useToast();

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

        {/* Main Header & Detail Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <CourseDetailHeader course={course} />
            <CourseSyllabusSection />
          </div>

          <div>
            <CoursePrerequisitesSection
              course={course}
              onOpenEnroll={() => setIsEnrollModalOpen(true)}
            />
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
