import React, { useState } from 'react';
import {
  BarChart3,
  Award,
  PieChart,
  Layers,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  Users,
  Volume2,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

// ----------------------------------------------------------------------------
// 1. Course Enrollment Distribution Interactive Bar & Column Chart
// ----------------------------------------------------------------------------
export const CourseEnrollmentBarChart = ({ courses = [], totalEnrollments = 0 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [chartView, setChartView] = useState('horizontal'); // 'horizontal' | 'column'

  if (!courses || courses.length === 0) {
    return (
      <Card elevated>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Enrollment Distribution by Course</h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>0 Total Registrations</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '2.5rem' }}>
          No course enrollments recorded yet.
        </p>
      </Card>
    );
  }

  const maxVal = Math.max(
    ...courses.map((c) => Math.max(c.enrolled_count || 0, c.shortlisted_count || 0)),
    1
  );

  let axisMax = maxVal;
  let ticks = [0, 1];
  if (maxVal <= 2) {
    axisMax = 2;
    ticks = [0, 1, 2];
  } else if (maxVal <= 5) {
    axisMax = 5;
    ticks = [0, 1, 2, 3, 4, 5];
  } else if (maxVal <= 10) {
    axisMax = 10;
    ticks = [0, 2, 4, 6, 8, 10];
  } else {
    const step = Math.ceil(maxVal / 5);
    axisMax = step * 5;
    ticks = [0, step, step * 2, step * 3, step * 4, axisMax];
  }

  return (
    <Card elevated>
      {/* Top Header & Chart Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={18} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Enrollment Distribution by Course</h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Comparative Analysis: Total Applications vs Shortlisted (ATS ≥ 70)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          {/* Visual Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#c7d2fe', fontWeight: 600 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, #6366f1, #a855f7)' }} />
              Total Enrolled
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6ee7b7', fontWeight: 600 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, #10b981, #059669)' }} />
              Shortlisted
            </span>
          </div>

          {/* Chart View Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setChartView('horizontal')}
              style={{
                border: 'none',
                background: chartView === 'horizontal' ? 'var(--primary)' : 'transparent',
                color: chartView === 'horizontal' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.22rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Horizontal Bars
            </button>
            <button
              type="button"
              onClick={() => setChartView('column')}
              style={{
                border: 'none',
                background: chartView === 'column' ? 'var(--primary)' : 'transparent',
                color: chartView === 'column' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.22rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Vertical Columns
            </button>
          </div>
        </div>
      </div>

      {/* VIEW A: HORIZONTAL CARTESIAN BAR GRAPH */}
      {chartView === 'horizontal' ? (
        <div style={{ padding: '0.25rem 0' }}>
          {/* Plot Area with Courses (With Dedicated Right-Side Scroller) */}
          <div
            className="graph-scrollbar-right"
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {courses.map((course, idx) => {
              const enrolledPct = Math.round(((course.enrolled_count || 0) / axisMax) * 100);
              const shortlistedPct = Math.round(((course.shortlisted_count || 0) / axisMax) * 100);
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={course.id || idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isHovered ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isHovered ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* Course Header Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '75%' }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>
                        {course.title}
                      </span>
                      <Badge variant="primary" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                        {course.level}
                      </Badge>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        ({course.duration_weeks} wks)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.78rem' }}>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                        Avg ATS: {course.avg_ats_score}%
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {course.percentage_of_total}% share
                      </span>
                    </div>
                  </div>

                  {/* Real Coordinate Bar Plane with Vertical Grid Lines */}
                  <div
                    style={{
                      position: 'relative',
                      background: 'rgba(15, 23, 42, 0.65)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.6rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {/* Vertical Dashed Grid Lines based on X-axis ticks */}
                    {ticks.map((t) => (
                      <div
                        key={t}
                        style={{
                          position: 'absolute',
                          left: `${(t / axisMax) * 100}%`,
                          top: 0,
                          bottom: 0,
                          borderLeft: '1px dashed rgba(255, 255, 255, 0.07)',
                          pointerEvents: 'none',
                        }}
                      />
                    ))}

                    {/* 1. Total Enrolled Bar */}
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          height: '22px',
                          width: `${Math.max(enrolledPct, 4)}%`,
                          background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                          borderRadius: '4px',
                          boxShadow: isHovered ? '0 0 12px rgba(99, 102, 241, 0.45)' : 'none',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '0.5rem',
                          minWidth: '24px',
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                          {course.enrolled_count}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#c7d2fe' }}>
                        {course.enrolled_count === 1 ? '1 applicant' : `${course.enrolled_count} applicants`}
                      </span>
                    </div>

                    {/* 2. Shortlisted Qualified Bar */}
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          height: '18px',
                          width: `${Math.max(shortlistedPct, 3)}%`,
                          background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                          borderRadius: '4px',
                          boxShadow: isHovered ? '0 0 10px rgba(16, 185, 129, 0.45)' : 'none',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '0.45rem',
                          minWidth: '22px',
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                          {course.shortlisted_count}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#6ee7b7' }}>
                        {course.shortlisted_count} qualified
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unified X-Axis Baseline and Numerical Grid Scale */}
          <div style={{ marginTop: '0.85rem', padding: '0 0.75rem' }}>
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.15)', position: 'relative' }}>
              {ticks.map((t) => (
                <div
                  key={t}
                  style={{
                    position: 'absolute',
                    left: `${(t / axisMax) * 100}%`,
                    top: '-4px',
                    height: '8px',
                    width: '1px',
                    background: 'rgba(255, 255, 255, 0.35)',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {ticks.map((t) => (
                <span key={t} style={{ transform: 'translateX(-50%)' }}>
                  {t}
                </span>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Applicant & Qualified Registration Count Scale
            </div>
          </div>
        </div>
      ) : (
        /* VIEW B: VERTICAL CARTESIAN COLUMN GRAPH */
        <div className="graph-scrollbar-right" style={{ padding: '0.75rem 0.5rem', overflowX: 'auto' }}>
          <div
            style={{
              height: '210px',
              width: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              gap: '1.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid rgba(255, 255, 255, 0.18)',
              position: 'relative',
            }}
          >
            {/* Horizontal Gridlines spanning chart */}
            {ticks.map((t) => (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${(t / axisMax) * 100}%`,
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.08)',
                  pointerEvents: 'none',
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', paddingLeft: '2px', transform: 'translateY(50%)' }}>
                  {t}
                </span>
              </div>
            ))}

            {/* Courses Dual Pillars */}
            {courses.map((course, idx) => {
              const enrolledHeight = Math.max(14, Math.round(((course.enrolled_count || 0) / axisMax) * 100));
              const shortlistedHeight = Math.max(10, Math.round(((course.shortlisted_count || 0) / axisMax) * 100));
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={course.id || idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    flex: 1,
                    maxWidth: '160px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {/* Dual Pillars (Enrolled vs Shortlisted) */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.45rem', width: '100%', justifyContent: 'center' }}>
                    {/* Enrolled Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '44px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.25rem' }}>
                        {course.enrolled_count}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: `${enrolledHeight}%`,
                          background: 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)',
                          borderRadius: '6px 6px 0 0',
                          boxShadow: isHovered ? '0 0 14px rgba(99, 102, 241, 0.5)' : 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                    </div>

                    {/* Shortlisted Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '44px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6ee7b7', marginBottom: '0.25rem' }}>
                        {course.shortlisted_count}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: `${shortlistedHeight}%`,
                          background: 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
                          borderRadius: '6px 6px 0 0',
                          boxShadow: isHovered ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Labels for Columns */}
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '1.5rem', marginTop: '0.75rem' }}>
            {courses.map((course, idx) => (
              <div
                key={course.id || idx}
                style={{
                  flex: 1,
                  maxWidth: '160px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: hoveredIdx === idx ? '#fff' : '#e5e7eb',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={course.title}
                >
                  {course.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <Badge variant="primary" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>
                    {course.level}
                  </Badge>
                  <span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 600 }}>
                    {course.avg_ats_score}% ATS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};


// ----------------------------------------------------------------------------
// 2. ATS Score Qualification Histogram Frequency Graph
// ----------------------------------------------------------------------------
export const AtsHistogramChart = ({
  atsDistribution = {},
  totalEvaluations = 1,
  avgAtsScore = 0,
}) => {
  const [hoveredTier, setHoveredTier] = useState(null);

  const tiers = [
    { key: 'tier_90_100', label: '90-100%', desc: 'Exceptional Match', count: atsDistribution.tier_90_100 || 0, color: '#10b981', gradient: ['#10b981', '#059669'] },
    { key: 'tier_80_89', label: '80-89%', desc: 'High Potential', count: atsDistribution.tier_80_89 || 0, color: '#34d399', gradient: ['#34d399', '#0d9488'] },
    { key: 'tier_70_79', label: '70-79%', desc: 'Direct Match', count: atsDistribution.tier_70_79 || 0, color: '#38bdf8', gradient: ['#38bdf8', '#0284c7'] },
    { key: 'tier_50_69', label: '50-69%', desc: 'Skills Gap', count: atsDistribution.tier_50_69 || 0, color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
    { key: 'tier_below_50', label: '< 50%', desc: 'Not Qualified', count: atsDistribution.tier_below_50 || 0, color: '#f43f5e', gradient: ['#f43f5e', '#e11d48'] },
  ];

  const maxCount = Math.max(...tiers.map((t) => t.count), 1);
  const total = Math.max(totalEvaluations, 1);

  return (
    <Card elevated>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} color="#fbbf24" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>ATS Score Qualification Histogram</h3>
        </div>
        <span
          style={{
            fontSize: '0.74rem',
            padding: '0.2rem 0.55rem',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#6ee7b7',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontWeight: 700,
          }}
        >
          Shortlist Cutoff: 70%
        </span>
      </div>

      {/* Modern SVG Histogram Visualizer */}
      <div style={{ padding: '0.5rem 0' }}>
        <div
          style={{
            height: '180px',
            width: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'relative',
          }}
        >
          {/* Reference Dotted Cutoff Line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '40%',
              borderBottom: '1.5px dashed rgba(16, 185, 129, 0.45)',
              display: 'flex',
              justifyContent: 'flex-end',
              paddingRight: '6px',
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: '0.68rem', color: '#6ee7b7', background: 'rgba(15, 23, 42, 0.9)', padding: '0 4px', borderRadius: '2px' }}>
              Cutoff Threshold (≥70%)
            </span>
          </div>

          {tiers.map((tier, idx) => {
            const heightPct = tier.count > 0 ? Math.max(16, Math.round((tier.count / maxCount) * 100)) : 6;
            const sharePercent = Math.round((tier.count / total) * 100);
            const isHovered = hoveredTier === idx;

            return (
              <div
                key={tier.key}
                onMouseEnter={() => setHoveredTier(idx)}
                onMouseLeave={() => setHoveredTier(null)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
              >
                {/* Count badge on top of bar */}
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: isHovered ? '#fff' : tier.color,
                    marginBottom: '0.35rem',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {tier.count}
                </div>

                {/* Histogram Column */}
                <div
                  style={{
                    width: '80%',
                    maxWidth: '48px',
                    height: `${heightPct}%`,
                    background: `linear-gradient(180deg, ${tier.gradient[0]} 0%, ${tier.gradient[1]} 100%)`,
                    borderRadius: '6px 6px 0 0',
                    boxShadow: isHovered ? `0 0 16px ${tier.color}` : 'none',
                    transition: 'all 0.25s ease',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Labels below histogram columns */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.5rem' }}>
          {tiers.map((tier, idx) => (
            <div
              key={tier.key}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: hoveredTier === idx ? '#fff' : tier.color,
              }}
            >
              {tier.label}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                {Math.round((tier.count / total) * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Summary Footnote */}
      <div
        style={{
          marginTop: '1.25rem',
          padding: '0.65rem 0.9rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Average candidate alignment:</span>
        <strong style={{ color: '#fbbf24', fontSize: '0.92rem' }}>{avgAtsScore}% ATS Match</strong>
      </div>
    </Card>
  );
};


// ----------------------------------------------------------------------------
// 3. Application Status Breakdown Interactive Donut Chart Graph
// ----------------------------------------------------------------------------
export const ApplicationStatusDonutChart = ({ summary = {} }) => {
  const shortlisted = Number(summary.total_shortlisted || 0);
  const rejected = Number(summary.total_rejected || 0);
  const pending = Number(summary.total_pending || 0);
  const total = Math.max(shortlisted + rejected + pending, 1);

  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12

  const shortRate = Math.round((shortlisted / total) * 100);
  const rejRate = Math.round((rejected / total) * 100);
  const pendRate = Math.max(0, 100 - shortRate - rejRate);

  const shortDash = (shortRate / 100) * circumference;
  const rejDash = (rejRate / 100) * circumference;
  const pendDash = (pendRate / 100) * circumference;

  return (
    <Card elevated>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <PieChart size={17} color="#a855f7" />
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Application Status Breakdown</h4>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0' }}>
        {/* SVG Donut Chart */}
        <div style={{ position: 'relative', width: '160px', height: '160px' }}>
          <svg viewBox="0 0 160 160" width="100%" height="100%">
            {/* Background circle track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="20"
            />

            {/* Shortlisted Segment (Emerald) */}
            {shortDash > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth="20"
                strokeDasharray={`${shortDash} ${circumference}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            )}

            {/* Rejected Segment (Rose) */}
            {rejDash > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="20"
                strokeDasharray={`${rejDash} ${circumference}`}
                strokeDashoffset={-shortDash}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            )}

            {/* Pending Segment (Sky) */}
            {pendDash > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="20"
                strokeDasharray={`${pendDash} ${circumference}`}
                strokeDashoffset={-(shortDash + rejDash)}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            )}
          </svg>

          {/* Center Statistic */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {summary.shortlist_rate || shortRate}%
            </span>
            <span style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
              Qualified
            </span>
          </div>
        </div>
      </div>

      {/* Legend & Count Telemetry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6ee7b7', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Shortlisted
          </span>
          <strong style={{ color: '#fff' }}>{shortlisted} ({shortRate}%)</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fda4af', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} /> Not Shortlisted
          </span>
          <strong style={{ color: '#fff' }}>{rejected} ({rejRate}%)</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#93c5fd', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} /> Under Review
          </span>
          <strong style={{ color: '#fff' }}>{pending} ({pendRate}%)</strong>
        </div>
      </div>
    </Card>
  );
};


// ----------------------------------------------------------------------------
// 4. Curriculum Level Distribution Visual Pillar Graph
// ----------------------------------------------------------------------------
export const CurriculumLevelChart = ({ courseLevels = {} }) => {
  const levels = [
    { name: 'Beginner', count: courseLevels.Beginner || 0, color: '#10b981' },
    { name: 'Intermediate', count: courseLevels.Intermediate || 0, color: '#818cf8' },
    { name: 'Advanced', count: courseLevels.Advanced || 0, color: '#f59e0b' },
  ];

  const maxLevelCount = Math.max(...levels.map((l) => l.count), 1);
  const totalCourses = levels.reduce((sum, l) => sum + l.count, 0);

  return (
    <Card elevated>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={17} color="#38bdf8" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Curriculum Level Distribution</h4>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {totalCourses} Total Tracks
        </span>
      </div>

      {/* 3 Pillar Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '140px', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {levels.map((lvl) => {
          const heightPct = lvl.count > 0 ? Math.max(18, Math.round((lvl.count / maxLevelCount) * 100)) : 8;

          return (
            <div key={lvl.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: lvl.color, marginBottom: '0.3rem' }}>
                {lvl.count}
              </span>
              <div
                style={{
                  width: '50px',
                  height: `${heightPct}%`,
                  background: lvl.color,
                  borderRadius: '6px 6px 0 0',
                  boxShadow: `0 0 10px ${lvl.color}33`,
                  transition: 'height 0.4s ease',
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.6rem' }}>
        {levels.map((lvl) => (
          <div key={lvl.name} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: lvl.color }}>
            {lvl.name}
          </div>
        ))}
      </div>
    </Card>
  );
};


// ----------------------------------------------------------------------------
// 5. Exam Integrity Telemetry Radial Gauge Graph
// ----------------------------------------------------------------------------
export const IntegrityGaugeChart = ({ summary = {} }) => {
  const total = summary.total_assignments || 0;
  const violations = summary.violation_lockouts || 0;
  const cleanPasses = Math.max(0, total - violations);

  // Platform integrity rate (100% clean if 0 violations)
  const integrityScore = total > 0 ? Math.max(0, Math.round(((total - violations) / total) * 100)) : 100;
  const isHealthy = integrityScore >= 80;

  // Semi-circle gauge (radius 55, arc = PI * 55 ~ 172.78)
  const arcLength = Math.PI * 55;
  const fillLength = (integrityScore / 100) * arcLength;

  return (
    <Card elevated>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <ShieldCheck size={17} color="#10b981" />
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Exam Integrity Telemetry</h4>
      </div>

      {/* Semi-circle Gauge Meter */}
      <div style={{ position: 'relative', width: '180px', height: '100px', margin: '0 auto' }}>
        <svg viewBox="0 0 180 100" width="100%" height="100%">
          {/* Background Arc */}
          <path
            d="M 25 90 A 55 55 0 0 1 155 90"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Active Integrity Arc */}
          <path
            d="M 25 90 A 55 55 0 0 1 155 90"
            fill="none"
            stroke={isHealthy ? '#10b981' : '#f59e0b'}
            strokeWidth="14"
            strokeDasharray={`${fillLength} ${arcLength}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>

        {/* Center Rating */}
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isHealthy ? '#6ee7b7' : '#fbbf24', lineHeight: 1 }}>
            {integrityScore}%
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
            Clean Session Rate
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Assessments Monitored:</span>
          <strong style={{ color: '#fff' }}>{total}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>YOLO Vision Frames Checked:</span>
          <strong style={{ color: '#38bdf8' }}>{summary.total_proctor_frames || 0}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
          <span style={{ color: violations > 0 ? '#fda4af' : 'var(--text-muted)' }}>Academic Lockouts Enforced:</span>
          <strong style={{ color: violations > 0 ? '#f43f5e' : '#10b981' }}>{violations}</strong>
        </div>
      </div>
    </Card>
  );
};

