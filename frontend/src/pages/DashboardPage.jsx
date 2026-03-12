import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAttendance } from '../store/slices/attendanceSlice';
import { fetchInventory, fetchRequests } from '../store/slices/inventorySlice';
import { fetchUsers } from '../store/slices/usersSlice';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import { fmtTime, fmtDate, statusBadgeClass } from '../utils/helpers';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { records, loading: attLoading } = useSelector(s => s.attendance);
  const { items: inventory, requests } = useSelector(s => s.inventory);
  const { items: users } = useSelector(s => s.users);
  const isManager = ['admin', 'manager'].includes(user?.role);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (isManager) {
      dispatch(fetchAttendance(`?from=${today}`));
      dispatch(fetchUsers());
    }
    dispatch(fetchInventory());
    dispatch(fetchRequests('?status=pending'));
  }, [dispatch, isManager]);

  const lowStock = inventory.filter(i => i.isLowStock);
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Greeting */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-display fw-bold mb-1" style={{ fontSize: '1.6rem' }}>
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-muted small mb-0">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="wf-btn wf-btn-outline" onClick={() => navigate('/attendance')}>
            <i className="bi bi-clock" />Clock In/Out
          </button>
          {isManager && (
            <button className="wf-btn wf-btn-primary" onClick={() => navigate('/inventory')}>
              <i className="bi bi-plus-lg" />Add Stock
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="wf-alert-strip mb-4">
          <div className="text-danger fs-5"><i className="bi bi-exclamation-triangle-fill" /></div>
          <div>
            <div className="fw-semibold text-danger small mb-1">{lowStock.length} Low Stock Alert{lowStock.length > 1 ? 's' : ''}</div>
            <div className="d-flex flex-wrap gap-2">
              {lowStock.map(i => (
                <button key={i._id} className="wf-badge wf-badge-red" style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => navigate('/inventory')}>
                  {i.itemName}: {i.quantity} {i.unitType}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="row g-3 mb-4">
        {isManager && (
          <>
            <div className="col-6 col-lg-3">
              <StatCard title="Total Employees" value={users.length} icon="bi-people-fill" color="blue" />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard title="Present Today" value={records.length} icon="bi-person-check-fill" color="green" />
            </div>
          </>
        )}
        <div className="col-6 col-lg-3">
          <StatCard title="Low Stock Items" value={lowStock.length} icon="bi-exclamation-triangle-fill" color="red" sub="Need restocking" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard title="Pending Requests" value={pendingRequests.length} icon="bi-hourglass-split" color="yellow" sub="Awaiting approval" />
        </div>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="row g-4">
        {/* Today's Attendance */}
        {isManager && (
          <div className="col-lg-7">
            <div className="wf-card">
              <div className="wf-card-header">
                <h6 className="wf-card-title">Today's Attendance</h6>
                <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => navigate('/attendance')}>
                  View All <i className="bi bi-arrow-right" />
                </button>
              </div>
              {attLoading ? <Spinner /> : (
                <div className="table-responsive">
                  <table className="wf-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Clock In</th>
                        <th>Hours</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr><td colSpan="4" className="text-center text-muted py-4 small">No attendance records today</td></tr>
                      ) : records.slice(0, 6).map(r => (
                        <tr key={r._id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="wf-avatar" style={{ width: 30, height: 30, fontSize: '0.7rem' }}>
                                {r.userId?.name?.charAt(0) || '?'}
                              </div>
                              <span className="fw-medium small">{r.userId?.name || '—'}</span>
                            </div>
                          </td>
                          <td className="small text-muted">{fmtTime(r.signInTime)}</td>
                          <td className="small">{r.totalHours ? `${r.totalHours}h` : <span className="text-primary">Active</span>}</td>
                          <td><Badge status={r.status}>{r.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Requests */}
        <div className={isManager ? 'col-lg-5' : 'col-lg-6'}>
          <div className="wf-card h-100">
            <div className="wf-card-header">
              <h6 className="wf-card-title">Pending Requests</h6>
              <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => navigate('/requests')}>
                View All <i className="bi bi-arrow-right" />
              </button>
            </div>
            <div>
              {pendingRequests.length === 0 ? (
                <div className="py-4 text-center text-muted small">No pending requests</div>
              ) : pendingRequests.slice(0, 5).map(r => (
                <div key={r._id} className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
                  <div>
                    <div className="fw-medium small">{r.employeeId?.name}</div>
                    <div className="text-muted-sm">{r.itemId?.itemName} × {r.quantityRequested} {r.itemId?.unitType}</div>
                  </div>
                  <Badge status="pending">pending</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Overview */}
        <div className={isManager ? 'col-lg-6' : 'col-lg-6'}>
          <div className="wf-card">
            <div className="wf-card-header">
              <h6 className="wf-card-title">Inventory Overview</h6>
              <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => navigate('/inventory')}>
                View All <i className="bi bi-arrow-right" />
              </button>
            </div>
            <div className="table-responsive">
              <table className="wf-table">
                <thead>
                  <tr><th>Item</th><th>Category</th><th>Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {inventory.slice(0, 6).map(item => (
                    <tr key={item._id}>
                      <td className="fw-medium small">{item.itemName}</td>
                      <td className="small text-muted">{item.category}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`fw-bold small ${item.isLowStock ? 'text-danger' : 'text-dark'}`}>{item.quantity}</span>
                          <span className="text-muted-sm">{item.unitType}</span>
                        </div>
                      </td>
                      <td><Badge status={item.isLowStock ? 'rejected' : 'active'}>{item.isLowStock ? 'Low' : 'OK'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
