
import React from 'react';
import { Platform } from 'react-native';

let toastContainer = null;
let alertContainer = null;

export const setToastContainer = (container) => {
  toastContainer = container;
};

export const setAlertContainer = (container) => {
  alertContainer = container;
};

export const formatErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    
    if (typeof detail === 'string') {
      return detail;
    }
    
    if (Array.isArray(detail)) {
      return detail.map((err, index) => {
        if (typeof err === 'string') return err;
        if (typeof err === 'object' && err.msg) {
          const field = err.loc && err.loc.length > 0 ? err.loc.join(' -> ') : 'field';
          return `${field}: ${err.msg}`;
        }
        return `Error ${index + 1}: ${JSON.stringify(err)}`;
      }).join('\n');
    }
    
    if (typeof detail === 'object') {
      return JSON.stringify(detail, null, 2);
    }
  }
  
  if (error.message) return error.message;
  
  return 'An unknown error occurred';
};

export const showToast = (message, type = 'info', duration = 3000) => {
  const formattedMessage = typeof message === 'string' ? message : formatErrorMessage(message);
  
  if (toastContainer) {
    toastContainer.show(formattedMessage, type, duration);
  } else {
    console.warn('⚠️ Toast container not initialized. Message:', formattedMessage);
    console.log(`[${type.toUpperCase()}] ${formattedMessage}`);
  }
};

export const showAlert = (title, message, type = 'info', buttons = []) => {
  return new Promise((resolve) => {
    const formattedMessage = typeof message === 'string' ? message : formatErrorMessage(message);
    
    if (alertContainer) {
      alertContainer.show(title, formattedMessage, type, buttons, resolve);
    } else {
      console.warn('⚠️ Alert container not initialized');
      console.log(`[ALERT] ${title}: ${formattedMessage}`);
      // Fallback to browser alert in web environment
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`${title}\n\n${formattedMessage}`);
      }
      resolve();
    }
  });
};

export const showConfirm = (title, message) => {
  return new Promise((resolve) => {
    if (alertContainer) {
      const buttons = [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Confirm',
          style: 'primary',
          onPress: () => resolve(true),
        },
      ];
      alertContainer.show(title, message, 'warning', buttons, resolve);
    } else {
      console.warn('⚠️ Alert container not initialized');
      // Fallback to browser confirm in web environment
      if (typeof window !== 'undefined' && window.confirm) {
        resolve(window.confirm(`${title}\n\n${message}`));
      } else {
        resolve(false);
      }
    }
  });
};

export const showSuccess = (message) => {
  showToast(message, 'success');
};

export const showError = (message) => {
  showToast(message, 'error');
};

export const showWarning = (message) => {
  showToast(message, 'warning');
};

export const showInfo = (message) => {
  showToast(message, 'info');
};
