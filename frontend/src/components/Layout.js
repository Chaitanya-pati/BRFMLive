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
  Modal as RNModal,
  Alert,
  TextInput // Import TextInput
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBranch } from "../context/BranchContext";
import { storage } from "../utils/storage";
import {
  FaHome,
  FaDatabase,
  FaTruck,
  FaFlask,
  FaBox,
  FaClipboardList,
  FaWarehouse,
  FaCog,
  FaRoute,
  FaUserShield, // For User Management Admin Icon
  FaUserCog // For Branch Master Admin Icon
} from "react-icons/fa";
import { Checkbox } from 'react-native-web'; // Assuming a checkbox component for web

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

// Icon Components with Font Awesome icons
const SvgHomeIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaHome color={color} size={18} />
    </View>
  );
};

const SvgDatabaseIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaDatabase color={color} size={18} />
    </View>
  );
};

const SvgTruckIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaTruck color={color} size={18} />
    </View>
  );
};

const SvgClipboardIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaFlask color={color} size={18} />
    </View>
  );
};

const SvgPackageIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaBox color={color} size={18} />
    </View>
  );
};

const SvgFileTextIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaClipboardList color={color} size={18} />
    </View>
  );
};

const SvgBinIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaWarehouse color={color} size={18} />
    </View>
  );
};

const SvgCogIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaCog color={color} size={18} />
    </View>
  );
};

const SvgRouteIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaRoute color={color} size={18} />
    </View>
  );
};

// Admin Icons
const SvgUserShieldIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaUserShield color={color} size={18} />
    </View>
  );
};

const SvgUserCogIcon = ({ active }) => {
  const color = active ? "#ffffff" : "#94a3b8";
  return (
    <View style={styles.iconContainer}>
      <FaUserCog color={color} size={18} />
    </View>
  );
};


export default function Layout({ children, title, currentRoute }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const { activeBranch, userBranches, setActiveBranch } = useBranch();

  // Assuming user role is stored in storage and retrieved here
  const [userRole, setUserRole] = useState('user'); // Default to 'user'
  const [userName, setUserName] = useState('User'); // Default to 'User'
  const [userData, setUserData] = useState(null); // State to hold user data

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await storage.getUserData();
        if (userData) {
          setUserData(userData);
          // Assuming userData contains role and name
          if (userData.role) setUserRole(userData.role);
          if (userData.name) setUserName(userData.name);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []);


  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
      setMobileMenuOpen(false);
    } else {
      setSidebarCollapsed(false);
    }
  }, [isMobile]);

  const menuItems = [
    { name: "Dashboard", route: "Home", icon: SvgHomeIcon, section: null },
    {
      name: "Master Data",
      route: "MasterView",
      icon: SvgDatabaseIcon,
      section: "Operations",
    },
    {
      name: "Customer Master",
      route: "CustomerMaster",
      icon: SvgUserShieldIcon,
      section: "Operations",
    },
    {
      name: "Driver Management",
      route: "DriverMaster",
      icon: SvgTruckIcon,
      section: "Operations",
    },
    {
      name: "Customer Orders",
      route: "CustomerOrderMaster",
      icon: SvgFileTextIcon,
      section: "Operations",
    },
    {
      name: "Route Configuration",
      route: "RouteConfiguration",
      icon: SvgRouteIcon,
      section: "Operations",
    },
    {
      name: "Gate Entry",
      route: "VehicleEntry",
      icon: SvgTruckIcon,
      section: "Operations",
    },
    {
      name: "Quality Control",
      route: "LabTest",
      icon: SvgClipboardIcon,
      section: "Operations",
    },
    {
      name: "Administrator Settings",
      route: "AdminDashboard",
      icon: SvgCogIcon,
      section: "Operations",
    },
    {
      name: "Unloading Entry",
      route: "UnloadingEntry",
      icon: SvgPackageIcon,
      section: "Operations",
    },
    {
      name: "Raw Wheat Bin Process", // Renamed from Precleaning Process
      route: "PrecleaningBin",
      icon: SvgBinIcon,
      section: "Operations",
    },
    {
      name: "Raw Wheat Bin Timeline", // Renamed from Precleaning Timeline
      route: "PrecleaningTimeline",
      icon: SvgBinIcon, // Assuming same icon as PrecleaningProcess for now
      section: "Operations",
    },
    {
      name: "Claim Tracking",
      route: "ClaimTracking",
      icon: SvgFileTextIcon,
      section: "Operations",
    },
    {
      name: "Production Planning",
      route: "ProductionOrder",
      icon: SvgCogIcon,
      section: "Operations",
    },
    {
      name: "Granulation Recording",
      route: "ProductionOrderGranulation",
      icon: SvgClipboardIcon,
      section: "Operations",
    },
    {
      name: "Reports",
      route: "Reports",
      icon: SvgFileTextIcon,
      section: "Operations",
    },
    // Admin only menu items
    {
      name: "User Management",
      route: "UserManagement",
      icon: SvgUserShieldIcon,
      section: "Admin",
      isAdminOnly: true,
    },
    {
      name: "Branch Master",
      route: "BranchMaster",
      icon: SvgUserCogIcon,
      section: "Admin",
      isAdminOnly: true,
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

  const handleBranchSwitch = async (branch) => {
    try {
      const success = await setActiveBranch(branch);
      if (success) {
        setBranchModalVisible(false);
        Alert.alert('Success', `Switched to ${branch.name}`);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        Alert.alert('Error', 'Failed to switch branch');
      }
    } catch (error) {
      console.error('Error switching branch:', error);
      Alert.alert('Error', 'Failed to switch branch');
    }
  };

  const handleLogout = async () => {
    await storage.clearAll();
    navigation.replace('Login');
  };

  const renderMenuItem = (item, index) => {
    if (item.isAdminOnly && userRole !== 'admin') {
      return null; // Skip rendering if not admin and it's an admin-only item
    }

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

  const handleBranchSelectionChange = (branchId, isSelected) => {
    // This function would handle updating the selected branches for user management
    // For now, it's a placeholder to demonstrate the new UI.
    console.log(`Branch ${branchId} selection changed to: ${isSelected}`);
    // In a real scenario, you'd update a state variable here.
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
            <Text style={styles.menuToggleIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.brfmText, isMobile && styles.brfmTextMobile]}>
            BRFM
          </Text>
        </View>
        <View style={styles.topBarRight}>
          {activeBranch && (
            <TouchableOpacity
              style={[styles.branchBadge, isMobile && styles.branchBadgeMobile]}
              onPress={() => setBranchModalVisible(true)}
            >
              <Text style={[styles.branchBadgeText, isMobile && styles.branchBadgeTextMobile]}>
                {activeBranch.name}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.userMenuButton}
            onPress={() => setUserMenuVisible(!userMenuVisible)}
          >
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>AD</Text>
            </View>
            {!isMobile && <Text style={styles.userMenuText}>▼</Text>}
          </TouchableOpacity>

          {userMenuVisible && (
            <>
              <TouchableOpacity
                style={styles.userMenuOverlay}
                onPress={() => setUserMenuVisible(false)}
                activeOpacity={1}
              />
              <View style={[styles.userDropdown, isMobile && styles.userDropdownMobile]}>
                <View style={styles.userDropdownHeader}>
                  <Text style={styles.userDropdownName}>{userName}</Text>
                  {userRole && (
                    <Text style={styles.userDropdownRole}>{userRole.toUpperCase()}</Text>
                  )}
                </View>
                {activeBranch && (
                  <>
                    <View style={styles.userDropdownDivider} />
                    <TouchableOpacity
                      style={styles.userDropdownItem}
                      onPress={() => {
                        setUserMenuVisible(false);
                        setBranchModalVisible(true);
                      }}
                    >
                      <Text style={styles.userDropdownItemLabel}>Branch</Text>
                      <Text style={styles.userDropdownItemValue}>{activeBranch.name}</Text>
                    </TouchableOpacity>
                  </>
                )}
                <View style={styles.userDropdownDivider} />
                <TouchableOpacity
                  style={styles.userDropdownItemDanger}
                  onPress={() => {
                    setUserMenuVisible(false);
                    handleLogout();
                  }}
                >
                  <Text style={styles.userDropdownItemDangerText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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

            {/* Section Divider for Operations, only show if sidebar is not collapsed or menu is open */}
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionLabel}>OPERATIONS</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {menuItems
              .slice(1)
              // Filter out admin-only items from the main loop if they are not intended for regular display
              .filter(item => !item.isAdminOnly || userRole === 'admin')
              .map((item, index) => renderMenuItem(item, index + 1))}

            {/* Admin Section Divider */}
            {userRole === 'admin' && (!sidebarCollapsed || mobileMenuOpen) && (
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {/* Render Admin Menu Items if user is admin */}
            {userRole === 'admin' && menuItems
              .filter(item => item.isAdminOnly)
              .map((item, index) => renderMenuItem(item, index + menuItems.length))}
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

      {/* Branch Switcher Modal */}
      <RNModal
        visible={branchModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBranchModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Switch Branch</Text>
            <ScrollView style={styles.branchList}>
              {userBranches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={[
                    styles.branchOption,
                    activeBranch?.id === branch.id && styles.branchOptionActive,
                  ]}
                  onPress={() => handleBranchSwitch(branch)}
                >
                  <View style={styles.branchOptionContent}>
                    <Text
                      style={[
                        styles.branchOptionName,
                        activeBranch?.id === branch.id && styles.branchOptionNameActive,
                      ]}
                    >
                      {branch.name}
                    </Text>
                    {branch.description && (
                      <Text style={styles.branchOptionDescription}>
                        {branch.description}
                      </Text>
                    )}
                  </View>
                  {activeBranch?.id === branch.id && (
                    <View style={styles.activeCheckmark}>
                      <Text style={styles.checkmarkIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setBranchModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

      {/* Branch Selection UI for User Management (Example) */}
      {/* This part is illustrative and would be rendered within the UserManagement screen */}
      {/* To demonstrate the checkbox concept */}
      <RNModal
        visible={false} // Set to true when needed in UserManagement screen
        transparent={true}
        animationType="slide"
        onRequestClose={() => { /* Close modal logic */ }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { /* Close modal logic */ }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Select Branches</Text>
            <ScrollView style={styles.branchList}>
              {userBranches.map((branch) => (
                <View key={branch.id} style={styles.branchCheckboxContainer}>
                  <Text style={styles.branchOptionName}>{branch.name}</Text>
                  <View style={styles.branchOptionContent}>
                    {branch.description && (
                      <Text style={styles.branchOptionDescription}>{branch.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => { /* Close modal logic */ }}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
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
    fontSize: 24,
    fontWeight: "600",
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
    gap: 8,
  },
  branchBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 4,
  },
  branchBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  branchBadgeMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  branchBadgeTextMobile: {
    fontSize: 10,
  },
  userMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 4,
  },
  userMenuText: {
    color: "#ffffff",
    fontSize: 12,
  },
  userMenuOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  userDropdown: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
    overflow: "hidden",
  },
  userDropdownMobile: {
    right: 10,
    minWidth: 180,
  },
  userDropdownHeader: {
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  userDropdownName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  userDropdownRole: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 2,
  },
  userDropdownDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  userDropdownItem: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userDropdownItemLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  userDropdownItemValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },
  userDropdownItemDanger: {
    padding: 16,
    backgroundColor: "#fef2f2",
  },
  userDropdownItemDangerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
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
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  branchList: {
    marginBottom: 20,
    maxHeight: 400,
  },
  branchOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  branchOptionActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  branchOptionContent: {
    flex: 1,
  },
  branchOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  branchOptionNameActive: {
    color: "#3b82f6",
  },
  branchOptionDescription: {
    fontSize: 14,
    color: "#666",
  },
  activeCheckmark: {
    marginLeft: 12,
  },
  checkmarkIcon: {
    color: "#3b82f6",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalCloseButton: {
    backgroundColor: "#f1f5f9",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  // Styles for the new branch selection UI
  branchCheckboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  checkbox: {
    marginRight: 12,
    width: 20,
    height: 20,
  },
});