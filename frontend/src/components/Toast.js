
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  }, []);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#10b981', icon: '✓' };
      case 'error':
        return { backgroundColor: '#ef4444', icon: '✕' };
      case 'warning':
        return { backgroundColor: '#f59e0b', icon: '⚠' };
      case 'info':
      default:
        return { backgroundColor: '#3b82f6', icon: 'ℹ' };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: typeStyles.backgroundColor, opacity: fadeAnim },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{typeStyles.icon}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 300,
    maxWidth: 500,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 10000,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '300',
  },
});

export default Toast;
