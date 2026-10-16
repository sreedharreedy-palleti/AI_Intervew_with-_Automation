import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { BookOpen, Plus, Users, ArrowRight, Edit2, Trash2 } from 'lucide-react';

const CourseCardList = ({
  courses = [],
  onOpenCreate,
  onOpenEdit,
  handleDeleteCourse,
  isDeletingId,
}) => {
  if (courses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Courses in Database</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Get started by creating your first course track for applicants.
        </p>
        <Button variant="primary" onClick={onOpenCreate}>
          <Plus size={15} />
          <span>Create Course Now</span>
        </Button>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
            <th style={{ padding: '0.85rem 0.75rem' }}>Course Title</th>
            <th style={{ padding: '0.85rem 0.75rem' }}>Instructor</th>
            <th style={{ padding: '0.85rem 0.75rem' }}>Duration</th>
            <th style={{ padding: '0.85rem 0.75rem' }}>Level</th>
            <th style={{ padding: '0.85rem 0.75rem' }}>Applicants</th>
            <th style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr
              key={course.id}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                transition: 'background var(--transition-fast)',
              }}
            >
              <td style={{ padding: '0.85rem 0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#f9fafb' }}>{course.title}</div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    maxWidth: '300px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {course.description}
                </div>
              </td>

              <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)' }}>
                {course.instructor}
              </td>

              <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)' }}>
                {course.duration_weeks} Weeks
              </td>

              <td style={{ padding: '0.85rem 0.75rem' }}>
                <Badge variant="primary">{course.level}</Badge>
              </td>

              <td style={{ padding: '0.85rem 0.75rem' }}>
                <Badge variant="success">
                  <Users size={12} />
                  <span>{course.enrolled_count} Students</span>
                </Badge>
              </td>

              <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link
                    to={`/admin/courses/${course.id}/roster`}
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    <span>Roster</span>
                    <ArrowRight size={13} />
                  </Link>

                  <button
                    onClick={() => onOpenEdit(course)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                    title="Edit Course"
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    disabled={isDeletingId === course.id}
                    className="btn btn-danger btn-sm"
                    title="Delete Course"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CourseCardList;
