import React from 'react';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AlertCircle } from 'lucide-react';

const CourseFormModal = ({
  isOpen,
  onClose,
  isEdit = false,
  formData,
  handleInputChange,
  formError,
  formLoading,
  handleSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Course Track' : 'Create New Course Curriculum'}
    >
      <form onSubmit={handleSubmit}>
        {formError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fda4af',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <Input
          id="title"
          label="Course Title *"
          placeholder="e.g. Advanced Cloud Systems & Python Architecture"
          value={formData.title}
          onChange={handleInputChange}
          required
        />

        <div className="form-group">
          <label className="form-label" htmlFor="description">
            Course Description & Prerequisites *
          </label>
          <textarea
            id="description"
            className="input-field"
            rows={4}
            placeholder="Detailed course description, core skills trained, and target technologies..."
            value={formData.description}
            onChange={handleInputChange}
            required
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            id="instructor"
            label="Lead Instructor *"
            placeholder="e.g. Dr. Jane Smith"
            value={formData.instructor}
            onChange={handleInputChange}
            required
          />

          <Input
            id="duration_weeks"
            type="number"
            label="Duration (Weeks) *"
            placeholder="8"
            value={formData.duration_weeks}
            onChange={handleInputChange}
            min="1"
            max="52"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="level">
            Experience / Difficulty Level
          </label>
          <select
            id="level"
            className="input-field"
            value={formData.level}
            onChange={handleInputChange}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={formLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={formLoading}>
            {isEdit ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CourseFormModal;
