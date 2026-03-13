import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchShifts,
  createShift,
  updateShift,
  deleteShift,
  respondToShift,
  bulkCreateShifts,
  fetchAvailability,
  updateAvailability
} from '../store/slices/shiftsSlice';
import { fetchSwapRequests, createSwapRequest, respondToSwap, approveSwap } from '../store/slices/swapSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import { fetchSites } from '../store/slices/sitesSlice';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import TimeRangeSlider from '../components/common/TimeRangeSlider';
import { fmtDate, fmtTime, getInitials } from '../utils/helpers';
import Alert from '../utils/alert';

const EMPTY_FORM = { title: '', location: '', site: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', notes: '', assignedEmployees: [] };

const ShiftsPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { items: shifts, availability, loading } = useSelector(s => s.shifts);
  const { items: employees } = useSelector(s => s.users);
  const { items: sites } = useSelector(s => s.sites);
  const { requests: swapRequests } = useSelector(s => s.swap);
  const isManager = ['admin', 'manager'].includes(user?.role);
  const canManageShifts = ['admin', 'manager', 'supervisor'].includes(user?.role);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('calendar'); // 'calendar', 'list', 'swaps'

  const [showModal, setShowModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [editShift, setEditShift] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [swapForm, setSwapForm] = useState({ targetUserId: '', offeredShiftId: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [siteFilter, setSiteFilter] = useState(user?.site?._id || user?.site || '');
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Site-scoping
  const mySites = sites.filter(s => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'manager') return s.manager?._id === user._id || s.manager === user._id;
    if (user?.role === 'supervisor') return (s._id === user?.site?._id || s._id === user?.site);
    return false;
  });

  const siteEmployees = form.site
    ? employees.filter(e => (e.site?._id || e.site) === form.site)
    : employees;

  const [bulkForm, setBulkForm] = useState({
    title: 'Regular Shift',
    startTime: '07:00',
    endTime: '16:00',
    days: [],
    employeeId: '',
    siteId: siteFilter,
    weeks: 1
  });

  const loadData = () => {
    dispatch(fetchShifts());
    dispatch(fetchSites());
    dispatch(fetchAvailability());
    dispatch(fetchSwapRequests());
    if (canManageShifts) dispatch(fetchUsers('?role=employee&status=active'));
  };

  useEffect(() => {
    loadData();
  }, [dispatch, isManager]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  const navigateMonth = (dir) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
  };

  const dayStatus = (day) => {
    if (!day) return null;
    const dStr = day.toISOString().split('T')[0];
    const avail = availability.find(a => a.date.split('T')[0] === dStr);
    return avail?.status || 'available';
  };

  const getEmployeeAvailability = (empId, dateStr) => {
    const avail = availability.find(a => {
      const aUserId = a.userId?._id || a.userId;
      return aUserId === empId && a.date?.split('T')[0] === dateStr;
    });
    return avail?.status || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.assignedEmployees.length > 0 && form.date) {
      const unavailableNames = form.assignedEmployees
        .filter(empId => getEmployeeAvailability(empId, form.date) === 'unavailable')
        .map(empId => employees.find(e => e._id === empId)?.name || 'Unknown');
      if (unavailableNames.length > 0) {
        Alert.error('Unavailable Employee', `${unavailableNames.join(', ')} is not available on ${form.date}.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const start = new Date(`${form.date}T${form.startTime}`);
      const end = new Date(`${form.date}T${form.endTime}`);
      const payload = { ...form, startTime: start, endTime: end };
      if (editShift) await dispatch(updateShift({ id: editShift._id, ...payload })).unwrap();
      else await dispatch(createShift(payload)).unwrap();
      setShowModal(false);
      Alert.success('Success', editShift ? 'Shift updated' : 'Shift created');
      loadData();
    } catch (err) {
      Alert.error('Error', err || 'Failed to save shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkForm.days.length || !bulkForm.employeeId || !bulkForm.siteId) {
      Alert.error('Validation Error', 'Please select employee, site, and at least one day.');
      return;
    }
    setSubmitting(true);
    try {
      const newShifts = [];
      const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
      for (let w = 0; w < bulkForm.weeks; w++) {
        bulkForm.days.forEach(dayName => {
          const d = new Date();
          const targetDay = dayMap[dayName];
          let diff = targetDay - d.getDay();
          if (diff < 0) diff += 7;
          const shiftDate = new Date();
          shiftDate.setDate(d.getDate() + diff + (w * 7));
          const dStr = shiftDate.toISOString().split('T')[0];
          newShifts.push({
            title: bulkForm.title,
            site: bulkForm.siteId,
            startTime: new Date(`${dStr}T${bulkForm.startTime}`),
            endTime: new Date(`${dStr}T${bulkForm.endTime}`),
            assignedEmployees: [bulkForm.employeeId]
          });
        });
      }
      await dispatch(bulkCreateShifts(newShifts)).unwrap();
      setShowBulkModal(false);
      Alert.success('Success', 'Bulk shifts created');
      loadData();
    } catch (err) {
      Alert.error('Bulk Error', err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openAvailModal = (day) => {
    if (!day || isManager) return;
    setSelectedDay(day);
    setShowAvailModal(true);
  };

  const setAvailabilityStatus = (status) => {
    dispatch(updateAvailability({ date: selectedDay, status }));
    setShowAvailModal(false);
  };

  const handleShiftResponse = (id, status) => {
    dispatch(respondToShift({ id, status })).unwrap().then(() => {
      Alert.success('Success', `Shift ${status}`);
      loadData();
    }).catch(err => Alert.error('Error', err.message));
  };

  const handleDeleteShift = (id, title) => {
    Alert.alert('Remove Shift', `Delete ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
          dispatch(deleteShift(id)).unwrap().then(() => {
            Alert.success('Removed', 'Deleted');
            loadData();
          });
      }}
    ]);
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(createSwapRequest({ shiftId: selectedShift._id, ...swapForm })).unwrap();
      setShowSwapModal(false);
      Alert.success('Success', swapForm.targetUserId ? 'Swap request sent' : 'Shift posted to open board');
      loadData();
    } catch (err) {
      Alert.error('Error', err || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwapResponse = async (id, status) => {
    try {
      await dispatch(respondToSwap({ id, status })).unwrap();
      Alert.success('Success', `Swap ${status}`);
      loadData();
    } catch (err) {
      Alert.error('Error', err);
    }
  };

  const handleSwapApproval = async (id, status) => {
    try {
      await dispatch(approveSwap({ id, status })).unwrap();
      Alert.success('Success', `Swap ${status}`);
      loadData();
    } catch (err) {
      Alert.error('Error', err);
    }
  };

  return (
    <div className={`d-flex flex-column flex-grow-1 ${view === 'calendar' ? 'vh-100 overflow-hidden' : 'p-4'}`} style={{ backgroundColor: 'var(--wf-light)', width: '100%' }}>
      <div className={`d-flex justify-content-between align-items-center ${view === 'calendar' ? 'px-4 py-3 border-bottom bg-white' : 'mb-4'}`}>
        <div>
          <h2 className="fw-display fw-bold mb-0">Shift Management</h2>
          <p className="text-muted small mb-0">Schedule and coordinate shifts</p>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div className="wf-tabs shadow-sm">
            <button className={`wf-tab ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>Calendar</button>
            <button className={`wf-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
            <button className={`wf-tab ${view === 'swaps' ? 'active' : ''}`} onClick={() => setView('swaps')}>
              Swaps {swapRequests.filter(r => r.status === 'pending' || (isManager && r.status === 'accepted')).length > 0 && <span className="badge bg-danger ms-1">{swapRequests.filter(r => r.status === 'pending' || (isManager && r.status === 'accepted')).length}</span>}
            </button>
          </div>
          {canManageShifts && (
            <div className="d-flex gap-2">
              <button className="wf-btn wf-btn-outline" onClick={() => setShowBulkModal(true)}>Bulk</button>
              <button className="wf-btn wf-btn-primary" onClick={() => { setEditShift(null); setForm(EMPTY_FORM); setShowModal(true); }}>New</button>
            </div>
          )}
        </div>
      </div>

      {view === 'calendar' && (
        <div className="flex-grow-1 d-flex flex-column overflow-hidden w-100">
           <div className="d-flex justify-content-between align-items-center px-4 py-2 bg-light border-bottom">
            <div className="d-flex align-items-center gap-3">
              <h4 className="fw-bold mb-0">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h4>
              <div className="d-flex gap-1">
                <button className="wf-btn wf-btn-outline wf-btn-sm bg-white" onClick={() => navigateMonth(-1)}><i className="bi bi-chevron-left" /></button>
                <button className="wf-btn wf-btn-outline wf-btn-sm bg-white fw-bold" onClick={() => setCurrentDate(new Date())}>Today</button>
                <button className="wf-btn wf-btn-outline wf-btn-sm bg-white" onClick={() => navigateMonth(1)}><i className="bi bi-chevron-right" /></button>
              </div>
            </div>
          </div>
          <div className="flex-grow-1 overflow-auto bg-light p-0">
            <div className="wf-calendar-grid" style={{ background: 'white', minHeight: '100%' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="wf-calendar-header">{d}</div>
              ))}
              {daysInMonth.map((day, idx) => {
                const status = dayStatus(day);
                const dayShifts = day ? shifts.filter(s => fmtDate(s.startTime) === fmtDate(day)) : [];
                return (
                  <div key={idx} className={`wf-calendar-day ${!day ? 'empty' : ''} ${status}`} onClick={() => openAvailModal(day)}>
                    {day && (
                      <>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className={`day-num ${day.toDateString() === new Date().toDateString() ? 'today' : ''}`}>{day.getDate()}</span>
                        </div>
                        <div className="shift-dots">
                          {dayShifts.map(s => {
                            const assignment = s.assignments?.find(a => (a.employee?._id || a.employee) === user._id);
                            return (
                              <div key={s._id} className={`shift-mini ${assignment?.status || 'managed'}`} title={s.title}>
                                <span>{s.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="wf-card shadow-sm w-100">
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Details</th>
                  <th>Site</th>
                  {canManageShifts && <th>Assigned To</th>}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5">No shifts found</td></tr>
                ) : shifts.map(s => {
                  const myAssignment = s.assignments?.find(a => (a.employee?._id || a.employee) === user._id);
                  return (
                    <tr key={s._id}>
                      <td>{fmtDate(s.startTime)}<br/><small className="text-muted">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</small></td>
                      <td><strong>{s.title}</strong></td>
                      <td>{s.site?.name || '—'}</td>
                      {canManageShifts && (
                        <td>
                          {s.assignments?.map((a, i) => (
                            <span key={i} className="badge bg-light text-dark me-1">{a.employee?.name}</span>
                          ))}
                        </td>
                      )}
                      <td><Badge status={myAssignment?.status || s.status}>{myAssignment?.status || s.status}</Badge></td>
                      <td>
                        <div className="d-flex gap-2">
                          {!isManager && myAssignment?.status === 'pending' && (
                            <>
                              <button className="wf-btn wf-btn-success wf-btn-sm" onClick={() => handleShiftResponse(s._id, 'accepted')}>Accept</button>
                              <button className="wf-btn wf-btn-danger wf-btn-sm" onClick={() => handleShiftResponse(s._id, 'rejected')}>Reject</button>
                            </>
                          )}
                          {!isManager && myAssignment?.status === 'accepted' && (
                            <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => { setSelectedShift(s); setShowSwapModal(true); }}>Swap</button>
                          )}
                          {canManageShifts && (
                            <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => { setEditShift(s); setForm({ ...s, date: s.startTime.split('T')[0] }); setShowModal(true); }}>Edit</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'swaps' && (
        <div className="wf-card shadow-sm w-100">
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr><th>Requesting</th><th>Shift</th><th>Target/Offer</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {swapRequests.map(r => (
                  <tr key={r._id}>
                    <td>{r.requestingUser?.name}</td>
                    <td>{r.shiftId?.title}</td>
                    <td>{r.targetUser?.name || 'Open'}{r.offeredShiftId && ` / ${r.offeredShiftId.title}`}</td>
                    <td><Badge status={r.status}>{r.status}</Badge></td>
                    <td>
                      {r.status === 'pending' && r.targetUser?._id === user._id && <button className="wf-btn wf-btn-success wf-btn-sm" onClick={() => handleSwapResponse(r._id, 'accepted')}>Accept</button>}
                      {isManager && r.status === 'accepted' && <button className="wf-btn wf-btn-primary wf-btn-sm" onClick={() => handleSwapApproval(r._id, 'approved')}>Approve</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showAvailModal} onClose={() => setShowAvailModal(false)} title="Availability">
        <div className="p-3 d-grid gap-2">
          <button className="wf-btn wf-btn-primary" onClick={() => setAvailabilityStatus('available')}>Available</button>
          <button className="wf-btn wf-btn-outline text-danger" onClick={() => setAvailabilityStatus('unavailable')}>Unavailable</button>
        </div>
      </Modal>

      <Modal open={showSwapModal} onClose={() => setShowSwapModal(false)} title="Shift Swap">
        <form onSubmit={handleSwapSubmit}>
          <div className="mb-3">
            <label className="wf-label">Target Employee</label>
            <select className="wf-select" value={swapForm.targetUserId} onChange={e => setSwapForm({...swapForm, targetUserId: e.target.value})}>
              <option value="">Open Shift</option>
              {employees.filter(e => e._id !== user._id).map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <button type="submit" className="wf-btn wf-btn-primary w-100">Submit</button>
        </form>
      </Modal>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Shift">
          <form onSubmit={handleSubmit}>
              <input className="wf-input mb-2" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <button type="submit" className="wf-btn wf-btn-primary w-100">Save</button>
          </form>
      </Modal>

      <style>{`
        .wf-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #eee; }
        .wf-calendar-day { background: white; min-height: 100px; padding: 10px; cursor: pointer; }
        .wf-calendar-day:hover { background: #f9f9f9; }
        .shift-mini { font-size: 0.75rem; padding: 2px 5px; background: #e0f2fe; margin-bottom: 2px; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default ShiftsPage;
