import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const SIZES = {
  xs: { width: 52, height: 72, borderRadius: 6, numSize: 11, labelSize: 9, subSize: 8 },
  sm: { width: 64, height: 88, borderRadius: 7, numSize: 12, labelSize: 10, subSize: 9 },
  md: { width: 80, height: 110, borderRadius: 8, numSize: 13, labelSize: 11, subSize: 10 },
  lg: { width: 100, height: 140, borderRadius: 10, numSize: 15, labelSize: 12, subSize: 11 },
};

function getFillColor(pct) {
  if (pct >= 90) return '#ef4444';
  if (pct >= 75) return '#f97316';
  if (pct >= 40) return '#f59e0b';
  return '#3b82f6';
}

export default function BinVisual({
  binNumber,
  capacity,
  currentQuantity,
  size = 'md',
  label,
  isSelected = false,
  onPress,
  disabled = false,
  style,
  showQty = true,
}) {
  const dim = SIZES[size] || SIZES.md;
  const qty = typeof currentQuantity === 'number' ? currentQuantity : 0;
  const cap = typeof capacity === 'number' && capacity > 0 ? capacity : 1;
  const pct = Math.min(100, Math.max(0, (qty / cap) * 100));
  const fillColor = getFillColor(pct);

  const innerHeight = dim.height - 16;
  const fillHeight = Math.round((pct / 100) * innerHeight);

  const container = (
    <View
      style={[
        styles.wrapper,
        { width: dim.width },
        isSelected && styles.selectedWrapper,
        disabled && styles.disabledWrapper,
        style,
      ]}
    >
      {isSelected && <View style={styles.selectedCheckmark}><Text style={styles.checkmarkText}>✓</Text></View>}
      <View
        style={[
          styles.binBody,
          {
            width: dim.width - 8,
            height: dim.height,
            borderRadius: dim.borderRadius,
            borderColor: isSelected ? '#2563eb' : '#cbd5e1',
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        <View style={[styles.binLid, { borderRadius: dim.borderRadius - 2 }]} />
        <View style={styles.binInner}>
          <View style={styles.emptySpace} />
          <View
            style={[
              styles.fill,
              {
                height: fillHeight,
                backgroundColor: fillColor,
                opacity: disabled ? 0.4 : 1,
              },
            ]}
          />
        </View>
        <View style={styles.pctOverlay}>
          <Text style={[styles.pctText, { fontSize: dim.numSize }]}>
            {Math.round(pct)}%
          </Text>
        </View>
      </View>
      <Text style={[styles.binNumber, { fontSize: dim.labelSize }]} numberOfLines={1}>
        {binNumber || '—'}
      </Text>
      {showQty && (
        <Text style={[styles.qtyText, { fontSize: dim.subSize }]} numberOfLines={1}>
          {qty} / {cap} T
        </Text>
      )}
      {label ? (
        <Text style={[styles.labelText, { fontSize: dim.subSize }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.75}>
        {container}
      </TouchableOpacity>
    );
  }
  return container;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: 4,
    paddingTop: 6,
    position: 'relative',
  },
  selectedWrapper: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  disabledWrapper: {
    opacity: 0.5,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  binBody: {
    borderStyle: 'solid',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    position: 'relative',
  },
  binLid: {
    height: 6,
    backgroundColor: '#94a3b8',
    width: '100%',
  },
  binInner: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  emptySpace: {
    flex: 1,
  },
  fill: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  pctOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  pctText: {
    fontWeight: '700',
    color: '#1e293b',
    textShadow: '0px 0px 3px rgba(255,255,255,0.8)',
  },
  binNumber: {
    marginTop: 5,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  qtyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 1,
  },
  labelText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 1,
    fontStyle: 'italic',
  },
});
