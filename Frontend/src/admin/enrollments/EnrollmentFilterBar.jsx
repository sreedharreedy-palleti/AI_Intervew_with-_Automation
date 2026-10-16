import React from 'react';
import Card from '../../components/common/Card';
import { Search } from 'lucide-react';

const EnrollmentFilterBar = ({
  searchQuery,
  setSearchQuery,
  selectedCourseFilter,
  setSelectedCourseFilter,
  courses = [],
  statusFilter,
  setStatusFilter,
  totalEnrollments,
  totalShortlisted,
  totalRejected,
}) => {
  return (
    <Card style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Search Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: '1 1 260px',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '0.45rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search candidate name, email, college, course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.85rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter by Course Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Course:</span>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            style={{
              background: '#151d2f',
              color: '#fff',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.75rem',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Courses ({courses.length})</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.enrolled_count || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'ALL', label: `All (${totalEnrollments})` },
            { id: 'SHORTLISTED', label: `Shortlisted (${totalShortlisted})` },
            { id: 'NOT_SHORTLISTED', label: `Not Shortlisted (${totalRejected})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: statusFilter === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === tab.id ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default EnrollmentFilterBar;
