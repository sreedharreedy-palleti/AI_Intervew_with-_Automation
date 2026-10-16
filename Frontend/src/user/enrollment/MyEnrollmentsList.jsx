import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles } from 'lucide-react';
import EnrollmentStatusCard from './EnrollmentStatusCard';

const MyEnrollmentsList = ({ enrolledCourses = [] }) => {
  if (enrolledCourses.length === 0) {
    return (
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
    );
  }

  return (
    <div className="grid-cards">
      {enrolledCourses.map((course) => (
        <EnrollmentStatusCard key={course.id} course={course} />
      ))}
    </div>
  );
};

export default MyEnrollmentsList;
