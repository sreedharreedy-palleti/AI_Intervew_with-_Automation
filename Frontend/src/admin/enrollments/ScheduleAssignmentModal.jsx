import React from 'react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { Send } from 'lucide-react';

const ScheduleAssignmentModal = ({
  isOpen,
  onClose,
  scheduleTarget,
  scheduleTargetCourseId,
  setScheduleTargetCourseId,
  courses = [],
  scheduleFormData,
  setScheduleFormData,
  scheduleLoading,
  handleScheduleSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        scheduleTarget
          ? `Schedule Assignment: ${scheduleTarget.name}`
          : 'Schedule Assignment for Shortlisted Candidates'
      }
      maxWidth="640px"
    >
      <form onSubmit={handleScheduleSubmit}>
        {/* Target summary banner */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
          }}
        >
          {scheduleTarget ? (
            <div>
              <div style={{ fontWeight: 700, color: '#f0f9ff' }}>
                Candidate: {scheduleTarget.name} ({scheduleTarget.email})
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                Course Track: <strong style={{ color: '#fff' }}>{scheduleTarget.course_title}</strong>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, color: '#f0f9ff' }}>
                Broadcast to Shortlisted Candidates
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                The assignment link, scheduled date & time, and policy rules will be emailed via Gmail to all shortlisted candidates.
              </div>
            </div>
          )}
        </div>

        {/* Course select if batch */}
        {!scheduleTarget && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Select Course Cohort *
            </label>
            <select
              value={scheduleTargetCourseId}
              onChange={(e) => setScheduleTargetCourseId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.enrolled_count || 0} students)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date and Time + Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Assignment Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={scheduleFormData.assignment_datetime}
              onChange={(e) =>
                setScheduleFormData({ ...scheduleFormData, assignment_datetime: e.target.value })
              }
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.9rem',
                colorScheme: 'dark',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Duration (Minutes)
            </label>
            <input
              type="number"
              min="15"
              max="360"
              required
              value={scheduleFormData.duration_minutes}
              onChange={(e) =>
                setScheduleFormData({ ...scheduleFormData, duration_minutes: Number(e.target.value) })
              }
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
          </div>
        </div>

        {/* Assignment Policy & Guidelines */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Assignment Policy & Proctoring Guidelines *
          </label>
          <textarea
            rows={5}
            required
            value={scheduleFormData.assignment_policy}
            onChange={(e) =>
              setScheduleFormData({ ...scheduleFormData, assignment_policy: e.target.value })
            }
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Included in the email and candidate portal before launching the assessment simulation.
          </p>
        </div>

        {/* Gmail Notification Checkbox */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            marginBottom: '1.5rem',
          }}
        >
          <input
            type="checkbox"
            id="sendGmailCheck"
            checked={scheduleFormData.send_email}
            onChange={(e) =>
              setScheduleFormData({ ...scheduleFormData, send_email: e.target.checked })
            }
            style={{ marginTop: '0.2rem', accentColor: '#10b981', cursor: 'pointer' }}
          />
          <label htmlFor="sendGmailCheck" style={{ fontSize: '0.82rem', color: '#e5e7eb', cursor: 'pointer' }}>
            <strong style={{ color: '#34d399' }}>Dispatch Gmail Notification Automatically</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
              Sends an official email to the candidate(s) with scheduled date & time, policy rules, and test simulation link.
            </p>
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={scheduleLoading}
            icon={<Send size={15} />}
          >
            {scheduleFormData.send_email ? 'Schedule & Send Gmail' : 'Save Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleAssignmentModal;
