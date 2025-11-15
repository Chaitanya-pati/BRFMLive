import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { storage } from '../utils/storage';
import { useBranch } from '../context/BranchContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors } from '../utils/theme';

export default function BranchSelectionScreen({ navigation, route }) {
  const { setActiveBranch, setUserBranches } = useBranch();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const userData = await storage.getUserData();
      
      if (!userData || !userData.branches || userData.branches.length === 0) {
        Alert.alert('Error', 'No branches found. Please contact your administrator.');
        navigation.replace('Login');
        return;
      }

      setBranches(userData.branches);
      setUserBranches(userData.branches);
      
      if (userData.branches.length === 1) {
        await handleBranchSelect(userData.branches[0]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      Alert.alert('Error', 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = async (branch) => {
    setSelecting(true);
    try {
      const success = await setActiveBranch(branch);
      
      if (success) {
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Error', 'Failed to set active branch');
      }
    } catch (error) {
      console.error('Error selecting branch:', error);
      Alert.alert('Error', 'Failed to select branch');
    } finally {
      setSelecting(false);
    }
  };

  const handleLogout = async () => {
    await storage.clearAll();
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading branches...</Text>
      </View>
    );
  }

  if (branches.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>No Branches Available</Text>
          <Text style={styles.message}>
            You don't have access to any branches. Please contact your administrator.
          </Text>
          <Button title="Logout" onPress={handleLogout} style={styles.button} />
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Select Branch</Text>
        <Text style={styles.subtitle}>
          Please select a branch to continue
        </Text>

        <View style={styles.branchList}>
          {branches.map((branch) => (
            <View key={branch.id} style={styles.branchCard}>
              <View style={styles.branchInfo}>
                <Text style={styles.branchName}>{branch.name}</Text>
                {branch.description && (
                  <Text style={styles.branchDescription}>{branch.description}</Text>
                )}
              </View>
              <Button
                title="Select"
                onPress={() => handleBranchSelect(branch)}
                disabled={selecting}
                style={styles.selectButton}
              />
            </View>
          ))}
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="secondary"
          style={styles.logoutButton}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    padding: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  branchList: {
    marginBottom: 20,
  },
  branchCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  branchInfo: {
    flex: 1,
    marginRight: 15,
  },
  branchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  branchDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectButton: {
    minWidth: 100,
  },
  button: {
    marginTop: 10,
  },
  logoutButton: {
    marginTop: 10,
  },
});
