import React from 'react';

const bgColors = {
  blue: 'bg-primary bg-opacity-10 text-primary',
  green: 'bg-success bg-opacity-10 text-success',
  red: 'bg-danger bg-opacity-10 text-danger',
  yellow: 'bg-warning bg-opacity-10 text-warning',
  purple: 'bg-purple',
  orange: 'bg-orange',
};

const StatCard = ({ title, value, icon, color = 'blue', sub, trend }) => (
  <div className="wf-stat-card">
    <div className="d-flex align-items-start justify-content-between mb-3">
      <div>
        <p className="wf-stat-label mb-1">{title}</p>
        <div className="wf-stat-value">{value}</div>
        {sub && <p className="text-muted-sm mt-1">{sub}</p>}
      </div>
      <div className={`wf-stat-icon ${bgColors[color] || bgColors.blue}`}>
        <i className={`bi ${icon}`} />
      </div>
    </div>
    {trend !== undefined && (
      <div className={`d-flex align-items-center gap-1 text-muted-sm ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
        <i className={`bi bi-arrow-${trend >= 0 ? 'up' : 'down'}-right`} />
        <span>{Math.abs(trend)}% from last week</span>
      </div>
    )}
  </div>
);

export default StatCard;
