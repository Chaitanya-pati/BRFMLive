import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";

const colors = {
  background: "#f5f6fa",
  surface: "#ffffff",
  primary: "#2c3e50",
  textPrimary: "#1f2937",
  textSecondary: "#6b7280",
  outlineVariant: "#e5e7eb",
  error: "#ef4444",
  onError: "#ffffff",
  info: "#3b82f6",
  onInfo: "#ffffff",
};

// Icon Components
const HomeIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "#3b82f6" : "none"}
    />
  </svg>
);

const DatabaseIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <ellipse
      cx="12"
      cy="5"
      rx="9"
      ry="3"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      fill={active ? "#3b82f6" : "none"}
    />
    <path
      d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const TruckIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M16 3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-1M16 3v13M16 3H1v13h15"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="5.5"
      cy="18.5"
      r="2.5"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      fill={active ? "#3b82f6" : "none"}
    />
    <circle
      cx="18.5"
      cy="18.5"
      r="2.5"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      fill={active ? "#3b82f6" : "none"}
    />
  </svg>
);

const ClipboardIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PackageIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "#3b82f6" : "none"}
    />
    <path
      d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FileTextIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "#3b82f6" : "none"}
    />
    <path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={active ? "#ffffff" : "#94a3b8"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Layout({ children, title, navigation, currentRoute }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
      setMobileMenuOpen(false);
    } else {
      setSidebarCollapsed(false);
    }
  }, [isMobile]);

  const menuItems = [
    { name: "Dashboard", route: "Home", icon: HomeIcon, section: null },
    {
      name: "Master Data",
      route: "MasterView",
      icon: DatabaseIcon,
      section: "Operations",
    },
    {
      name: "Gate Entry",
      route: "VehicleEntry",
      icon: TruckIcon,
      section: "Operations",
    },
    {
      name: "Quality Control",
      route: "LabTest",
      icon: ClipboardIcon,
      section: "Operations",
    },
    {
      name: "Unloading Entry",
      route: "UnloadingEntry",
      icon: PackageIcon,
      section: "Operations",
    },
    {
      name: "Claim Tracking",
      route: "ClaimTracking",
      icon: FileTextIcon,
      section: "Operations",
    },
  ];

  const toggleMobileMenu = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleNavigate = (route) => {
    navigation.navigate(route);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const renderMenuItem = (item, index) => {
    const IconComponent = item.icon;
    const isActive = currentRoute === item.route;

    return (
      <TouchableOpacity
        key={index}
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={() => handleNavigate(item.route)}
      >
        <View style={styles.menuIcon}>
          <IconComponent active={isActive} />
        </View>
        {(!sidebarCollapsed || mobileMenuOpen) && (
          <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
            {item.name}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.menuToggle}
            onPress={toggleMobileMenu}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12h18M3 6h18M3 18h18"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </TouchableOpacity>
          <Image
            source={require("../../assets/new-logo.png")}
            style={[styles.logo, isMobile && styles.logoMobile]}
            resizeMode="contain"
          />
          <Text style={[styles.brfmText, isMobile && styles.brfmTextMobile]}>
            BRFM
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <View style={styles.adminProfile}>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>AD</Text>
            </View>
            {!isMobile && <Text style={styles.adminName}>Admin</Text>}
          </View>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Mobile Overlay */}
        {isMobile && mobileMenuOpen && (
          <TouchableOpacity
            style={styles.mobileOverlay}
            onPress={() => setMobileMenuOpen(false)}
            activeOpacity={1}
          />
        )}

        {/* Sidebar */}
        <View
          style={[
            styles.sidebar,
            sidebarCollapsed && !mobileMenuOpen && styles.sidebarCollapsed,
            isMobile && mobileMenuOpen && styles.sidebarMobileOpen,
            isMobile && !mobileMenuOpen && styles.sidebarMobileHidden,
          ]}
        >
          <View style={styles.sidebarHeader} />

          <ScrollView style={styles.menuContainer}>
            {renderMenuItem(menuItems[0], 0)}

            {(!sidebarCollapsed || mobileMenuOpen) && (
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionLabel}>OPERATIONS</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {menuItems
              .slice(1)
              .map((item, index) => renderMenuItem(item, index + 1))}
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          <View style={styles.contentHeader}>
            <Text
              style={[
                styles.contentTitle,
                isMobile && styles.contentTitleMobile,
              ]}
            >
              {title}
            </Text>
          </View>
          <ScrollView style={styles.contentScroll}>{children}</ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: "#2d3e50",
    paddingHorizontal: Platform.select({ web: 20, default: 16 }),
    paddingVertical: 12,
    paddingTop: Platform.OS === "web" ? 12 : 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    height: Platform.select({ web: 64, default: 72 }),
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuToggle: {
    padding: 8,
  },
  menuToggleIcon: {
    color: "#cbd5e1",
  },
  logo: {
    height: 40,
    width: 40,
  },
  logoMobile: {
    height: 36,
    width: 36,
  },
  brfmText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 3,
    marginLeft: 8,
  },
  brfmTextMobile: {
    fontSize: 22,
    letterSpacing: 2,
    marginLeft: 6,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  adminAvatarText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  adminName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
  },
  mainContainer: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },
  mobileOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },
  sidebar: {
    width: 260,
    backgroundColor: "#2d3e50",
    boxShadow: "2px 0 8px rgba(0, 0, 0, 0.1)",
    zIndex: 1000,
  },
  sidebarCollapsed: {
    width: 80,
  },
  sidebarMobileOpen: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 260,
    boxShadow: "2px 0 16px rgba(0, 0, 0, 0.3)",
  },
  sidebarMobileHidden: {
    position: "absolute",
    left: -260,
    width: 0,
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: 0,
    borderBottomWidth: 0,
    height: 0,
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  sectionLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    transition: "all 0.2s ease",
  },
  menuItemActive: {
    backgroundColor: "#3b82f6",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  menuIcon: {
    marginRight: 14,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    color: "#b8c5d6",
    fontSize: 15,
    fontWeight: "500",
  },
  menuTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentMobile: {
    width: "100%",
  },
  contentHeader: {
    backgroundColor: colors.surface,
    padding: Platform.select({ web: 24, default: 16 }),
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    marginBottom: 0,
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  contentTitleMobile: {
    fontSize: 22,
  },
  contentScroll: {
    flex: 1,
    padding: Platform.select({ web: 24, default: 16 }),
  },
});
