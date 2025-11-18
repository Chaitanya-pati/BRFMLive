
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import AlertDialog from './AlertDialog';

const AlertContainer = forwardRef((props, ref) => {
  const [alert, setAlert] = useState(null);

  useImperativeHandle(ref, () => ({
    show: (title, message, type, buttons, resolve) => {
      setAlert({ title, message, type, buttons, resolve });
    },
  }));

  const handleClose = () => {
    if (alert?.resolve) {
      alert.resolve();
    }
    setAlert(null);
  };

  if (!alert) return null;

  return (
    <AlertDialog
      visible={true}
      onClose={handleClose}
      title={alert.title}
      message={alert.message}
      type={alert.type}
      buttons={alert.buttons}
    />
  );
});

export default AlertContainer;
