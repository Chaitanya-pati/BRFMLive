
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
    console.warn('Toast container not initialized');
  }
};

export const showAlert = (title, message, type = 'info', buttons = []) => {
  return new Promise((resolve) => {
    if (alertContainer) {
      alertContainer.show(title, message, type, buttons, resolve);
    } else {
      console.warn('Alert container not initialized');
      resolve();
    }
  });
};

export const showConfirm = (title, message, onConfirm, onCancel) => {
  return showAlert(title, message, 'warning', [
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: () => {
        onCancel?.();
      },
    },
    {
      text: 'Confirm',
      style: 'destructive',
      onPress: () => {
        onConfirm?.();
      },
    },
  ]);
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
