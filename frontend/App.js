import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import SupplierMasterScreen from './src/screens/SupplierMasterScreen';
import VehicleEntryScreen from './src/screens/VehicleEntryScreen';
import LabTestScreen from './src/screens/LabTestScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Gate Entry & Lab Testing' }}
        />
        <Stack.Screen
          name="SupplierMaster"
          component={SupplierMasterScreen}
          options={{ title: 'Supplier Master' }}
        />
        <Stack.Screen
          name="VehicleEntry"
          component={VehicleEntryScreen}
          options={{ title: 'Vehicle Entry' }}
        />
        <Stack.Screen
          name="LabTest"
          component={LabTestScreen}
          options={{ title: 'Lab Test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
