import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Layout from "../../components/Layout";
import { EmbeddedContext } from "../../contexts/EmbeddedContext";
import colors from "../../theme/colors";

export default function TabbedMasterShell({ navigation, title, tabs, initialKey }) {
  const [activeKey, setActiveKey] = useState(initialKey || tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) || tabs[0];

  return (
    <Layout title={title} navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveKey(t.key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.tabContent}>
          <EmbeddedContext.Provider value={true}>
            {active && active.render(navigation)}
          </EmbeddedContext.Provider>
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f5f6fa" },
  headerRow: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text || "#1f2937" },
  tabBar: {
    flexGrow: 0,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabBarContent: { paddingRight: 12 },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 6,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: "#1f2937", fontWeight: "700" },
  tabContent: { flex: 1, backgroundColor: "#fff", borderRadius: 8, overflow: "hidden" },
});
