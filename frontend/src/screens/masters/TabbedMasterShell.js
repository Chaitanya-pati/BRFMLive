import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Layout from "../../components/Layout";
import ResponsiveTabs from "../../components/ResponsiveTabs";
import { EmbeddedContext } from "../../contexts/EmbeddedContext";

export default function TabbedMasterShell({ navigation, title, tabs, initialKey }) {
  const [activeKey, setActiveKey] = useState(initialKey || tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) || tabs[0];

  return (
    <Layout title={title} navigation={navigation}>
      <View style={styles.container}>
        <ResponsiveTabs
          tabs={tabs.map(({ key, label }) => ({ key, label }))}
          activeKey={activeKey}
          onChange={setActiveKey}
        />
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
  tabContent: { flex: 1, backgroundColor: "#fff" },
});
