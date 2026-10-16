import React, { useState, useEffect } from 'react';
import { courseApi } from '../services/courseApi';
import { useToast } from '../../hooks/useToast';
import Loader from '../../components/common/Loader';
import { Sparkles } from 'lucide-react';
import MyEnrollmentsList from '../enrollment/MyEnrollmentsList';

const MyEnrollments = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();

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
        ) : (
          <MyEnrollmentsList enrolledCourses={enrolledCourses} />
        )}
      </div>
    </div>
  );
};

export default MyEnrollments;
