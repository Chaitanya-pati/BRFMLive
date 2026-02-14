import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Layout from "../components/Layout";
import FinishedGoodsMasterScreen from "./FinishedGoodsMasterScreen";
import RawProductMasterScreen from "./RawProductMasterScreen";
import { TouchableOpacity, Text } from "react-native";
import colors from "../theme/colors";

export default function ProductMasterScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("finished");

  return (
    <Layout navigation={navigation} title="Product Master" currentRoute="ProductMaster">
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "finished" && styles.activeTab]} 
            onPress={() => setActiveTab("finished")}
          >
            <Text style={[styles.tabText, activeTab === "finished" && styles.activeTabText]}>Finished Goods</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "raw" && styles.activeTab]} 
            onPress={() => setActiveTab("raw")}
          >
            <Text style={[styles.tabText, activeTab === "raw" && styles.activeTabText]}>Raw Products</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === "finished" ? (
            <FinishedGoodsMasterScreen navigation={navigation} isTab={true} />
          ) : (
            <RawProductMasterScreen navigation={navigation} isTab={true} />
          )}
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: '#666', fontWeight: '600' },
  activeTabText: { color: colors.primary },
  content: { flex: 1 }
});
