import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import Layout from "../../components/Layout";
import { EmbeddedContext } from "../../contexts/EmbeddedContext";

export default function TabbedMasterShell({ navigation, title, tabs, initialKey }) {
  const [activeKey, setActiveKey] = useState(initialKey || tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) || tabs[0];
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  return (
    <Layout title={title} navigation={navigation}>
      <View style={styles.container}>
        <View
          style={[
            styles.tabBar,
            { flexDirection: "row", flexWrap: "wrap" },
          ]}
        >
          {tabs.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  isNarrow && styles.tabNarrow,
                  isActive && styles.tabActive,
                ]}
                onPress={() => setActiveKey(t.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isNarrow && styles.tabTextNarrow,
                    isActive && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
  container: { flex: 1, backgroundColor: "#f5f6fa" },
  tabBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 4,
    marginBottom: 0,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabNarrow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  tabTextNarrow: { fontSize: 13 },
  tabTextActive: { color: "#1f2937", fontWeight: "700" },
  tabContent: { flex: 1, backgroundColor: "#fff" },
});
