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
  const isManager = ['admin', 'manager'].includes(user?.role);
  const canManageShifts = ['admin', 'manager', 'supervisor'].includes(user?.role);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('calendar'); // 'calendar', 'list', 'availability'

  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [siteFilter, setSiteFilter] = useState(user?.site?._id || user?.site || '');
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Site-scoping: filter sites based on user role
  const mySites = sites.filter(s => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'manager') return s.manager?._id === user._id || s.manager === user._id;
    if (user?.role === 'supervisor') return (s._id === user?.site?._id || s._id === user?.site);
    return false;
  });

  // Filter employees by selected site (for shift assignment)
  const siteEmployees = form.site
    ? employees.filter(e => (e.site?._id || e.site) === form.site)
    : employees;

  // Bulk Form state
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
    if (canManageShifts) dispatch(fetchUsers('?role=employee&status=active'));
  };

  useEffect(() => {
    loadData();
  }, [dispatch, isManager]);

  // --- Calendar Helpers ---
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

  // --- Actions ---
  const getEmployeeAvailability = (empId, dateStr) => {
    const avail = availability.find(a => {
      const aUserId = a.userId?._id || a.userId;
      return aUserId === empId && a.date?.split('T')[0] === dateStr;
    });
    return avail?.status || null; // null means no record = available by default
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend availability check
    if (form.assignedEmployees.length > 0 && form.date) {
      const unavailableNames = form.assignedEmployees
        .filter(empId => getEmployeeAvailability(empId, form.date) === 'unavailable')
        .map(empId => employees.find(e => e._id === empId)?.name || 'Unknown');

      if (unavailableNames.length > 0) {
        Alert.error('Unavailable Employee', `${unavailableNames.join(', ')} ${unavailableNames.length === 1 ? 'is' : 'are'} not available on ${form.date}. Please select a different date or remove them.`);
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
          const currentDay = d.getDay();
          const targetDay = dayMap[dayName];
          let diff = targetDay - currentDay;
          if (diff < 0) diff += 7; // Ensure it's in the future/present week

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
      Alert.error('Bulk Error', err.message || 'Failed to create bulk shifts');
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
    dispatch(respondToShift({ id, status }))
      .unwrap()
      .then(() => {
        Alert.success('Success', `Shift ${status}`);
        loadData();
      })
      .catch(err => {
        Alert.error('Error', err.message || 'Failed to respond to shift');
      });
  };

  const handleDeleteShift = (id, title) => {
    Alert.alert('Remove Shift', `Are you sure you want to remove the shift "${title}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          dispatch(deleteShift(id))
            .unwrap()
            .then(() => {
              Alert.success('Removed', 'Shift has been deleted successfully');
              loadData();
            })
            .catch(err => {
              Alert.error('Error', err.message || 'Failed to delete shift');
            });
        }
      }
    ]);
  };

  // --- Render ---
  return (
    <div className={`d-flex flex-column flex-grow-1 ${view === 'calendar' ? 'vh-100 overflow-hidden' : 'p-4'}`} style={{ backgroundColor: 'var(--wf-light)', width: '100%' }}>
      {/* Dynamic Header */}
      <div className={`d-flex justify-content-between align-items-center ${view === 'calendar' ? 'px-4 py-3 border-bottom bg-white' : 'mb-4'}`}>
        <div style={{ minWidth: '300px' }}>
          <h2 className="fw-display fw-bold mb-0" style={{ fontSize: '1.5rem' }}>Shift Management</h2>
          <p className="text-muted small mb-0">Schedule and coordinate shifts across all locations</p>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div className="wf-tabs shadow-sm">
            <button className={`wf-tab ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>Calendar</button>
            <button className={`wf-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
          </div>
          {canManageShifts && (
            <div className="d-flex gap-2">
              <button className="wf-btn wf-btn-outline shadow-sm" onClick={() => setShowBulkModal(true)}>
                <i className="bi bi-layers" /> Bulk
              </button>
              <button className="wf-btn wf-btn-primary shadow-sm" onClick={() => { setEditShift(null); setForm(EMPTY_FORM); setShowModal(true); }}>
                <i className="bi bi-plus-lg" /> New
              </button>
            </div>
          )}
        </div>
      </div>

      {view === 'calendar' && (
        <div className="flex-grow-1 d-flex flex-column overflow-hidden w-100">
          <div className="d-flex justify-content-between align-items-center px-4 py-2 bg-light border-bottom">
            <div className="d-flex align-items-center gap-3">
              <h4 className="fw-bold mb-0" style={{ fontSize: '1.1rem', color: 'var(--wf-dark)', minWidth: '180px' }}>
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h4>
              <div className="vr mx-2" style={{ height: '20px' }}></div>
              <div className="d-flex gap-1">
                <button className="wf-btn wf-btn-outline wf-btn-sm bg-white" onClick={() => navigateMonth(-1)}><i className="bi bi-chevron-left" /></button>
                <button className="wf-btn wf-btn-outline wf-btn-sm bg-white fw-bold" onClick={() => setCurrentDate(new Date())}>Today</button>
                <button className="wf-btn wf-btn-outline wf-btn-sm bg-white" onClick={() => navigateMonth(1)}><i className="bi bi-chevron-right" /></button>
              </div>
            </div>
            
            <div className="d-flex gap-4">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></div>
                <span className="text-muted-sm fw-bold">Available</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></div>
                <span className="text-muted-sm fw-bold">Unavailable</span>
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
                          {!isManager && status !== 'available' && (
                            <div className={`wf-avail-dot ${status}`} />
                          )}
                        </div>
                        <div className="shift-dots">
                          {dayShifts.map(s => {
                            const assignment = s.assignments?.find(a => (a.employee?._id || a.employee) === user._id);
                            return (
                              <div key={s._id} className={`shift-mini ${assignment?.status || 'managed'}`} title={s.title}>
                                <div className="shift-mini-status"></div>
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
                  <th>Shift Details</th>
                  <th>Site</th>
                  <th>Assigned By</th>
                  {canManageShifts && <th>Assigned To</th>}
                  <th>Response Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr><td colSpan="7"><EmptyState icon="bi-calendar-x" title="No Shifts" message="No shifts found for this period." /></td></tr>
                ) : shifts.map(s => {
                  const myAssignment = s.assignments?.find(a => (a.employee?._id || a.employee) === user._id);
                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="fw-bold small">{fmtDate(s.startTime)}</div>
                        <div className="text-muted-sm">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{s.title}</div>
                        <div className="small text-muted">{s.location || 'No location'}</div>
                      </td>
                      <td>
                        <div className="small fw-medium">{s.site?.name || '—'}</div>
                        {s.site?.address && <div className="text-muted-sm">{s.site.address}</div>}
                      </td>
                      <td>
                        <div className="small fw-medium">{s.createdBy?.name || 'App Admin'}</div>
                      </td>
                      {canManageShifts && (
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {s.assignments?.map((a, i) => (
                              <div key={i} className={`wf-badge wf-badge-sm ${a.status === 'accepted' ? 'wf-badge-green' : a.status === 'rejected' ? 'wf-badge-red' : 'wf-badge-gray'}`} title={a.status}>
                                {a.employee?.name || 'User'}
                              </div>
                            ))}
                          </div>
                        </td>
                      )}
                      <td>
                        <Badge status={myAssignment?.status || s.status}>{myAssignment?.status || s.status}</Badge>
                      </td>
                      <td>
                        {!isManager && myAssignment?.status === 'pending' && (
                          <div className="d-flex gap-2">
                            <button className="wf-btn wf-btn-success wf-btn-sm" onClick={() => handleShiftResponse(s._id, 'accepted')}>Accept</button>
                            <button className="wf-btn wf-btn-danger wf-btn-sm" onClick={() => handleShiftResponse(s._id, 'rejected')}>Reject</button>
                          </div>
                        )}
                        {canManageShifts && (
                          <div className="d-flex gap-2">
                            <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => {
                              setEditShift(s);
                              setForm({
                                title: s.title,
                                location: s.location || '',
                                date: new Date(s.startTime).toISOString().split('T')[0],
                                startTime: new Date(s.startTime).toTimeString().slice(0, 5),
                                endTime: new Date(s.endTime).toTimeString().slice(0, 5),
                                notes: s.notes || '',
                                assignedEmployees: s.assignments?.map(a => a.employee?._id || a.employee) || []
                              });
                              setShowModal(true);
                            }}><i className="bi bi-pencil me-1" />Edit</button>
                            <button className="wf-btn wf-btn-danger wf-btn-sm" onClick={() => handleDeleteShift(s._id, s.title)}>
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Availability Modal --- */}
      <Modal open={showAvailModal} onClose={() => setShowAvailModal(false)} title="Set Availability">
        <div className="p-2">
          <p className="text-muted small mb-4">Set your availability for <strong>{selectedDay && fmtDate(selectedDay)}</strong></p>
          <div className="d-grid gap-3">
            <button className="wf-btn py-3 d-flex align-items-center justify-content-between px-4"
              style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
              onClick={() => setAvailabilityStatus('available')}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
                <span className="fw-bold">Available</span>
              </div>
              <i className="bi bi-chevron-right" />
            </button>
            <button className="wf-btn py-3 d-flex align-items-center justify-content-between px-4"
              style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
              onClick={() => setAvailabilityStatus('unavailable')}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <span className="fw-bold">Not Available</span>
              </div>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Shift Modal --- */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editShift ? 'Edit Shift' : 'Create New Shift'}>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <label className="wf-label">Title *</label>
              <input className="wf-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="col-12">
              <label className="wf-label">Date *</label>
              <input type="date" className="wf-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            </div>
            <div className="col-12">
              <TimeRangeSlider
                label="Shift Hours"
                startValue={form.startTime}
                endValue={form.endTime}
                onStartChange={v => setForm(p => ({ ...p, startTime: v }))}
                onEndChange={v => setForm(p => ({ ...p, endTime: v }))}
              />
            </div>
            <div className="col-12">
              <label className="wf-label">Assign Employees</label>
              {/* Note: In a fuller implementation, employees would be filtered by site/role */}
              <div className="d-flex flex-wrap gap-2 p-3 border rounded-3 bg-light" style={{ maxHeight: 180, overflowY: 'auto' }}>
                {employees.map(emp => {
                  const avail = getEmployeeAvailability(emp._id, form.date);
                  const isUnavailable = avail === 'unavailable';
                  const isSelected = form.assignedEmployees.includes(emp._id);
                  return (
                    <div key={emp._id}
                      className={`wf-badge cursor-pointer px-3 py-2 ${isSelected ? (isUnavailable ? 'wf-badge-red' : 'wf-badge-blue') : 'wf-badge-gray'}`}
                      style={{ opacity: isUnavailable && !isSelected ? 0.6 : 1 }}
                      title={isUnavailable ? `${emp.name} is unavailable on ${form.date}` : emp.name}
                      onClick={() => {
                        if (isUnavailable && !isSelected) {
                          Alert.error('Unavailable', `${emp.name} has marked themselves as unavailable on ${form.date}.`);
                          return;
                        }
                        const newSelected = isSelected
                          ? form.assignedEmployees.filter(id => id !== emp._id)
                          : [...form.assignedEmployees, emp._id];
                        setForm(p => ({ ...p, assignedEmployees: newSelected }));
                      }}>
                      {isUnavailable && <i className="bi bi-x-circle-fill me-1" style={{ color: '#ef4444', fontSize: '0.7rem' }} />}
                      {emp.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="wf-btn wf-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="wf-btn wf-btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Shift'}</button>
          </div>
        </form>
      </Modal>

      {/* --- Bulk Modal --- */}
      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Shift Assignment">
        <form onSubmit={handleBulkSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <label className="wf-label">Select Employee *</label>
              <select className="wf-select" value={bulkForm.employeeId} onChange={e => setBulkForm(p => ({ ...p, employeeId: e.target.value }))} required>
                <option value="">Choose Employee...</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.title || 'Staff'})</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="wf-label">Select Site *</label>
              <select className="wf-select" value={bulkForm.siteId} onChange={e => setBulkForm(p => ({ ...p, siteId: e.target.value }))} required>
                <option value="">Choose Site...</option>
                {mySites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-12">
              <TimeRangeSlider
                label="Standard Hours"
                startValue={bulkForm.startTime}
                endValue={bulkForm.endTime}
                onStartChange={v => setBulkForm(p => ({ ...p, startTime: v }))}
                onEndChange={v => setBulkForm(p => ({ ...p, endTime: v }))}
              />
            </div>
            <div className="col-12">
              <label className="wf-label">Days of Week *</label>
              <div className="d-flex flex-wrap gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <button key={day} type="button"
                    className={`wf-btn wf-btn-sm ${bulkForm.days.includes(day) ? 'wf-btn-primary' : 'wf-btn-outline'}`}
                    onClick={() => setBulkForm(p => ({ ...p, days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day] }))}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-12">
              <label className="wf-label">Duration (Weeks)</label>
              <input type="number" min="1" max="12" className="wf-input" value={bulkForm.weeks} onChange={e => setBulkForm(p => ({ ...p, weeks: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="wf-btn wf-btn-outline" onClick={() => setShowBulkModal(false)}>Cancel</button>
            <button type="submit" className="wf-btn wf-btn-primary" disabled={submitting}>Generate Shifts</button>
          </div>
        </form>
      </Modal>

      <style>{`
        .wf-calendar-grid { 
          display: grid; 
          grid-template-columns: repeat(7, 1fr); 
          grid-template-rows: auto repeat(6, 1fr); 
          background: var(--wf-border); 
          gap: 1px;
          height: 100%;
        }
        .wf-calendar-header { 
          background: #f8fafc; 
          padding: 12px; 
          text-align: center; 
          font-size: 0.75rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: #64748b; 
          border-bottom: 1px solid var(--wf-border);
        }
        .wf-calendar-day { 
          background: white; 
          min-height: 100px; 
          padding: 12px; 
          transition: all 0.2s ease; 
          cursor: pointer; 
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .wf-calendar-day.empty { background: #f8fafc; cursor: default; }
        .wf-calendar-day.available { background: rgba(16, 185, 129, 0.18); }
        .wf-calendar-day.unavailable { background: rgba(239, 68, 68, 0.18); }
        .wf-calendar-day:not(.empty):hover { 
          background: #f1f5f9; 
          z-index: 2;
          box-shadow: inset 0 0 0 2px var(--wf-accent);
        }
        .day-num { font-size: 0.95rem; font-weight: 800; color: #475569; }
        .day-num.today {
          background: var(--wf-accent);
          color: white;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin: -4px;
        }
        .wf-avail-dot { width: 8px; height: 8px; border-radius: 50%; }
        .wf-avail-dot.unavailable { background: #ef4444; }
        .wf-avail-dot.available { background: #10b981; }
        
        .shift-dots { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
        .shift-mini { 
          font-size: 0.7rem; 
          padding: 6px 10px; 
          border-radius: 8px; 
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
          transition: transform 0.1s ease;
        }
        .shift-mini:hover { transform: scale(1.02); }
        .shift-mini-status { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        
        .shift-mini.accepted { background: #dcfce7; color: #166534; }
        .shift-mini.accepted .shift-mini-status { background: #166534; }
        
        .shift-mini.rejected { background: #fee2e2; color: #991b1b; }
        .shift-mini.rejected .shift-mini-status { background: #991b1b; }
        
        .shift-mini.pending { background: #fef9c3; color: #854d0e; }
        .shift-mini.pending .shift-mini-status { background: #854d0e; }
        
        .shift-mini.managed { background: #eff6ff; color: #1e40af; }
        .shift-mini.managed .shift-mini-status { background: #1e40af; }
      `}</style>
    </div>
  );
};

export default ShiftsPage;

