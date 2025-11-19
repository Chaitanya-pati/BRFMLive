
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

export const showToast = (message, type = 'info', duration = 3000) => {
  if (toastContainer) {
    toastContainer.show(message, type, duration);
  } else {
    console.warn('⚠️ Toast container not initialized. Message:', message);
    // Fallback to console for debugging
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
};

export const showAlert = (title, message, type = 'info', buttons = []) => {
  return new Promise((resolve) => {
    if (alertContainer) {
      alertContainer.show(title, message, type, buttons, resolve);
    } else {
      console.warn('⚠️ Alert container not initialized');
      console.log(`[ALERT] ${title}: ${message}`);
      // Fallback to browser alert in web environment
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`${title}\n\n${message}`);
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
