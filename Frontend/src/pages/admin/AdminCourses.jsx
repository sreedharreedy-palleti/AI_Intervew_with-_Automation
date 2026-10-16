import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import {
  BookOpen,
  Plus,
  Trash2,
  Users,
  Clock,
  User,
  ArrowRight,
  AlertTriangle,
  Edit2,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // New Course Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    duration_weeks: 8,
    level: 'Beginner',
  });
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    duration_weeks: 8,
    level: 'Beginner',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const toast = useToast();

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.listCourses();
      setCourses(data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (formError) setFormError('');
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.id]: e.target.value });
    if (formError) setFormError('');
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setEditFormData({
      title: course.title || '',
      description: course.description || '',
      instructor: course.instructor || '',
      duration_weeks: course.duration_weeks || 8,
      level: course.level || 'Beginner',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      await adminApi.createCourse(formData);
      toast.success('New course curriculum created successfully!');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        instructor: '',
        duration_weeks: 8,
        level: 'Beginner',
      });
      fetchCourses();
    } catch (err) {
      setFormError(err.message || 'Failed to create course');
      toast.error(err.message || 'Course creation error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;
    setFormLoading(true);
    setFormError('');

    try {
      await adminApi.updateCourse(editingCourse.id, {
        ...editFormData,
        duration_weeks: Number(editFormData.duration_weeks),
      });
      toast.success('Course track updated successfully!');
      setIsEditModalOpen(false);
      setEditingCourse(null);
      fetchCourses();
    } catch (err) {
      setFormError(err.message || 'Failed to update course');
      toast.error(err.message || 'Update error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete course "${courseTitle}"?`)) {
      return;
    }

    setIsDeletingId(courseId);
    try {
      await adminApi.deleteCourse(courseId);
      toast.success('Course deleted successfully');
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete course');
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
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
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus size={16} />}
        >
          Create New Course
        </Button>
      </div>

      {/* Courses Table Card */}
      <Card>
        {isLoading ? (
          <Loader text="Loading course catalog..." />
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Courses in Database</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Get started by creating your first course track for applicants.
            </p>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={15} />
              <span>Create Course Now</span>
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Course Title</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Instructor</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Duration</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Level</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Applicants</th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr
                    key={course.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#f9fafb' }}>{course.title}</div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          maxWidth: '300px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {course.description}
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)' }}>
                      {course.instructor}
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)' }}>
                      {course.duration_weeks} Weeks
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <Badge variant="primary">{course.level}</Badge>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <Badge variant="success">
                        <Users size={12} />
                        <span>{course.enrolled_count} Students</span>
                      </Badge>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link
                          to={`/admin/courses/${course.id}/roster`}
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none' }}
                        >
                          <span>Roster</span>
                          <ArrowRight size={13} />
                        </Link>

                        <button
                          onClick={() => handleOpenEdit(course)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                          title="Edit Course"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          disabled={isDeletingId === course.id}
                          className="btn btn-danger btn-sm"
                          title="Delete Course"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Course Curriculum"
        maxWidth="600px"
      >
        <form onSubmit={handleCreateCourse}>
          {formError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fda4af',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              {formError}
            </div>
          )}

          <Input
            id="title"
            label="Course Title"
            placeholder="e.g. Advanced Distributed Systems in Go & Python"
            value={formData.title}
            onChange={handleInputChange}
            required
            icon={<BookOpen size={16} />}
          />

          <div className="form-group">
            <label className="form-label">
              <span>
                Course Description / Syllabus Overview <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Outline the core concepts, prerequisites, and technical interview expectations..."
              value={formData.description}
              onChange={handleInputChange}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="instructor"
              label="Lead Instructor"
              placeholder="e.g. Dr. Jane Doe"
              value={formData.instructor}
              onChange={handleInputChange}
              required
              icon={<User size={16} />}
            />

            <Input
              id="duration_weeks"
              label="Duration (in Weeks)"
              type="number"
              min={1}
              value={formData.duration_weeks}
              onChange={handleInputChange}
              required
              icon={<Clock size={16} />}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Difficulty Level</label>
            <select
              id="level"
              value={formData.level}
              onChange={handleInputChange}
              className="form-control"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading} icon={<Plus size={16} />}>
              Create Course Track
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Course Track"
        maxWidth="600px"
      >
        <form onSubmit={handleUpdateCourse}>
          {formError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fda4af',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              {formError}
            </div>
          )}

          <Input
            id="title"
            label="Course Title"
            placeholder="e.g. Full-Stack Cloud Native Development"
            value={editFormData.title}
            onChange={handleEditInputChange}
            required
            icon={<BookOpen size={16} />}
          />

          <div className="form-group">
            <label className="form-label">
              <span>Course Description / Syllabus Overview</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Outline the core concepts, prerequisites..."
              value={editFormData.description}
              onChange={handleEditInputChange}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="instructor"
              label="Lead Instructor"
              placeholder="e.g. Dr. Jane Doe"
              value={editFormData.instructor}
              onChange={handleEditInputChange}
              required
              icon={<User size={16} />}
            />

            <Input
              id="duration_weeks"
              label="Duration (in Weeks)"
              type="number"
              min={1}
              value={editFormData.duration_weeks}
              onChange={handleEditInputChange}
              required
              icon={<Clock size={16} />}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Difficulty Level</label>
            <select
              id="level"
              value={editFormData.level}
              onChange={handleEditInputChange}
              className="form-control"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading} icon={<Edit2 size={16} />}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCourses;
