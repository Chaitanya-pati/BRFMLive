import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from "react-native";

export default function ResponsiveTabs({ tabs, activeKey, onChange, style }) {
  const scrollRef = useRef(null);
  const { width: winWidth } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const overflowing = contentWidth > containerWidth + 1;
  const canScrollLeft = overflowing && scrollX > 2;
  const canScrollRight = overflowing && scrollX + containerWidth < contentWidth - 2;

  const scrollBy = useCallback(
    (delta) => {
      if (!scrollRef.current) return;
      const next = Math.max(
        0,
        Math.min(scrollX + delta, Math.max(0, contentWidth - containerWidth)),
      );
      scrollRef.current.scrollTo({ x: next, animated: true });
    },
    [scrollX, contentWidth, containerWidth],
  );

  const step = Math.max(120, Math.floor(containerWidth * 0.6));

  return (
    <View
      style={[styles.wrapper, style]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      key={`tabs-${winWidth}`}
    >
      {canScrollLeft && (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowLeft]}
          onPress={() => scrollBy(-step)}
          accessibilityLabel="Scroll tabs left"
        >
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        onContentSizeChange={(w) => setContentWidth(w)}
        contentContainerStyle={styles.tabsRow}
        style={styles.scroll}
      >
        {tabs.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onChange && onChange(t.key)}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {canScrollRight && (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowRight]}
          onPress={() => scrollBy(step)}
          accessibilityLabel="Scroll tabs right"
        >
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  scroll: { flex: 1 },
  tabsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 4,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    justifyContent: "center",
  },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: "#1f2937", fontWeight: "700" },
  arrow: {
    width: 32,
    height: "100%",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    zIndex: 2,
  },
  arrowLeft: {
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  arrowRight: {
    borderLeftWidth: 1,
    borderLeftColor: "#e5e7eb",
  },
  arrowText: {
    fontSize: 22,
    color: "#374151",
    fontWeight: "700",
    lineHeight: 22,
  },
});
