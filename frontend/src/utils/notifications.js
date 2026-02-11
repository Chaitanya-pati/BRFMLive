import { showToast, showAlert, showConfirm as customShowConfirm } from './customAlerts';

export const showNotification = (message, type = 'info') => {
  showToast(message, type);
};

export const showError = (message) => {
  showToast(message, 'error');
};

export const showSuccess = (message) => {
  showToast(message, 'success');
};

export const showWarning = (message) => {
  showToast(message, 'warning');
};

export const showConfirm = (title, message, onConfirm, onCancel) => {
  return customShowConfirm(title, message).then(confirmed => {
    if (confirmed && onConfirm) {
      onConfirm();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
    return confirmed;
  });
};

export default {
  showNotification,
  showError,
  showSuccess,
  showWarning,
  showConfirm,
};