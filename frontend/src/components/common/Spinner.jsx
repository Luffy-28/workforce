import React from 'react';

const Spinner = ({ text = 'Loading...' }) => (
  <div className="wf-loading flex-column gap-3">
    <div className="wf-spinner" />
    {text && <p className="text-muted-sm">{text}</p>}
  </div>
);

export default Spinner;
