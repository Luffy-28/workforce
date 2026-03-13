import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, createUser, updateUser, deleteUser } from '../store/slices/usersSlice';
import { fetchSites } from '../store/slices/sitesSlice';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { getInitials, fmtDate } from '../utils/helpers';
import Alert from '../utils/alert';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'employee', department: '', phone: '', status: 'active', site: '', title: '' };

const UsersPage = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector(s => s.auth);
  const { items: users, loading } = useSelector(s => s.users);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const { items: sites } = useSelector(s => s.sites);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchSites());
  }, [dispatch]);

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => { setEditUser(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      department: u.department || '',
      phone: u.phone || '',
      status: u.status,
      site: u.site?._id || u.site || '',
      title: u.title || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    if (editUser) await dispatch(updateUser({ id: editUser._id, ...payload }));
    else await dispatch(createUser(payload));
    setShowModal(false);
    setSubmitting(false);
  };

  const roleColors = { admin: 'purple', manager: 'blue', supervisor: 'cyan', employee: 'gray' };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-display fw-bold mb-1">User Management</h2>
          <p className="text-muted small mb-0">{users.length} total users — {users.filter(u => u.status === 'active').length} active</p>
        </div>
        <button className="wf-btn wf-btn-primary" onClick={openAdd}>
          <i className="bi bi-person-plus" />Add User
        </button>
      </div>

      {/* Role Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Admins', count: users.filter(u => u.role === 'admin').length, icon: 'bi-shield-check', color: 'purple' },
          { label: 'Managers', count: users.filter(u => u.role === 'manager').length, icon: 'bi-person-gear', color: 'blue' },
          { label: 'Employees', count: users.filter(u => u.role === 'employee').length, icon: 'bi-people', color: 'green' },
          { label: 'Inactive', count: users.filter(u => u.status === 'inactive').length, icon: 'bi-person-slash', color: 'red' },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="wf-stat-card text-center p-3">
              <div className="wf-stat-value">{s.count}</div>
              <div className="wf-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <div className="wf-search">
          <i className="bi bi-search wf-search-icon" />
          <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="wf-select" style={{ width: 'auto' }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="wf-card">
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Department</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="7"><EmptyState icon="bi-people" title="No Users" message="Add users to your workspace" /></td></tr>
                ) : filtered.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="wf-avatar wf-avatar-lg" style={{ width: 40, height: 40, fontSize: '0.95rem' }}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="fw-semibold small">{u.name}</div>
                          <div className="text-muted-sm">{u.title || u.role} • {u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge status={u.role}>{u.role}</Badge></td>
                    <td className="small text-muted">{u.department || '—'}</td>
                    <td className="small text-muted">{u.phone || '—'}</td>
                    <td><Badge status={u.status}>{u.status}</Badge></td>
                    <td className="small text-muted">{fmtDate(u.createdAt)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        {/* Managers can only edit employees and supervisors. Admins can edit anyone. */}
                        {(currentUser.role === 'admin' || (currentUser.role === 'manager' && ['employee', 'supervisor'].includes(u.role))) && (
                          <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => openEdit(u)}>
                            <i className="bi bi-pencil" />Edit
                          </button>
                        )}
                        {u._id !== currentUser?._id && (currentUser.role === 'admin' || (currentUser.role === 'manager' && ['employee', 'supervisor'].includes(u.role))) && (
                          <button className="wf-btn wf-btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}
                            onClick={() => {
                              Alert.alert('Delete User', 'Are you sure you want to delete this user? This action cannot be undone.', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteUser(u._id)) }
                              ]);
                            }}>
                            <i className="bi bi-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User' : 'Add New User'}>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Full Name *</label>
                <input className="wf-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Email *</label>
                <input className="wf-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input className="wf-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} {...(!editUser ? { required: true } : {})} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Role</label>
                <select className="wf-select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  {currentUser.role === 'admin' && <option value="manager">Manager</option>}
                  {currentUser.role === 'admin' && <option value="admin">Admin</option>}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Department</label>
                <input className="wf-input" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Phone</label>
                <input className="wf-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Job Title</label>
                <input className="wf-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Barista" />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Assigned Site</label>
                <select className="wf-select" value={form.site} onChange={e => setForm(p => ({ ...p, site: e.target.value }))}>
                  <option value="">No Site Assigned</option>
                  {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            {editUser && (
              <div className="col-12">
                <div className="wf-form-group">
                  <label className="wf-label">Status</label>
                  <select className="wf-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="wf-btn wf-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" disabled={submitting} className="wf-btn wf-btn-primary">
              {submitting ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
