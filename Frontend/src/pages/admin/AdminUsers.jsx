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
  Users,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Mail,
  User,
  Lock,
  Shield,
} from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    is_verified: true,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'user',
    is_verified: true,
    password: '',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const toast = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.listUsers();
      setUsers(data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch candidate accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      await adminApi.createUser(createForm);
      toast.success('New user account created successfully!');
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        is_verified: true,
      });
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to create user');
      toast.error(err.message || 'Creation error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      password: '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setFormLoading(true);
    setFormError('');

    const updatePayload = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      is_verified: editForm.is_verified,
    };
    if (editForm.password) {
      updatePayload.password = editForm.password;
    }

    try {
      await adminApi.updateUser(editingUser.id, updatePayload);
      toast.success('User updated successfully!');
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to update user');
      toast.error(err.message || 'Update error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This will unenroll them from all courses.`)) {
      return;
    }

    setIsDeletingId(userId);
    try {
      await adminApi.deleteUser(userId);
      toast.success('User deleted and unenrolled successfully');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in">
      {/* Header Bar */}
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Candidate & User Administration</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Inspect registered accounts, email verification status, and course enrollment records.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          icon={<UserPlus size={16} />}
        >
          Add New User
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          maxWidth: '480px',
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search by candidate name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            width: '100%',
          }}
        />
      </div>

      {/* Users Table */}
      <Card>
        {isLoading ? (
          <Loader text="Loading candidates and user accounts..." />
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Users Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {searchQuery ? 'No accounts match your search filter.' : 'No users have registered yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Role</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Verified</th>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Enrolled Courses</th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#f9fafb' }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <Badge variant={u.role === 'admin' ? 'warning' : 'primary'}>
                        {u.role === 'admin' ? 'Admin' : 'Candidate'}
                      </Badge>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      {u.is_verified ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.82rem' }}>
                          <CheckCircle size={15} />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f43f5e', fontSize: '0.82rem' }}>
                          <XCircle size={15} />
                          <span>Unverified</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <Badge variant="success">{u.enrolled_courses_count} tracks</Badge>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none' }}
                          title="View Profile & Enrolled Courses"
                        >
                          <Eye size={14} />
                          <span>Profile</span>
                        </Link>

                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="btn btn-secondary btn-sm"
                          title="Edit User"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={isDeletingId === u.id}
                          className="btn btn-danger btn-sm"
                          title="Delete User"
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

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New User Account"
        maxWidth="520px"
      >
        <form onSubmit={handleCreateSubmit}>
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
            id="name"
            label="Full Name"
            placeholder="Candidate Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
            icon={<User size={16} />}
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            required
            icon={<Mail size={16} />}
          />

          <Input
            id="password"
            label="Initial Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            required
            icon={<Lock size={16} />}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-control"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                <option value="user">Candidate (User)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Email Verified</label>
              <select
                className="form-control"
                value={createForm.is_verified ? 'true' : 'false'}
                onChange={(e) => setCreateForm({ ...createForm, is_verified: e.target.value === 'true' })}
              >
                <option value="true">Yes (Verified)</option>
                <option value="false">No (Unverified)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading} icon={<UserPlus size={16} />}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${editingUser?.name || ''}`}
        maxWidth="520px"
      >
        <form onSubmit={handleEditSubmit}>
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
            id="editName"
            label="Full Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
            icon={<User size={16} />}
          />

          <Input
            id="editEmail"
            label="Email Address"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            required
            icon={<Mail size={16} />}
          />

          <Input
            id="editPassword"
            label="Update Password (Optional)"
            type="password"
            placeholder="Leave blank to keep unchanged"
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            icon={<Lock size={16} />}
            helperText="Only fill if you want to reset this user's password."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-control"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="user">Candidate (User)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Email Verified</label>
              <select
                className="form-control"
                value={editForm.is_verified ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.value === 'true' })}
              >
                <option value="true">Yes (Verified)</option>
                <option value="false">No (Unverified)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={formLoading}>
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

export default AdminUsers;
