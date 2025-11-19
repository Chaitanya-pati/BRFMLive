import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal as RNModal, ScrollView, useWindowDimensions, Platform } from 'react-native';
import colors from '../theme/colors';

export default function Modal({ visible, onClose, title, children, width = '80%' }) {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (visible && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [visible]);

  const getModalWidth = () => {
    if (isMobile) return '95%';
    if (isTablet) return '85%';
    return width;
  };

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer,
          { width: getModalWidth() },
          isMobile && styles.modalContainerMobile,
        ]}>
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <Text style={[styles.title, isMobile && styles.titleMobile]} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={[styles.content, isMobile && styles.contentMobile]}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.select({ web: 20, default: 0 }),
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    maxHeight: '90%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  modalContainerMobile: {
    borderRadius: 0,
    maxHeight: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerMobile: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  titleMobile: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentMobile: {
    padding: 10,
  },
});