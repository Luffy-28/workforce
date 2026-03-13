import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeaves, submitLeaveRequest, updateLeaveStatus } from '../store/slices/leavesSlice';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import { fmtDate } from '../utils/helpers';
import Alert from '../utils/alert';

const LeavePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { items: leaves, loading } = useSelector(state => state.leaves);
  const isManager = ['admin', 'manager', 'supervisor'].includes(user?.role);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    dispatch(fetchLeaves(filterStatus !== 'all' ? `?status=${filterStatus}` : ''));
  }, [dispatch, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(submitLeaveRequest(form));
    if (!result.error) {
      setShowModal(false);
      setForm({ type: 'vacation', startDate: '', endDate: '', reason: '' });
      Alert.success('Success', 'Leave request submitted successfully');
    } else {
      Alert.error('Error', result.payload?.message || 'Failed to submit request');
    }
  };

  const handleStatusUpdate = (id, status) => {
    Alert.alert(`Confirm ${status}`, `Are you sure you want to ${status} this request?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Confirm', 
        onPress: () => {
          dispatch(updateLeaveStatus({ id, status }));
          Alert.success('Updated', `Request ${status}ed`);
        }
      }
    ]);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold fw-display">Leave Management</h2>
        <button className="wf-btn wf-btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-2"></i> Request Leave
        </button>
      </div>

      <div className="wf-card mb-4 p-3">
        <div className="d-flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button 
              key={s} 
              className={`wf-btn wf-btn-sm ${filterStatus === s ? 'wf-btn-primary' : 'wf-btn-outline'}`}
              onClick={() => setFilterStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="wf-card">
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  {isManager && <th>Employee</th>}
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan={isManager ? 6 : 4} className="text-center py-5 text-muted">No leave requests found</td></tr>
                ) : leaves.map(leave => (
                  <tr key={leave._id}>
                    {isManager && (
                      <td>
                        <div className="fw-medium small">{leave.userId?.name}</div>
                        <div className="text-muted-sm">{leave.userId?.department}</div>
                      </td>
                    )}
                    <td><span className="badge bg-light text-dark text-capitalize">{leave.type.replace('-', ' ')}</span></td>
                    <td className="small">
                      {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)}
                    </td>
                    <td className="small text-muted" style={{ maxWidth: 200 }}>
                      <div className="text-truncate" title={leave.reason}>{leave.reason}</div>
                    </td>
                    <td><Badge status={leave.status}>{leave.status}</Badge></td>
                    {isManager && (
                      <td>
                        {leave.status === 'pending' && (
                          <div className="d-flex gap-2">
                            <button className="wf-btn wf-btn-sm wf-btn-primary" onClick={() => handleStatusUpdate(leave._id, 'approved')}>Approve</button>
                            <button className="wf-btn wf-btn-sm wf-btn-outline text-danger" onClick={() => handleStatusUpdate(leave._id, 'rejected')}>Reject</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Request Leave">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="wf-label">Leave Type</label>
            <select 
              className="wf-select" 
              value={form.type} 
              onChange={e => setForm({...form, type: e.target.value})}
              required
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal Leave</option>
              <option value="public-holiday">Public Holiday</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="wf-label">Start Date</label>
              <input 
                type="date" 
                className="wf-input" 
                value={form.startDate} 
                onChange={e => setForm({...form, startDate: e.target.value})}
                required 
              />
            </div>
            <div className="col-md-6">
              <label className="wf-label">End Date</label>
              <input 
                type="date" 
                className="wf-input" 
                value={form.endDate} 
                onChange={e => setForm({...form, endDate: e.target.value})}
                required 
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="wf-label">Reason</label>
            <textarea 
              className="wf-input" 
              rows="3" 
              value={form.reason} 
              onChange={e => setForm({...form, reason: e.target.value})}
              placeholder="Provide a reason for your request..."
              required 
            />
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="button" className="wf-btn wf-btn-outline w-100" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="wf-btn wf-btn-primary w-100 shadow">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeavePage;
