import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markRead, markAllRead } from '../store/slices/notificationsSlice';
import EmptyState from '../components/common/EmptyState';
import { fmt } from '../utils/helpers';

const TYPE_CONFIG = {
  'low-stock': { icon: 'bi-exclamation-triangle-fill', bg: '#fef2f2', color: '#ef4444' },
  'request-update': { icon: 'bi-arrow-down-circle-fill', bg: '#eff6ff', color: '#3b82f6' },
  'shift-assigned': { icon: 'bi-calendar-check-fill', bg: '#f5f3ff', color: '#6366f1' },
  'task-assigned': { icon: 'bi-check2-circle', bg: '#f0fdf4', color: '#10b981' },
  'announcement': { icon: 'bi-megaphone-fill', bg: '#fff7ed', color: '#f97316' },
  'attendance': { icon: 'bi-clock-fill', bg: '#f0f9ff', color: '#0ea5e9' },
};

const NotificationsPage = () => {
  const dispatch = useDispatch();
  const { items: notifications } = useSelector(s => s.notifications);

  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  const unread = notifications.filter(n => !n.isRead);
  const today = notifications.filter(n => new Date(n.createdAt).toDateString() === new Date().toDateString());
  const older = notifications.filter(n => new Date(n.createdAt).toDateString() !== new Date().toDateString());

  const NotifItem = ({ notif }) => {
    const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG['announcement'];
    return (
      <div className={`wf-notif-item ${!notif.isRead ? 'unread' : ''}`} onClick={() => !notif.isRead && dispatch(markRead(notif._id))}>
        <div className="wf-notif-icon" style={{ background: config.bg, color: config.color }}>
          <i className={`bi ${config.icon}`} />
        </div>
        <div className="flex-1">
          <div className="d-flex align-items-start justify-content-between gap-2">
            <p className={`small mb-1 ${!notif.isRead ? 'fw-semibold' : 'text-muted'}`}>{notif.title}</p>
            {!notif.isRead && <div className="wf-notif-dot flex-shrink-0" />}
          </div>
          <p className="text-muted-sm mb-1">{notif.message}</p>
          <p className="text-muted-sm mb-0" style={{ fontSize: '0.7rem' }}>{fmt(notif.createdAt)}</p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-display fw-bold mb-1">Notifications</h2>
          <p className="text-muted small mb-0">{unread.length} unread of {notifications.length} total</p>
        </div>
        {unread.length > 0 && (
          <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => dispatch(markAllRead())}>
            <i className="bi bi-check2-all" />Mark all as read
          </button>
        )}
      </div>

      {/* Summary Row */}
      <div className="row g-3 mb-4">
        {Object.entries(TYPE_CONFIG).slice(0, 4).map(([type, cfg]) => {
          const count = notifications.filter(n => n.type === type).length;
          return (
            <div key={type} className="col-6 col-md-3">
              <div className="wf-stat-card p-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="wf-notif-icon rounded-3" style={{ background: cfg.bg, color: cfg.color, width: 36, height: 36 }}>
                    <i className={`bi ${cfg.icon}`} />
                  </div>
                  <div>
                    <div className="fw-display fw-bold" style={{ fontSize: '1.4rem' }}>{count}</div>
                    <div className="text-muted-sm" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{type.replace('-', ' ')}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="wf-card">
        {notifications.length === 0 ? (
          <EmptyState icon="bi-bell" title="No Notifications" message="You're all caught up!" />
        ) : (
          <>
            {today.length > 0 && (
              <>
                <div className="px-4 py-2 border-bottom" style={{ background: '#f8fafc' }}>
                  <span className="text-muted-sm text-uppercase fw-semibold" style={{ letterSpacing: '0.07em', fontSize: '0.7rem' }}>Today</span>
                </div>
                {today.map(n => <NotifItem key={n._id} notif={n} />)}
              </>
            )}
            {older.length > 0 && (
              <>
                <div className="px-4 py-2 border-bottom" style={{ background: '#f8fafc' }}>
                  <span className="text-muted-sm text-uppercase fw-semibold" style={{ letterSpacing: '0.07em', fontSize: '0.7rem' }}>Earlier</span>
                </div>
                {older.map(n => <NotifItem key={n._id} notif={n} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
