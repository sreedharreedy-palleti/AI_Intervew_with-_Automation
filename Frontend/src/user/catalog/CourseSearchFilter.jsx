import React from 'react';
import { Search, Sparkles } from 'lucide-react';

const CourseSearchFilter = ({
  searchQuery,
  setSearchQuery,
  selectedLevel,
  setSelectedLevel,
  handleSearchKeyDown,
}) => {
  return (
    <div>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            color: 'var(--primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          <Sparkles size={16} />
          <span>AI-Powered Technical Assessment Platform</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
          Explore Enterprise Training Programs
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Select a curriculum, submit your resume, and qualify for AI-proctored technical coding
          simulations generated tailored to your experience.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search curricula by title, instructor, or technology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor:
                  selectedLevel === lvl ? 'var(--primary)' : 'var(--border-subtle)',
                background:
                  selectedLevel === lvl
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(255, 255, 255, 0.03)',
                color: selectedLevel === lvl ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseSearchFilter;
