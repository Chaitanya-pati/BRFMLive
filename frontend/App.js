import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BranchProvider } from './src/context/BranchContext';
import LoginScreen from './src/screens/LoginScreen';
import BranchSelectionScreen from './src/screens/BranchSelectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import SupplierMasterScreen from './src/screens/SupplierMasterScreen';
import VehicleEntryScreen from './src/screens/VehicleEntryScreen';
import LabTestScreen from './src/screens/LabTestScreen';
import ClaimTrackingScreen from './src/screens/ClaimTrackingScreen';
import MasterViewScreen from './src/screens/MasterViewScreen';
import UnloadingEntryScreen from './src/screens/UnloadingEntryScreen';
import PrecleaningBinScreen from './src/screens/PrecleaningBinScreen';
import BranchMasterScreen from './src/screens/BranchMasterScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import MachineManagementScreen from './src/screens/MachineManagementScreen';
import RouteConfigurationScreen from './src/screens/RouteConfigurationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  console.log('App component rendering...');
  
  return (
    <BranchProvider>
      <NavigationContainer
        onStateChange={(state) => console.log('Navigation state changed:', state)}
        onError={(error) => console.error('Navigation error:', error)}
      >
        <Stack.Navigator
          initialRouteName="Login"
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
          <Stack.Screen name="MachineManagement" component={MachineManagementScreen} />
          <Stack.Screen name="RouteConfiguration" component={RouteConfigurationScreen} />
          <Stack.Screen name="SupplierMaster" component={SupplierMasterScreen} />
          <Stack.Screen name="VehicleEntry" component={VehicleEntryScreen} />
          <Stack.Screen name="LabTest" component={LabTestScreen} />
          <Stack.Screen name="ClaimTracking" component={ClaimTrackingScreen} />
          <Stack.Screen name="MasterView" component={MasterViewScreen} />
          <Stack.Screen name="UnloadingEntry" component={UnloadingEntryScreen} />
          <Stack.Screen name="PrecleaningBin" component={PrecleaningBinScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </BranchProvider>
  );
}
