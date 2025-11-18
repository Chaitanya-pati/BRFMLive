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

export const showConfirm = (title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel') => {
  customShowConfirm(title, message, onConfirm, onCancel);
};

export default {
  showNotification,
  showError,
  showSuccess,
  showWarning,
  showConfirm,
};