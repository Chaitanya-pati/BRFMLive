import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from "react-native";
import Layout from "../components/Layout";
import colors from "../theme/colors";
import GranulationTemplateView from "../components/admin/GranulationTemplateView";
import { getApiClient } from "../api/client";
import Card from "../components/Card";

export default function AdminDashboardScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.get("/granulation-templates");
      setTemplates(res.data || []);
    } catch (error) {
      console.error("Failed to fetch templates", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTemplateItem = ({ item }) => (
    <Card style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <Text style={styles.fgName}>{item.finished_good?.product_name || `FG ID: ${item.finished_good_id}`}</Text>
        <Text style={[styles.status, { color: item.is_active ? "#10b981" : "#ef4444" }]}>
          {item.is_active ? "Active" : "Inactive"}
        </Text>
      </View>
      <View style={styles.columnsContainer}>
        {item.columns_definition?.columns?.map((col, idx) => (
          <View key={idx} style={styles.columnBadge}>
            <Text style={styles.columnText}>{col}</Text>
          </View>
        ))}
      </View>
    </Card>
  );

  const GranulationModule = () => (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionHeader}>Define New Template</Text>
        <GranulationTemplateView onSuccess={fetchTemplates} />
        
        <Text style={[styles.sectionHeader, { marginTop: 30 }]}>Saved Templates</Text>
        {loading && !templates.length ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          templates.map(item => (
            <View key={item.id}>
              {renderTemplateItem({ item })}
            </View>
          ))
        )}
        {!loading && templates.length === 0 && (
          <Text style={styles.emptyText}>No templates found</Text>
        )}
      </View>
    </ScrollView>
  );

  return (
    <Layout navigation={navigation} title="Administrator Settings">
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "templates" && styles.activeTab]} 
            onPress={() => setActiveTab("templates")}
          >
            <Text style={[styles.tabText, activeTab === "templates" && styles.activeTabText]}>Granulation Setup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === "templates" && <GranulationModule />}
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: '#666', fontWeight: '600' },
  activeTabText: { color: colors.primary },
  content: { flex: 1 },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, paddingHorizontal: 4 },
  templateCard: { marginBottom: 12, padding: 16 },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fgName: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  status: { fontWeight: 'bold' },
  columnsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  columnBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  columnText: { color: '#1976D2', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999', fontSize: 16 }
});
