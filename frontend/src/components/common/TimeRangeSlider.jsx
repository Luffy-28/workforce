import React from 'react';

/**
 * A smooth time range slider component.
 * Converts 0-1440 minutes into HH:mm format.
 */
const TimeRangeSlider = ({ label, startValue, endValue, onStartChange, onEndChange }) => {
    const toTimeStr = (v) => {
        const hh = Math.floor(v / 60).toString().padStart(2, '0');
        const mm = (v % 60).toString().padStart(2, '0');
        return `${hh}:${mm}`;
    };

    // Convert "HH:mm" to minutes
    const toMins = (str) => {
        if (!str) return 0;
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
    };

    const startMins = typeof startValue === 'string' ? toMins(startValue) : startValue;
    const endMins = typeof endValue === 'string' ? toMins(endValue) : endValue;

    return (
        <div className="wf-time-slider-group mb-3">
            <label className="wf-label d-flex justify-content-between mb-2">
                <span>{label}</span>
                <span className="fw-bold text-primary">{toTimeStr(startMins)} – {toTimeStr(endMins)}</span>
            </label>

            <div className="position-relative pt-2 pb-4">
                {/* Simple dual-range implementation using two overlays or a single range for now for simplicity if start/end can be separate */}
                <div className="d-flex flex-column gap-3">
                    <div>
                        <div className="small text-muted mb-1">Start Time</div>
                        <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="1439"
                            step="15"
                            value={startMins}
                            onChange={(e) => onStartChange(toTimeStr(parseInt(e.target.value)))}
                        />
                    </div>
                    <div>
                        <div className="small text-muted mb-1">End Time</div>
                        <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="1439"
                            step="15"
                            value={endMins}
                            onChange={(e) => onEndChange(toTimeStr(parseInt(e.target.value)))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeRangeSlider;
