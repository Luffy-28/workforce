/**
 * Alert utility — fixed.
 *
 * ROOT CAUSE: Immer (used internally by Redux Toolkit) clones state objects
 * and STRIPS non-serializable values like functions. So btn.onPress was
 * always undefined by the time the modal tried to call it.
 *
 * FIX: Never put callbacks in Redux. Store them here in a plain Map,
 * keyed by alertId. The modal calls Alert.handlePress(alertId, index)
 * which looks up and fires the real function.
 */
import store from '../store';
import { showAlert, hideAlert } from '../store/slices/alertSlice';

// Callbacks live here — outside Redux, never touched by Immer
const callbackRegistry = new Map();
let counter = 0;

const Alert = {
  alert: (title, message, buttons = []) => {
    const alertId = ++counter;

    // Only send serializable data to Redux (text + style, NO functions)
    const serializableButtons = buttons.map((btn, index) => ({
      text: btn.text,
      style: btn.style || 'default',
      index,
    }));

    // Store real callbacks separately, keyed by alertId
    callbackRegistry.set(alertId, buttons.map(btn => btn.onPress || null));

    store.dispatch(showAlert({ alertId, title, message, buttons: serializableButtons }));
  },

  // Convenience: green success toast
  success: (title, message) => {
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
  },

  // Convenience: red error toast
  error: (title, message) => {
    Alert.alert(title, message, [{ text: 'OK', style: 'destructive' }]);
  },

  // Called by the Alert modal component when user clicks a button
  handlePress: (alertId, buttonIndex) => {
    const callbacks = callbackRegistry.get(alertId);
    callbackRegistry.delete(alertId);
    store.dispatch(hideAlert());

    const fn = callbacks?.[buttonIndex];
    if (typeof fn === 'function') {
      // Small delay so modal unmounts cleanly before side-effects run
      setTimeout(fn, 50);
    }
  },
};

export default Alert;