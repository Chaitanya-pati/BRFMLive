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
  const [loading, setLoading] = useState(false);
  const [lastAlertTimes, setLastAlertTimes] = useState({});

  // New state for transfer session flow
  const [startTransferModal, setStartTransferModal] = useState(false);
  const [viewActiveTransferModal, setViewActiveTransferModal] = useState(false);
  const [divertTransferModal, setDivertTransferModal] = useState(false);
  const [stopTransferModal, setStopTransferModal] = useState(false);
  const [activeTransferSession, setActiveTransferSession] = useState(null);
  const [selectedSourceGodown, setSelectedSourceGodown] = useState('');
  const [availableDestinationBins, setAvailableDestinationBins] = useState([]);

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
    source_type: 'godown',
    source_godown_id: '',
    source_bin_id: '',
    destination_bin_id: '',
    cleaning_interval_hours: '300',
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
  });

  const [stopTransferFormData, setStopTransferFormData] = useState({
    transferred_quantity: '',
  });

  const [divertTransferFormData, setDivertTransferFormData] = useState({
    new_bin_id: '',
    quantity_transferred: '',
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

  // Sort bins by last digit sequentially
  const getSortedBinsByLastDigit = (binsList) => {
    return [...binsList].sort((a, b) => {
      const lastDigitA = parseInt(a.bin_number.slice(-1)) || 0;
      const lastDigitB = parseInt(b.bin_number.slice(-1)) || 0;
      return lastDigitA - lastDigitB;
    });
  };

  // Update available bins when source godown changes
  useEffect(() => {
    if (selectedSourceGodown) {
      const godownId = parseInt(selectedSourceGodown);
      const mappingsForGodown = routeMappings.filter(
        mapping => mapping.source_godown_id === godownId
      );

      const binIds = mappingsForGodown.map(m => m.destination_bin_id);
      const availableBins = bins.filter(b => binIds.includes(b.id));
      const sortedBins = getSortedBinsByLastDigit(availableBins);

      setAvailableDestinationBins(sortedBins);
    } else {
      setAvailableDestinationBins([]);
    }
  }, [selectedSourceGodown, routeMappings, bins]);

  // Store interval IDs for each active transfer session
  const notificationIntervalsRef = useRef({});

  const startNotificationCheck = (sessionId, cleaningIntervalSeconds) => {
    if (notificationIntervalsRef.current[sessionId]) {
      clearInterval(notificationIntervalsRef.current[sessionId]);
    }

    notificationIntervalsRef.current[sessionId] = setInterval(() => {
      const transferSessions = transferSessionsRef.current;
      const session = transferSessions.find(s => s.id === sessionId);

      if (!session || session.status?.toLowerCase() !== 'active' || session.stop_timestamp) {
        clearInterval(notificationIntervalsRef.current[sessionId]);
        delete notificationIntervalsRef.current[sessionId];
        return;
      }

      const godowns = godownsRef.current;
      const bins = binsRef.current;
      const magnets = magnetsRef.current;
      const routeMappings = routeMappingsRef.current; // Corrected from routeMappings.current
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
        // Use current_bin_id if available, otherwise destination_bin_id
        const bin = bins.find((b) => b.id === session.current_bin_id || b.id === session.destination_bin_id);

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

  useEffect(() => {
    return () => {
      Object.keys(notificationIntervalsRef.current).forEach(sessionId => {
        clearInterval(notificationIntervalsRef.current[sessionId]);
      });
    };
  }, []);

  const handleStartTransfer = () => {
    setSelectedSourceGodown('');
    setTransferSessionFormData({
      source_godown_id: '',
      destination_bin_id: '',
    });
    setStartTransferModal(true);
  };

  const handleSubmitStartTransfer = async () => {
    if (!transferSessionFormData.source_godown_id || !transferSessionFormData.destination_bin_id) {
      if (Platform.OS === 'web') {
        alert('⚠️ Missing Information\n\nPlease select:\n• Source Godown\n• Destination Bin');
      } else {
        Alert.alert('⚠️ Missing Information', 'Please select source godown and destination bin.');
      }
      return;
    }

    // Find the route mapping based on source godown and destination bin
    const selectedRouteMapping = routeMappings.find(
      mapping => mapping.source_godown_id === parseInt(transferSessionFormData.source_godown_id) &&
                 mapping.destination_bin_id === parseInt(transferSessionFormData.destination_bin_id)
    );

    if (!selectedRouteMapping) {
      const sourceName = godowns.find(g => g.id === parseInt(transferSessionFormData.source_godown_id))?.name || 'Selected Godown';
      const destBin = bins.find(b => b.id === parseInt(transferSessionFormData.destination_bin_id))?.bin_number || 'Selected Bin';

      const errorMessage = `No route mapping found for:\n${sourceName} → Bin ${destBin}\n\nPlease configure a route mapping first in the "Route Mappings" tab.`;

      if (Platform.OS === 'web') {
        alert(`⚠️ Route Not Found\n\n${errorMessage}`);
      } else {
        Alert.alert('⚠️ Route Not Found', errorMessage);
      }
      return;
    }

    const payload = {
      source_godown_id: parseInt(transferSessionFormData.source_godown_id),
      destination_bin_id: parseInt(transferSessionFormData.destination_bin_id),
      magnet_id: selectedRouteMapping.magnet_id,
      cleaning_interval_hours: selectedRouteMapping.cleaning_interval_hours,
      notes: '' // Notes are not part of this initial start flow
    };

    try {
      setLoading(true);
      const response = await transferSessionApi.start(payload);
      const data = response.data;

      // Start notification check for the new session
      startNotificationCheck(data.id, selectedRouteMapping.cleaning_interval_hours);

      // Prepare success message details
      const sourceName = godowns.find(g => g.id === parseInt(transferSessionFormData.source_godown_id))?.name || 'Unknown';
      const destBin = bins.find(b => b.id === parseInt(transferSessionFormData.destination_bin_id))?.bin_number || 'Unknown';
      const magnetName = magnets.find(m => m.id === data.magnet_id)?.name || 'Unknown';
      const intervalMin = Math.floor(selectedRouteMapping.cleaning_interval_hours / 60);
      const intervalSec = selectedRouteMapping.cleaning_interval_hours % 60;
      const intervalDisplay = intervalMin > 0 ? `${intervalMin} minute${intervalMin > 1 ? 's' : ''}` : `${intervalSec} seconds`;

      // Show success alert
      if (Platform.OS === 'web') {
        alert(`✅ Transfer Started Successfully!\n\n📍 Route: ${sourceName} → Bin ${destBin}\n🧲 Magnet: ${magnetName}\n⏱️ Cleaning Interval: ${intervalDisplay}\n\nThe system will remind you to clean the magnet at regular intervals during the transfer.`);
      } else {
        Alert.alert('✅ Transfer Started', `Route: ${sourceName} → Bin ${destBin}\nMagnet: ${magnetName}\nCleaning Interval: ${intervalDisplay}`);
      }

      setStartTransferModal(false); // Close the start transfer modal
      await fetchTransferSessions(); // Refresh the list of transfer sessions
    } catch (error) {
      console.error('❌ Error starting transfer:', error);

      let errorMessage = 'An unexpected error occurred while starting the transfer.';
      let errorTitle = '❌ Transfer Failed';

      if (error.response?.status === 404) {
        const detail = error.response?.data?.detail || '';
        if (detail.includes('No route mapping found')) {
          errorTitle = '⚠️ Route Not Found';
          errorMessage = `No route mapping exists for the selected source and destination.\n\nPlease go to the "Route Mappings" tab and create a mapping.`;
        } else {
          errorMessage = detail; // Use the specific error detail if available
        }
      } else if (error.response?.status === 400) {
        errorTitle = '⚠️ Invalid Request';
        errorMessage = error.response?.data?.detail || 'Please check your selections and try again.';
      } else if (error.message === 'Network Error' || !error.response) {
        errorTitle = '🔌 Connection Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = error.response?.data?.detail || errorMessage;
      }

      // Show error alert
      if (Platform.OS === 'web') {
        alert(`${errorTitle}\n\n${errorMessage}`);
      } else {
        Alert.alert(errorTitle, errorMessage);
      }
    } finally {
      setLoading(false); // Ensure loading indicator is turned off
    }
  };

  const handleViewActiveTransfer = (session) => {
    setActiveTransferSession(session);
    // Clear previous form data for divert and stop modals
    setDivertTransferFormData({ new_bin_id: '', quantity_transferred: '' });
    setStopTransferFormData({ transferred_quantity: '' });
    setViewActiveTransferModal(true); // Show the view active transfer modal
  };

  const handleDivertTransfer = async () => {
    if (!divertTransferFormData.new_bin_id || !divertTransferFormData.quantity_transferred) {
      Alert.alert('Error', 'Please fill in all required fields (New Bin and Quantity Transferred)');
      return;
    }

    const quantity = parseFloat(divertTransferFormData.quantity_transferred);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity transferred');
      return;
    }

    try {
      setLoading(true);
      await transferSessionApi.divert(activeTransferSession.id, {
        new_bin_id: parseInt(divertTransferFormData.new_bin_id),
        quantity_transferred: quantity,
      });

      // Show success message
      if (Platform.OS === 'web') {
        alert('✅ Transfer Diverted Successfully!');
      } else {
        Alert.alert('Success', 'Transfer diverted successfully!');
      }

      // Close modals and reset state
      setDivertTransferModal(false);
      setViewActiveTransferModal(false);
      setActiveTransferSession(null);
      setDivertTransferFormData({ new_bin_id: '', quantity_transferred: '' });
      
      // Refresh data
      await fetchTransferSessions();
      await fetchBins();
      await fetchGodowns();
    } catch (error) {
      console.error('Error diverting transfer:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to divert transfer';

      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStopTransfer = async () => {
    if (!stopTransferFormData.transferred_quantity) {
      Alert.alert('Error', 'Please enter the transferred quantity');
      return;
    }

    const quantity = parseFloat(stopTransferFormData.transferred_quantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid transferred quantity');
      return;
    }

    try {
      setLoading(true);
      // Call the stop API with the session ID and the transferred quantity
      await transferSessionApi.stop(activeTransferSession.id, quantity);

      // Stop any ongoing notification checks for this session
      stopNotificationCheck(activeTransferSession.id);

      // Prepare success message details
      const sourceName = activeTransferSession.source_godown?.name || 'Unknown';
      // Determine the correct bin number to display in the success message
      const destBin = bins.find(b => b.id === activeTransferSession.current_bin_id)?.bin_number || activeTransferSession.destination_bin?.bin_number || 'Unknown';

      // Show success message
      if (Platform.OS === 'web') {
        alert(`✅ Transfer Completed Successfully!\n\n📍 Route: ${sourceName} → Bin ${destBin}\n\nGodown and bin quantities have been updated.`);
      } else {
        Alert.alert('✅ Transfer Completed', `Transfer completed.\n\nQuantities have been updated.`);
      }

      // Close modals and reset state
      setStopTransferModal(false);
      setViewActiveTransferModal(false);
      setActiveTransferSession(null);
      setStopTransferFormData({ transferred_quantity: '' });
      
      // Refresh data
      await fetchTransferSessions();
      await fetchBins();
      await fetchGodowns();
    } catch (error) {
      console.error('Error stopping transfer:', error);

      let errorMessage = 'An unexpected error occurred while stopping the transfer.';
      let errorTitle = '❌ Stop Transfer Failed';

      if (error.response?.status === 404) {
        errorTitle = '❌ Transfer Not Found';
        errorMessage = 'This transfer session no longer exists.';
      } else if (error.response?.status === 400) {
        errorTitle = '⚠️ Invalid Request';
        errorMessage = error.response?.data?.detail || 'Please check the transferred quantity.';
      } else if (error.message === 'Network Error' || !error.response) {
        errorTitle = '🔌 Connection Error';
        errorMessage = 'Unable to connect to the server.';
      } else {
        errorMessage = error.response?.data?.detail || errorMessage;
      }

      // Show error alert
      if (Platform.OS === 'web') {
        alert(`${errorTitle}\n\n${errorMessage}`);
      } else {
        Alert.alert(errorTitle, errorMessage);
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

    if (!confirmDelete) return; // Exit if user cancels deletion

    try {
      setLoading(true);
      await transferSessionApi.delete(session.id); // Call the delete API
      stopNotificationCheck(session.id); // Stop any active notification checks
      await fetchTransferSessions(); // Refresh the list

      // Show success message
      if (Platform.OS === 'web') {
        alert('Transfer session deleted successfully');
      } else {
        Alert.alert('Success', 'Transfer session deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting transfer session:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete transfer session';

      // Show error message
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

    if (!confirmDelete) return; // Exit if user cancels deletion

    try {
      setLoading(true);
      await routeMagnetMappingApi.delete(mapping.id); // Call the delete API
      await fetchRouteMappings(); // Refresh the list

      // Show success message
      if (Platform.OS === 'web') {
        alert('Route mapping deleted successfully');
      } else {
        Alert.alert('Success', 'Route mapping deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting route mapping:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete route mapping';

      // Show error message
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

    // Validate cleaning interval
    const cleaningInterval = parseInt(routeMappingFormData.cleaning_interval_hours);
    if (isNaN(cleaningInterval) || cleaningInterval <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive number for the Cleaning Interval (in seconds).');
      return;
    }

    // Check for required fields
    if (!routeMappingFormData.magnet_id || !sourceId || !routeMappingFormData.destination_bin_id) {
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

      // Add source ID based on source type
      if (routeMappingFormData.source_type === 'godown') {
        mappingData.source_godown_id = parseInt(routeMappingFormData.source_godown_id);
        mappingData.source_bin_id = null; // Ensure source_bin_id is null for godown source
      } else {
        mappingData.source_bin_id = parseInt(routeMappingFormData.source_bin_id);
        mappingData.source_godown_id = null; // Ensure source_godown_id is null for bin source
      }

      if (editingRouteMapping) {
        // Update existing route mapping
        await routeMagnetMappingApi.update(editingRouteMapping.id, mappingData);
        Alert.alert('Success', 'Route mapping updated successfully');
      } else {
        // Create new route mapping
        await routeMagnetMappingApi.create(mappingData);
        Alert.alert('Success', 'Route mapping added successfully');
      }

      setModalVisible(false); // Close the modal
      await fetchRouteMappings(); // Refresh the list
    } catch (error) {
      console.error('Error saving route mapping:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save route mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRouteMapping = () => {
    setEditingRouteMapping(null); // Ensure no mapping is being edited
    // Reset form data for a new mapping
    setRouteMappingFormData({
      magnet_id: '',
      source_type: 'godown', // Default to godown
      source_godown_id: '',
      source_bin_id: '',
      destination_bin_id: '',
      cleaning_interval_hours: '300', // Default cleaning interval
    });
    setModalVisible(true); // Show the modal
  };

  const handleEditRouteMapping = (mapping) => {
    setEditingRouteMapping(mapping); // Set the mapping to be edited
    // Populate form data with the existing mapping details
    setRouteMappingFormData({
      magnet_id: String(mapping.magnet_id),
      source_type: mapping.source_godown_id ? 'godown' : 'bin', // Determine source type
      source_godown_id: mapping.source_godown_id ? String(mapping.source_godown_id) : '',
      source_bin_id: mapping.source_bin_id ? String(mapping.source_bin_id) : '',
      destination_bin_id: String(mapping.destination_bin_id),
      cleaning_interval_hours: String(mapping.cleaning_interval_hours || '300'), // Use existing or default
    });
    setModalVisible(true); // Show the modal
  };

  const handleAddCleaningRecord = () => {
    setEditingCleaningRecord(null); // Ensure no record is being edited
    // Reset form data for a new cleaning record
    setCleaningRecordFormData({
      magnet_id: '',
      transfer_session_id: '',
      cleaning_timestamp: new Date().toISOString(), // Default to current time
      notes: '',
      before_cleaning_photo: null,
      after_cleaning_photo: null,
    });
    setModalVisible(true); // Show the modal
  };

  const handleEditCleaningRecord = (record) => {
    setEditingCleaningRecord(record); // Set the record to be edited
    // Populate form data with the existing record details
    setCleaningRecordFormData({
      magnet_id: String(record.magnet_id),
      transfer_session_id: record.transfer_session_id ? String(record.transfer_session_id) : '',
      cleaning_timestamp: record.cleaning_timestamp,
      notes: record.notes || '',
      before_cleaning_photo: null, // Reset photo fields on edit to allow re-upload
      after_cleaning_photo: null,
    });
    setModalVisible(true); // Show the modal
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

    if (!confirmDelete) return; // Exit if user cancels deletion

    try {
      setLoading(true);
      await magnetCleaningRecordApi.delete(record.id); // Call the delete API
      await fetchCleaningRecords(); // Refresh the list

      // Show success message
      if (Platform.OS === 'web') {
        alert('Cleaning record deleted successfully');
      } else {
        Alert.alert('Success', 'Cleaning record deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting cleaning record:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete cleaning record';

      // Show error message
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
      const formDataToSend = new FormData(); // Use FormData for file uploads
      formDataToSend.append('magnet_id', cleaningRecordFormData.magnet_id);

      if (cleaningRecordFormData.transfer_session_id) {
        formDataToSend.append('transfer_session_id', cleaningRecordFormData.transfer_session_id);
      }

      if (cleaningRecordFormData.notes) {
        formDataToSend.append('notes', cleaningRecordFormData.notes);
      }

      // Append photos if they exist
      if (cleaningRecordFormData.before_cleaning_photo) {
        formDataToSend.append('before_cleaning_photo', cleaningRecordFormData.before_cleaning_photo);
      }

      if (cleaningRecordFormData.after_cleaning_photo) {
        formDataToSend.append('after_cleaning_photo', cleaningRecordFormData.after_cleaning_photo);
      }

      if (editingCleaningRecord) {
        // Update existing cleaning record
        await magnetCleaningRecordApi.update(editingCleaningRecord.id, formDataToSend);
        Alert.alert('Success', 'Cleaning record updated successfully');
      } else {
        // Create new cleaning record
        await magnetCleaningRecordApi.create(formDataToSend);
        Alert.alert('Success', 'Cleaning record added successfully');
      }

      setModalVisible(false); // Close the modal
      await fetchCleaningRecords(); // Refresh the list
    } catch (error) {
      console.error('Error saving cleaning record:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save cleaning record');
    } finally {
      setLoading(false);
    }
  };

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
      field: 'current_bin', // Display current bin if available, otherwise destination bin
      label: 'Current Bin',
      flex: 1.2,
      render: (val, item) => {
        if (item.current_bin) return item.current_bin.bin_number;
        return item.destination_bin?.bin_number || '-';
      }
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
              onView={(session) => { // Only allow viewing active sessions
                if (session.status?.toLowerCase() === 'active') {
                  handleViewActiveTransfer(session);
                }
              }}
              onDelete={handleDeleteTransferSession}
              loading={loading}
              emptyMessage="No transfer sessions found"
              viewLabel={(row) => row.status?.toLowerCase() === 'active' ? 'View' : null} // Show "View" only for active sessions
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

        {/* Start Transfer Modal */}
        <Modal
          visible={startTransferModal}
          onClose={() => setStartTransferModal(false)}
          title="Start Transfer Session"
        >
          <ScrollView style={styles.modalContent}>
            <SelectDropdown
              label="Source Godown *"
              value={selectedSourceGodown}
              onValueChange={(value) => {
                setSelectedSourceGodown(value); // Update selected source godown
                setTransferSessionFormData({ 
                  ...transferSessionFormData, 
                  source_godown_id: value,
                  destination_bin_id: '' // Reset destination bin when source changes
                });
              }}
              options={godowns.map(g => ({ label: g.name, value: String(g.id) }))}
              placeholder="Select source godown"
            />

            {/* Only show destination bin selection if a source godown is selected */}
            {selectedSourceGodown && (
              <SelectDropdown
                label="Destination Bin * (Ordered Sequentially)"
                value={transferSessionFormData.destination_bin_id}
                onValueChange={(value) => setTransferSessionFormData({ ...transferSessionFormData, destination_bin_id: value })}
                // Options are dynamically set based on route mappings and sorted
                options={availableDestinationBins.map(b => ({ label: `Bin ${b.bin_number}`, value: String(b.id) }))}
                placeholder="Select destination bin"
              />
            )}

            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={() => setStartTransferModal(false)}
                variant="outline"
              />
              <Button
                title="Start Transfer"
                onPress={handleSubmitStartTransfer}
                variant="primary"
              />
            </View>
          </ScrollView>
        </Modal>

        {/* View Active Transfer Modal */}
        <Modal
          visible={viewActiveTransferModal}
          onClose={() => setViewActiveTransferModal(false)}
          title="Active Transfer Details"
        >
          <ScrollView style={styles.modalContent}>
            {activeTransferSession ? (
              <>
                <Text style={styles.routeFlowTitle}>Transfer Details</Text>
                <View style={styles.routeFlowPreview}>
                  <Text style={styles.routeFlowText}>
                    Source: {activeTransferSession.source_godown?.name || 'N/A'}
                  </Text>
                  <Text style={styles.routeFlowText}>
                    {/* Display current bin or destination bin */}
                    Current Bin: Bin {bins.find(b => b.id === activeTransferSession.current_bin_id)?.bin_number || activeTransferSession.destination_bin?.bin_number || 'N/A'}
                  </Text>
                  <Text style={styles.routeFlowText}>
                    Magnet: <Text style={styles.routeFlowMagnet}>{activeTransferSession.magnet?.name || 'N/A'}</Text>
                  </Text>
                  <Text style={styles.routeFlowText}>
                    Started: {formatISTDateTime(activeTransferSession.start_timestamp)}
                  </Text>
                  <Text style={styles.routeFlowText}>
                    Status: {activeTransferSession.status}
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <Button
                    title="Divert to Next Bin"
                    onPress={() => {
                      setViewActiveTransferModal(false); // Close view modal
                      setDivertTransferModal(true); // Open divert modal
                    }}
                    variant="secondary"
                  />
                  <Button
                    title="Stop Transfer"
                    onPress={() => {
                      setViewActiveTransferModal(false); // Close view modal
                      setStopTransferModal(true); // Open stop modal
                    }}
                    variant="outline"
                  />
                </View>
              </>
            ) : (
              <Text>No active transfer session found.</Text>
            )}
          </ScrollView>
        </Modal>

        {/* Divert Transfer Modal */}
        <Modal
          visible={divertTransferModal}
          onClose={() => setDivertTransferModal(false)}
          title="Divert Transfer to Next Bin"
        >
          <ScrollView style={styles.modalContent}>
            {activeTransferSession && (
              <>
                <Text style={styles.infoText}>
                  Current Bin: {bins.find(b => b.id === activeTransferSession.current_bin_id)?.bin_number || 'N/A'}
                </Text>

                <SelectDropdown
                  label="New Destination Bin *"
                  value={divertTransferFormData.new_bin_id}
                  onValueChange={(value) => setDivertTransferFormData({ ...divertTransferFormData, new_bin_id: value })}
                  // Use sorted bins for selection
                  options={getSortedBinsByLastDigit(bins).map(b => ({ label: `Bin ${b.bin_number}`, value: String(b.id) }))}
                  placeholder="Select new destination bin"
                />

                <InputField
                  label="Quantity Transferred to Current Bin (tons) *"
                  placeholder="Enter quantity transferred"
                  value={divertTransferFormData.quantity_transferred}
                  onChangeText={(text) => setDivertTransferFormData({ ...divertTransferFormData, quantity_transferred: text })}
                  keyboardType="numeric"
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setDivertTransferModal(false)}
                    variant="outline"
                  />
                  <Button
                    title="Divert Transfer"
                    onPress={handleDivertTransfer}
                    variant="primary"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </Modal>

        {/* Stop Transfer Modal */}
        <Modal
          visible={stopTransferModal}
          onClose={() => setStopTransferModal(false)}
          title="Stop Transfer Session"
        >
          <ScrollView style={styles.modalContent}>
            {activeTransferSession && (
              <>
                <Text style={styles.infoText}>
                  Current Bin: {bins.find(b => b.id === activeTransferSession.current_bin_id)?.bin_number || 'N/A'}
                </Text>

                <InputField
                  label="Quantity Transferred to Current Bin (tons) *"
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
                    onPress={handleStopTransfer}
                    variant="primary"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </Modal>

        {/* Route Mapping Modal (only shown when activeTab is routeMappings) */}
        <Modal
          visible={modalVisible && activeTab === 'routeMappings'}
          onClose={() => setModalVisible(false)}
          title={editingRouteMapping ? 'Edit Route Mapping' : 'Add Route Mapping'}
        >
          <ScrollView style={styles.modalContent}>
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
                source_godown_id: '', // Reset source IDs when type changes
                source_bin_id: ''
              })}
              options={[
                { label: 'Godown', value: 'godown' },
                { label: 'Bin', value: 'bin' }
              ]}
              placeholder="Select source type"
            />

            {/* Conditionally render source godown or bin selection */}
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
          </ScrollView>
        </Modal>

        {/* Cleaning Record Modal (only shown when activeTab is cleaningRecords) */}
        <Modal
          visible={modalVisible && activeTab === 'cleaningRecords'}
          onClose={() => setModalVisible(false)}
          title={editingCleaningRecord ? 'Edit Cleaning Record' : 'Add Cleaning Record'}
        >
          <ScrollView style={styles.modalContent}>
            <SelectDropdown
              label="Magnet *"
              value={cleaningRecordFormData.magnet_id}
              onValueChange={(value) => {
                // Automatically link to an active transfer session if one exists for the selected magnet
                const activeSession = transferSessions.find(
                  s => s.magnet_id === parseInt(value) && !s.stop_timestamp // Find active session
                );
                setCleaningRecordFormData({
                  ...cleaningRecordFormData,
                  magnet_id: value,
                  transfer_session_id: activeSession ? String(activeSession.id) : '' // Set session ID if found
                });
              }}
              options={magnets.map(m => ({ label: m.name, value: String(m.id) }))}
              placeholder="Select magnet"
            />

            {/* Show transfer session dropdown only if a magnet is selected and has active sessions */}
            {cleaningRecordFormData.magnet_id && (
              <SelectDropdown
                label="Transfer Session (optional)"
                value={cleaningRecordFormData.transfer_session_id}
                onValueChange={(value) => setCleaningRecordFormData({ ...cleaningRecordFormData, transfer_session_id: value })}
                // Filter sessions for the selected magnet
                options={transferSessions
                  .filter(s => s.magnet_id === parseInt(cleaningRecordFormData.magnet_id))
                  .map(s => ({
                    label: `${s.source_godown?.name || 'N/A'} → ${s.destination_bin?.bin_number || 'N/A'} (${s.status})`, // Display route and status
                    value: String(s.id)
                  }))}
                placeholder="Select transfer session"
              />
            )}

            <InputField
              label="Cleaning Timestamp (IST)"
              placeholder="Will be set to current time when you submit"
              value={editingCleaningRecord
                ? formatISTDateTime(cleaningRecordFormData.cleaning_timestamp) // Display formatted time if editing
                : '⏱️ Current time will be used automatically'} // Placeholder for new records
              editable={false} // Timestamp is auto-generated on submit
            />

            <InputField
              label="Before Cleaning Photo"
              placeholder="Select photo"
              value={cleaningRecordFormData.before_cleaning_photo?.name || 'No file selected'}
              editable={false}
            />
            {/* File input for web */}
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
            {/* File input for web */}
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
    whiteSpace: 'nowrap', // Ensures tab text stays on one line
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
  infoText: { // Added for displaying current bin info in modals
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    fontWeight: '600',
  },
});