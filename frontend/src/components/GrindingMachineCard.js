import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';

// ─── Gear Icon ──────────────────────────────────────────────────────────────
function GearIcon({ color, size = 20 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        backgroundColor: 'transparent',
        position: 'absolute',
      }} />
      <View style={{
        width: size * 0.35,
        height: size * 0.35,
        borderRadius: size * 0.175,
        backgroundColor: color,
      }} />
    </View>
  );
}

// ─── Industrial Mill Visual ──────────────────────────────────────────────────
// Drawn entirely with React Native Views (no SVG, no emoji, no images)
// Layout (top → bottom):
//   Feed spout cap → Hopper (trapezoid) → Intake flange
//   → Grinding chamber → Separator band → Motor base → Discharge spout
function MillVisual({ isActive = false }) {
  const blue = '#1e40af';
  const green = '#16a34a';
  const accent = isActive ? green : blue;
  const dark = isActive ? '#14532d' : '#1e3a8a';
  const fill = isActive ? '#dcfce7' : '#dbeafe';

  const W = 64;   // body width
  const HW = W;   // hopper width (same as body for trapezoid top)

  return (
    <View style={{ width: W + 8, alignItems: 'center', gap: 0 }}>

      {/* Feed cap — small rectangle sitting on top of hopper */}
      <View style={{
        width: 20,
        height: 5,
        backgroundColor: '#94a3b8',
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
        marginBottom: 0,
      }} />

      {/* Hopper — trapezoid using clipPath (React Native Web → CSS) */}
      <View style={{
        width: HW,
        height: 20,
        backgroundColor: accent,
        // wide at top, narrower at bottom (30% inset each side at bottom)
        clipPath: 'polygon(0% 0%, 100% 0%, 70% 100%, 30% 100%)',
      }} />

      {/* Hopper neck */}
      <View style={{
        width: W * 0.4,
        height: 5,
        backgroundColor: accent,
      }} />

      {/* Intake flange */}
      <View style={{
        width: W,
        height: 5,
        backgroundColor: dark,
        borderRadius: 1,
      }} />

      {/* Grinding chamber body */}
      <View style={{
        width: W,
        height: 50,
        borderWidth: 2.5,
        borderTopWidth: 0,
        borderColor: dark,
        backgroundColor: fill,
        overflow: 'hidden',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* left highlight sheen */}
        <View style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: '14%', backgroundColor: 'rgba(255,255,255,0.4)',
        }} />
        {/* right shadow */}
        <View style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: '10%', backgroundColor: 'rgba(0,0,0,0.07)',
        }} />
        {/* Gear pair */}
        <View style={{ flexDirection: 'row', gap: 4, zIndex: 2 }}>
          <GearIcon color={accent} size={22} />
          <GearIcon color={accent} size={15} />
        </View>
        {/* Speed/motion lines */}
        <View style={{
          position: 'absolute', bottom: 8, left: 6, right: 6,
          height: 1.5, backgroundColor: accent, opacity: 0.3, borderRadius: 1,
        }} />
        <View style={{
          position: 'absolute', bottom: 13, left: 10, right: 10,
          height: 1, backgroundColor: accent, opacity: 0.2, borderRadius: 1,
        }} />
        {/* Active indicator */}
        {isActive && (
          <View style={{
            position: 'absolute', top: 4, right: 4,
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: '#22c55e', borderWidth: 1, borderColor: '#fff',
          }} />
        )}
      </View>

      {/* Separator band */}
      <View style={{ width: W, height: 5, backgroundColor: dark }} />

      {/* Motor housing */}
      <View style={{
        width: W - 8,
        height: 22,
        borderWidth: 1.5,
        borderTopWidth: 0,
        borderColor: dark,
        backgroundColor: '#f1f5f9',
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
      }}>
        {/* Cooling fins */}
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{
            width: 2.5, height: '75%',
            backgroundColor: accent, opacity: 0.3,
            borderRadius: 1, marginHorizontal: 2,
          }} />
        ))}
        {/* MOTOR label */}
        <Text style={{
          position: 'absolute',
          fontSize: 7, fontWeight: '800',
          letterSpacing: 0.8, color: dark,
          textAlign: 'center',
        }}>MOTOR</Text>
      </View>

      {/* Discharge spout */}
      <View style={{ alignItems: 'center' }}>
        {/* Vertical pipe */}
        <View style={{ width: 12, height: 8, backgroundColor: accent }} />
        {/* Flare — two angled sides forming a "V" outward */}
        <View style={{ flexDirection: 'row', marginTop: 0 }}>
          {/* Left angle */}
          <View style={{
            width: 0, height: 0,
            borderStyle: 'solid',
            borderTopWidth: 7,
            borderTopColor: accent,
            borderLeftWidth: 7,
            borderLeftColor: 'transparent',
            borderRightWidth: 0,
          }} />
          {/* Right angle */}
          <View style={{
            width: 0, height: 0,
            borderStyle: 'solid',
            borderTopWidth: 7,
            borderTopColor: accent,
            borderRightWidth: 7,
            borderRightColor: 'transparent',
            borderLeftWidth: 0,
          }} />
        </View>
      </View>
    </View>
  );
}

// ─── Quantity Bar ────────────────────────────────────────────────────────────
function QuantityBar({ current, capacity, color }) {
  const pct = capacity > 0 ? Math.min(100, Math.max(0, (current / capacity) * 100)) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
      <View style={{
        flex: 1, height: 6, backgroundColor: '#e2e8f0',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <View style={{
          width: `${pct}%`, height: '100%',
          backgroundColor: color, borderRadius: 3,
        }} />
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color, minWidth: 30, textAlign: 'right' }}>
        {Math.round(pct)}%
      </Text>
    </View>
  );
}

// ─── GrindingMachineCard ─────────────────────────────────────────────────────
export default function GrindingMachineCard({ bin, onPress, isActive = false }) {
  const qty = typeof bin.current_quantity === 'number' ? bin.current_quantity : 0;
  const cap = typeof bin.capacity === 'number' && bin.capacity > 0 ? bin.capacity : Math.max(qty, 1);
  const accent = isActive ? '#16a34a' : '#1e40af';
  const accentBg = isActive ? '#dcfce7' : '#dbeafe';
  const statusLabel = isActive ? 'IN USE' : 'READY';

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* ── Left: Mill illustration ── */}
      <View style={styles.millArea}>
        <MillVisual isActive={isActive} />
      </View>

      {/* ── Centre: Info ── */}
      <View style={styles.info}>
        {/* Status badge */}
        <View style={[styles.badge, { backgroundColor: accentBg }]}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.badgeText, { color: accent }]}>{statusLabel}</Text>
        </View>

        <Text style={styles.binName}>Bin {bin.bin_number}</Text>

        {bin.order_number
          ? <Text style={styles.order}>Order: {bin.order_number}</Text>
          : <Text style={styles.orderMuted}>No order linked</Text>
        }

        {bin.raw_product_name
          ? <Text style={styles.product}>{bin.raw_product_name}</Text>
          : null
        }

        {/* Quantity bar */}
        <Text style={[styles.qty, { color: accent }]}>
          {qty} / {cap} T
        </Text>
        <QuantityBar current={qty} capacity={cap} color={accent} />
      </View>

      {/* ── Right: Action ── */}
      <View style={styles.action}>
        <View style={[styles.startBtn, { backgroundColor: accent }]}>
          <Text style={styles.startArrow}>▶</Text>
          <Text style={styles.startLabel}>Start</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.07)',
    gap: 14,
  },
  cardActive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },

  millArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  info: {
    flex: 1,
    gap: 2,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 5,
    marginBottom: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  binName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  order: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 1,
  },
  orderMuted: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  product: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  qty: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },

  action: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 3,
  },
  startArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  startLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
