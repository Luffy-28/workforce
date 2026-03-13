import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import { disconnectSocket } from '../../utils/socket';
import { getInitials } from '../../utils/helpers';
import Alert from '../../utils/alert';

const navConfig = [
  {
    section: 'Main', items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
      { path: '/attendance', label: 'Attendance', icon: 'bi-clock' },
    ]
  },
  {
    section: 'Operations', items: [
      { path: '/inventory', label: 'Inventory', icon: 'bi-box-seam', roles: ['admin', 'manager'] },
      { path: '/requests', label: 'Requests', icon: 'bi-arrow-down-circle', badge: 'pendingRequests', roles: ['admin', 'manager'] },
      { path: '/shifts', label: 'Shifts', icon: 'bi-calendar3' },
      { path: '/leaves', label: 'Leaves', icon: 'bi-calendar-range' },
      { path: '/tasks', label: 'Tasks', icon: 'bi-check2-square' },
    ]
  },
  {
    section: 'Management', items: [
      { path: '/users', label: 'Users', icon: 'bi-people', roles: ['admin', 'manager'] },
      { path: '/sites', label: 'Sites', icon: 'bi-geo-alt', roles: ['admin', 'manager'] },
      { path: '/reports', label: 'Reports', icon: 'bi-bar-chart', roles: ['admin', 'manager'] },
      { path: '/notifications', label: 'Notifications', icon: 'bi-bell', badge: 'unreadNotifs' },
    ]
  },
];

const Sidebar = ({ mobileOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { items: notifications } = useSelector(s => s.notifications);
  const { requests } = useSelector(s => s.inventory);

  const unreadNotifs = notifications.filter(n => !n.isRead).length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const badges = { unreadNotifs, pendingRequests };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          disconnectSocket();
          await dispatch(logoutUser());
          navigate('/login');
        }
      }
    ]);
  };

  const navTo = (path) => { navigate(path); onClose?.(); };

  return (
    <>
      {mobileOpen && <div className="position-fixed inset-0 bg-dark bg-opacity-50 d-md-none" style={{ zIndex: 999 }} onClick={onClose} />}
      <div className={`wf-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="wf-sidebar-logo">
          <div className="wf-logo-icon">
            <i className="bi bi-shield-check text-white fs-5" />
          </div>
          <div className="wf-sidebar-brand">
            {user?.company?.name || 'WorkForce Pro'}
            <span>{user?.company ? 'Company Workspace' : 'Management System'}</span>
          </div>

        </div>

        <nav className="wf-nav">
          {navConfig.map(({ section, items }) => (
            <div key={section}>
              <div className="wf-nav-section-label">{section}</div>
              {items.filter(item => !item.roles || item.roles.includes(user?.role)).map(item => {
                const badgeCount = item.badge ? badges[item.badge] : 0;
                const isActive = location.pathname === item.path;
                return (
                  <button key={item.path} className={`wf-nav-item ${isActive ? 'active' : ''}`} onClick={() => navTo(item.path)}>
                    <i className={`bi ${item.icon} fs-6`} />
                    <span>{item.label}</span>
                    {badgeCount > 0 && <span className="wf-nav-badge">{badgeCount}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="wf-sidebar-user">
          <div className="d-flex align-items-center gap-2 mb-2 px-1">
            <div className="wf-avatar">{getInitials(user?.name)}</div>
            <div className="overflow-hidden">
              <div className="text-white fw-semibold small text-truncate">{user?.name}</div>
              <div className="text-muted-sm text-truncate" style={{ color: '#64748b' }}>{user?.role}</div>
            </div>
          </div>
          <button className="wf-nav-item w-100 text-danger" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
