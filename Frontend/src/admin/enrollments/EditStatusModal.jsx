import React from 'react';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const EditStatusModal = ({
  editingStudent,
  onClose,
  editStatus,
  setEditStatus,
  editAtsScore,
  setEditAtsScore,
  editLoading,
  handleEditStatusSubmit,
}) => {
  if (!editingStudent) return null;

  return (
    <Modal
      isOpen={Boolean(editingStudent)}
      onClose={onClose}
      title={`Edit Status: ${editingStudent.name}`}
    >
      <form onSubmit={handleEditStatusSubmit}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Course: <strong style={{ color: '#fff' }}>{editingStudent.course_title}</strong> ({editingStudent.email})
        </p>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Application Shortlist Status *
          </label>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
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
            <option value="shortlisted">Shortlisted (Passed threshold)</option>
            <option value="rejected">Not Shortlisted (Rejected)</option>
            <option value="pending">Under Review / Pending</option>
          </select>
        </div>

        <Input
          id="editAtsScore"
          type="number"
          label="ATS Match Score (%)"
          value={editAtsScore}
          onChange={(e) => setEditAtsScore(e.target.value)}
          min="0"
          max="100"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={editLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditStatusModal;
