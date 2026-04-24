import React from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import TabbedMasterShell from "./TabbedMasterShell";
import RawProductMasterScreen from "../RawProductMasterScreen";
import FinishedGoodsMasterScreen from "../FinishedGoodsMasterScreen";
import FinishedGoodsManagementScreen from "../FinishedGoodsManagementScreen";
import GranulationTemplateScreen from "../GranulationTemplateScreen";
import MasterViewScreen from "../MasterViewScreen";
import { bagSizeApi } from "../../api/client";
import colors from "../../theme/colors";

const fakeRoute = (params = {}) => ({ params });

function BagSizesView() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    bagSizeApi
      .getAll()
      .then((res) => {
        if (!cancelled) setItems(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);
  if (loading) {
    return (
      <View style={bsStyles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={bsStyles.title}>Bag Sizes</Text>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        ListEmptyComponent={<Text style={bsStyles.empty}>No bag sizes configured.</Text>}
        renderItem={({ item }) => (
          <View style={bsStyles.row}>
            <Text style={bsStyles.cellName}>{item.name || item.size_name || `#${item.id}`}</Text>
            <Text style={bsStyles.cellWeight}>{item.weight_kg != null ? `${item.weight_kg} kg` : "—"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const bsStyles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text || "#1f2937", marginBottom: 12 },
  empty: { color: "#6b7280", fontStyle: "italic", padding: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cellName: { fontSize: 14, color: "#1f2937", fontWeight: "600" },
  cellWeight: { fontSize: 14, color: "#374151" },
});

export default function ProductionMastersScreen({ navigation }) {
  const tabs = [
    {
      key: "raw_products",
      label: "Raw Products",
      render: (nav) => <RawProductMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "finished_goods",
      label: "Finished Goods",
      render: (nav) => <FinishedGoodsMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "fg_godown",
      label: "Finished Goods Godown",
      render: (nav) => <FinishedGoodsManagementScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "bag_sizes",
      label: "Bag Sizes",
      render: () => <BagSizesView />,
    },
    {
      key: "granulation",
      label: "Granulation Template",
      render: (nav) => <GranulationTemplateScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "silo",
      label: "Silo Master",
      render: (nav) => (
        <MasterViewScreen navigation={nav} route={fakeRoute({ initialTab: "silo", lockTab: true })} />
      ),
    },
  ];

  return <TabbedMasterShell navigation={navigation} title="Production Masters" tabs={tabs} />;
}
