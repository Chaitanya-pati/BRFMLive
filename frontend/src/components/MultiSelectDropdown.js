import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import colors from '../theme/colors';

const STATUS_COLORS = {
  PENDING:            { bg: '#f1f5f9', text: '#475569' },
  DISPATCHED:         { bg: '#fef9c3', text: '#ca8a04' },
  DELIVERED:          { bg: '#dcfce7', text: '#16a34a' },
  PARTIALLY_DELIVERED:{ bg: '#fff7ed', text: '#ea580c' },
};

export default function MultiSelectDropdown({
  label,
  value = [],
  onValueChange,
  options = [],
  placeholder = 'Select items…',
  searchable = true,
  itemNoun = 'orders',
}) {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      o =>
        (o.label || '').toLowerCase().includes(q) ||
        (o.sublabel || '').toLowerCase().includes(q)
    );
  }, [options, query]);

  const selectedCount = value.length;

  const triggerLabel =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
      ? options.find(o => o.value === value[0])?.label || `${selectedCount} selected`
      : `${selectedCount} ${itemNoun} selected`;

  const toggle = (val) => {
    if (value.includes(val)) {
      onValueChange(value.filter(v => v !== val));
    } else {
      onValueChange([...value, val]);
    }
  };

  const toggleAll = () => {
    if (value.length === options.length) {
      onValueChange([]);
    } else {
      onValueChange(options.map(o => o.value));
    }
  };

  const panelWidth = isMobile ? width - 32 : Math.min(560, width - 64);
  const panelMaxHeight = Math.min(420, height * 0.6);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => { setOpen(true); setQuery(''); }}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.triggerText, selectedCount === 0 && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {triggerLabel}
        </Text>
        {selectedCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedCount}</Text>
          </View>
        )}
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={[styles.panel, { width: panelWidth, maxHeight: panelMaxHeight }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={e => e.stopPropagation()}
          >
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{label || placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search…"
                  placeholderTextColor="#9ca3af"
                  autoFocus={Platform.OS === 'web'}
                  clearButtonMode="while-editing"
                />
              </View>
            )}

            {options.length > 1 && !query && (
              <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll}>
                <View style={[styles.cb, value.length === options.length && styles.cbChecked]}>
                  {value.length === options.length && <Text style={styles.cbTick}>✓</Text>}
                  {value.length > 0 && value.length < options.length && (
                    <Text style={styles.cbTick}>–</Text>
                  )}
                </View>
                <Text style={styles.selectAllText}>
                  {value.length === options.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {filtered.length === 0 ? (
                <Text style={styles.emptyText}>No results found</Text>
              ) : (
                filtered.map(opt => {
                  const checked = value.includes(opt.value);
                  const statusStyle = STATUS_COLORS[opt.badge] || STATUS_COLORS.PENDING;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionRow, checked && styles.optionRowSelected]}
                      onPress={() => toggle(opt.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.cb, checked && styles.cbChecked]}>
                        {checked && <Text style={styles.cbTick}>✓</Text>}
                      </View>

                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionLabel, checked && styles.optionLabelSelected]}>
                          {opt.label}
                        </Text>
                        {opt.sublabel ? (
                          <Text style={styles.optionSublabel}>{opt.sublabel}</Text>
                        ) : null}
                      </View>

                      {opt.badge ? (
                        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                            {opt.badge}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.panelFooter}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.doneBtnText}>Done  ({selectedCount} selected)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 46,
  },
  triggerOpen: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  triggerPlaceholder: {
    color: '#9ca3af',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    color: '#6b7280',
    fontSize: 11,
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 8px 30px rgba(0,0,0,0.18)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 10,
      },
    }),
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#6b7280',
  },
  searchRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 10,
  },
  list: {
    flexGrow: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    paddingVertical: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionRowSelected: {
    backgroundColor: '#eff6ff',
  },
  cb: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  cbChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cbTick: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  optionInfo: {
    flex: 1,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionSublabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  panelFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-end',
    backgroundColor: '#fafafa',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
