import React from 'react';
import Badge from '../../components/common/Badge';
import { CheckCircle } from 'lucide-react';

const CourseDetailHeader = ({ course }) => {
  return (
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
    </div>
  );
};

export default CourseDetailHeader;
