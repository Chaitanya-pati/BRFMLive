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
const Icon = ({ name, size = 36, color }) => {
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
    <View style={{ marginRight: 16 }}>
      <IconComponent color={color || colors.primary} size={size} />
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
      gradient: ["#3b82f6", "#2563eb"],
    },
    {
      title: "Vehicle Entries",
      value: "-",
      color: "#8b5cf6",
      icon: "truck",
      gradient: ["#8b5cf6", "#7c3aed"],
    },
    {
      title: "Lab Tests",
      value: "-",
      color: "#10b981",
      icon: "flask",
      gradient: ["#10b981", "#059669"],
    },
    {
      title: "Pending Tests",
      value: "-",
      color: "#f59e0b",
      icon: "clock",
      gradient: ["#f59e0b", "#d97706"],
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
          gradient: ["#3b82f6", "#2563eb"],
        },
        {
          title: "Vehicle Entries",
          value: vehiclesRes.data.length.toString(),
          color: "#8b5cf6",
          icon: "truck",
          gradient: ["#8b5cf6", "#7c3aed"],
        },
        {
          title: "Lab Tests",
          value: labTestsRes.data.length.toString(),
          color: "#10b981",
          icon: "flask",
          gradient: ["#10b981", "#059669"],
        },
        {
          title: "Pending Tests",
          value: availableVehiclesRes.data.length.toString(),
          color: "#f59e0b",
          icon: "clock",
          gradient: ["#f59e0b", "#d97706"],
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
  ];

  const quickActions = allQuickActions.filter(
    (action) => !action.adminOnly || userRole === "admin",
  );

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
                { borderLeftColor: stat.color },
                isMobile && styles.statCardMobile,
              ]}
            >
              <Icon
                name={stat.icon}
                size={isMobile ? 28 : 36}
                color={stat.color}
              />
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
                      { color: stat.color },
                      isMobile && styles.statValueMobile,
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
          Quick Actions
        </Text>
        <View
          style={[styles.quickActions, isMobile && styles.quickActionsMobile]}
        >
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionCard,
                { backgroundColor: action.color },
                isMobile && styles.actionCardMobile,
              ]}
              onPress={() => navigation.navigate(action.route, action.params)}
            >
              <Icon name={action.icon} size={isMobile ? 28 : 32} color="#fff" />
              <Text
                style={[
                  styles.actionTitle,
                  isMobile && styles.actionTitleMobile,
                ]}
              >
                {action.title}
              </Text>
            </TouchableOpacity>
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
}

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
    minWidth: 200,
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    borderLeftWidth: 5,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
    transition: "all 0.3s ease",
  },
  statCardMobile: {
    minWidth: "100%",
    padding: 16,
  },
  statIcon: {
    fontSize: 36,
    marginRight: 16,
    // Removed direct icon styling, will rely on SvgIcon or placeholder
  },
  statIconMobile: {
    fontSize: 28,
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  statTitleMobile: {
    fontSize: 11,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1f2937",
  },
  statValueMobile: {
    fontSize: 26,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitleMobile: {
    fontSize: 13,
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  quickActionsMobile: {
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 150,
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", // Softer shadow
    justifyContent: "center", // Center content vertically
  },
  actionCardMobile: {
    minWidth: Platform.select({ web: "calc(50% - 6px)", default: "45%" }),
    padding: 16,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
    // Removed direct icon styling, will rely on SvgIcon or placeholder
  },
  actionIconMobile: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionTitle: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  actionTitleMobile: {
    fontSize: 13,
  },
  activityCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 0,
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", // Softer shadow
    minHeight: 100, // Give it some height
    justifyContent: "center", // Center text
    alignItems: "center",
  },
  activityText: {
    color: colors.textTertiary,
    fontSize: 16,
  },
});
