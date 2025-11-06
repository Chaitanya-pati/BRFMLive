import { Alert, Platform } from 'react-native';

export const showNotification = (message, type = 'info') => {
  if (Platform.OS === 'web') {
    // For web, we'll use browser alerts or could use a toast library
    if (type === 'error') {
      alert(`Error: ${message}`);
    } else if (type === 'success') {
      alert(`Success: ${message}`);
    } else {
      alert(message);
    }
  } else {
    // For mobile, use React Native Alert
    Alert.alert(
      type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info',
      message,
      [{ text: 'OK' }]
    );
  }
};

export default { showNotification };