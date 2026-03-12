import React from 'react';

const Modal = ({ open, onClose, title, children, wide, footer }) => {
  if (!open) return null;
  return (
    <div className="wf-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`wf-modal ${wide ? 'wf-modal-wide' : ''}`}>
        <div className="wf-modal-header">
          <h5 className="wf-modal-title">{title}</h5>
          <button className="wf-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="wf-modal-body">{children}</div>
        {footer && <div className="wf-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
