import React from 'react';
import { statusBadgeClass } from '../../utils/helpers';

const Badge = ({ status, children }) => (
  <span className={`wf-badge ${statusBadgeClass(status || children)}`}>
    {children}
  </span>
);

export default Badge;
