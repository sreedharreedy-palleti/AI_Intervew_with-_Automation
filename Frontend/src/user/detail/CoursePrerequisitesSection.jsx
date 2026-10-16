import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { User, Clock, Award, Users, Calendar, CheckCircle, Sparkles } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const CoursePrerequisitesSection = ({ course, onOpenEnroll }) => {
  return (
    <Card
      style={{
        position: 'sticky',
        top: '90px',
        border: '1px solid var(--border-medium)',
      }}
    >
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
        Track Overview
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={15} /> Instructor
          </span>
          <span style={{ fontWeight: 600 }}>{course.instructor}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={15} /> Duration
          </span>
          <span style={{ fontWeight: 600 }}>{course.duration_weeks} Weeks</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={15} /> Proficiency
          </span>
          <Badge variant="primary">{course.level}</Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={15} /> Enrolled
          </span>
          <span style={{ fontWeight: 600 }}>{course.enrolled_count} Candidates</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={15} /> Published
          </span>
          <span style={{ fontWeight: 500 }}>{formatDate(course.created_at)}</span>
        </div>
      </div>

      {course.is_enrolled ? (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              padding: '0.85rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#6ee7b7',
              fontSize: '0.88rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <CheckCircle size={16} />
            <span>Application Submitted</span>
          </div>

          <Link to="/my-enrollments" className="btn btn-outline btn-block">
            View My Applications
          </Link>
        </div>
      ) : (
        <Button
          variant="primary"
          block
          size="lg"
          onClick={onOpenEnroll}
          icon={<Sparkles size={18} />}
        >
          Apply & Evaluate Resume
        </Button>
      )}
    </Card>
  );
};

export default CoursePrerequisitesSection;
