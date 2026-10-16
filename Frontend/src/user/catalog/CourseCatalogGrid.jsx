import React from 'react';
import { BookOpen } from 'lucide-react';
import CourseCard from './CourseCard';

const CourseCatalogGrid = ({
  courses,
  filteredCourses,
  onOpenEnroll,
  onResetFilter,
}) => {
  if (filteredCourses.length === 0) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '2rem auto',
        }}
      >
        <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No matching courses</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          We couldn't find any courses matching your criteria. Try adjusting your search term or level filter.
        </p>
        <button
          onClick={onResetFilter}
          className="btn btn-secondary btn-sm"
        >
          Reset Filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid-cards">
      {filteredCourses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onOpenEnroll={onOpenEnroll}
        />
      ))}
    </div>
  );
};

export default CourseCatalogGrid;
