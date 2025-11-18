import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import colors from '../theme/colors';
import { binApi, magnetApi, routeMagnetMappingApi, godownApi, magnetCleaningRecordApi, transferSessionApi } from '../api/client';
import { formatISTDateTime } from '../utils/dateUtils';
import { calculateMagnetNotifications } from '../utils/notificationChecker';

export default function PrecleaningBinScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState('routeMappings');
  const [bins, setBins] = useState([]);
  const [magnets, setMagnets] = useState([]);
  const [routeMappings, setRouteMappings] = useState([]);
  const [cleaningRecords, setCleaningRecords] = useState([]);
  const [transferSessions, setTransferSessions] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const [editingMagnet, setEditingMagnet] = useState(null);
  const [editingRouteMapping, setEditingRouteMapping] = useState(null);
  const [editingCleaningRecord, setEditingCleaningRecord] = useState(null);
  const [editingTransferSession, setEditingTransferSession] = useState(null);
  const [stopTransferModal, setStopTransferModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastAlertTimes, setLastAlertTimes] = useState({});

  const cleaningRecordsRef = React.useRef(cleaningRecords);
  const transferSessionsRef = React.useRef(transferSessions);
  const routeMappingsRef = React.useRef(routeMappings);
  const magnetsRef = React.useRef(magnets);
  const godownsRef = React.useRef(godowns);
  const binsRef = React.useRef(bins);

  React.useEffect(() => {
    cleaningRecordsRef.current = cleaningRecords;
  }, [cleaningRecords]);

  React.useEffect(() => {
    transferSessionsRef.current = transferSessions;
  }, [transferSessions]);

  React.useEffect(() => {
    routeMappingsRef.current = routeMappings;
  }, [routeMappings]);

  React.useEffect(() => {
    magnetsRef.current = magnets;
  }, [magnets]);

  React.useEffect(() => {
    godownsRef.current = godowns;
  }, [godowns]);

  React.useEffect(() => {
    binsRef.current = bins;
  }, [bins]);

  const [binFormData, setBinFormData] = useState({
    bin_number: '',
    capacity: '',
    current_quantity: '',
    status: 'Active',
  });

  const [magnetFormData, setMagnetFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
  });

  const [routeMappingFormData, setRouteMappingFormData] = useState({
    magnet_id: '',
    source_type: 'godown', // 'godown' or 'bin'
    source_godown_id: '',
    source_bin_id: '',
    destination_bin_id: '',
    cleaning_interval_hours: '300', // in seconds (300 = 5 minutes)
  });

  const [cleaningRecordFormData, setCleaningRecordFormData] = useState({
    magnet_id: '',
    transfer_session_id: '',
    cleaning_timestamp: new Date().toISOString(),
    notes: '',
    before_cleaning_photo: null,
    after_cleaning_photo: null,
  });

  const [transferSessionFormData, setTransferSessionFormData] = useState({
    source_godown_id: '',
    destination_bin_id: '',
    notes: '',
  });

  const [stopTransferFormData, setStopTransferFormData] = useState({
    transferred_quantity: '',
  });

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Full', value: 'Full' },
    { label: 'Maintenance', value: 'Maintenance' },
  ];

  const fetchBins = async () => {
    try {
      const response = await binApi.getAll();
      setBins(response.data || []);
    } catch (error) {
      console.error('Error fetching bins:', error);
    }
  };

  const fetchMagnets = async () => {
    try {
      const response = await magnetApi.getAll();
      setMagnets(response.data || []);
    } catch (error) {
      console.error('Error fetching magnets:', error);
    }
  };

  const fetchRouteMappings = async () => {
    try {
      const response = await routeMagnetMappingApi.getAll();
      setRouteMappings(response.data || []);
    } catch (error) {
      console.error('Error fetching route mappings:', error);
    }
  };

  const fetchGodowns = async () => {
    try {
      const response = await godownApi.getAll();
      setGodowns(response.data || []);
    } catch (error) {
      console.error('Error fetching godowns:', error);
    }
  };

  const fetchCleaningRecords = async () => {
    try {
      const response = await magnetCleaningRecordApi.getAll();
      setCleaningRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching cleaning records:', error);
    }
  };

  const fetchTransferSessions = async () => {
    try {
      const response = await transferSessionApi.getAll();
      setTransferSessions(response.data || []);
    } catch (error) {
      console.error('Error fetching transfer sessions:', error);
    }
  };

  useEffect(() => {
    fetchBins();
    fetchMagnets();
    fetchRouteMappings();
    fetchGodowns();
    fetchCleaningRecords();
    fetchTransferSessions();
  }, []);

  useEffect(() => {
    if (activeTab === 'routeMappings') {
      fetchRouteMappings();
      fetchGodowns();
    }
  }, [activeTab]);

  // Store interval IDs for each active transfer session
  const notificationIntervalsRef = useRef({});

  const startNotificationCheck = (sessionId, cleaningIntervalSeconds) => {
    // Clear any existing interval for this session
    if (notificationIntervalsRef.current[sessionId]) {
      clearInterval(notificationIntervalsRef.current[sessionId]);
    }

    // Start checking at the cleaning interval rate
    notificationIntervalsRef.current[sessionId] = setInterval(() => {
      const transferSessions = transferSessionsRef.current;
      const session = transferSessions.find(s => s.id === sessionId);

      if (!session || session.status?.toLowerCase() !== 'active' || session.stop_timestamp) {
        // Session ended, stop checking
        clearInterval(notificationIntervalsRef.current[sessionId]);
        delete notificationIntervalsRef.current[sessionId];
        return;
      }

      // Check if cleaning is needed
      const godowns = godownsRef.current;
      const bins = binsRef.current;
      const magnets = magnetsRef.current;
      const routeMappings = routeMappingsRef.current;
      const cleaningRecords = cleaningRecordsRef.current;

      const now = new Date();
      const startTime = new Date(session.start_timestamp);
      const elapsedSeconds = (now - startTime) / 1000;
      const intervalsPassed = Math.floor(elapsedSeconds / cleaningIntervalSeconds);

      if (intervalsPassed === 0) return;

      const currentIntervalNumber = intervalsPassed;
      const currentIntervalStart = new Date(
        startTime.getTime() + currentIntervalNumber * cleaningIntervalSeconds * 1000
      );

      const cleanedInCurrentInterval = cleaningRecords.some((record) => {
        const recordTime = new Date(record.cleaning_timestamp);
        return (
          record.magnet_id === session.magnet_id &&
          record.transfer_session_id === session.id &&
          recordTime >= currentIntervalStart
        );
      });

      if (!cleanedInCurrentInterval) {
        const magnet = magnets.find((m) => m.id === session.magnet_id);
        const godown = godowns.find((g) => g.id === session.source_godown_id);
        const bin = bins.find((b) => b.id === session.destination_bin_id);

        if (magnet && godown && bin) {
          const intervalMinutes = Math.floor(cleaningIntervalSeconds / 60);
          const intervalSeconds = cleaningIntervalSeconds % 60;
          const intervalString = intervalMinutes > 0 ? `${intervalMinutes}m ${intervalSeconds}s` : `${intervalSeconds}s`;

          const message = `🔔MAGNET CLEANING REQUIRED!\n\nMagnet: ${magnet.name}\nFrom: ${godown.name}\nTo: Bin ${bin.bin_number}\nInterval #${currentIntervalNumber}\nCleaning Interval: ${intervalString}\n\nPlease clean the magnet now!`;

          if (Platform.OS === 'web') {
            alert(message);
          } else {
            Alert.alert('Cleaning Required', message);
          }
        }
      }
    }, cleaningIntervalSeconds * 1000);
  };

  const stopNotificationCheck = (sessionId) => {
    if (notificationIntervalsRef.current[sessionId]) {
      clearInterval(notificationIntervalsRef.current[sessionId]);
      delete notificationIntervalsRef.current[sessionId];
    }
  };

  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      Object.keys(notificationIntervalsRef.current).forEach(sessionId => {
        clearInterval(notificationIntervalsRef.current[sessionId]);
      });
    };
  }, []);

  const handleSubmitTransferSession = async () => {
    if (!transferSessionFormData.source_godown_id || !transferSessionFormData.destination_bin_id || !transferSessionFormData.magnet_id) {
      if (Platform.OS === 'web') {
        alert('⚠️ Missing Information\n\nPlease select:\n• Source Godown\n• Destination Bin\n• Magnet\n\nThese are required to start the transfer.');
      } else {
        Alert.alert(
          '⚠️ Missing Information',
          'Please select source godown, destination bin, and magnet to start the transfer.',
          [{ text: 'OK', style: 'default' }]
        );
      }
      return;
    }

    const selectedMagnetId = parseInt(transferSessionFormData.magnet_id);
    const selectedRouteMapping = routeMappings.find(
      mapping => mapping.magnet_id === selectedMagnetId &&
                 mapping.source_godown_id === (transferSessionFormData.source_godown_id ? parseInt(transferSessionFormData.source_godown_id) : null) &&
                 mapping.source_bin_id === (transferSessionFormData.source_type === 'bin' ? parseInt(transferSessionFormData.source_bin_id) : null) &&
                 mapping.destination_bin_id === parseInt(transferSessionFormData.destination_bin_id)
    );

    if (!selectedRouteMapping) {
      const sourceName = godowns.find(g => g.id === parseInt(transferSessionFormData.source_godown_id))?.name || 'Selected Godown';
      const destBin = bins.find(b => b.id === parseInt(transferSessionFormData.destination_bin_id))?.bin_number || 'Selected Bin';
      const magnetName = magnets.find(m => m.id === selectedMagnetId)?.name || 'Selected Magnet';

      const errorMessage = `No route mapping found for:\n${sourceName} → Bin ${destBin} (with Magnet: ${magnetName})\n\nPlease configure a route mapping first in the "Route Mappings" tab.`;

      if (Platform.OS === 'web') {
        alert(`⚠️ Route Not Found\n\n${errorMessage}`);
      } else {
        Alert.alert('⚠️ Route Not Found', errorMessage, [{ text: 'OK', style: 'default' }]);
      }
      return;
    }

    const cleaningIntervalSeconds = parseInt(selectedRouteMapping.cleaning_interval_hours);
    if (isNaN(cleaningIntervalSeconds) || cleaningIntervalSeconds <= 0) {
      if (Platform.OS === 'web') {
        alert('⚠️ Invalid Cleaning Interval\n\nThe selected route mapping has an invalid cleaning interval. Please update the route mapping.');
      } else {
        Alert.alert('⚠️ Invalid Cleaning Interval', 'The selected route mapping has an invalid cleaning interval. Please update the route mapping.', [{ text: 'OK', style: 'default' }]);
      }
      return;
    }

    const payload = {
      source_godown_id: parseInt(transferSessionFormData.source_godown_id),
      destination_bin_id: parseInt(transferSessionFormData.destination_bin_id),
      magnet_id: selectedMagnetId,
      cleaning_interval_hours: cleaningIntervalSeconds, // Store the interval in seconds
      notes: transferSessionFormData.notes,
    };

    try {
      setLoading(true);
      const response = await transferSessionApi.start(payload);

      const data = response.data;
      console.log('✅ Transfer session started:', data);

      // Start notification check for this session
      startNotificationCheck(data.id, cleaningIntervalSeconds);

      const sourceName = godowns.find(g => g.id === parseInt(transferSessionFormData.source_godown_id))?.name || 'Unknown';
      const destBin = bins.find(b => b.id === parseInt(transferSessionFormData.destination_bin_id))?.bin_number || 'Unknown';
      const magnetName = magnets.find(m => m.id === data.magnet_id)?.name || 'Unknown';
      const intervalMin = Math.floor(cleaningIntervalSeconds / 60);
      const intervalSec = cleaningIntervalSeconds % 60;
      const intervalDisplay = intervalMin > 0 ? `${intervalMin} minute${intervalMin > 1 ? 's' : ''}` : `${intervalSec} seconds`;

      if (Platform.OS === 'web') {
        alert(`✅ Transfer Started Successfully!\n\n📍 Route: ${sourceName} → Bin ${destBin}\n🧲 Magnet: ${magnetName}\n⏱️ Cleaning Interval: ${intervalDisplay}\n\n🔔 First notification will appear in approximately ${intervalDisplay}\n\nThe system will remind you to clean the magnet at regular intervals during the transfer.`);
      } else {
        Alert.alert(
          '✅ Transfer Started',
          `Route: ${sourceName} → Bin ${destBin}\nMagnet: ${magnetName}\nCleaning Interval: ${intervalDisplay}\n\nFirst notification in ${intervalDisplay}`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      setTransferSessionFormData({
        source_godown_id: '',
        destination_bin_id: '',
        magnet_id: '',
        notes: '',
      });
      setModalVisible(false);
      await fetchTransferSessions(); // Refresh the list
    } catch (error) {
      console.error('❌ Error starting transfer:', error);
      console.error('Error details:', error.response?.data);

      let errorMessage = 'An unexpected error occurred while starting the transfer.';
      let errorTitle = '❌ Transfer Failed';

      if (error.response?.status === 404) {
        const detail = error.response?.data?.detail || '';
        if (detail.includes('No route mapping found')) {
          errorTitle = '⚠️ Route Not Configured';
          errorMessage = `No route mapping exists for the selected source and destination.\n\nTo fix this, please go to the "Route Mappings" tab and create a mapping that includes the selected magnet, source, and destination.`;
        } else if (detail.includes('godown not found')) {
          errorTitle = '❌ Source Godown Not Found';
          errorMessage = 'The selected source godown no longer exists. Please refresh and try again.';
        } else if (detail.includes('bin not found')) {
          errorTitle = '❌ Destination Bin Not Found';
          errorMessage = 'The selected destination bin no longer exists. Please refresh and try again.';
        } else {
          errorMessage = detail;
        }
      } else if (error.response?.status === 400) {
        errorTitle = '⚠️ Invalid Request';
        errorMessage = error.response?.data?.detail || 'Please check your selections and try again.';
      } else if (error.message === 'Network Error' || !error.response) {
        errorTitle = '🔌 Connection Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else {
        errorMessage = error.response?.data?.detail || errorMessage;
      }

      if (Platform.OS === 'web') {
        alert(`${errorTitle}\n\n${errorMessage}`);
      } else {
        Alert.alert(errorTitle, errorMessage, [{ text: 'OK', style: 'default' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStopTransferSession = async (sessionId) => {
    try {
      setLoading(true);
      const response = await transferSessionApi.stop(sessionId);

      if (!response.ok) throw new Error('Failed to stop transfer session');

      // Stop notification check for this session
      stopNotificationCheck(sessionId);

      const sourceName = editingTransferSession.source_godown?.name || 'Unknown';
      const destBin = editingTransferSession.destination_bin?.bin_number || 'Unknown';

      if (Platform.OS === 'web') {
        alert(`✅ Transfer Completed Successfully!\n\n📍 Route: ${sourceName} → Bin ${destBin}\n\nGodown and bin quantities have been updated.`);
      } else {
        Alert.alert(
          '✅ Transfer Completed',
          `Transfer from ${sourceName} to Bin ${destBin} completed.\n\nQuantities have been updated.`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      setStopTransferModal(false);
      setLastAlertTimes(prev => {
        const updated = { ...prev };
        delete updated[sessionId];
        return updated;
      });
      setEditingTransferSession(null);
      await fetchTransferSessions();
      await fetchBins();
      await fetchGodowns();
    } catch (error) {
      console.error('Error stopping transfer:', error);

      let errorMessage = 'An unexpected error occurred while stopping the transfer.';
      let errorTitle = '❌ Stop Transfer Failed';

      if (error.response?.status === 404) {
        errorTitle = '❌ Transfer Not Found';
        errorMessage = 'This transfer session no longer exists. It may have already been stopped.';
      } else if (error.response?.status === 400) {
        const detail = error.response?.data?.detail || '';
        if (detail.includes('not active')) {
          errorTitle = '⚠️ Transfer Already Stopped';
          errorMessage = 'This transfer session has already been stopped.';
        } else {
          errorTitle = '⚠️ Invalid Request';
          errorMessage = detail || 'Please check the transferred quantity and try again.';
        }
      } else if (error.message === 'Network Error' || !error.response) {
        errorTitle = '🔌 Connection Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else {
        errorMessage = error.response?.data?.detail || errorMessage;
      }

      if (Platform.OS === 'web') {
        alert(`${errorTitle}\n\n${errorMessage}`);
      } else {
        Alert.alert(errorTitle, errorMessage, [{ text: 'OK', style: 'default' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransferSession = async (session) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete this transfer session?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete this transfer session?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await transferSessionApi.delete(session.id);
      // Stop any active notification checks for this session before deleting
      stopNotificationCheck(session.id);
      await fetchTransferSessions();

      if (Platform.OS === 'web') {
        alert('Transfer session deleted successfully');
      } else {
        Alert.alert('Success', 'Transfer session deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting transfer session:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete transfer session';

      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRouteMapping = async (mapping) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete this route mapping?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete this route mapping?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await routeMagnetMappingApi.delete(mapping.id);
      await fetchRouteMappings();

      if (Platform.OS === 'web') {
        alert('Route mapping deleted successfully');
      } else {
        Alert.alert('Success', 'Route mapping deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting route mapping:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete route mapping';

      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRouteMapping = async () => {
    const sourceId = routeMappingFormData.source_type === 'godown'
      ? routeMappingFormData.source_godown_id
      : routeMappingFormData.source_bin_id;

    // Validate cleaning_interval_hours as a number
    const cleaningInterval = parseInt(routeMappingFormData.cleaning_interval_hours);
    if (isNaN(cleaningInterval) || cleaningInterval <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive number for the Cleaning Interval (in seconds).');
      return;
    }

    if (!routeMappingFormData.magnet_id || !sourceId ||
        !routeMappingFormData.destination_bin_id) {
      Alert.alert('Error', 'Please fill in all required fields (Magnet, Source, Destination)');
      return;
    }

    try {
      setLoading(true);
      const mappingData = {
        magnet_id: parseInt(routeMappingFormData.magnet_id),
        destination_bin_id: parseInt(routeMappingFormData.destination_bin_id),
        cleaning_interval_hours: cleaningInterval, // Use the validated integer value
      };

      // Add the appropriate source ID
      if (routeMappingFormData.source_type === 'godown') {
        mappingData.source_godown_id = parseInt(routeMappingFormData.source_godown_id);
        mappingData.source_bin_id = null;
      } else {
        mappingData.source_bin_id = parseInt(routeMappingFormData.source_bin_id);
        mappingData.source_godown_id = null;
      }

      if (editingRouteMapping) {
        await routeMagnetMappingApi.update(editingRouteMapping.id, mappingData);
        Alert.alert('Success', 'Route mapping updated successfully');
      } else {
        await routeMagnetMappingApi.create(mappingData);
        Alert.alert('Success', 'Route mapping added successfully');
      }

      setModalVisible(false);
      await fetchRouteMappings();
    } catch (error) {
      console.error('Error saving route mapping:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save route mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBin = (bin) => {
    setEditingBin(bin);
    setEditingMagnet(null);
    setBinFormData({
      bin_number: bin.bin_number,
      capacity: String(bin.capacity),
      current_quantity: String(bin.current_quantity || 0),
      status: bin.status,
    });
    setModalVisible(true);
  };

  const handleEditMagnet = (magnet) => {
    setEditingMagnet(magnet);
    setEditingBin(null);
    setMagnetFormData({
      name: magnet.name,
      description: magnet.description || '',
      status: magnet.status,
    });
    setModalVisible(true);
  };

  const handleDeleteBin = async (bin) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete bin ${bin.bin_number}?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete bin ${bin.bin_number}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await binApi.delete(bin.id);
      await fetchBins();

      if (Platform.OS === 'web') {
        alert('Bin deleted successfully');
      } else {
        Alert.alert('Success', 'Bin deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting bin:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete bin';

      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMagnet = async (magnet) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete magnet ${magnet.name}?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete magnet ${magnet.name}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await magnetApi.delete(magnet.id);
      await fetchMagnets();

      if (Platform.OS === 'web') {
        alert('Magnet deleted successfully');
      } else {
        Alert.alert('Success', 'Magnet deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting magnet:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete magnet';

      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBin = async () => {
    if (!binFormData.bin_number || !binFormData.capacity) {
      Alert.alert('Error', 'Please fill in all required fields (Bin Number and Capacity)');
      return;
    }

    const capacity = parseFloat(binFormData.capacity);
    const currentQuantity = binFormData.current_quantity ? parseFloat(binFormData.current_quantity) : 0.0;

    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Error', 'Please enter a valid capacity');
      return;
    }

    if (isNaN(currentQuantity) || currentQuantity < 0) {
      Alert.alert('Error', 'Please enter a valid current quantity');
      return;
    }

    try {
      setLoading(true);
      const binData = {
        bin_number: binFormData.bin_number.trim(),
        capacity: capacity,
        current_quantity: currentQuantity,
        status: binFormData.status,
      };

      if (editingBin) {
        await binApi.update(editingBin.id, binData);
        Alert.alert('Success', 'Bin updated successfully');
      } else {
        await binApi.create(binData);
        Alert.alert('Success', 'Bin added successfully');
      }

      setModalVisible(false);
      await fetchBins();
    } catch (error) {
      console.error('Error saving bin:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save bin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMagnet = async () => {
    if (!magnetFormData.name) {
      Alert.alert('Error', 'Please fill in the magnet name');
      return;
    }

    try {
      setLoading(true);
      const magnetData = {
        name: magnetFormData.name.trim(),
        description: magnetFormData.description.trim(),
        status: magnetFormData.status,
      };

      if (editingMagnet) {
        await magnetApi.update(editingMagnet.id, magnetData);
        Alert.alert('Success', 'Magnet updated successfully');
      } else {
        await magnetApi.create(magnetData);
        Alert.alert('Success', 'Magnet added successfully');
      }

      setModalVisible(false);
      await fetchMagnets();
    } catch (error) {
      console.error('Error saving magnet:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save magnet');
    } finally {
      setLoading(false);
    }
  };

  const binColumns = [
    { field: 'bin_number', label: 'Bin Number', flex: 1 },
    { field: 'capacity', label: 'Capacity (tons)', flex: 1 },
    { field: 'current_quantity', label: 'Current Qty (tons)', flex: 1 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const magnetColumns = [
    { field: 'name', label: 'Magnet Name', flex: 2 },
    { field: 'description', label: 'Description', flex: 3 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const routeMappingColumns = [
    { field: 'id', label: 'ID', flex: 0.4 },
    {
      field: 'magnet',
      label: 'Magnet',
      flex: 1.2,
      render: (val, item) => item?.magnet?.name || 'N/A'
    },
    {
      field: 'route_flow',
      label: 'Route Flow',
      flex: 2.2,
      render: (val, item) => {
        if (!item) return 'N/A';
        const source = item.source_godown
          ? `Godown: ${item.source_godown.name}`
          : item.source_bin
            ? `Bin: ${item.source_bin.bin_number}`
            : 'N/A';
        const destination = item.destination_bin?.bin_number || 'N/A';
        return `${source} → Bin: ${destination}`;
      }
    },
    {
      field: 'magnet_status',
      label: 'Magnet Status',
      flex: 0.8,
      render: (val, item) => item?.magnet?.status || 'N/A'
    },
    {
      field: 'cleaning_interval_hours',
      label: 'Cleaning Interval (sec)',
      flex: 1
    },
  ];

  const cleaningRecordColumns = [
    {
      field: 'magnet',
      label: 'Magnet',
      flex: 1.5,
      render: (val) => val?.name || '-'
    },
    {
      field: 'cleaning_timestamp',
      label: 'Cleaning Time (IST)',
      flex: 2,
      render: (val) => formatISTDateTime(val)
    },
    {
      field: 'before_cleaning_photo',
      label: 'Before Photo',
      flex: 1,
      render: (val) => val ? '✓' : '-'
    },
    {
      field: 'after_cleaning_photo',
      label: 'After Photo',
      flex: 1,
      render: (val) => val ? '✓' : '-'
    },
    { field: 'notes', label: 'Notes', flex: 2 },
  ];

  const transferSessionColumns = [
    {
      field: 'source_godown',
      label: 'Source Godown',
      flex: 1.2,
      render: (val) => val?.name || '-'
    },
    {
      field: 'destination_bin',
      label: 'Destination Bin',
      flex: 1.2,
      render: (val) => val?.bin_number || '-'
    },
    {
      field: 'magnet',
      label: 'Magnet',
      flex: 1.2,
      render: (val) => val?.name || '-'
    },
    {
      field: 'start_timestamp',
      label: 'Start Time (IST)',
      flex: 1.5,
      render: (val) => formatISTDateTime(val)
    },
    {
      field: 'stop_timestamp',
      label: 'Stop Time (IST)',
      flex: 1.5,
      render: (val) => formatISTDateTime(val)
    },
    {
      field: 'transferred_quantity',
      label: 'Quantity (tons)',
      flex: 1,
      render: (val) => val ? val.toFixed(2) : '-'
    },
    {
      field: 'status',
      label: 'Status',
      flex: 0.8,
      render: (val) => val ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() : '-'
    },
  ];

  const handleAddRouteMapping = () => {
    setEditingRouteMapping(null);
    setRouteMappingFormData({
      magnet_id: '',
      source_type: 'godown',
      source_godown_id: '',
      source_bin_id: '',
      destination_bin_id: '',
      cleaning_interval_hours: '300',
    });
    setModalVisible(true);
  };

  const handleEditRouteMapping = (mapping) => {
    setEditingRouteMapping(mapping);
    setRouteMappingFormData({
      magnet_id: String(mapping.magnet_id),
      source_type: mapping.source_godown_id ? 'godown' : 'bin',
      source_godown_id: mapping.source_godown_id ? String(mapping.source_godown_id) : '',
      source_bin_id: mapping.source_bin_id ? String(mapping.source_bin_id) : '',
      destination_bin_id: String(mapping.destination_bin_id),
      cleaning_interval_hours: String(mapping.cleaning_interval_hours || '300'),
    });
    setModalVisible(true);
  };

  const handleStartTransfer = () => {
    setEditingTransferSession(null);
    setTransferSessionFormData({
      source_godown_id: '',
      destination_bin_id: '',
      magnet_id: '',
      notes: '',
    });
    setModalVisible(true);
  };

  const handleAddCleaningRecord = () => {
    setEditingCleaningRecord(null);
    setCleaningRecordFormData({
      magnet_id: '',
      transfer_session_id: '',
      cleaning_timestamp: new Date().toISOString(),
      notes: '',
      before_cleaning_photo: null,
      after_cleaning_photo: null,
    });
    setModalVisible(true);
  };

  const handleEditCleaningRecord = (record) => {
    setEditingCleaningRecord(record);
    setCleaningRecordFormData({
      magnet_id: String(record.magnet_id),
      transfer_session_id: record.transfer_session_id ? String(record.transfer_session_id) : '',
      cleaning_timestamp: record.cleaning_timestamp,
      notes: record.notes || '',
      before_cleaning_photo: null,
      after_cleaning_photo: null,
    });
    setModalVisible(true);
  };

  const handleDeleteCleaningRecord = async (record) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete this cleaning record?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete this cleaning record?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await magnetCleaningRecordApi.delete(record.id);
      await fetchCleaningRecords();

      if (Platform.OS === 'web') {
        alert('Cleaning record deleted successfully');
      } else {
        Alert.alert('Success', 'Cleaning record deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting cleaning record:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete cleaning record';

      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCleaningRecord = async () => {
    if (!cleaningRecordFormData.magnet_id) {
      Alert.alert('Error', 'Please select a magnet');
      return;
    }

    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('magnet_id', cleaningRecordFormData.magnet_id);

      if (cleaningRecordFormData.transfer_session_id) {
        formDataToSend.append('transfer_session_id', cleaningRecordFormData.transfer_session_id);
      }

      if (cleaningRecordFormData.notes) {
        formDataToSend.append('notes', cleaningRecordFormData.notes);
      }

      if (cleaningRecordFormData.before_cleaning_photo) {
        formDataToSend.append('before_cleaning_photo', cleaningRecordFormData.before_cleaning_photo);
      }

      if (cleaningRecordFormData.after_cleaning_photo) {
        formDataToSend.append('after_cleaning_photo', cleaningRecordFormData.after_cleaning_photo);
      }

      if (editingCleaningRecord) {
        await magnetCleaningRecordApi.update(editingCleaningRecord.id, formDataToSend);
        Alert.alert('Success', 'Cleaning record updated successfully');
      } else {
        await magnetCleaningRecordApi.create(formDataToSend);
        Alert.alert('Success', 'Cleaning record added successfully');
      }

      setModalVisible(false);
      await fetchCleaningRecords();
    } catch (error) {
      console.error('Error saving cleaning record:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save cleaning record');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitStopTransfer = async () => {
    if (!stopTransferFormData.transferred_quantity) {
      Alert.alert('Error', 'Please enter the transferred quantity');
      return;
    }

    const quantity = parseFloat(stopTransferFormData.transferred_quantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid transferred quantity');
      return;
    }

    await handleStopTransferSession(editingTransferSession.id);
  };


  return (
    <Layout title="Precleaning Process" navigation={navigation} currentRoute="PrecleaningBin">
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabScrollContent}
        >
          <View style={[styles.tabContainer, isMobile && styles.tabContainerMobile]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'routeMappings' && styles.activeTab, isMobile && styles.tabMobile]}
              onPress={() => setActiveTab('routeMappings')}
            >
              <Text style={[styles.tabText, activeTab === 'routeMappings' && styles.activeTabText, isMobile && styles.tabTextMobile]}>
                {isMobile ? 'Routes' : 'Route Mappings'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'cleaningRecords' && styles.activeTab, isMobile && styles.tabMobile]}
              onPress={() => setActiveTab('cleaningRecords')}
            >
              <Text style={[styles.tabText, activeTab === 'cleaningRecords' && styles.activeTabText, isMobile && styles.tabTextMobile]}>
                {isMobile ? 'Cleaning' : 'Cleaning Records'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'transferSessions' && styles.activeTab, isMobile && styles.tabMobile]}
              onPress={() => setActiveTab('transferSessions')}
            >
              <Text style={[styles.tabText, activeTab === 'transferSessions' && styles.activeTabText, isMobile && styles.tabTextMobile]}>
                {isMobile ? 'Transfers' : 'Transfer Sessions'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {activeTab === 'routeMappings' ? (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Add Route Mapping"
                onPress={handleAddRouteMapping}
                variant="primary"
              />
            </View>

            <DataTable
              columns={routeMappingColumns}
              data={routeMappings}
              onEdit={handleEditRouteMapping}
              onDelete={handleDeleteRouteMapping}
              loading={loading}
              emptyMessage="No route mappings found"
            />
          </>
        ) : activeTab === 'transferSessions' ? (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Start Transfer"
                onPress={handleStartTransfer}
                variant="primary"
              />
            </View>

            <DataTable
              columns={transferSessionColumns}
              data={transferSessions}
              onEdit={(session) => {
                if (session.status?.toLowerCase() === 'active') {
                  setEditingTransferSession(session); // Set the session to be stopped
                  setStopTransferModal(true);
                }
              }}
              onDelete={handleDeleteTransferSession}
              loading={loading}
              emptyMessage="No transfer sessions found"
              editLabel={(row) => row.status?.toLowerCase() === 'active' ? 'Stop' : null}
            />
          </>
        ) : (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Add Cleaning Record"
                onPress={handleAddCleaningRecord}
                variant="primary"
              />
            </View>

            <DataTable
              columns={cleaningRecordColumns}
              data={cleaningRecords}
              onEdit={handleEditCleaningRecord}
              onDelete={handleDeleteCleaningRecord}
              loading={loading}
              emptyMessage="No cleaning records found"
            />
          </>
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={
            editingBin ? 'Edit Bin' :
            editingMagnet ? 'Edit Magnet' :
            editingRouteMapping ? 'Edit Route Mapping' :
            editingCleaningRecord ? 'Edit Cleaning Record' :
            activeTab === 'bins' ? 'Add Bin' :
            activeTab === 'magnets' ? 'Add Magnet' :
            activeTab === 'routeMappings' ? 'Add Route Mapping' :
            activeTab === 'transferSessions' ? 'Start Transfer Session' : 'Add Cleaning Record'
          }
        >
          <ScrollView style={styles.modalContent}>
            {(editingBin || (!editingMagnet && !editingRouteMapping && activeTab === 'bins')) ? (
              <>
                <InputField
                  label="Bin Number *"
                  placeholder="Enter bin number"
                  value={binFormData.bin_number}
                  onChangeText={(text) => setBinFormData({ ...binFormData, bin_number: text })}
                />

                <InputField
                  label="Capacity (tons) *"
                  placeholder="Enter capacity in tons"
                  value={binFormData.capacity}
                  onChangeText={(text) => setBinFormData({ ...binFormData, capacity: text })}
                  keyboardType="numeric"
                />

                <InputField
                  label="Current Quantity (tons)"
                  placeholder="Enter current quantity in tons"
                  value={binFormData.current_quantity}
                  onChangeText={(text) => setBinFormData({ ...binFormData, current_quantity: text })}
                  keyboardType="numeric"
                />

                <SelectDropdown
                  label="Status *"
                  value={binFormData.status}
                  onValueChange={(value) => setBinFormData({ ...binFormData, status: value })}
                  options={statusOptions}
                  placeholder="Select status"
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title={editingBin ? 'Update' : 'Add'}
                    onPress={handleSubmitBin}
                    variant="primary"
                  />
                </View>
              </>
            ) : (editingMagnet || (!editingBin && !editingRouteMapping && activeTab === 'magnets')) ? (
              <>
                <InputField
                  label="Magnet Name *"
                  placeholder="Enter magnet name"
                  value={magnetFormData.name}
                  onChangeText={(text) => setMagnetFormData({ ...magnetFormData, name: text })}
                />

                <InputField
                  label="Description"
                  placeholder="Enter description"
                  value={magnetFormData.description}
                  onChangeText={(text) => setMagnetFormData({ ...magnetFormData, description: text })}
                  multiline
                  numberOfLines={3}
                />

                <SelectDropdown
                  label="Status *"
                  value={magnetFormData.status}
                  onValueChange={(value) => setMagnetFormData({ ...magnetFormData, status: value })}
                  options={statusOptions}
                  placeholder="Select status"
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title={editingMagnet ? 'Update' : 'Add'}
                    onPress={handleSubmitMagnet}
                    variant="primary"
                  />
                </View>
              </>
            ) : (editingRouteMapping || (!editingBin && !editingMagnet && !editingCleaningRecord && activeTab === 'routeMappings')) ? (
              <>
                <SelectDropdown
                  label="Magnet *"
                  value={routeMappingFormData.magnet_id}
                  onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, magnet_id: value })}
                  options={magnets.map(m => ({ label: m.name, value: String(m.id) }))}
                  placeholder="Select magnet"
                />

                <SelectDropdown
                  label="Source Type *"
                  value={routeMappingFormData.source_type}
                  onValueChange={(value) => setRouteMappingFormData({
                    ...routeMappingFormData,
                    source_type: value,
                    source_godown_id: '',
                    source_bin_id: ''
                  })}
                  options={[
                    { label: 'Godown', value: 'godown' },
                    { label: 'Bin', value: 'bin' }
                  ]}
                  placeholder="Select source type"
                />

                {routeMappingFormData.source_type === 'godown' ? (
                  <SelectDropdown
                    label="Source Godown *"
                    value={routeMappingFormData.source_godown_id}
                    onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, source_godown_id: value })}
                    options={godowns.map(g => ({ label: g.name, value: String(g.id) }))}
                    placeholder="Select source godown"
                  />
                ) : (
                  <SelectDropdown
                    label="Source Bin *"
                    value={routeMappingFormData.source_bin_id}
                    onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, source_bin_id: value })}
                    options={bins.map(b => ({ label: b.bin_number, value: String(b.id) }))}
                    placeholder="Select source bin"
                  />
                )}

                <SelectDropdown
                  label="Destination Bin *"
                  value={routeMappingFormData.destination_bin_id}
                  onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, destination_bin_id: value })}
                  options={bins.map(b => ({ label: b.bin_number, value: String(b.id) }))}
                  placeholder="Select destination bin"
                />

                <InputField
                  label="Cleaning Interval (seconds) *"
                  value={routeMappingFormData.cleaning_interval_hours}
                  onChangeText={(text) => setRouteMappingFormData({ ...routeMappingFormData, cleaning_interval_hours: text })}
                  placeholder="e.g., 300 (5 min) or 1800 (30 min)"
                  keyboardType="numeric"
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title={editingRouteMapping ? 'Update' : 'Add'}
                    onPress={handleSubmitRouteMapping}
                    variant="primary"
                  />
                </View>
              </>
            ) : activeTab === 'transferSessions' ? (
              <>
                <SelectDropdown
                  label="Source Godown *"
                  value={transferSessionFormData.source_godown_id}
                  onValueChange={(value) => setTransferSessionFormData({ ...transferSessionFormData, source_godown_id: value })}
                  options={godowns.map(g => ({ label: g.name, value: String(g.id) }))}
                  placeholder="Select source godown"
                />

                <SelectDropdown
                  label="Destination Bin *"
                  value={transferSessionFormData.destination_bin_id}
                  onValueChange={(value) => setTransferSessionFormData({ ...transferSessionFormData, destination_bin_id: value })}
                  options={bins.map(b => ({ label: b.bin_number, value: String(b.id) }))}
                  placeholder="Select destination bin"
                />

                <SelectDropdown
                  label="Magnet *"
                  value={transferSessionFormData.magnet_id}
                  onValueChange={(value) => setTransferSessionFormData({ ...transferSessionFormData, magnet_id: value })}
                  options={magnets.map(m => ({ label: m.name, value: String(m.id) }))}
                  placeholder="Select magnet"
                />

                <InputField
                  label="Notes"
                  placeholder="Enter notes (optional)"
                  value={transferSessionFormData.notes}
                  onChangeText={(text) => setTransferSessionFormData({ ...transferSessionFormData, notes: text })}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title="Start Transfer"
                    onPress={handleSubmitTransferSession}
                    variant="primary"
                  />
                </View>
              </>
            ) : (
              <>
                <SelectDropdown
                  label="Magnet *"
                  value={cleaningRecordFormData.magnet_id}
                  onValueChange={(value) => {
                    // Auto-select active transfer session for this magnet
                    const activeSession = transferSessions.find(
                      s => s.magnet_id === parseInt(value) && !s.stop_timestamp
                    );
                    setCleaningRecordFormData({
                      ...cleaningRecordFormData,
                      magnet_id: value,
                      transfer_session_id: activeSession ? String(activeSession.id) : ''
                    });
                  }}
                  options={magnets.map(m => ({ label: m.name, value: String(m.id) }))}
                  placeholder="Select magnet"
                />

                {cleaningRecordFormData.magnet_id && (
                  <SelectDropdown
                    label="Transfer Session (optional)"
                    value={cleaningRecordFormData.transfer_session_id}
                    onValueChange={(value) => setCleaningRecordFormData({ ...cleaningRecordFormData, transfer_session_id: value })}
                    options={transferSessions
                      .filter(s => s.magnet_id === parseInt(cleaningRecordFormData.magnet_id))
                      .map(s => ({
                        label: `${s.source_godown?.name || 'N/A'} → ${s.destination_bin?.bin_number || 'N/A'} (${s.status})`,
                        value: String(s.id)
                      }))}
                    placeholder="Select transfer session"
                  />
                )}

                <InputField
                  label="Cleaning Timestamp (IST)"
                  placeholder="Will be set to current time when you submit"
                  value={editingCleaningRecord
                    ? formatISTDateTime(cleaningRecordFormData.cleaning_timestamp)
                    : '⏱️ Current time will be used automatically'}
                  editable={false}
                />

                <InputField
                  label="Before Cleaning Photo"
                  placeholder="Select photo"
                  value={cleaningRecordFormData.before_cleaning_photo?.name || 'No file selected'}
                  editable={false}
                />
                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCleaningRecordFormData({ ...cleaningRecordFormData, before_cleaning_photo: e.target.files[0] })}
                    style={{ marginBottom: 16 }}
                  />
                )}

                <InputField
                  label="After Cleaning Photo"
                  placeholder="Select photo"
                  value={cleaningRecordFormData.after_cleaning_photo?.name || 'No file selected'}
                  editable={false}
                />
                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCleaningRecordFormData({ ...cleaningRecordFormData, after_cleaning_photo: e.target.files[0] })}
                    style={{ marginBottom: 16 }}
                  />
                )}

                <InputField
                  label="Notes"
                  placeholder="Enter notes (optional)"
                  value={cleaningRecordFormData.notes}
                  onChangeText={(text) => setCleaningRecordFormData({ ...cleaningRecordFormData, notes: text })}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title={editingCleaningRecord ? 'Update' : 'Add'}
                    onPress={handleSubmitCleaningRecord}
                    variant="primary"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </Modal>

        <Modal
          visible={stopTransferModal}
          onClose={() => setStopTransferModal(false)}
          title="Stop Transfer Session"
        >
          <ScrollView style={styles.modalContent}>
            <InputField
              label="Transferred Quantity (tons) *"
              placeholder="Enter quantity in tons"
              value={stopTransferFormData.transferred_quantity}
              onChangeText={(text) => setStopTransferFormData({ ...stopTransferFormData, transferred_quantity: text })}
              keyboardType="numeric"
            />

            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={() => setStopTransferModal(false)}
                variant="outline"
              />
              <Button
                title="Stop Transfer"
                onPress={handleSubmitStopTransfer}
                variant="primary"
              />
            </View>
          </ScrollView>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabScrollView: {
    flexGrow: 0,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[300],
  },
  tabScrollContent: {
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tabContainerMobile: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    whiteSpace: 'nowrap',
  },
  tabMobile: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
  },
  tabTextMobile: {
    fontSize: 14,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  modalContent: {
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  routeFlowPreview: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 16,
  },
  routeFlowTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  routeFlowText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  routeFlowMagnet: {
    fontWeight: '700',
    color: colors.primary,
  },
});