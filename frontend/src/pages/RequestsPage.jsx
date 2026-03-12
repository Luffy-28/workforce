import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRequests, createRequest, approveRequest, deliverRequest, rejectRequest } from '../store/slices/inventorySlice';
import { fetchInventory } from '../store/slices/inventorySlice';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { fmtDate, fmt } from '../utils/helpers';
import Alert from '../utils/alert';

const RequestsPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { requests, items: inventory, loading } = useSelector(s => s.inventory);
  const isManager = ['admin', 'manager'].includes(user?.role);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ itemId: '', quantityRequested: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchRequests());
    dispatch(fetchInventory());
  }, [dispatch]);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending (${requests.filter(r => r.status === 'pending').length})` },
    { key: 'approved', label: 'Approved' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const filtered = activeTab === 'all' ? requests : requests.filter(r => r.status === activeTab);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await dispatch(createRequest({ ...form, quantityRequested: +form.quantityRequested }));
    setShowModal(false);
    setForm({ itemId: '', quantityRequested: '', reason: '' });
    setSubmitting(false);
  };

  const handleAction = async (action, id) => {
    if (action === 'approve') await dispatch(approveRequest(id));
    else if (action === 'deliver') await dispatch(deliverRequest(id));
    else if (action === 'reject') {
      Alert.alert('Reject Request', 'Are you sure you want to reject this stock request?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => dispatch(rejectRequest({ id, reason: 'Rejected by manager' }))
        }
      ]);
    }
  };

  const selectedItem = inventory.find(i => i._id === form.itemId);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-display fw-bold mb-1">Stock Requests</h2>
          <p className="text-muted small mb-0">
            {isManager ? 'Manage employee stock requests' : 'Request items you need for work'}
          </p>
        </div>
        {!isManager && (
          <button className="wf-btn wf-btn-primary" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-lg" />New Request
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total', value: requests.length, color: 'bg-primary' },
          { label: 'Pending', value: requests.filter(r => r.status === 'pending').length, color: 'bg-warning' },
          { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: 'bg-info' },
          { label: 'Delivered', value: requests.filter(r => r.status === 'delivered').length, color: 'bg-success' },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="wf-stat-card text-center">
              <div className="wf-stat-value">{s.value}</div>
              <div className="wf-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Filter */}
      <div className="wf-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`wf-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="wf-card">
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested</th>
                  {isManager && <th>Actions</th>}
                  <th>Delivered By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8"><EmptyState icon="bi-arrow-down-circle" title="No Requests" message="No requests found for this filter" /></td></tr>
                ) : filtered.map(req => (
                  <tr key={req._id}>
                    <td>
                      <div className="fw-medium small">{req.employeeId?.name || '—'}</div>
                      <div className="text-muted-sm">{req.employeeId?.department}</div>
                    </td>
                    <td className="fw-semibold small">{req.itemId?.itemName || '—'}</td>
                    <td>
                      <span className="fw-bold">{req.quantityRequested}</span>
                      <span className="text-muted-sm ms-1">{req.itemId?.unitType}</span>
                    </td>
                    <td className="small text-muted" style={{ maxWidth: 150 }}>{req.reason || '—'}</td>
                    <td><Badge status={req.status}>{req.status}</Badge></td>
                    <td className="small text-muted">{fmtDate(req.createdAt)}</td>
                    {isManager && (
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          {req.status === 'pending' && (
                            <>
                              <button className="wf-btn wf-btn-success wf-btn-sm" onClick={() => handleAction('approve', req._id)}>
                                <i className="bi bi-check2" />Approve
                              </button>
                              <button className="wf-btn wf-btn-danger wf-btn-sm" onClick={() => handleAction('reject', req._id)}>
                                <i className="bi bi-x" />Reject
                              </button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <button className="wf-btn wf-btn-primary wf-btn-sm" onClick={() => handleAction('deliver', req._id)}>
                              <i className="bi bi-truck" />Mark Delivered
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="small text-muted">
                      {req.deliveredBy?.name ? (
                        <div>
                          <div>{req.deliveredBy.name}</div>
                          <div className="text-muted-sm">{fmtDate(req.deliveredAt)}</div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Request Stock Item">
        <form onSubmit={handleSubmit}>
          <div className="wf-form-group">
            <label className="wf-label">Select Item *</label>
            <select className="wf-select" value={form.itemId} onChange={e => setForm(p => ({ ...p, itemId: e.target.value }))} required>
              <option value="">Choose an item...</option>
              {inventory.map(i => (
                <option key={i._id} value={i._id}>{i.itemName} ({i.quantity} {i.unitType} available)</option>
              ))}
            </select>
          </div>
          {selectedItem && (
            <div className="p-3 mb-3 rounded-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <div className="small fw-semibold text-primary">{selectedItem.itemName}</div>
              <div className="text-muted-sm">Available: <strong>{selectedItem.quantity} {selectedItem.unitType}</strong> | Category: {selectedItem.category}</div>
            </div>
          )}
          <div className="wf-form-group">
            <label className="wf-label">Quantity Needed *</label>
            <input className="wf-input" type="number" min="1" max={selectedItem?.quantity}
              value={form.quantityRequested} onChange={e => setForm(p => ({ ...p, quantityRequested: e.target.value }))} required />
          </div>
          <div className="wf-form-group">
            <label className="wf-label">Reason (optional)</label>
            <textarea className="wf-textarea" rows="3" value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Why do you need this item?" />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="wf-btn wf-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" disabled={submitting} className="wf-btn wf-btn-primary">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RequestsPage;
