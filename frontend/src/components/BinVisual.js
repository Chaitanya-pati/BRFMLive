import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BinNumberHighlight from './BinNumberHighlight';

// Size presets: width is the body width; total height is lid + body + hopper
const SIZES = {
  xs: { bodyW: 44, bodyH: 56, lidH: 8,  hopperH: 14, numSize: 10, labelSize: 9,  subSize: 8,  bandGap: 0.34 },
  sm: { bodyW: 54, bodyH: 68, lidH: 9,  hopperH: 17, numSize: 11, labelSize: 10, subSize: 9,  bandGap: 0.34 },
  md: { bodyW: 68, bodyH: 86, lidH: 11, hopperH: 22, numSize: 13, labelSize: 11, subSize: 10, bandGap: 0.34 },
  lg: { bodyW: 84, bodyH: 108, lidH: 14, hopperH: 28, numSize: 15, labelSize: 12, subSize: 11, bandGap: 0.34 },
};

function getFillColor(pct) {
  if (pct >= 90) return '#ef4444';
  if (pct >= 75) return '#f97316';
  if (pct >= 40) return '#eab308';
  return '#3b82f6';
}

function getFillColorDark(pct) {
  if (pct >= 90) return '#b91c1c';
  if (pct >= 75) return '#c2410c';
  if (pct >= 40) return '#a16207';
  return '#1d4ed8';
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
  const fillColorDark = getFillColorDark(pct);
  const fillOpacity = disabled ? 0.4 : 1;

  const fillHeight = Math.round((pct / 100) * dim.bodyH);

  // Hopper triangle: half-width of body for the left/right border widths
  const halfW = Math.floor(dim.bodyW / 2);
  // Lid is a bit wider than the body
  const lidW = dim.bodyW + 8;

  const container = (
    <View
      style={[
        styles.wrapper,
        isSelected && styles.selectedWrapper,
        disabled && styles.disabledWrapper,
        style,
      ]}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <View style={styles.selectedCheckmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}

      {/* ── LID ── */}
      <View style={[styles.lidOuter, { width: lidW, height: dim.lidH }]}>
        {/* Lid top ridge */}
        <View style={[styles.lidTopRidge, { width: lidW - 8 }]} />
        {/* Lid main plate */}
        <View style={[styles.lidPlate, { width: lidW, height: dim.lidH - 3 }]} />
        {/* Lid bottom flange line */}
        <View style={[styles.lidFlange, { width: lidW + 2 }]} />
      </View>

      {/* ── BODY ── */}
      <View
        style={[
          styles.body,
          {
            width: dim.bodyW,
            height: dim.bodyH,
            borderWidth: isSelected ? 2 : 1.5,
            borderLeftColor: isSelected ? '#2563eb' : '#78909c',
            borderRightColor: isSelected ? '#2563eb' : '#607d8b',
            borderTopColor: isSelected ? '#2563eb' : '#90a4ae',
            borderBottomColor: isSelected ? '#2563eb' : '#546e7a',
          },
        ]}
      >
        {/* Fill from bottom */}
        <View style={styles.emptySpace} />
        <View
          style={[
            styles.fill,
            {
              height: fillHeight,
              opacity: fillOpacity,
              backgroundColor: fillColor,
            },
          ]}
        >
          {/* Fill top highlight stripe */}
          {fillHeight > 4 && (
            <View
              style={[
                styles.fillTopHighlight,
                { backgroundColor: fillColorDark },
              ]}
            />
          )}
        </View>

        {/* Reinforcement bands (horizontal rings) */}
        <View style={[styles.band, { top: Math.round(dim.bodyH * 0.30) }]} />
        <View style={[styles.band, { top: Math.round(dim.bodyH * 0.60) }]} />

        {/* 3-D sheen on left edge */}
        <View style={styles.sheen} />

        {/* Shadow on right edge */}
        <View style={styles.rightShadow} />

        {/* % overlay */}
        <View style={styles.pctOverlay}>
          <Text
            style={[
              styles.pctText,
              { fontSize: dim.numSize },
              pct > 0 && fillHeight > 20 ? { color: '#fff' } : { color: '#334155' },
            ]}
          >
            {Math.round(pct)}%
          </Text>
        </View>
      </View>

      {/* ── HOPPER (tapered funnel bottom) ── */}
      <View
        style={[
          styles.hopperTriangle,
          {
            borderLeftWidth: halfW,
            borderRightWidth: halfW,
            borderTopWidth: dim.hopperH,
            borderTopColor: isSelected ? '#64adf5' : '#90a4ae',
          },
        ]}
      />
      {/* Drain spout */}
      <View style={styles.drainSpout} />

      {/* Labels */}
      <BinNumberHighlight
        value={binNumber}
        compact
        style={{ marginTop: 6 }}
        textStyle={{ fontSize: dim.labelSize }}
      />
      {showQty && (
        <Text
          style={[styles.qtyText, { fontSize: dim.subSize }]}
          numberOfLines={1}
        >
          {qty} / {cap} T
        </Text>
      )}
      {label ? (
        <Text
          style={[styles.labelText, { fontSize: dim.subSize }]}
          numberOfLines={1}
        >
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
    paddingTop: 4,
    position: 'relative',
  },
  selectedWrapper: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  disabledWrapper: {
    opacity: 0.5,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 0,
    right: 0,
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

  // ── LID ──
  lidOuter: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  lidTopRidge: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: '#546e7a',
    borderRadius: 2,
  },
  lidPlate: {
    position: 'absolute',
    bottom: 3,
    backgroundColor: '#78909c',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  lidFlange: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#455a64',
    borderRadius: 1,
  },

  // ── BODY ──
  body: {
    backgroundColor: '#eceff1',
    overflow: 'hidden',
    position: 'relative',
    borderStyle: 'solid',
  },
  emptySpace: {
    flex: 1,
  },
  fill: {
    width: '100%',
    overflow: 'hidden',
  },
  fillTopHighlight: {
    width: '100%',
    height: 3,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#90a4ae',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#607d8b',
    borderBottomColor: '#607d8b',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '16%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  rightShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '10%',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  pctOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontWeight: '800',
    letterSpacing: 0.3,
    textShadow: '0px 1px 2px rgba(0,0,0,0.25)',
  },

  // ── HOPPER ──
  hopperTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  drainSpout: {
    width: 6,
    height: 5,
    backgroundColor: '#607d8b',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },

  // ── LABELS ──
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
