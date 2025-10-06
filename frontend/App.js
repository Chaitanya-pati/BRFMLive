import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import SupplierMasterScreen from './src/screens/SupplierMasterScreen';
import VehicleEntryScreen from './src/screens/VehicleEntryScreen';
import LabTestScreen from './src/screens/LabTestScreen';
import ClaimTrackingScreen from './src/screens/ClaimTrackingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
