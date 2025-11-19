import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
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
import { showToast, showAlert, showConfirm } from '../utils/customAlerts';
import CleaningReminder from '../components/CleaningReminder';
import * as ImagePicker from 'expo-image-picker'; // Import ImagePicker

export default function PrecleaningBinScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024; // Define isTablet for modal width adjustments

  const [activeTab, setActiveTab] = useState('cleaningRecords'); // Default to cleaningRecords tab
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

  // State for cleaning reminder popup
  const [cleaningReminderVisible, setCleaningReminderVisible] = useState(false);
  const [cleaningReminderData, setCleaningReminderData] = useState({});

  // State for cleaning record modal
  const [cleaningModalVisible, setCleaningModalVisible] = useState(false);
  const [beforeCleaningPhoto, setBeforeCleaningPhoto] = useState(null);
  const [afterCleaningPhoto, setAfterCleaningPhoto] = useState(null);


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
      setBins([]);
    }
  };

  const fetchMagnets = async () => {
    try {
      const response = await magnetApi.getAll();
      setMagnets(response.data || []);
    } catch (error) {
      console.error('Error fetching magnets:', error);
      setMagnets([]);
    }
  };

  const fetchRouteMappings = async () => {
    try {
      const response = await routeMagnetMappingApi.getAll();
      setRouteMappings(response.data || []);
    } catch (error) {
      console.error('Error fetching route mappings:', error);
      setRouteMappings([]);
    }
  };

  const fetchGodowns = async () => {
    try {
      const response = await godownApi.getAll();
      setGodowns(response.data || []);
    } catch (error) {
      console.error('Error fetching godowns:', error);
      setGodowns([]);
    }
  };

  const fetchCleaningRecords = async () => {
    try {
      const response = await magnetCleaningRecordApi.getAll();
      setCleaningRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching cleaning records:', error);
      setCleaningRecords([]);
    }
  };

  const fetchTransferSessions = async () => {
    try {
      const response = await transferSessionApi.getAll();
      setTransferSessions(response.data || []);
    } catch (error) {
      console.error('Error fetching transfer sessions:', error);
      setTransferSessions([]);
    }
  };

  useEffect(() => {
    fetchBins();
    fetchMagnets();
    fetchRouteMappings(); // Still fetching this data for potential use in other components or logic
    fetchGodowns();
    fetchCleaningRecords();
    fetchTransferSessions();
  }, []);

  // Fetch route mappings and godowns when the active tab changes to 'routeMappings'
  useEffect(() => {
    if (activeTab === 'routeMappings') {
      fetchRouteMappings();
      fetchGodowns();
    } else if (activeTab === 'cleaningRecords') {
      fetchCleaningRecords();
    } else if (activeTab === 'transferSessions') {
      fetchTransferSessions();
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

  // Update available bins when source godown changes - show ALL active bins
  useEffect(() => {
    if (selectedSourceGodown) {
      // Show all active bins, not just those with route mappings
      const activeBins = bins.filter(b => b.status === 'Active');
      const sortedBins = getSortedBinsByLastDigit(activeBins);
      setAvailableDestinationBins(sortedBins);
    } else {
      setAvailableDestinationBins([]);
    }
  }, [selectedSourceGodown, bins]);

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
        const bin = bins.find((b) => b.id === session.current_bin_id || b.id === session.destination_bin_id);

        if (magnet && godown && bin) {
          const intervalMinutes = Math.floor(cleaningIntervalSeconds / 60);
          const intervalSeconds = cleaningIntervalSeconds % 60;
          const intervalString = intervalMinutes > 0 ? `${intervalMinutes}m ${intervalSeconds}s` : `${intervalSeconds}s`;

          // Constructing the message for the cleaning reminder
          const sourceName = godown.name;
          const destName = bin.bin_number;
          const magnetNames = magnet.name;
          const timeString = `${Math.floor(elapsedSeconds / 3600)}h ${(Math.floor(elapsedSeconds / 60) % 60)}m ${(Math.floor(elapsedSeconds) % 60)}s`;

          const uncleanedMagnets = [{ id: magnet.id, name: magnet.name }]; // Assuming only one magnet per active session for this notification context
          const totalMagnetsOnRoute = 1; // Assuming only one magnet for this notification context

          // Play notification sound
          if (Platform.OS === 'web') {
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+l9r0yHosBSJ1xe/glEILElyx6OyrWBUIRJze8L9qIAUuhM/z1YU1Bhxqvu7mnEoODlOq5O+zYBoHPJXY88p8LgUecL/v45dGChFcsujuq1oVB0Kb3fLBaiEELIHN89OENAM');
              audio.play().catch(() => {});
            } catch (e) {
              console.error('Audio play error:', e);
            }
          }

          // Show custom cleaning reminder popup
          setCleaningReminderData({
            magnets: uncleanedMagnets,
            sourceName,
            destName,
            runningTime: timeString,
            cleaningInterval: intervalString,
            totalMagnets: totalMagnetsOnRoute,
          });
          setCleaningReminderVisible(true);
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
      showAlert('⚠️ Missing Information', 'Please select source godown and destination bin.');
      return;
    }

    // Try to find a route mapping (optional - only needed for cleaning reminders)
    const selectedRouteMapping = routeMappings.find(
      mapping => mapping.source_godown_id === parseInt(transferSessionFormData.source_godown_id) &&
                 mapping.destination_bin_id === parseInt(transferSessionFormData.destination_bin_id)
    );

    const payload = {
      source_godown_id: parseInt(transferSessionFormData.source_godown_id),
      destination_bin_id: parseInt(transferSessionFormData.destination_bin_id),
      magnet_id: selectedRouteMapping?.magnet_id || null,
      cleaning_interval_hours: selectedRouteMapping?.cleaning_interval_hours || null,
      notes: ''
    };

    try {
      setLoading(true);
      const response = await transferSessionApi.start(payload);
      const data = response.data;

      // Start notification check only if there's a magnet and cleaning interval
      if (data.magnet_id && data.cleaning_interval_hours) {
        startNotificationCheck(data.id, data.cleaning_interval_hours);
      }

      // Prepare success message details
      const sourceName = godowns.find(g => g.id === parseInt(transferSessionFormData.source_godown_id))?.name || 'Unknown';
      const destBin = bins.find(b => b.id === parseInt(transferSessionFormData.destination_bin_id))?.bin_number || 'Unknown';

      let successMessage = `✅ Transfer Started Successfully!\n\n📍 Route: ${sourceName} → Bin ${destBin}`;

      if (data.magnet_id) {
        const magnetName = magnets.find(m => m.id === data.magnet_id)?.name || 'Unknown';
        const intervalMin = Math.floor(data.cleaning_interval_hours / 60);
        const intervalSec = data.cleaning_interval_hours % 60;
        const intervalDisplay = intervalMin > 0 ? `${intervalMin} minute${intervalMin > 1 ? 's' : ''}` : `${intervalSec} seconds`;
        successMessage += `\n🧲 Magnet: ${magnetName}\n⏱️ Cleaning Interval: ${intervalDisplay}\n\nThe system will remind you to clean the magnet at regular intervals.`;
      } else {
        successMessage += `\n\n⚠️ No route mapping configured - cleaning reminders disabled.\nTo enable cleaning reminders, create a route mapping in the "Route Mappings" tab.`;
      }

      // Show success alert
      showAlert('✅ Transfer Started', successMessage);

      setStartTransferModal(false);
      await fetchTransferSessions();
    } catch (error) {
      console.error('❌ Error starting transfer:', error);

      let errorMessage = 'An unexpected error occurred while starting the transfer.';
      let errorTitle = '❌ Transfer Failed';

      if (error.response?.status === 400) {
        errorTitle = '⚠️ Invalid Request';
        errorMessage = error.response?.data?.detail || 'Please check your selections and try again.';
      } else if (error.message === 'Network Error' || !error.response) {
        errorTitle = '🔌 Connection Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = error.response?.data?.detail || errorMessage;
      }

      showAlert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewActiveTransfer = (session) => {
    setActiveTransferSession(session);
    setDivertTransferFormData({ new_bin_id: '', quantity_transferred: '' });
    setStopTransferFormData({ transferred_quantity: '' });
    setViewActiveTransferModal(true);
  };

  const handleDivertTransfer = async () => {
    if (!divertTransferFormData.new_bin_id || !divertTransferFormData.quantity_transferred) {
      showAlert('Error', 'Please fill in all required fields (New Bin and Quantity Transferred)');
      return;
    }

    const quantity = parseFloat(divertTransferFormData.quantity_transferred);
    if (isNaN(quantity) || quantity <= 0) {
      showAlert('Error', 'Please enter a valid quantity transferred');
      return;
    }

    try {
      setLoading(true);
      await transferSessionApi.divert(activeTransferSession.id, {
        new_bin_id: parseInt(divertTransferFormData.new_bin_id),
        quantity_transferred: quantity,
      });

      showAlert('✅ Transfer Diverted Successfully!', 'Transfer diverted successfully!');

      setDivertTransferModal(false);
      setViewActiveTransferModal(false);
      setActiveTransferSession(null);
      setDivertTransferFormData({ new_bin_id: '', quantity_transferred: '' });

      await fetchTransferSessions();
      await fetchBins();
      await fetchGodowns();
    } catch (error) {
      console.error('Error diverting transfer:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to divert transfer';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTransfer = async () => {
    if (!stopTransferFormData.transferred_quantity) {
      showAlert('Error', 'Please enter the transferred quantity');
      return;
    }

    const quantity = parseFloat(stopTransferFormData.transferred_quantity);
    if (isNaN(quantity) || quantity <= 0) {
      showAlert('Error', 'Please enter a valid transferred quantity');
      return;
    }

    try {
      setLoading(true);
      await transferSessionApi.stop(activeTransferSession.id, quantity);
      stopNotificationCheck(activeTransferSession.id);

      const sourceName = activeTransferSession.source_godown?.name || 'Unknown';
      const destBin = bins.find(b => b.id === activeTransferSession.current_bin_id)?.bin_number || activeTransferSession.destination_bin?.bin_number || 'Unknown';

      showAlert('✅ Transfer Completed', `Transfer completed.\n\nQuantities have been updated.`);

      setStopTransferModal(false);
      setViewActiveTransferModal(false);
      setActiveTransferSession(null);
      setStopTransferFormData({ transferred_quantity: '' });

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

      showAlert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransferSession = async (session) => {
    try {
      const confirmDelete = await showConfirm(
        'Confirm Delete',
        `Are you sure you want to delete this transfer session?\n\nSource: ${session.source_godown?.name || 'N/A'}\nDestination: ${session.destination_bin?.bin_number || 'N/A'}`
      );

      if (!confirmDelete) {
        console.log('Delete cancelled by user');
        return;
      }

      setLoading(true);
      await transferSessionApi.delete(session.id);
      stopNotificationCheck(session.id);
      await fetchTransferSessions();
      showToast('✅ Transfer session deleted successfully', 'success');
    } catch (error) {
      console.error('❌ Error deleting transfer session:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete transfer session';
      showAlert('❌ Delete Failed', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRouteMapping = async (mapping) => {
    try {
      const confirmDelete = await showConfirm(
        'Confirm Delete',
        `Are you sure you want to delete this route mapping?\n\nMagnet: ${mapping.magnet?.name || 'N/A'}`
      );

      if (!confirmDelete) {
        console.log('Delete cancelled by user');
        return;
      }

      setLoading(true);
      await routeMagnetMappingApi.delete(mapping.id);
      await fetchRouteMappings();
      showToast('✅ Route mapping deleted successfully', 'success');
    } catch (error) {
      console.error('❌ Error deleting route mapping:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete route mapping';
      showAlert('❌ Delete Failed', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRouteMapping = async () => {
    const sourceId = routeMappingFormData.source_type === 'godown'
      ? routeMappingFormData.source_godown_id
      : routeMappingFormData.source_bin_id;

    const cleaningInterval = parseInt(routeMappingFormData.cleaning_interval_hours);
    if (isNaN(cleaningInterval) || cleaningInterval <= 0) {
      showAlert('Validation Error', 'Please enter a valid positive number for the Cleaning Interval (in seconds).');
      return;
    }

    if (!routeMappingFormData.magnet_id || !sourceId || !routeMappingFormData.destination_bin_id) {
      showAlert('Error', 'Please fill in all required fields (Magnet, Source, Destination)');
      return;
    }

    try {
      setLoading(true);
      const mappingData = {
        magnet_id: parseInt(routeMappingFormData.magnet_id),
        destination_bin_id: parseInt(routeMappingFormData.destination_bin_id),
        cleaning_interval_hours: cleaningInterval,
      };

      if (routeMappingFormData.source_type === 'godown') {
        mappingData.source_godown_id = parseInt(routeMappingFormData.source_godown_id);
        mappingData.source_bin_id = null;
      } else {
        mappingData.source_bin_id = parseInt(routeMappingFormData.source_bin_id);
        mappingData.source_godown_id = null;
      }

      if (editingRouteMapping) {
        await routeMagnetMappingApi.update(editingRouteMapping.id, mappingData);
        showToast('Route mapping updated successfully');
      } else {
        await routeMagnetMappingApi.create(mappingData);
        showToast('Route mapping added successfully');
      }

      setModalVisible(false);
      await fetchRouteMappings();
    } catch (error) {
      console.error('Error saving route mapping:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to save route mapping');
    } finally {
      setLoading(false);
    }
  };

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
    setBeforeCleaningPhoto(null);
    setAfterCleaningPhoto(null);
    setCleaningModalVisible(true);
  };

  const openEditCleaningModal = (record) => {
    setEditingCleaningRecord(record);
    setCleaningFormData({
      magnet_id: record.magnet_id,
      transfer_session_id: record.transfer_session_id || '',
      cleaning_timestamp: record.cleaning_timestamp ? new Date(record.cleaning_timestamp) : new Date(),
      notes: record.notes || '',
    });

    // Helper function to construct full image URL
    const constructImageUrl = (imagePath) => {
      if (!imagePath) return null;

      let photoUrl = imagePath;

      // Remove Python byte string markers if present
      if (photoUrl.startsWith("b'") || photoUrl.startsWith('b"')) {
        photoUrl = photoUrl.slice(2, -1);
      }

      // If already a full URL, return as is
      if (photoUrl.startsWith('http')) {
        return { uri: photoUrl };
      }

      // Construct full URL using window location for web compatibility
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const baseUrl = `${protocol}//${hostname}:8000`;

      const fullUrl = photoUrl.startsWith('/')
        ? `${baseUrl}${photoUrl}`
        : `${baseUrl}/${photoUrl}`;

      console.log('Constructed image URL:', fullUrl);
      return { uri: fullUrl };
    };

    // Load existing images if available
    const beforePhoto = constructImageUrl(record.before_cleaning_photo);
    const afterPhoto = constructImageUrl(record.after_cleaning_photo);

    setBeforeCleaningPhoto(beforePhoto);
    setAfterCleaningPhoto(afterPhoto);
    setCleaningModalVisible(true);
  };

  const handleDeleteCleaningRecord = async (record) => {
    try {
      const confirmDelete = await showConfirm(
        'Confirm Delete',
        `Are you sure you want to delete this cleaning record?\n\nMagnet: ${record.magnet?.name || 'N/A'}\nCleaned: ${formatISTDateTime(record.cleaning_timestamp)}`
      );

      if (!confirmDelete) {
        console.log('Delete cancelled by user');
        return;
      }

      setLoading(true);
      await magnetCleaningRecordApi.delete(record.id);
      await fetchCleaningRecords();
      showToast('✅ Cleaning record deleted successfully', 'success');
    } catch (error) {
      console.error('❌ Error deleting cleaning record:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete cleaning record';
      showAlert('❌ Delete Failed', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const pickCleaningImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (type === 'before') {
          setBeforeCleaningPhoto(result.assets[0]);
        } else {
          setAfterCleaningPhoto(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showCustomAlert('Error', 'Failed to pick image');
    }
  };

  const captureCleaningImage = async (type) => {
    try {
      // Request camera permission if not already granted
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        showCustomAlert('Error', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (type === 'before') {
          setBeforeCleaningPhoto(result.assets[0]);
        } else {
          setAfterCleaningPhoto(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      showCustomAlert('Error', 'Failed to capture image');
    }
  };

  const handleSubmitCleaningRecord = async () => {
    if (!cleaningRecordFormData.magnet_id) {
      showAlert('Error', 'Please select a magnet');
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

      // Append image files if they exist
      if (beforeCleaningPhoto && beforeCleaningPhoto.uri) {
        // Extract file name and type if available from URI
        let uriParts = beforeCleaningPhoto.uri.split('/');
        let filename = uriParts[uriParts.length - 1];
        // Infer type from filename extension, default to 'image'
        let fileType = filename.includes('.') ? `image/${filename.split('.').pop()}` : 'image';

        formDataToSend.append('before_cleaning_photo', {
          uri: Platform.OS === 'android' ? beforeCleaningPhoto.uri : beforeCleaningPhoto.uri.replace('file://', ''),
          name: filename,
          type: fileType,
        });
      }

      if (afterCleaningPhoto && afterCleaningPhoto.uri) {
        // Extract file name and type if available from URI
        let uriParts = afterCleaningPhoto.uri.split('/');
        let filename = uriParts[uriParts.length - 1];
        // Infer type from filename extension, default to 'image'
        let fileType = filename.includes('.') ? `image/${filename.split('.').pop()}` : 'image';

        formDataToSend.append('after_cleaning_photo', {
          uri: Platform.OS === 'android' ? afterCleaningPhoto.uri : afterCleaningPhoto.uri.replace('file://', ''),
          name: filename,
          type: fileType,
        });
      }

      if (editingCleaningRecord) {
        await magnetCleaningRecordApi.update(editingCleaningRecord.id, formDataToSend);
        showToast('Cleaning record updated successfully');
      } else {
        await magnetCleaningRecordApi.create(formDataToSend);
        showToast('Cleaning record added successfully');
      }

      setCleaningModalVisible(false);
      await fetchCleaningRecords();
    } catch (error) {
      console.error('Error saving cleaning record:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to save cleaning record');
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
      render: (val, item) => (item?.magnet?.name || 'N/A')
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
      render: (val, item) => (item?.magnet?.status || 'N/A')
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
      render: (val) => (val?.name || '-')
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
      render: (val) => (val ? '✓' : '-')
    },
    {
      field: 'after_cleaning_photo',
      label: 'After Photo',
      flex: 1,
      render: (val) => (val ? '✓' : '-')
    },
    { field: 'notes', label: 'Notes', flex: 2 },
  ];

  const transferSessionColumns = [
    {
      field: 'source_godown',
      label: 'Source Godown',
      flex: 1.2,
      render: (val) => (val?.name || '-')
    },
    {
      field: 'current_bin',
      label: 'Current Bin',
      flex: 1.2,
      render: (val, item) => {
        if (item.current_bin) return item.current_bin.bin_number;
        return (item.destination_bin?.bin_number || '-');
      }
    },
    {
      field: 'magnet',
      label: 'Magnet',
      flex: 1.2,
      render: (val) => (val?.name || '-')
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
      render: (val) => (val ? val.toFixed(2) : '-')
    },
    {
      field: 'status',
      label: 'Status',
      flex: 0.8,
      render: (val) => (val ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() : '-')
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
            {/* Route Mappings tab is removed */}
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

        {activeTab === 'cleaningRecords' ? (
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
              onEdit={openEditCleaningModal}
              onDelete={handleDeleteCleaningRecord}
              loading={loading}
              emptyMessage="No cleaning records found"
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
              onView={(session) => {
                if (session.status?.toLowerCase() === 'active') {
                  handleViewActiveTransfer(session);
                }
              }}
              onDelete={handleDeleteTransferSession}
              loading={loading}
              emptyMessage="No transfer sessions found"
              viewLabel={(row) => row.status?.toLowerCase() === 'active' ? 'View' : null}
            />
          </>
        ) : null} {/* No content for routeMappings tab as it's removed */}

        {/* Start Transfer Modal */}
        <Modal
          visible={startTransferModal}
          onClose={() => setStartTransferModal(false)}
          title="Start Transfer Session"
          width={isMobile ? '95%' : isTablet ? '75%' : '50%'}
        >
          <ScrollView style={styles.modalContent}>
            <SelectDropdown
              label="Source Godown *"
              value={selectedSourceGodown}
              onValueChange={(value) => {
                setSelectedSourceGodown(value);
                setTransferSessionFormData({
                  ...transferSessionFormData,
                  source_godown_id: value,
                  destination_bin_id: ''
                });
              }}
              options={godowns.map(g => ({ label: g.name, value: String(g.id) }))}
              placeholder="Select source godown"
            />

            {selectedSourceGodown && availableDestinationBins.length > 0 && (
              <View style={styles.binSelectionContainer}>
                <Text style={styles.binSelectionLabel}>Destination Bin * (Ordered Sequentially)</Text>
                <View style={styles.binListContainer}>
                  {availableDestinationBins.map((bin) => (
                    <TouchableOpacity
                      key={bin.id}
                      style={styles.binOption}
                      onPress={() => setTransferSessionFormData({ ...transferSessionFormData, destination_bin_id: String(bin.id) })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.radioOuter}>
                        {transferSessionFormData.destination_bin_id === String(bin.id) && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <View style={styles.binInfoContainer}>
                        <Text style={styles.binNumberText}>Bin {bin.bin_number}</Text>
                        <Text style={styles.binDetailsText}>
                          Capacity: {bin.capacity} tons | Current: {bin.current_quantity || 0} tons
                        </Text>
                        <Text style={[styles.binStatusText, bin.status === 'Active' && styles.binStatusActive]}>
                          {bin.status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {selectedSourceGodown && availableDestinationBins.length === 0 && (
              <Text style={styles.noBinsText}>No active bins available. Please check bin status in the system.</Text>
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
          title="Active Transfer Session Details"
          width={isMobile ? '95%' : isTablet ? '80%' : '60%'}
        >
          <ScrollView style={styles.modalContent}>
            {activeTransferSession ? (
              <>
                <Text style={styles.sectionTitle}>Transfer Details</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Source Godown:</Text>
                  <Text style={styles.infoValue}>
                    {activeTransferSession.source_godown?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Destination Bin:</Text>
                  <Text style={styles.infoValue}>
                    {activeTransferSession.destination_bin?.bin_number || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Current Bin:</Text>
                  <Text style={styles.infoValue}>
                    {activeTransferSession.current_bin?.bin_number || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Magnet:</Text>
                  <Text style={styles.infoValue}>
                    {activeTransferSession.magnet?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Session Start:</Text>
                  <Text style={styles.infoValue}>
                    {formatISTDateTime(activeTransferSession.start_timestamp)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={styles.infoValue}>
                    {activeTransferSession.status}
                  </Text>
                </View>

                {activeTransferSession.bin_transfers && activeTransferSession.bin_transfers.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Bin Transfer History</Text>
                    {activeTransferSession.bin_transfers
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((binTransfer, index) => (
                        <View key={binTransfer.id} style={styles.binTransferCard}>
                          <Text style={styles.binTransferTitle}>
                            Transfer #{binTransfer.sequence} - Bin {binTransfer.bin?.bin_number || binTransfer.bin_id}
                          </Text>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Start Time:</Text>
                            <Text style={styles.infoValue}>
                              {formatISTDateTime(binTransfer.start_timestamp)}
                            </Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>End Time:</Text>
                            <Text style={styles.infoValue}>
                              {binTransfer.end_timestamp ? formatISTDateTime(binTransfer.end_timestamp) : 'In Progress'}
                            </Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Quantity:</Text>
                            <Text style={styles.infoValue}>
                              {binTransfer.quantity ? `${binTransfer.quantity.toFixed(2)} tons` : '-'}
                            </Text>
                          </View>
                        </View>
                      ))}
                  </>
                )}
              </>
            ) : (
              <Text>No active transfer session found.</Text>
            )}

            <View style={styles.buttonContainer}>
              <Button
                title="Divert to Next Bin"
                onPress={() => {
                  setViewActiveTransferModal(false);
                  setDivertTransferModal(true);
                }}
                variant="secondary"
              />
              <Button
                title="Stop Transfer"
                onPress={() => {
                  setViewActiveTransferModal(false);
                  setStopTransferModal(true);
                }}
                variant="outline"
              />
            </View>
          </ScrollView>
        </Modal>

        {/* Divert Transfer Modal */}
        <Modal
          visible={divertTransferModal}
          onClose={() => setDivertTransferModal(false)}
          title="Divert Transfer to Next Bin"
          width={isMobile ? '95%' : isTablet ? '75%' : '50%'}
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
          title="Stop Transfer"
          width={isMobile ? '95%' : isTablet ? '75%' : '50%'}
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

        {/* Cleaning Record Modal */}
        <Modal
          visible={cleaningModalVisible}
          onClose={() => {
            setCleaningModalVisible(false);
            setEditingCleaningRecord(null); // Reset editing state
            setCleaningRecordFormData({ // Reset form data
              magnet_id: '',
              transfer_session_id: '',
              cleaning_timestamp: new Date().toISOString(),
              notes: '',
            });
            setBeforeCleaningPhoto(null); // Clear photo states
            setAfterCleaningPhoto(null);
          }}
          title={editingCleaningRecord ? 'Edit Cleaning Record' : 'Add Cleaning Record'}
          width={isMobile ? '95%' : isTablet ? '75%' : '50%'}
        >
          <ScrollView style={styles.modalContent}>
            <SelectDropdown
              label="Magnet *"
              value={cleaningRecordFormData.magnet_id}
              onValueChange={(value) => {
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

            {/* Before Cleaning Photo Section */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>Before Cleaning Photo</Text>
              {beforeCleaningPhoto ? (
                <View>
                  <Image
                    source={{ uri: beforeCleaningPhoto.uri }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                    onError={(error) => {
                      console.error('Failed to load before cleaning photo:', error);
                      showCustomAlert('Error', 'Failed to load image');
                    }}
                    onLoad={() => console.log('Before cleaning photo loaded successfully')}
                  />
                  <Text style={styles.imageUrlDebug}>URL: {beforeCleaningPhoto.uri}</Text>
                  <View style={styles.imageButtonRow}>
                    <TouchableOpacity
                      onPress={() => captureCleaningImage('before')}
                      style={[styles.imageActionButton, styles.cameraButton]}
                    >
                      <Text style={styles.imageActionText}>📷 Capture</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => pickCleaningImage('before')}
                      style={[styles.imageActionButton, styles.galleryButton]}
                    >
                      <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureCleaningImage('before')}
                    style={[styles.uploadButton, styles.cameraButton]}
                  >
                    <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickCleaningImage('before')}
                    style={[styles.uploadButton, styles.galleryButton]}
                  >
                    <Text style={styles.uploadButtonText}>🖼️ Upload from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* After Cleaning Photo Section */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>After Cleaning Photo</Text>
              {afterCleaningPhoto ? (
                <View>
                  <Image
                    source={{ uri: afterCleaningPhoto.uri }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                    onError={(error) => {
                      console.error('Failed to load after cleaning photo:', error);
                      showCustomAlert('Error', 'Failed to load image');
                    }}
                    onLoad={() => console.log('After cleaning photo loaded successfully')}
                  />
                  <Text style={styles.imageUrlDebug}>URL: {afterCleaningPhoto.uri}</Text>
                  <View style={styles.imageButtonRow}>
                    <TouchableOpacity
                      onPress={() => captureCleaningImage('after')}
                      style={[styles.imageActionButton, styles.cameraButton]}
                    >
                      <Text style={styles.imageActionText}>📷 Capture</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => pickCleaningImage('after')}
                      style={[styles.imageActionButton, styles.galleryButton]}
                    >
                      <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureCleaningImage('after')}
                    style={[styles.uploadButton, styles.cameraButton]}
                  >
                    <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickCleaningImage('after')}
                    style={[styles.uploadButton, styles.galleryButton]}
                  >
                    <Text style={styles.uploadButtonText}>🖼️ Upload from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

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
                onPress={() => {
                  setCleaningModalVisible(false);
                  setEditingCleaningRecord(null);
                  setCleaningRecordFormData({
                    magnet_id: '',
                    transfer_session_id: '',
                    cleaning_timestamp: new Date().toISOString(),
                    notes: '',
                  });
                  setBeforeCleaningPhoto(null);
                  setAfterCleaningPhoto(null);
                }}
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

        {/* Cleaning Reminder Popup */}
        <CleaningReminder
          visible={cleaningReminderVisible}
          onClose={() => setCleaningReminderVisible(false)}
          {...cleaningReminderData}
        />

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
    flexWrap: 'wrap',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    marginBottom: 20,
    gap: 8,
  },
  tabContainerMobile: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minWidth: Platform.select({ web: 'auto', default: 100 }),
  },
  tabMobile: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabTextMobile: {
    fontSize: 14,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  modalContent: {
    padding: 16,
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
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    fontWeight: '600',
  },
  binSelectionContainer: {
    marginBottom: 16,
  },
  binSelectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  binListContainer: {
    gap: 12,
  },
  binOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  binInfoContainer: {
    flex: 1,
  },
  binNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  binDetailsText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  binStatusText: {
    fontSize: 12,
    color: colors.gray[600],
    fontWeight: '500',
  },
  binStatusActive: {
    color: colors.success || '#10b981',
  },
  noBinsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginVertical: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'column',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  binTransferCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  binTransferTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    minWidth: Platform.select({ web: 120, default: '100%' }),
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divertButton: {
    backgroundColor: colors.warning,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  stopButton: {
    backgroundColor: colors.error,
    borderWidth: 1,
    borderColor: colors.error,
  },
  actionButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  // Styles for image upload and preview
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  imageUploadButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageUploadButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  imageSection: {
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  imageButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  imageActionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  galleryButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  imageActionText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  uploadButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  imageUrlDebug: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
});