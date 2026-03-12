import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../services/api';
import { fetchSites } from '../store/slices/sitesSlice';
import Spinner from '../components/common/Spinner';
import { fmtDate } from '../utils/helpers';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ReportsPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { items: sites } = useSelector(s => s.sites);

  const [attReport, setAttReport] = useState(null);
  const [perfReport, setPerfReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [siteId, setSiteId] = useState('');
  const [granularity, setGranularity] = useState('day');

  const load = async () => {
    setLoading(true);
    try {
      const q = `from=${dateFrom}&to=${dateTo}&siteId=${siteId}&granularity=${granularity}`;
      const [att, perf] = await Promise.all([
        api.get(`/reports/attendance?from=${dateFrom}&to=${dateTo}`),
        api.get(`/reports/performance?${q}`),
      ]);
      setAttReport(att.data);
      setPerfReport(perf.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    dispatch(fetchSites());
    load();
  }, [dispatch]);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-display fw-bold mb-1">Performance Analytics</h2>
          <p className="text-muted small">Visual reports on attendance, work hours, and site efficiency</p>
        </div>

        <div className="wf-card p-3 d-flex flex-wrap gap-3 align-items-end">
          <div>
            <label className="wf-label-sm">Site Filter</label>
            <select className="wf-select wf-select-sm" value={siteId} onChange={e => setSiteId(e.target.value)} style={{ width: '160px' }}>
              <option value="">All Sites</option>
              {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="wf-label-sm">Date Range</label>
            <div className="d-flex gap-2 align-items-center">
              <input type="date" className="wf-input wf-input-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <input type="date" className="wf-input wf-input-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="wf-label-sm">View By</label>
            <select className="wf-select wf-select-sm" value={granularity} onChange={e => setGranularity(e.target.value)}>
              <option value="day">Daily</option>
              <option value="fortnight">Fortnightly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <button className="wf-btn wf-btn-primary py-2 px-3" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1" />Reload
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="row g-4">
          {/* Main Attendance Activity Chart */}
          <div className="col-lg-8">
            <div className="wf-card p-4 h-100">
              <div className="d-flex justify-content-between mb-4">
                <h6 className="fw-bold mb-0">Work Hours & Overtime Trend</h6>
                <div className="small text-muted">Total Hours: {attReport?.summary?.totalHours || 0}h</div>
              </div>
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perfReport?.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="hours" name="Regular Hours" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="overtime" name="Overtime" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Present vs Possible Breakdown (Simplified Pie for now) */}
          <div className="col-lg-4">
            <div className="wf-card p-4 h-100">
              <h6 className="fw-bold mb-4">Attendance Mix</h6>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'On-Time', value: 75 },
                        { name: 'Late', value: 15 },
                        { name: 'Absent', value: 10 },
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                  <span className="small text-muted">Total Employees Clocked In</span>
                  <span className="fw-bold">{attReport?.summary?.totalRecords}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="small text-muted">Avg Work Day</span>
                  <span className="fw-bold">
                    {attReport?.summary?.totalRecords > 0
                      ? (attReport.summary.totalHours / attReport.summary.totalRecords).toFixed(1)
                      : 0}h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Productivity List (New Chart Style) */}
          <div className="col-12">
            <div className="wf-card p-4">
              <h6 className="fw-bold mb-4">Detailed Employee Performance</h6>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perfReport?.employeeBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={100} fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="hours" name="Total Hours" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="col-12">
            <div className="wf-card">
              <div className="wf-card-header border-bottom">
                <h6 className="fw-bold mb-0">Raw Data Reference</h6>
              </div>
              <div className="table-responsive">
                <table className="wf-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Days Present</th>
                      <th>Work Hours</th>
                      <th>Efficiency</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfReport?.employeeBreakdown?.map((emp, i) => (
                      <tr key={i}>
                        <td className="fw-medium">{emp.name}</td>
                        <td>{emp.present}</td>
                        <td className="fw-bold text-primary">{emp.hours.toFixed(1)}h</td>
                        <td>
                          <div className="progress" style={{ height: '6px', width: '100px' }}>
                            <div className="progress-bar bg-success" style={{ width: `${Math.min(emp.hours / 40 * 100, 100)}%` }} />
                          </div>
                        </td>
                        <td>
                          <span className={`wf-badge ${emp.hours > 30 ? 'wf-badge-green' : 'wf-badge-yellow'}`}>
                            {emp.hours > 30 ? 'High' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
