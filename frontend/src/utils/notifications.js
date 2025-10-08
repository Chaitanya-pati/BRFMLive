
import { Alert, Platform } from 'react-native';

class NotificationManager {
  showSuccess(message, title = 'Success') {
    if (Platform.OS === 'web') {
      this._showWebNotification(title, message, 'success');
    } else {
      Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
    }
  }

  showError(message, title = 'Error') {
    if (Platform.OS === 'web') {
      this._showWebNotification(title, message, 'error');
    } else {
      Alert.alert(title, message, [{ text: 'OK', style: 'cancel' }]);
    }
  }

  showWarning(message, title = 'Warning') {
    if (Platform.OS === 'web') {
      this._showWebNotification(title, message, 'warning');
    } else {
      Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
    }
  }

  showConfirm(title, message, onConfirm, onCancel = () => {}) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      } else {
        onCancel();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Confirm', style: 'destructive', onPress: onConfirm }
      ]);
    }
  }

  _showWebNotification(title, message, type) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    
    const colors = {
      success: { bg: '#10b981', icon: '✓' },
      error: { bg: '#ef4444', icon: '✕' },
      warning: { bg: '#f59e0b', icon: '⚠' }
    };

    const { bg, icon } = colors[type] || colors.success;

    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bg};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s;
        min-width: 300px;
        max-width: 500px;
      ">
        <div style="
          background: rgba(255,255,255,0.2);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
        ">${icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">${title}</div>
          <div style="font-size: 13px; opacity: 0.95;">${message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
        ">×</button>
      </div>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

export default new NotificationManager();
