import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BranchProvider } from './src/contexts/BranchContext';
import HomeScreen from './src/screens/HomeScreen';
import SupplierMasterScreen from './src/screens/SupplierMasterScreen';
import VehicleEntryScreen from './src/screens/VehicleEntryScreen';
import LabTestScreen from './src/screens/LabTestScreen';
import ClaimTrackingScreen from './src/screens/ClaimTrackingScreen';
import MasterViewScreen from './src/screens/MasterViewScreen';
import UnloadingEntryScreen from './src/screens/UnloadingEntryScreen';
import PrecleaningBinScreen from './src/screens/PrecleaningBinScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <BranchProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
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
