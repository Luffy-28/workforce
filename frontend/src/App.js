import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/slices/authSlice';

import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import InventoryPage from './pages/InventoryPage';
import RequestsPage from './pages/RequestsPage';
import ShiftsPage from './pages/ShiftsPage';
import TasksPage from './pages/TasksPage';
import UsersPage from './pages/UsersPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import SitesPage from './pages/SitesPage';
import CompanyRegisterPage from './pages/CompanyRegisterPage';
import ProfilePage from './pages/ProfilePage';


// ─── Route Guards ─────────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, initialized } = useSelector(s => s.auth);
  if (!initialized) return <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'white' }}>Loading...</div></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ children, roles }) => {
  const { user } = useSelector(s => s.auth);
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, initialized } = useSelector(s => s.auth);
  if (!initialized) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// ─── App ──────────────────────────────────────
const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) dispatch(fetchMe());
    else { const { logout } = require('./store/slices/authSlice'); dispatch(logout()); }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register-company" element={<PublicRoute><CompanyRegisterPage /></PublicRoute>} />


        {/* Protected */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Manager+ only */}
          <Route path="reports" element={
            <RoleRoute roles={['admin', 'manager']}><ReportsPage /></RoleRoute>
          } />

          <Route path="sites" element={
            <RoleRoute roles={['admin', 'manager']}><SitesPage /></RoleRoute>
          } />

          {/* Admin only */}
          <Route path="users" element={
            <RoleRoute roles={['admin']}><UsersPage /></RoleRoute>
          } />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
