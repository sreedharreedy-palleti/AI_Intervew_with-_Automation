import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { CheckCircle, User, Clock, Sparkles, ArrowRight } from 'lucide-react';

const EnrollmentStatusCard = ({ course }) => {
  return (
    <Card
      key={course.id}
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
            marginBottom: '0.85rem',
          }}
        >
          <Badge variant="success">
            <CheckCircle size={12} />
            <span>Application Active</span>
          </Badge>
          <Badge variant="primary">{course.level}</Badge>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.6rem' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {course.assignment_token && (
            <Link
              to={`/assignment/${course.assignment_token}`}
              className="btn btn-primary btn-block btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <Sparkles size={14} />
              <span>
                {course.assignment_status === 'submitted'
                  ? `View Assessment Result (${Math.round(course.assignment_score ?? 0)}%)`
                  : 'Take AI Technical Assessment'}
              </span>
            </Link>
          )}

          <Link
            to={`/courses/${course.id}`}
            className="btn btn-secondary btn-block btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <span>View Course Details</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default EnrollmentStatusCard;
