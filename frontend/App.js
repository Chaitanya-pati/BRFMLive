import React, { useState, useEffect, createContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import SupplierMasterScreen from './src/screens/SupplierMasterScreen';
import VehicleEntryScreen from './src/screens/VehicleEntryScreen';
import LabTestScreen from './src/screens/LabTestScreen';
import LoginScreen from './src/screens/LoginScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();
export const AuthContext = createContext();

export default function App() {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      if (token && userData) {
        setAuthToken(token);
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setAuthToken(token);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
    setUser(null);
    setAuthToken(null);
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AuthContext.Provider value={{ user, authToken, logout: handleLogout }}>
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
          <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
