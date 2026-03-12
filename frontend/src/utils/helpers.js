export const fmt = (date) => date ? new Date(date).toLocaleString() : '—';
export const fmtDate = (date) => date ? new Date(date).toLocaleDateString() : '—';
export const fmtTime = (date) => date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const statusBadgeClass = (status) => {
  const map = {
    pending: 'wf-badge-yellow', approved: 'wf-badge-blue', delivered: 'wf-badge-green',
    rejected: 'wf-badge-red', active: 'wf-badge-green', inactive: 'wf-badge-gray',
    present: 'wf-badge-green', absent: 'wf-badge-red', late: 'wf-badge-orange',
    'on-break': 'wf-badge-yellow', upcoming: 'wf-badge-blue', completed: 'wf-badge-green',
    'in-progress': 'wf-badge-blue', cancelled: 'wf-badge-red',
    low: 'wf-badge-gray', medium: 'wf-badge-yellow', high: 'wf-badge-red',
    admin: 'wf-badge-purple', manager: 'wf-badge-blue', employee: 'wf-badge-gray',
  };
  return map[status] || 'wf-badge-gray';
};

export const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const roleIcon = (role) => ({ admin: 'bi-shield-check', manager: 'bi-person-gear', employee: 'bi-person' }[role] || 'bi-person');
