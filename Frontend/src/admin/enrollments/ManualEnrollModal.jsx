import React from 'react';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ManualEnrollModal = ({
  isOpen,
  onClose,
  enrollFormData,
  setEnrollFormData,
  courses = [],
  enrollLoading,
  handleManualEnrollSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Candidate Course Enrollment"
    >
      <form onSubmit={handleManualEnrollSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Select Course *
          </label>
          <select
            value={enrollFormData.course_id}
            onChange={(e) => setEnrollFormData({ ...enrollFormData, course_id: e.target.value })}
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
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <Input
          id="name"
          label="Candidate Full Name *"
          placeholder="e.g. Jane Doe"
          value={enrollFormData.name}
          onChange={(e) => setEnrollFormData({ ...enrollFormData, name: e.target.value })}
          required
        />

        <Input
          id="email"
          type="email"
          label="Candidate Email *"
          placeholder="candidate@example.com"
          value={enrollFormData.email}
          onChange={(e) => setEnrollFormData({ ...enrollFormData, email: e.target.value })}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <Input
            id="college"
            label="College / University"
            placeholder="e.g. Stanford University"
            value={enrollFormData.college}
            onChange={(e) => setEnrollFormData({ ...enrollFormData, college: e.target.value })}
          />

          <Input
            id="year"
            label="Graduation Year"
            placeholder="2025"
            value={enrollFormData.year}
            onChange={(e) => setEnrollFormData({ ...enrollFormData, year: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <Input
            id="ats_score"
            type="number"
            label="ATS Match Score (0 - 100)"
            value={enrollFormData.ats_score}
            onChange={(e) => setEnrollFormData({ ...enrollFormData, ats_score: e.target.value })}
            min="0"
            max="100"
          />

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Shortlist Status *
            </label>
            <select
              value={enrollFormData.application_status}
              onChange={(e) => setEnrollFormData({ ...enrollFormData, application_status: e.target.value })}
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
              <option value="shortlisted">Shortlisted (Qualified)</option>
              <option value="rejected">Not Shortlisted (Rejected)</option>
              <option value="pending">Under Review (Pending)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={enrollLoading}>
            Enroll Candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ManualEnrollModal;
