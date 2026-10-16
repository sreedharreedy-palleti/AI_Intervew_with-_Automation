import React from 'react';
import Card from '../../components/common/Card';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';

const EnrollmentMetricsBar = ({
  totalEnrollments,
  coursesCount,
  totalShortlisted,
  totalRejected,
  totalPending,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}
    >
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
          <span>Total Enrolled</span>
          <Users size={16} color="var(--primary)" />
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem' }}>
          {totalEnrollments}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Across {coursesCount} active courses
        </div>
      </Card>

      <Card style={{ padding: '1.25rem', borderLeft: '3px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
          <span>Shortlisted</span>
          <CheckCircle size={16} color="#10b981" />
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#10b981' }}>
          {totalShortlisted}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>
          ATS Match ≥ 70% ({totalEnrollments > 0 ? Math.round((totalShortlisted / totalEnrollments) * 100) : 0}% qualified)
        </div>
      </Card>

      <Card style={{ padding: '1.25rem', borderLeft: '3px solid #f43f5e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
          <span>Not Shortlisted</span>
          <XCircle size={16} color="#f43f5e" />
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#f43f5e' }}>
          {totalRejected}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '0.2rem' }}>
          ATS Match &lt; 70% (Below threshold)
        </div>
      </Card>

      {totalPending > 0 && (
        <Card style={{ padding: '1.25rem', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>Under Review</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', color: '#f59e0b' }}>
            {totalPending}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.2rem' }}>
            Pending evaluation
          </div>
        </Card>
      )}
    </div>
  );
};

export default EnrollmentMetricsBar;
