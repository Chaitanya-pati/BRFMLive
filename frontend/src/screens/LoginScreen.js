import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../api/client';
import { storage } from '../utils/storage';
import { useBranch } from '../context/BranchContext';
import colors from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const { setActiveBranch, setUserBranches } = useBranch();

  useEffect(() => {
    // Check backend connectivity on mount
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        setBackendStatus(response.ok ? 'connected' : 'error');
      } catch (error) {
        console.error('Backend health check failed:', error);
        setBackendStatus('disconnected');
      }
    };
    checkBackend();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    const loginUrl = `${API_BASE_URL}/api/login`;
    console.log('🔐 Attempting login with:', {
      username,
      apiUrl: API_BASE_URL,
      fullUrl: loginUrl,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
      port: typeof window !== 'undefined' ? window.location.port : 'N/A'
    });

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('📡 Login response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned invalid response. Please check if backend is running on port 8000.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Login failed:', errorData);
        throw new Error(errorData.detail || 'Invalid username or password');
      }

      const data = await response.json();
      console.log('✅ Login successful:', data);

      await storage.setUserData(data);
      await storage.setItem('userId', String(data.user_id));
      await storage.setItem('username', data.username);
      await storage.setItem('userRole', data.role || 'user');
      await storage.setItem('userName', data.full_name || data.username);

      // Store branches
      if (data.branches && data.branches.length > 0) {
        await storage.setItem('userBranches', JSON.stringify(data.branches));
      }

      navigation.replace('BranchSelection');
    } catch (error) {
      console.error('❌ Login error:', error);

      let errorMessage = error.message || 'Invalid username or password';

      // Check if it's a network/connection error
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        errorMessage = `Cannot connect to backend server.\n\nBackend URL: ${API_BASE_URL}\n\nPlease ensure:\n1. Backend server is running (port 8000)\n2. Click the Run button to start both servers\n3. Wait for "Uvicorn running on http://0.0.0.0:8000" message\n\nIf issue persists, check the console logs for API URL details.`;
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>Login</Text>

        {backendStatus === 'disconnected' && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusTextError}>
              ⚠️ Backend Disconnected - Click Run button to start server
            </Text>
          </View>
        )}
        {backendStatus === 'connected' && (
          <View style={[styles.statusBanner, styles.statusBannerSuccess]}>
            <Text style={styles.statusTextSuccess}>✅ Connected to backend</Text>
          </View>
        )}

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 25,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBanner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  statusBannerSuccess: {
    backgroundColor: '#d4edda',
    borderLeftColor: '#28a745',
  },
  statusTextError: {
    color: '#856404',
    fontSize: 13,
    textAlign: 'center',
  },
  statusTextSuccess: {
    color: '#155724',
    fontSize: 13,
    textAlign: 'center',
  },
});