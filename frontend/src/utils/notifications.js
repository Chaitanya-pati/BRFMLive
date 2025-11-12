import { Alert, Platform } from 'react-native';

export const showNotification = (message, type = 'info') => {
  if (Platform.OS === 'web') {
    if (type === 'error') {
      alert(`Error: ${message}`);
    } else if (type === 'success') {
      alert(`Success: ${message}`);
    } else if (type === 'warning') {
      alert(`Warning: ${message}`);
    } else {
      alert(message);
    }
  } else {
    Alert.alert(
      type === 'error' ? 'Error' : type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Info',
      message,
      [{ text: 'OK' }]
    );
  }
};

export const showError = (message) => {
  showNotification(message, 'error');
};

export const showSuccess = (message) => {
  showNotification(message, 'success');
};

export const showWarning = (message) => {
  showNotification(message, 'warning');
};

export const showConfirm = (title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel') => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm?.();
      } else {
        onCancel?.();
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          {
            text: cancelText,
            onPress: onCancel,
            style: 'cancel',
          },
          {
            text: confirmText,
            onPress: onConfirm,
          },
        ],
        { cancelable: false }
      );
    }
  };

export default {
  showNotification,
  showError,
  showSuccess,
  showWarning,
  showConfirm,
};