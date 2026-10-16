import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { CheckCircle, User, Clock, ArrowRight, Sparkles } from 'lucide-react';

const CourseCard = ({ course, onOpenEnroll }) => {
  const getLevelVariant = (level) => {
    const l = level?.toLowerCase();
    if (l === 'beginner') return 'success';
    if (l === 'intermediate') return 'warning';
    if (l === 'advanced') return 'danger';
    return 'primary';
  };

  return (
    <Card
      key={course.id}
      hoverable
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
            marginBottom: '1rem',
          }}
        >
          <Badge variant={getLevelVariant(course.level)}>{course.level}</Badge>
          {course.is_enrolled ? (
            <Badge variant="success">
              <CheckCircle size={12} />
              <span>Enrolled</span>
            </Badge>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Open Enrollment
            </span>
          )}
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.65rem' }}>
          {course.title}
        </h3>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
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

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            to={`/courses/${course.id}`}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <span>Overview</span>
            <ArrowRight size={14} />
          </Link>

          {course.is_enrolled ? (
            <Link
              to="/my-enrollments"
              className="btn btn-primary btn-sm"
              style={{ flex: 1.2, textDecoration: 'none' }}
            >
              <span>View Status</span>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={() => onOpenEnroll(course)}
              style={{ flex: 1.2 }}
            >
              Apply (ATS)
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CourseCard;
