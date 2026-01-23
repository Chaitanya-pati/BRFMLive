import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BranchProvider } from './src/context/BranchContext';
import { storage } from './src/utils/storage';
import { setToastContainer, setAlertContainer } from './src/utils/customAlerts';
import ToastContainer from './src/components/ToastContainer';
import AlertContainer from './src/components/AlertContainer';
import LoginScreen from './src/screens/LoginScreen';
import BranchSelectionScreen from './src/screens/BranchSelectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import SupplierMasterScreen from './src/screens/SupplierMasterScreen';
import VehicleEntryScreen from './src/screens/VehicleEntryScreen';
import LabTestScreen from './src/screens/LabTestScreen';
import CustomerMasterScreen from './src/screens/CustomerMasterScreen';
import ClaimTrackingScreen from './src/screens/ClaimTrackingScreen';
import MasterViewScreen from './src/screens/MasterViewScreen';
import UnloadingEntryScreen from './src/screens/UnloadingEntryScreen';
import PrecleaningBinScreen from './src/screens/PrecleaningBinScreen';
import BranchMasterScreen from './src/screens/BranchMasterScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import MachineManagementScreen from './src/screens/MachineManagementScreen';
import RouteConfigurationScreen from './src/screens/RouteConfigurationScreen';
import DailyReportScreen from './src/screens/DailyReportScreen';
import PrecleaningTimelineScreen from './src/screens/PrecleaningTimelineScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import RawProductMasterScreen from './src/screens/RawProductMasterScreen';
import FinishedGoodsMasterScreen from './src/screens/FinishedGoodsMasterScreen';
import ProductionOrderScreen from './src/screens/ProductionOrderScreen';
import ProductionOrderPlanningScreen from './src/screens/ProductionOrderPlanningScreen';
import TransferRecordingScreen from './src/screens/TransferRecordingScreen';
import Transfer12HourScreen from './src/screens/Transfer12HourScreen';
import GrindingScreen from './src/screens/GrindingScreen';
import GrindingExcelViewScreen from './src/screens/GrindingExcelViewScreen';
import colors from './src/theme/colors';

const Stack = createNativeStackNavigator();

export default function App() {
  const toastRef = useRef(null);
  const alertRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    // Retry mechanism to ensure refs are captured even on slower devices
    let attempts = 0;
    const maxAttempts = 20; // Try for up to 1 second (20 * 50ms)

    const interval = setInterval(() => {
      attempts++;

      if (toastRef.current && alertRef.current) {
        setToastContainer(toastRef.current);
        setAlertContainer(alertRef.current);
        console.log('✅ Toast and Alert containers initialized');
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.error('❌ Failed to initialize Toast/Alert containers after', maxAttempts, 'attempts');
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await storage.getUserData();
      const activeBranch = await storage.getActiveBranch();

      if (userData && userData.user_id) {
        if (activeBranch && activeBranch.id) {
          setInitialRoute('Home');
        } else if (userData.branches && userData.branches.length > 1) {
          setInitialRoute('BranchSelection');
        } else if (userData.branches && userData.branches.length === 1) {
          await storage.setActiveBranch(userData.branches[0]);
          setInitialRoute('Home');
        } else {
          setInitialRoute('Login');
        }
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer ref={toastRef} />
      <AlertContainer ref={alertRef} />
      <NavigationContainer
        onStateChange={(state) => console.log('Navigation state changed:', state)}
        onError={(error) => console.error('Navigation error:', error)}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <BranchProvider>
            <Stack.Navigator
              initialRouteName={initialRoute}
              screenOptions={{
                headerShown: false,
              }}
            >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="BranchSelection" component={BranchSelectionScreen} />
          <Stack.Screen name="Dashboard" component={HomeScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="BranchMaster" component={BranchMasterScreen} />
          <Stack.Screen name="UserManagement" component={UserManagementScreen} />
          <Stack.Screen name="RouteConfiguration" component={RouteConfigurationScreen} />
          <Stack.Screen name="SupplierMaster" component={SupplierMasterScreen} />
          <Stack.Screen name="VehicleEntry" component={VehicleEntryScreen} />
          <Stack.Screen name="LabTest" component={LabTestScreen} />
          <Stack.Screen name="CustomerMaster" component={CustomerMasterScreen} />
          <Stack.Screen name="ClaimTracking" component={ClaimTrackingScreen} />
          <Stack.Screen name="MasterView" component={MasterViewScreen} />
          <Stack.Screen name="UnloadingEntry" component={UnloadingEntryScreen} />
          <Stack.Screen name="PrecleaningBin" component={PrecleaningBinScreen} />
          <Stack.Screen name="DailyReport" component={DailyReportScreen} />
          <Stack.Screen name="PrecleaningTimeline" component={PrecleaningTimelineScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="RawProductMaster" component={RawProductMasterScreen} />
          <Stack.Screen name="FinishedGoodsMaster" component={FinishedGoodsMasterScreen} />
          <Stack.Screen name="ProductionOrder" component={ProductionOrderScreen} />
          <Stack.Screen name="ProductionOrderPlanning" component={ProductionOrderPlanningScreen} />
          <Stack.Screen name="MachineManagement" component={MachineManagementScreen} />
          <Stack.Screen name="TransferRecording" component={TransferRecordingScreen} />
          <Stack.Screen name="Transfer12Hour" component={Transfer12HourScreen} />
          <Stack.Screen name="Grinding" component={GrindingScreen} />
          <Stack.Screen name="GrindingExcelView" component={GrindingExcelViewScreen} />
        </Stack.Navigator>
          </BranchProvider>
        )}
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});