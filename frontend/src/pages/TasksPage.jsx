import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, createTask, updateTask, deleteTask } from '../store/slices/tasksSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { fmtDate } from '../utils/helpers';
import Alert from '../utils/alert';

const PRIORITY_COLORS = { low: 'wf-badge-gray', medium: 'wf-badge-yellow', high: 'wf-badge-red' };

const TasksPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { items: tasks, loading } = useSelector(s => s.tasks);
  const { items: employees } = useSelector(s => s.users);
  const isManager = ['admin', 'manager'].includes(user?.role);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: [] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks());
    if (isManager) dispatch(fetchUsers('?status=active'));
  }, [dispatch, isManager]);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  const filtered = activeTab === 'all' ? tasks : tasks.filter(t => t.status === activeTab);

  const openAdd = () => { setEditTask(null); setForm({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: [] }); setShowModal(true); };
  const openEdit = (t) => {
    setEditTask(t);
    setForm({ title: t.title, description: t.description || '', priority: t.priority, dueDate: t.dueDate?.slice(0, 10) || '', assignedTo: t.assignedTo?.map(u => u._id || u) || [] });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (editTask) await dispatch(updateTask({ id: editTask._id, ...form }));
    else await dispatch(createTask(form));
    setShowModal(false);
    setSubmitting(false);
  };

  const changeStatus = (id, status) => dispatch(updateTask({ id, status }));
  const toggleEmployee = (id) => setForm(p => ({ ...p, assignedTo: p.assignedTo.includes(id) ? p.assignedTo.filter(e => e !== id) : [...p.assignedTo, id] }));

  // Kanban-style columns
  const pending = tasks.filter(t => t.status === 'pending');
  const inProgress = tasks.filter(t => t.status === 'in-progress');
  const completed = tasks.filter(t => t.status === 'completed');

  const TaskCard = ({ task }) => (
    <div className="wf-card mb-3">
      <div className="wf-card-body p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className={`fw-display fw-bold mb-0 small ${task.status === 'completed' ? 'text-decoration-line-through text-muted' : ''}`}>{task.title}</h6>
          <span className={`wf-badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        </div>
        {task.description && <p className="text-muted-sm mb-2 small">{task.description}</p>}
        {task.dueDate && (
          <div className={`small mb-2 d-flex align-items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-danger' : 'text-muted'}`}>
            <i className="bi bi-calendar-x" />
            Due: {fmtDate(task.dueDate)}
            {new Date(task.dueDate) < new Date() && task.status !== 'completed' && <span className="wf-badge wf-badge-red ms-1">Overdue</span>}
          </div>
        )}
        {task.assignedTo?.length > 0 && (
          <div className="d-flex align-items-center gap-1 mb-2">
            {task.assignedTo.slice(0, 3).map((u, i) => (
              <div key={i} className="wf-avatar" style={{ width: 22, height: 22, fontSize: '0.6rem' }} title={u.name}>{u.name?.charAt(0)}</div>
            ))}
            {task.assignedTo.length > 3 && <span className="text-muted-sm">+{task.assignedTo.length - 3}</span>}
          </div>
        )}
        <div className="d-flex gap-2 pt-2 border-top mt-2">
          <Badge status={task.status}>{task.status}</Badge>
          <div className="ms-auto d-flex gap-1">
            {task.status === 'pending' && (
              <button className="wf-btn wf-btn-sm" style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '2px 8px' }}
                onClick={() => changeStatus(task._id, 'in-progress')}>Start</button>
            )}
            {task.status === 'in-progress' && (
              <button className="wf-btn wf-btn-success wf-btn-sm" onClick={() => changeStatus(task._id, 'completed')}>
                <i className="bi bi-check2" />Done
              </button>
            )}
            {isManager && (
              <>
                <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => openEdit(task)}><i className="bi bi-pencil" /></button>
                <button className="wf-btn wf-btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}
                  onClick={() => {
                    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteTask(task._id)) }
                    ]);
                  }}><i className="bi bi-trash" /></button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-display fw-bold mb-1">Tasks</h2>
          <p className="text-muted small mb-0">{pending.length} pending, {inProgress.length} in progress, {completed.length} completed</p>
        </div>
        {isManager && (
          <button className="wf-btn wf-btn-primary" onClick={openAdd}>
            <i className="bi bi-plus-lg" />New Task
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="row g-4">
        {[
          { label: 'Pending', items: pending, color: '#f59e0b', bg: '#fffbeb', status: 'pending', icon: 'bi-hourglass' },
          { label: 'In Progress', items: inProgress, color: '#3b82f6', bg: '#eff6ff', status: 'in-progress', icon: 'bi-arrow-right-circle' },
          { label: 'Completed', items: completed, color: '#10b981', bg: '#f0fdf4', status: 'completed', icon: 'bi-check-circle' },
        ].map(col => (
          <div key={col.label} className="col-md-4">
            <div className="rounded-3 p-3" style={{ background: col.bg, border: `1px solid ${col.color}30` }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${col.icon}`} style={{ color: col.color }} />
                  <h6 className="fw-display fw-bold mb-0 small">{col.label}</h6>
                </div>
                <span className="wf-badge" style={{ background: `${col.color}20`, color: col.color }}>{col.items.length}</span>
              </div>
              {loading ? <Spinner text="Loading tasks..." /> :
                col.items.length === 0 ? (
                  <div className="text-center py-4 text-muted small">No {col.label.toLowerCase()} tasks</div>
                ) : col.items.map(t => <TaskCard key={t._id} task={t} />)
              }
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTask ? 'Edit Task' : 'Create Task'} wide>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <div className="wf-form-group">
                <label className="wf-label">Task Title *</label>
                <input className="wf-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
            </div>
            <div className="col-12">
              <div className="wf-form-group">
                <label className="wf-label">Description</label>
                <textarea className="wf-textarea" rows="3" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Priority</label>
                <select className="wf-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Due Date</label>
                <input className="wf-input" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
            </div>
            {isManager && employees.length > 0 && (
              <div className="col-12">
                <label className="wf-label">Assign To</label>
                <div className="p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', maxHeight: 180, overflowY: 'auto' }}>
                  {employees.map(e => (
                    <div key={e._id} className="form-check mb-2">
                      <input className="form-check-input" type="checkbox" id={`task-${e._id}`} checked={form.assignedTo.includes(e._id)} onChange={() => toggleEmployee(e._id)} />
                      <label className="form-check-label small" htmlFor={`task-${e._id}`}>{e.name} <span className="text-muted">({e.role})</span></label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="wf-btn wf-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" disabled={submitting} className="wf-btn wf-btn-primary">
              {submitting ? 'Saving...' : editTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TasksPage;
