import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import Layout from "../components/Layout";
import colors from "../theme/colors";
import { supplierApi, vehicleApi, labTestApi } from "../api/client";
import {
  FaBuilding,
  FaTruck,
  FaFlask,
  FaClock,
  FaStore,
  FaUsers,
  FaUserPlus,
  FaCar,
  FaChartBar,
  FaBox,
  FaCogs,
  FaRoute,
  FaFilePdf,
  FaTasks,
  FaWarehouse,
} from "react-icons/fa";
import { useBranch } from "../context/BranchContext";
import { storage } from "../utils/storage";

// Icon component using Font Awesome icons
const Icon = ({ name, size = 20, color }) => {
  const iconMap = {
    building: FaBuilding,
    truck: FaTruck,
    flask: FaFlask,
    clock: FaClock,
    storefront: FaStore,
    people: FaUsers,
    "person-add": FaUserPlus,
    car: FaCar,
    "chart-bar": FaChartBar,
    box: FaBox,
    cogs: FaCogs,
    route: FaRoute,
    "file-pdf": FaFilePdf,
    tasks: FaTasks,
    warehouse: FaWarehouse,
  };

  const IconComponent = iconMap[name] || FaBuilding;

  return (
    <View style={styles.iconContainer}>
      <IconComponent color={color || "#94a3b8"} size={size} />
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const { activeBranch, setActiveBranch } = useBranch();

  const [stats, setStats] = useState([
    {
      title: "Total Suppliers",
      value: "-",
      color: "#3b82f6",
      icon: "building",
    },
    {
      title: "Vehicle Entries",
      value: "-",
      color: "#6366f1",
      icon: "truck",
    },
    {
      title: "Lab Tests",
      value: "-",
      color: "#10b981",
      icon: "flask",
    },
    {
      title: "Pending Tests",
      value: "-",
      color: "#f59e0b",
      icon: "clock",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkBranch = async () => {
      if (!activeBranch) {
        const storedBranch = await storage.getActiveBranch();
        const userData = await storage.getUserData();

        if (storedBranch) {
          await setActiveBranch(storedBranch);
        } else if (userData?.branches?.length > 1) {
          navigation.replace("BranchSelection");
        } else if (userData?.branches?.length === 1) {
          await setActiveBranch(userData.branches[0]);
        } else {
          navigation.replace("Login");
        }
      }
    };

    checkBranch();
  }, [activeBranch]);

  useEffect(() => {
    const loadUserRole = async () => {
      const userData = await storage.getUserData();
      setUserRole(userData?.role);
    };
    loadUserRole();
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [suppliersRes, vehiclesRes, labTestsRes, availableVehiclesRes] =
        await Promise.all([
          supplierApi.getAll(),
          vehicleApi.getAll(),
          labTestApi.getAll(),
          vehicleApi.getAvailableForTesting(),
        ]);

      setStats([
        {
          title: "Total Suppliers",
          value: suppliersRes.data.length.toString(),
          color: "#3b82f6",
          icon: "building",
        },
        {
          title: "Vehicle Entries",
          value: vehiclesRes.data.length.toString(),
          color: "#6366f1",
          icon: "truck",
        },
        {
          title: "Lab Tests",
          value: labTestsRes.data.length.toString(),
          color: "#10b981",
          icon: "flask",
        },
        {
          title: "Pending Tests",
          value: availableVehiclesRes.data.length.toString(),
          color: "#f59e0b",
          icon: "clock",
        },
      ]);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const allQuickActions = [
    {
      title: "Dispatch Management",
      route: "DispatchManagement",
      icon: "truck",
      color: "#f59e0b",
      adminOnly: false,
    },
    {
      title: "Branch Master",
      route: "BranchMaster",
      icon: "storefront",
      color: "#3b82f6",
      adminOnly: true,
    },
    {
      title: "User Management",
      route: "UserManagement",
      icon: "people",
      color: "#6366f1",
      adminOnly: true,
    },
    {
      title: "Add Supplier",
      route: "SupplierMaster",
      icon: "person-add",
      color: "#06b6d4",
      adminOnly: false,
    },
    {
      title: "Vehicle Entry",
      route: "VehicleEntry",
      icon: "car",
      color: "#f43f5e",
      adminOnly: false,
    },
    {
      title: "New Lab Test",
      route: "LabTest",
      icon: "flask",
      color: "#10b981",
      adminOnly: false,
    },
    {
      title: "Daily Report",
      route: "DailyReport",
      icon: "chart-bar",
      color: "#8b5cf6",
      adminOnly: false,
    },
    {
      title: "Unloading Entry",
      route: "UnloadingEntry",
      icon: "warehouse",
      color: "#ec4899",
      adminOnly: false,
    },
    {
      title: "Precleaning Bin",
      route: "PrecleaningBin",
      icon: "box",
      color: "#14b8a6",
      adminOnly: false,
    },
    {
      title: "Route Config",
      route: "RouteConfiguration",
      icon: "route",
      color: "#f97316",
      adminOnly: false,
    },
    {
      title: "Reports",
      route: "Reports",
      icon: "file-pdf",
      color: "#06b6d4",
      adminOnly: false,
    },
    {
      title: "Raw Products",
      route: "RawProductMaster",
      icon: "tasks",
      color: "#84cc16",
      adminOnly: false,
    },
    {
      title: "Finished Goods",
      route: "FinishedGoodsMaster",
      icon: "box",
      color: "#a855f7",
      adminOnly: false,
    },
    {
      title: "FG Inventory",
      route: "FinishedGoodsManagement",
      icon: "warehouse",
      color: "#4CAF50",
      adminOnly: false,
    },
    {
      title: "FG Stock View",
      route: "GodownStockView",
      icon: "warehouse",
      color: "#673AB7",
      adminOnly: false,
    },
    {
      title: "Order Traceability",
      route: "ProductionOrderTraceability",
      icon: "route",
      color: "#e91e63",
      adminOnly: false,
    },
    {
      title: "Production Orders",
      route: "ProductionOrder",
      icon: "cogs",
      color: "#ef4444",
      adminOnly: false,
    },
    {
      title: "Order Planning",
      route: "ProductionOrderPlanning",
      icon: "cogs",
      color: "#f59e0b",
      adminOnly: false,
    },
    {
      title: "Precleaning Timeline",
      route: "PrecleaningTimeline",
      icon: "clock",
      color: "#6366f1",
      adminOnly: false,
    },
    {
      title: "Transfer Recording",
      route: "TransferRecording",
      icon: "warehouse",
      color: "#d946ef",
      adminOnly: false,
    },
    {
      title: "12 Hour Transfer",
      route: "Transfer12Hour",
      icon: "clock",
      color: "#06b6d4",
      adminOnly: false,
    },
    {
      title: "Grinding",
      route: "Grinding",
      icon: "cogs",
      color: "#795548",
      adminOnly: false,
    },
    {
      title: "Administrator Settings",
      route: "AdminDashboard",
      icon: "cogs",
      color: "#4CAF50",
      adminOnly: true,
    },
  ];

  const quickActions = [];

  return (
    <Layout title="Dashboard" navigation={navigation} currentRoute="Home">
      <View style={styles.container}>
        <View
          style={[
            styles.statsContainer,
            isMobile && styles.statsContainerMobile,
            isTablet && styles.statsContainerTablet,
          ]}
        >
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[
                styles.statCard,
                isMobile && styles.statCardMobile,
              ]}
            >
              <View style={[styles.statIconWrapper, { backgroundColor: stat.color + '15' }]}>
                <Icon
                  name={stat.icon}
                  size={20}
                  color={stat.color}
                />
              </View>
              <View style={styles.statInfo}>
                <Text
                  style={[styles.statTitle, isMobile && styles.statTitleMobile]}
                >
                  {stat.title}
                </Text>
                {loading ? (
                  <ActivityIndicator size="small" color={stat.color} />
                ) : (
                  <Text
                    style={[
                      styles.statValue,
                      isMobile && styles.statValueMobile,
                      { color: stat.color }
                    ]}
                  >
                    {stat.value}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <Text
          style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}
        >
          Recent Activity
        </Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>No recent activity</Text>
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 6,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statsContainerMobile: {
    gap: 12,
    marginBottom: 16,
  },
  statsContainerTablet: {
    gap: 14,
  },
  statCard: {
    flex: 1,
    minWidth: 240,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValueMobile: {
    fontSize: 26,
  },
  activityCard: {
    backgroundColor: "#ffffff",
    padding: 30,
    borderRadius: 24,
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    // Standard shadow props for cross-platform compatibility
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  activityText: {
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: "500",
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 24,
    marginTop: 16,
    letterSpacing: -0.75,
  },
  sectionTitleMobile: {
    fontSize: 20,
    marginBottom: 16,
  },
});
