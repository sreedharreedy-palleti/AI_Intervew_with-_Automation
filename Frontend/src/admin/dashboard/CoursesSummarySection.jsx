import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import { ArrowRight } from 'lucide-react';

const CoursesSummarySection = ({ courses = [] }) => {
  if (courses.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
        No courses found in database.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
            <th style={{ padding: '0.75rem 0.5rem' }}>Course Title</th>
            <th style={{ padding: '0.75rem 0.5rem' }}>Instructor</th>
            <th style={{ padding: '0.75rem 0.5rem' }}>Duration</th>
            <th style={{ padding: '0.75rem 0.5rem' }}>Level</th>
            <th style={{ padding: '0.75rem 0.5rem' }}>Enrolled Applicants</th>
            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>{course.title}</td>
              <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>{course.instructor}</td>
              <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>{course.duration_weeks} wks</td>
              <td style={{ padding: '0.85rem 0.5rem' }}>
                <Badge variant="primary">{course.level}</Badge>
              </td>
              <td style={{ padding: '0.85rem 0.5rem' }}>
                <Badge variant="success">{course.enrolled_count} candidates</Badge>
              </td>
              <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                <Link
                  to={`/admin/courses/${course.id}/roster`}
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <span>View Roster</span>
                  <ArrowRight size={13} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CoursesSummarySection;
