import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAttendance,
  fetchMyAttendance,
  clockIn,
  clockOut,
  breakStart,
  breakEnd,
  requestAdjustment,
  fetchAdjustments,
  processAdjustment,
  updateAttendanceStatus,
  clearAttendanceError
} from '../store/slices/attendanceSlice';
import { fetchSites } from '../store/slices/sitesSlice';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { fmtDate, fmtTime } from '../utils/helpers';
import Alert from '../utils/alert';

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Map Updater Component ────────────────────────────────────────────────────
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const getGPS = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve({ lat: 0, lng: 0, address: 'Geolocation not supported' });
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = parseFloat(coords.latitude.toFixed(6));
        const lng = parseFloat(coords.longitude.toFixed(6));
        const coordLabel = `${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng)}°${lng >= 0 ? 'E' : 'W'}`;

        try {
          const nominatimFetch = fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          );

          const res = await Promise.race([nominatimFetch, timeoutPromise]);
          const data = await res.json();

          const a = data.address || {};
          const parts = [
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
            a.suburb || a.neighbourhood || a.quarter,
            a.city || a.town || a.village || a.county,
            a.postcode,
            a.country,
          ].filter(Boolean);

          const address = parts.length ? parts.join(', ') : data.display_name || coordLabel;
          resolve({ lat, lng, address });
        } catch {
          resolve({ lat, lng, address: coordLabel });
        }
      },
      () => resolve({ lat: 0, lng: 0, address: 'Location permission denied' }),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });

const LocationCell = ({ gps, type }) => {
  if (!gps?.address && !gps?.lat) return <span className="text-muted">—</span>;

  const { lat, lng, address } = gps;
  const iconClass = type === 'in' ? 'text-success' : 'text-danger';

  const parts = address ? address.split(', ') : [];
  const line1 = parts.slice(0, 2).join(', ') || address;
  const line2 = parts.slice(2).join(', ') || '';

  const mapsUrl =
    lat && lng && lat !== 0
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(address)}`;

  return (
    <div className="d-flex align-items-start gap-1" style={{ maxWidth: 220 }}>
      <i className={`bi bi-geo-alt-fill mt-1 flex-shrink-0 ${iconClass}`} style={{ fontSize: 13 }} />
      <div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none small fw-medium text-body"
          title={`${lat}, ${lng}`}
        >
          <div>{line1}</div>
          {line2 && <div className="text-muted" style={{ fontSize: '0.78rem' }}>{line2}</div>}
        </a>
        {lat !== 0 && (
          <div className="text-muted" style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>
            {lat}, {lng}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const AttendancePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { records, myRecords, adjustments, loading, clockedIn, onBreak, error } = useSelector(s => s.attendance);
  const { items: sites } = useSelector(s => s.sites);
  const isManager = ['admin', 'manager', 'supervisor'].includes(user?.role);

  const [time, setTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState(false);
  const [view, setView] = useState('history');
  const [filter, setFilter] = useState('all');

  // New filters
  const [nameFilter, setNameFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');

  const [showAdjModal, setShowAdjModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [adjForm, setAdjForm] = useState({ signInTime: '', signOutTime: '', note: '' });

  // Map state
  const [currentGPS, setCurrentGPS] = useState({ lat: 0, lng: 0, address: 'Locating...' });

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    loadData();
    // Initial GPS fetch for the map
    getGPS().then(setCurrentGPS);
    return () => clearInterval(t);
  }, [dispatch, isManager]);

  useEffect(() => {
    if (error) setActionLoading(false);
  }, [error]);

  const loadData = () => {
    if (isManager) {
      dispatch(fetchAttendance());
      dispatch(fetchAdjustments());
      dispatch(fetchSites());
    }
    dispatch(fetchMyAttendance());
  };

  const handleAction = async (action) => {
    const labels = {
      in: 'Clock In',
      out: 'Clock Out',
      'break-start': 'Start Break',
      'break-end': 'End Break',
    };

    Alert.alert(
      labels[action],
      `Are you sure you want to ${labels[action]} at ${currentGPS.address}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              setActionLoading(true);

              let loc = currentGPS;
              if (action === 'in' || action === 'out') {
                // Refresh GPS to be sure
                loc = await getGPS();
                setCurrentGPS(loc);
              }

              const actionMap = {
                in: clockIn({ gpsLocation: loc }),
                out: clockOut({ gpsLocation: loc }),
                'break-start': breakStart(),
                'break-end': breakEnd(),
              };

              const result = await dispatch(actionMap[action]);
              if (result.error) {
                Alert.error('Action Failed', result.payload || result.error.message || 'Action failed');
              } else {
                Alert.success('Success', `Successfully ${labels[action].toLowerCase()}ed`);
              }
              loadData();
            } catch (err) {
              console.error(err);
              Alert.error('Error', 'An unexpected error occurred. Please refresh and try again.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const openAdjustment = (record) => {
    setSelectedRecord(record);
    const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');
    setAdjForm({
      signInTime: fmt(record.signInTime),
      signOutTime: fmt(record.signOutTime),
      note: '',
    });
    setShowAdjModal(true);
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjForm.note) {
      Alert.error('Note Required', 'Please provide a note explaining the change.');
      return;
    }

    Alert.alert('Submit Request', 'Submit this adjustment request for approval?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          await dispatch(requestAdjustment({
            attendanceId: selectedRecord._id,
            requestedChanges: {
              signInTime: adjForm.signInTime,
              signOutTime: adjForm.signOutTime,
            },
            note: adjForm.note,
          }));
          setShowAdjModal(false);
          loadData();
          Alert.success('Submitted', 'Adjustment request sent successfully');
        }
      }
    ]);
  };

  const filterRecords = (recs) => {
    let filtered = recs;

    // Time filter
    if (filter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((r) => {
        const d = new Date(r.date || r.signInTime);
        const diffDays = (now - d) / (1000 * 3600 * 24);
        if (filter === 'day') return d.toDateString() === now.toDateString();
        if (filter === 'week') return diffDays <= 7;
        if (filter === 'fortnight') return diffDays <= 14;
        if (filter === 'month') return diffDays <= 30;
        return true;
      });
    }

    // Name filter
    if (nameFilter) {
      const search = nameFilter.toLowerCase();
      filtered = filtered.filter(r =>
        r.userId?.name.toLowerCase().includes(search)
      );
    }

    // Site filter
    if (siteFilter) {
      filtered = filtered.filter(r =>
        (r.userId?.site?._id || r.userId?.site) === siteFilter
      );
    }

    return filtered;
  };

  const displayRecords = useMemo(
    () => filterRecords(isManager ? records : myRecords),
    [records, myRecords, filter, isManager, nameFilter, siteFilter]
  );

  const totalHours = useMemo(
    () => displayRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(2),
    [displayRecords]
  );

  return (
    <div className="container-fluid py-4">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {error}
          <button type="button" className="btn-close" onClick={() => dispatch(clearAttendanceError())} />
        </div>
      )}

      {/* ── Clock Hero ── */}
      <div className="wf-clock-hero mb-4 overflow-hidden" style={{ borderRadius: '1.25rem' }}>
        <div className="row g-0">
          <div className="col-lg-7 p-4 p-md-5">
            <div className="wf-clock-time">{time.toLocaleTimeString()}</div>
            <div className="wf-clock-date">
              {time.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </div>
            <div className="mt-2 d-flex align-items-center gap-2">
              <div
                className={`rounded-circle ${!clockedIn ? 'bg-secondary' : onBreak ? 'bg-warning' : 'bg-success'}`}
                style={{ width: 10, height: 10 }}
              />
              <span className="small text-white-50">
                {!clockedIn ? 'Not clocked in' : onBreak ? 'On break' : 'Currently working'}
              </span>
            </div>

            <div className="mt-4 pt-2">
              <div className="d-flex flex-wrap gap-2">
                {!clockedIn ? (
                  <button
                    className="wf-btn bg-white text-primary border-0 fw-bold px-5 py-3 shadow-lg"
                    style={{ borderRadius: '1rem' }}
                    onClick={() => handleAction('in')}
                    disabled={actionLoading}
                  >
                    {actionLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" />Locating…</>
                      : <><i className="bi bi-play-fill me-2" />Clock In</>}
                  </button>
                ) : (
                  <>
                    {!onBreak ? (
                      <button
                        className="wf-btn bg-white-10 text-white border-white-20 fw-semibold px-4 py-3"
                        style={{ borderRadius: '1rem' }}
                        onClick={() => handleAction('break-start')}
                        disabled={actionLoading}
                      >
                        {actionLoading
                          ? <span className="spinner-border spinner-border-sm" />
                          : <><i className="bi bi-pause-fill me-2" />Start Break</>}
                      </button>
                    ) : (
                      <button
                        className="wf-btn bg-warning text-dark border-0 fw-bold px-4 py-3"
                        style={{ borderRadius: '1rem' }}
                        onClick={() => handleAction('break-end')}
                        disabled={actionLoading}
                      >
                        {actionLoading
                          ? <span className="spinner-border spinner-border-sm" />
                          : <><i className="bi bi-play-fill me-2" />End Break</>}
                      </button>
                    )}
                    <button
                      className="wf-btn bg-danger text-white border-0 fw-bold px-5 py-3 shadow"
                      style={{ borderRadius: '1rem' }}
                      onClick={() => handleAction('out')}
                      disabled={actionLoading}
                    >
                      {actionLoading
                        ? <><span className="spinner-border spinner-border-sm me-2" />Locating…</>
                        : <><i className="bi bi-stop-fill me-2" />Clock Out</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-5 d-none d-lg-block position-relative" style={{ minHeight: 400 }}>
            {/* Live Map Integration */}
            <MapContainer
              center={[currentGPS.lat || -33.8688, currentGPS.lng || 151.2093]}
              zoom={13}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={[currentGPS.lat, currentGPS.lng]} />
              {currentGPS.lat !== 0 && (
                <Marker position={[currentGPS.lat, currentGPS.lng]}>
                  <Popup>
                    <div className="small">
                      <strong>You are here</strong><br />
                      {currentGPS.address}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Map Overlay info */}
            <div className="position-absolute bottom-0 start-0 w-100 p-3" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)', zIndex: 1000 }}>
              <div className="d-flex align-items-center gap-2 text-white small">
                <i className="bi bi-geo-alt-fill text-danger" />
                <span className="text-truncate">{currentGPS.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats / Filters ── */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="wf-stat-card p-3">
            <div className="wf-stat-label">Total Hours</div>
            <div className="wf-stat-value text-primary">{totalHours}h</div>
          </div>
        </div>
        <div className="col-md-9">
          <div className="wf-card p-3">
            <div className="row g-3 align-items-center">
              <div className="col-auto d-flex gap-1 overflow-auto pb-1">
                {['all', 'day', 'week', 'fortnight', 'month'].map((f) => (
                  <button
                    key={f}
                    className={`wf-btn wf-btn-sm text-nowrap ${filter === f ? 'wf-btn-primary' : 'wf-btn-outline'}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {isManager && (
                <>
                  <div className="col-md-3">
                    <input
                      className="wf-input wf-input-sm"
                      placeholder="Filter by name..."
                      value={nameFilter}
                      onChange={e => setNameFilter(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <select
                      className="wf-select wf-select-sm"
                      value={siteFilter}
                      onChange={e => setSiteFilter(e.target.value)}
                    >
                      <option value="">All Sites</option>
                      {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {isManager && (
                <div className="col-auto ms-auto">
                  <div className="wf-tab-group mb-0">
                    <button className={`wf-tab ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>Hist</button>
                    <button className={`wf-tab ${view === 'pending' ? 'active' : ''}`} onClick={() => setView('pending')}>Appr</button>
                    <button className={`wf-tab ${view === 'adjustments' ? 'active' : ''}`} onClick={() => setView('adjustments')}>Edits</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── History View ── */}
      {view === 'history' && (
        <div className="wf-card">
          <div className="wf-card-header">
            <h6 className="wf-card-title">{isManager ? 'Attendance Records' : 'My History'}</h6>
            <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={loadData}>
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <div className="table-responsive">
              <table className="wf-table">
                <thead>
                  <tr>
                    {isManager && <th>Employee</th>}
                    <th>Date</th>
                    <th>Clock In / Out</th>
                    <th style={{ minWidth: 230 }}>Clock In Location</th>
                    <th style={{ minWidth: 230 }}>Clock Out Location</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRecords.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 9 : 8}>
                        <EmptyState icon="bi-clock" title="No Records" message="Try adjusting your filters" />
                      </td>
                    </tr>
                  ) : (
                    displayRecords.map((r) => (
                      <tr key={r._id}>
                        {isManager && (
                          <td>
                            <div className="fw-medium small">{r.userId?.name}</div>
                            <div className="text-muted-sm">{sites.find(s => (s._id === (r.userId?.site?._id || r.userId?.site)))?.name || r.userId?.department || '—'}</div>
                          </td>
                        )}
                        <td className="small">{fmtDate(r.signInTime || r.date)}</td>
                        <td className="small">
                          <div className="fw-bold">
                            <i className="bi bi-box-arrow-in-right text-success me-1" />
                            {fmtTime(r.signInTime)}
                          </div>
                          <div className="mt-1">
                            {r.signOutTime ? (
                              <>
                                <i className="bi bi-box-arrow-right text-danger me-1" />
                                <span>{fmtTime(r.signOutTime)}</span>
                              </>
                            ) : (
                              <Badge status="success">Active</Badge>
                            )}
                          </div>
                        </td>
                        <td><LocationCell gps={r.gpsLocation?.signIn} type="in" /></td>
                        <td>
                          {r.signOutTime ? (
                            <LocationCell gps={r.gpsLocation?.signOut} type="out" />
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td className="fw-semibold small text-primary">{r.totalHours ? `${r.totalHours}h` : '—'}</td>
                        <td><Badge status={r.status}>{r.status}</Badge></td>
                        <td>
                          {!isManager && (
                            <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => openAdjustment(r)}>
                              <i className="bi bi-pencil" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Pending Approvals ── */}
      {view === 'pending' && (
        <div className="wf-card">
          <div className="wf-card-header">
            <h6 className="wf-card-title">Pending Approvals</h6>
          </div>
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th style={{ minWidth: 230 }}>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.filter((r) => r.status === 'pending').length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <EmptyState icon="bi-check2-circle" title="All Caught Up" message="No pending approvals" />
                    </td>
                  </tr>
                ) : (
                  records
                    .filter((r) => r.status === 'pending')
                    .map((r) => (
                      <tr key={r._id}>
                        <td>
                          <div className="fw-medium small">{r.userId?.name}</div>
                          <div className="text-muted-sm">{r.userId?.title || r.userId?.role}</div>
                        </td>
                        <td className="small">{fmtDate(r.signInTime)}</td>
                        <td className="small">{fmtTime(r.signInTime)}</td>
                        <td><LocationCell gps={r.gpsLocation?.signIn} type="in" /></td>
                        <td>
                          <div className="d-flex gap-2">
                            <button className="wf-btn wf-btn-primary wf-btn-sm" onClick={() => dispatch(updateAttendanceStatus({ id: r._id, status: 'present' })).then(loadData)}>Approve</button>
                            <button className="wf-btn wf-btn-outline wf-btn-sm text-danger" onClick={() => {
                              Alert.alert('Reject Clock-in', 'Are you sure you want to reject this clock-in request?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Reject', style: 'destructive', onPress: () => dispatch(updateAttendanceStatus({ id: r._id, status: 'absent', notes: 'Rejected' })).then(loadData) }
                              ]);
                            }}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edits ── */}
      {view === 'adjustments' && (
        <div className="wf-card">
          <div className="wf-card-header">
            <h6 className="wf-card-title">Adjustment Requests</h6>
          </div>
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Requested Changes</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr><td colSpan="4"><EmptyState icon="bi-patch-check" title="No Requests" message="Clear!" /></td></tr>
                ) : (
                  adjustments.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <div className="fw-medium small">{a.userId?.name}</div>
                        <div className="text-muted-sm">{fmtDate(a.attendanceId?.date)}</div>
                      </td>
                      <td className="small">
                        {fmtTime(a.requestedChanges?.signInTime)} - {fmtTime(a.requestedChanges?.signOutTime)}
                      </td>
                      <td className="small text-muted">{a.note}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="wf-btn wf-btn-primary wf-btn-sm" onClick={() => dispatch(processAdjustment({ id: a._id, status: 'approved' }))}>Approve</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Adjustment Modal ── */}
      <Modal open={showAdjModal} onClose={() => setShowAdjModal(false)} title="Request Edit">
        <form onSubmit={submitAdjustment}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="wf-label">Clock In</label>
              <input type="datetime-local" className="wf-input" value={adjForm.signInTime} onChange={(e) => setAdjForm({ ...adjForm, signInTime: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="wf-label">Clock Out</label>
              <input type="datetime-local" className="wf-input" value={adjForm.signOutTime} onChange={(e) => setAdjForm({ ...adjForm, signOutTime: e.target.value })} required />
            </div>
            <div className="col-12">
              <label className="wf-label">Reason *</label>
              <textarea className="wf-input" rows="3" value={adjForm.note} onChange={(e) => setAdjForm({ ...adjForm, note: e.target.value })} required />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="submit" className="wf-btn wf-btn-primary">Submit</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendancePage;