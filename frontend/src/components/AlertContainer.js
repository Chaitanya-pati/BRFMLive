import React, { useState, forwardRef, useImperativeHandle } from 'react';
import AlertDialog from './AlertDialog';

const AlertContainer = forwardRef((props, ref) => {
  const [alerts, setAlerts] = useState([]);

  useImperativeHandle(ref, () => ({
    show: (title, message, type = 'info', buttons = [], resolve) => {
      const id = Date.now();

      // Wrap button callbacks to close dialog and resolve promise
      const wrappedButtons = buttons.map(button => ({
        ...button,
        onPress: () => {
          if (button.onPress) {
            button.onPress();
          }
          handleClose(id);
          if (resolve) {
            resolve();
          }
        }
      }));

      setAlerts((prev) => [...prev, { 
        id, 
        title, 
        message, 
        type, 
        buttons: wrappedButtons.length > 0 ? wrappedButtons : [{
          text: 'OK',
          style: 'primary',
          onPress: () => {
            handleClose(id);
            if (resolve) {
              resolve();
            }
          }
        }]
      }]);
    },
  }));

  const handleClose = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <>
      {alerts.map((alert) => (
        <AlertDialog
          key={alert.id}
          visible={true}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          buttons={alert.buttons}
          onClose={() => handleClose(alert.id)}
        />
      ))}
    </>
  );
});

export default AlertContainer;