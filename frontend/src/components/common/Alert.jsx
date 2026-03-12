import React from 'react';
import { useSelector } from 'react-redux';
import Alert from '../../utils/alert';

const AlertModal = () => {
    const { isOpen, alertId, title, message, buttons } = useSelector((state) => state.alert);

    if (!isOpen) return null;

    const handleButtonPress = (buttonIndex) => {
        // Alert.handlePress fires the real callback from the registry
        // and dispatches hideAlert — no onPress needed from Redux state
        Alert.handlePress(alertId, buttonIndex);
    };

    return (
        <div className="wf-alert-overlay">
            <div className="wf-alert-container">
                <div className="wf-alert-content">
                    {title && <h5 className="wf-alert-title">{title}</h5>}
                    {message && <p className="wf-alert-message">{message}</p>}
                </div>
                <div className={`wf-alert-buttons ${buttons.length > 2 ? 'vertical' : ''}`}>
                    {buttons.map((btn) => (
                        <button
                            key={btn.index}
                            className={`wf-alert-button ${
                                btn.style === 'cancel' ? 'cancel' :
                                btn.style === 'destructive' ? 'destructive' : ''
                            }`}
                            onClick={() => handleButtonPress(btn.index)}
                        >
                            {btn.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AlertModal;