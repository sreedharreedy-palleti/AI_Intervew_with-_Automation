import React from 'react';
import Card from '../../components/common/Card';
import { BookOpen, Users, CheckCircle, XCircle } from 'lucide-react';

const StatsOverview = ({
  totalCourses,
  totalEnrollments,
  totalShortlisted,
  totalRejected,
}) => {
  return (
    <div className="grid-metrics">
      <Card elevated>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Courses</span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <BookOpen size={18} />
          </div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {totalCourses}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#818cf8', marginTop: '0.25rem' }}>
          Active curricula in catalog
        </div>
      </Card>

      <Card elevated>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Enrolled Applicants</span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
            <Users size={18} />
          </div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {totalEnrollments}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#c084fc', marginTop: '0.25rem' }}>
          Course enrollments received
        </div>
      </Card>

      <Card elevated style={{ borderLeft: '3px solid #10b981' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Shortlisted Candidates</span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
            <CheckCircle size={18} />
          </div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
          {totalShortlisted}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#6ee7b7', marginTop: '0.25rem' }}>
          ATS Match ≥ 70% ({totalEnrollments > 0 ? Math.round((totalShortlisted / totalEnrollments) * 100) : 0}% qualified)
        </div>
      </Card>

      <Card elevated style={{ borderLeft: '3px solid #f43f5e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Not Shortlisted</span>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af' }}>
            <XCircle size={18} />
          </div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f43f5e' }}>
          {totalRejected}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#fda4af', marginTop: '0.25rem' }}>
          ATS Match &lt; 70% threshold
        </div>
      </Card>
    </div>
  );
};

export default StatsOverview;
