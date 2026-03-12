import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getInitials } from '../../utils/helpers';

const Topbar = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { items: notifications } = useSelector(s => s.notifications);
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="wf-topbar">
      <div className="d-flex align-items-center gap-3">
        <button className="btn btn-link text-dark p-0 d-md-none" onClick={onMenuClick}>
          <i className="bi bi-list fs-4" />
        </button>
        <h1 className="wf-page-title">{title}</h1>
      </div>
      <div className="d-flex align-items-center gap-3">
        <div className="wf-search d-none d-md-block">
          <i className="bi bi-search wf-search-icon" />
          <input type="text" placeholder="Search..." />
        </div>
        <button className="btn btn-link text-dark position-relative p-1" onClick={() => navigate('/notifications')}>
          <i className="bi bi-bell fs-5" />
          {unread > 0 && (
            <span className="position-absolute top-0 end-0 badge rounded-pill bg-danger" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>
              {unread}
            </span>
          )}
        </button>
        <div className="wf-avatar" style={{ cursor: 'pointer', overflow: 'hidden' }} title={user?.name} onClick={() => navigate('/profile')}>
          {user?.avatar ? (
            <img src={`${process.env.REACT_APP_API_URL}${user.avatar}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : getInitials(user?.name)}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
