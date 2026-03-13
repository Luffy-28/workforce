import React from 'react';
import { useSelector } from 'react-redux';
import Spinner from '../common/Spinner';

const AnnouncementCard = ({ announcement }) => {
  const isHighPriority = announcement.priority === 'high';
  
  return (
    <div className={`wf-card mb-3 p-3 ${isHighPriority ? 'border-primary' : ''}`} style={{ borderLeft: isHighPriority ? '5px solid var(--wf-primary)' : '1px solid var(--wf-border)' }}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h6 className="mb-0 fw-bold">{announcement.title}</h6>
        {isHighPriority && <span className="badge bg-primary">Urgent</span>}
      </div>
      <p className="text-muted small mb-2">{announcement.message}</p>
      <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
        <span className="small text-secondary">
          <i className="bi bi-person me-1"></i>
          {announcement.senderId?.name || 'Management'}
        </span>
        <span className="small text-secondary">
          {new Date(announcement.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

const AnnouncementList = () => {
  const { items, loading } = useSelector(state => state.announcements);

  if (loading && items.length === 0) return <Spinner />;

  return (
    <div className="announcements-container">
      <div className="d-flex align-items-center mb-3">
        <i className="bi bi-megaphone fs-4 me-2 text-primary"></i>
        <h5 className="mb-0">Announcements</h5>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center p-4 bg-light rounded text-muted">
          No active announcements
        </div>
      ) : (
        items.map(announcement => (
          <AnnouncementCard key={announcement._id} announcement={announcement} />
        ))
      )}
    </div>
  );
};

export default AnnouncementList;
