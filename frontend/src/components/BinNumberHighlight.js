import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "../theme/colors";

export default function BinNumberHighlight({
  value,
  prefix = "",
  compact = false,
  inline = false,
  style,
  textStyle,
}) {
  const displayValue =
    value === null || value === undefined || value === "" ? "—" : String(value);
  const content = `${prefix}${displayValue}`;

  if (inline) {
    return (
      <Text
        accessibilityLabel={`Bin ${displayValue}`}
        style={[styles.inline, compact && styles.inlineCompact, style, textStyle]}
        numberOfLines={1}
      >
        {content}
      </Text>
    );
  }

  return (
    <View
      accessibilityLabel={`Bin ${displayValue}`}
      style={[styles.badge, compact && styles.badgeCompact, style]}
    >
      <Text style={[styles.badgeText, compact && styles.badgeTextCompact, textStyle]} numberOfLines={1}>
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    borderColor: colors.primaryLight,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  badgeCompact: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.25,
  },
  badgeTextCompact: {
    fontSize: 11,
  },
  inline: {
    backgroundColor: "#dbeafe",
    borderRadius: 4,
    color: colors.primaryDark,
    fontWeight: "800",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  inlineCompact: {
    fontSize: 12,
  },
});