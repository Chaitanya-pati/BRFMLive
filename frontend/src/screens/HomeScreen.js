import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import Layout from "../components/Layout";
import colors from "../theme/colors";
import { supplierApi, vehicleApi, labTestApi, unloadingApi, transferSessionApi, dispatchApi } from "../api/client";
import { formatISTDateTime } from "../utils/dateUtils";
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
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

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
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const [vehiclesRes, labTestsRes, unloadingRes, transferRes, dispatchRes] = await Promise.allSettled([
        vehicleApi.getAll(),
        labTestApi.getAll(),
        unloadingApi.getAll(),
        transferSessionApi.getAll(),
        dispatchApi.getAll(),
      ]);

      const activities = [];

      if (vehiclesRes.status === 'fulfilled') {
        vehiclesRes.value.data.forEach(v => {
          if (v.arrival_time) {
            activities.push({
              type: 'vehicle',
              icon: '🚛',
              color: '#6366f1',
              label: `Vehicle Entry: ${v.vehicle_number}`,
              detail: v.supplier?.supplier_name || v.supplier_name || '—',
              time: new Date(v.arrival_time),
            });
          }
        });
      }

      if (labTestsRes.status === 'fulfilled') {
        labTestsRes.value.data.forEach(lt => {
          const t = lt.test_date || lt.created_at;
          if (t) {
            activities.push({
              type: 'labtest',
              icon: '🔬',
              color: '#10b981',
              label: `Lab Test${lt.vehicle?.vehicle_number ? ': ' + lt.vehicle.vehicle_number : ''}`,
              detail: lt.category ? `Category: ${lt.category}` : (lt.wheat_variety || '—'),
              time: new Date(t),
            });
          }
        });
      }

      if (unloadingRes.status === 'fulfilled') {
        unloadingRes.value.data.forEach(u => {
          const t = u.unloading_start_time || u.created_at;
          if (t) {
            activities.push({
              type: 'unloading',
              icon: '📦',
              color: '#8b5cf6',
              label: `Unloading${u.vehicle?.vehicle_number ? ': ' + u.vehicle.vehicle_number : ''}`,
              detail: u.godown?.name || u.godown_name || '—',
              time: new Date(t),
            });
          }
        });
      }

      if (transferRes.status === 'fulfilled') {
        transferRes.value.data.forEach(s => {
          const t = s.start_timestamp || s.created_at;
          if (t) {
            activities.push({
              type: 'transfer',
              icon: '🔀',
              color: '#f59e0b',
              label: `Transfer ${s.status === 'active' ? 'Started' : s.status === 'completed' ? 'Completed' : 'Updated'}`,
              detail: s.transferred_quantity ? `${s.transferred_quantity} T` : 'In progress',
              time: new Date(t),
            });
          }
        });
      }

      if (dispatchRes.status === 'fulfilled') {
        dispatchRes.value.data.forEach(d => {
          const t = d.dispatched_at || d.created_at;
          if (t) {
            activities.push({
              type: 'dispatch',
              icon: '🚚',
              color: '#ef4444',
              label: `Dispatch: ${d.order_code || d.vehicle_number || 'Order'}`,
              detail: d.customer?.customer_name || d.customer_name || '—',
              time: new Date(t),
            });
          }
        });
      }

      activities.sort((a, b) => b.time - a.time);
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      console.error('Failed to load recent activity', err);
    } finally {
      setActivityLoading(false);
    }
  };

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
      title: "Driver Delivery",
      route: "DriverDelivery",
      icon: "camera",
      color: "#10b981",
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
      title: "Raw Wheat Transfer",
      route: "PrecleaningBin",
      icon: "box",
      color: "#14b8a6",
      adminOnly: false,
    },
    {
      title: "Magnets Cleaning",
      route: "MagnetCleaning",
      icon: "tasks",
      color: "#0ea5e9",
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
      title: "Production Order Products",
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
      title: "Customer Order Traceability",
      route: "CustomerOrderTraceability",
      icon: "route",
      color: "#00bcd4",
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
      title: "24 hour transfer",
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
          {activityLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.activityText, { marginTop: 8, fontSize: 14 }]}>Loading activity…</Text>
            </View>
          ) : recentActivity.length === 0 ? (
            <Text style={styles.activityText}>No recent activity</Text>
          ) : (
            recentActivity.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.activityItem,
                  idx < recentActivity.length - 1 && styles.activityItemBorder,
                ]}
              >
                <View style={[styles.activityIconWrap, { backgroundColor: item.color + '18' }]}>
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                </View>
                <View style={styles.activityBody}>
                  <Text style={styles.activityLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.activityDetail} numberOfLines={1}>{item.detail}</Text>
                </View>
                <Text style={styles.activityTime}>{formatISTDateTime(item.time)}</Text>
              </View>
            ))
          )}
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  activityText: {
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: "500",
    fontStyle: "italic",
    textAlign: 'center',
    padding: 30,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityBody: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  activityDetail: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    flexShrink: 0,
    textAlign: 'right',
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
