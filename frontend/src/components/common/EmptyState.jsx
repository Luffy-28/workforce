import React from 'react';

const EmptyState = ({ icon = 'bi-inbox', title = 'No data', message = '', action }) => (
  <div className="wf-empty">
    <i className={`bi ${icon} wf-empty-icon`} />
    <h6 className="fw-display fw-bold text-muted mb-1">{title}</h6>
    {message && <p className="wf-empty-text">{message}</p>}
    {action}
  </div>
);

export default EmptyState;
