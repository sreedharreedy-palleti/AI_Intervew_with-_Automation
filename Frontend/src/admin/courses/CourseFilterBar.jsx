import React from 'react';
import Button from '../../components/common/Button';
import { Plus } from 'lucide-react';

const CourseFilterBar = ({ onOpenCreate }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem',
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Course Tracks Management</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Publish new technical curricula, view student applicant rosters, and inspect ATS resumes.
        </p>
      </div>

      <Button
        variant="primary"
        onClick={onOpenCreate}
        icon={<Plus size={16} />}
      >
        Create New Course
      </Button>
    </div>
  );
};

export default CourseFilterBar;
