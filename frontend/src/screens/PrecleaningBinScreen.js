import React, { useState, useEffect } from 'react';
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

export default function PrecleaningBinScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState('bins');
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

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Filter for ACTIVE sessions (status-based, not just stop_timestamp)
      const activeTransferSessions = transferSessions.filter(session => 
        session.status?.toLowerCase() === 'active' && !session.stop_timestamp
      );

      console.log('🔍 Checking notifications every 5 seconds...', {
        totalSessions: transferSessions.length,
        activeSessions: activeTransferSessions.length
      });

      activeTransferSessions.forEach(session => {
        const startTime = new Date(session.start_timestamp);
        const now = new Date();
        const elapsedSeconds = (now - startTime) / 1000;
        const cleaningIntervalSeconds = session.cleaning_interval_hours || 300; // default 5 minutes

        const intervalsPassed = Math.floor(elapsedSeconds / cleaningIntervalSeconds);

        console.log(`📊 Session ${session.id}: elapsed=${Math.floor(elapsedSeconds)}s, interval=${cleaningIntervalSeconds}s, intervalsPassed=${intervalsPassed}`);

        // START showing alerts ONLY AFTER the first cleaning interval has passed
        if (intervalsPassed > 0) {
          const sourceName = godowns.find(g => g.id === session.source_godown_id)?.name || 'Unknown';
          const destName = bins.find(b => b.id === session.destination_bin_id)?.bin_number || 'Unknown';
          
          // Find ALL magnets on this route (same source godown -> destination bin)
          const routeMagnetsOnThisRoute = routeMappings.filter(mapping => 
            mapping.source_godown_id === session.source_godown_id &&
            mapping.destination_bin_id === session.destination_bin_id
          );

          // Check which magnets have been cleaned recently (within the current interval)
          const uncleanedMagnets = [];
          const cleanedMagnets = [];

          routeMagnetsOnThisRoute.forEach(mapping => {
            const magnet = magnets.find(m => m.id === mapping.magnet_id);
            if (!magnet) return;

            // Find the most recent cleaning record for this magnet in THIS SESSION
            const recentCleaningRecord = cleaningRecords
              .filter(record => 
                record.magnet_id === mapping.magnet_id && 
                record.transfer_session_id === session.id
              )
              .sort((a, b) => new Date(b.cleaning_timestamp) - new Date(a.cleaning_timestamp))[0];

            // A magnet is considered "cleaned" if it has a cleaning record within the CURRENT interval period
            if (recentCleaningRecord) {
              const cleaningTime = new Date(recentCleaningRecord.cleaning_timestamp);
              const timeSinceCleaningSeconds = (now - cleaningTime) / 1000;
              
              // If cleaned within the current interval, it's clean
              if (timeSinceCleaningSeconds < cleaningIntervalSeconds) {
                console.log(`  ✅ Magnet ${magnet.name} is CLEAN (cleaned ${Math.floor(timeSinceCleaningSeconds)}s ago)`);
                cleanedMagnets.push(magnet);
              } else {
                console.log(`  ❌ Magnet ${magnet.name} needs CLEANING (last cleaned ${Math.floor(timeSinceCleaningSeconds)}s ago)`);
                uncleanedMagnets.push(magnet);
              }
            } else {
              console.log(`  ❌ Magnet ${magnet.name} needs CLEANING (no cleaning record in this session)`);
              uncleanedMagnets.push(magnet);
            }
          });

          // Show notification EVERY 5 SECONDS if there are uncleaned magnets
          // This will keep showing until a cleaning record is created
          if (uncleanedMagnets.length > 0) {
            const timeElapsed = Math.floor(elapsedSeconds);
            const minutes = Math.floor(timeElapsed / 60);
            const seconds = Math.floor(timeElapsed % 60);
            const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            
            // Format cleaning interval
            const intervalMinutes = Math.floor(cleaningIntervalSeconds / 60);
            const intervalSeconds = cleaningIntervalSeconds % 60;
            const intervalString = intervalMinutes > 0 ? `${intervalMinutes}m ${intervalSeconds}s` : `${intervalSeconds}s`;

            const totalMagnetsOnRoute = routeMagnetsOnThisRoute.length;
            const magnetNames = uncleanedMagnets.map(m => m.name).join(', ');
            
            const alertMessage = `🔔 MAGNET CLEANING REQUIRED!\n\nTransfer: ${sourceName} → Bin ${destName}\nUncleaned: ${uncleanedMagnets.length} of ${totalMagnetsOnRoute} magnets\nMagnets: ${magnetNames}\nRunning time: ${timeString}\nCleaning Interval: ${intervalString}\n\n⚠️ Please create cleaning record NOW!`;

            console.log(`🔔 ALERT EVERY 5 SECONDS for session ${session.id}: ${uncleanedMagnets.length} magnet(s) need cleaning`);

            // Play notification sound every time
            if (Platform.OS === 'web') {
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+l9r0yHosBSJ1xe/glEILElyx6OyrWBUIRJze8L9qIAUuhM/z1YU1Bhxqvu7mnEoODlOq5O+zYBoHPJXY88p8LgUecL/v45dGChFcsujuq1oVB0Kb3fLBaiEELIHN89OENAM');
                audio.play().catch(() => {});
              } catch (e) {
                console.error('Audio play error:', e);
              }

              // Show/update custom notification with bell icon (refreshes every 5 seconds)
              showCleaningNotification(alertMessage, session.id, intervalString, uncleanedMagnets.length, totalMagnetsOnRoute);
            } else {
              Alert.alert('🔔 Cleaning Reminder', alertMessage, [
                { text: 'OK', style: 'default' }
              ]);
            }
          } else {
            // All magnets are cleaned - IMMEDIATELY REMOVE notification
            if (Platform.OS === 'web') {
              const notification = document.getElementById(`cleaning-notification-${session.id}`);
              if (notification) {
                console.log('✅ REMOVING notification for session', session.id, '- all magnets cleaned!');
                notification.remove();
              }
            }
          }
        } else {
          // Before first interval - no alerts yet
          console.log(`⏳ Session ${session.id}: Waiting for first interval (${Math.floor(cleaningIntervalSeconds - elapsedSeconds)}s remaining)`);
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [transferSessions, godowns, bins, magnets, routeMappings, cleaningRecords]);

  const showCleaningNotification = (message, sessionId, intervalString, uncleanedCount, totalCount) => {
    // Remove any existing notifications for this session
    const existingNotification = document.getElementById(`cleaning-notification-${sessionId}`);
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = `cleaning-notification-${sessionId}`;
    notification.className = 'cleaning-notification';

    const messageLines = message.split('\n').filter(line => line.trim());
    const transferLine = messageLines.find(line => line.startsWith('Transfer from')) || '';
    const uncleanedLine = messageLines.find(line => line.startsWith('Uncleaned Magnets:')) || '';
    const magnetsLine = messageLines.find(line => line.startsWith('Magnets:')) || '';
    const timeLine = messageLines.find(line => line.startsWith('Running time:')) || '';
    const intervalLine = messageLines.find(line => line.startsWith('Cleaning Interval:')) || '';
    
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 20px 24px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(255,255,255,0.1);
        display: flex;
        align-items: flex-start;
        gap: 16px;
        z-index: 10000;
        animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), shake 0.5s ease-in-out 0.4s;
        min-width: 400px;
        max-width: 520px;
        border: 2px solid rgba(255,255,255,0.2);
      ">
        <div style="
          background: rgba(255,255,255,0.25);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          animation: bellRing 1s ease-in-out infinite;
          flex-shrink: 0;
        ">🔔</div>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            ⚠️ MAGNET CLEANING REQUIRED
          </div>
          <div style="font-size: 14px; opacity: 0.95; line-height: 1.6;">
            <div style="margin-bottom: 4px;">${transferLine}</div>
            <div style="
              background: rgba(255,255,255,0.2);
              padding: 8px 12px;
              border-radius: 8px;
              margin: 8px 0;
              font-weight: 700;
              font-size: 15px;
              border-left: 3px solid #fef3c7;
            ">${uncleanedLine}</div>
            <div style="font-size: 13px; margin-bottom: 4px; opacity: 0.9;">${magnetsLine}</div>
            <div style="font-weight: 600; color: #fef3c7; margin-top: 8px; margin-bottom: 2px;">${timeLine}</div>
            <div style="font-size: 12px; opacity: 0.85;">${intervalLine}</div>
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
      </div>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('cleaning-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'cleaning-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(500px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes bellRing {
          0%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(-15deg); }
          20%, 40% { transform: rotate(15deg); }
          50% { transform: rotate(0deg); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Keep notification visible (don't auto-remove for cleaning alerts)
  };

  const fetchBins = async () => {
    try {
      setLoading(true);
      const response = await binApi.getAll();
      setBins(response.data);
    } catch (error) {
      console.error('Error fetching bins:', error);
      Alert.alert('Error', 'Failed to load bins');
    } finally {
      setLoading(false);
    }
  };

  const fetchMagnets = async () => {
    try {
      setLoading(true);
      const response = await magnetApi.getAll();
      setMagnets(response.data);
    } catch (error) {
      console.error('Error fetching magnets:', error);
      Alert.alert('Error', 'Failed to load magnets');
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteMappings = async () => {
    try {
      setLoading(true);
      const response = await routeMagnetMappingApi.getAll();
      setRouteMappings(response.data);
    } catch (error) {
      console.error('Error fetching route mappings:', error);
      Alert.alert('Error', 'Failed to load route mappings');
    } finally {
      setLoading(false);
    }
  };

  const fetchGodowns = async () => {
    try {
      const response = await godownApi.getAll();
      setGodowns(response.data);
    } catch (error) {
      console.error('Error fetching godowns:', error);
    }
  };

  const fetchCleaningRecords = async () => {
    try {
      setLoading(true);
      const response = await magnetCleaningRecordApi.getAll();
      setCleaningRecords(response.data);
    } catch (error) {
      console.error('Error fetching cleaning records:', error);
      Alert.alert('Error', 'Failed to load cleaning records');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferSessions = async () => {
    try {
      setLoading(true);
      const response = await transferSessionApi.getAll();
      console.log('📦 Fetched transfer sessions:', response.data);
      console.log('📊 Session details:', response.data.map(s => ({
        id: s.id,
        status: s.status,
        stop_timestamp: s.stop_timestamp,
        cleaning_interval: s.cleaning_interval_hours,
        magnet_id: s.magnet_id
      })));
      setTransferSessions(response.data);
    } catch (error) {
      console.error('Error fetching transfer sessions:', error);
      
      let errorMessage = 'Unable to load transfer sessions. Please try again.';
      if (error.message === 'Network Error' || !error.response) {
        errorMessage = '🔌 Connection Error\n\nUnable to connect to the server. Please check your internet connection and refresh the page.';
      } else if (error.response?.status >= 500) {
        errorMessage = '🔧 Server Error\n\nThe server encountered an error. Please try again in a moment.';
      }
      
      if (Platform.OS === 'web') {
        console.error(errorMessage);
      } else {
        Alert.alert('⚠️ Loading Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBin = () => {
    setEditingBin(null);
    setEditingMagnet(null);
    setBinFormData({
      bin_number: '',
      capacity: '',
      current_quantity: '',
      status: 'Active',
    });
    setModalVisible(true);
  };

  const handleAddMagnet = () => {
    setEditingBin(null);
    setEditingMagnet(null);
    setEditingRouteMapping(null);
    setMagnetFormData({
      name: '',
      description: '',
      status: 'Active',
    });
    setModalVisible(true);
  };

  const handleAddRouteMapping = () => {
    setEditingBin(null);
    setEditingMagnet(null);
    setEditingRouteMapping(null);
    setRouteMappingFormData({
      magnet_id: '',
      source_type: 'godown',
      source_godown_id: '',
      source_bin_id: '',
      destination_bin_id: '',
      cleaning_interval_hours: '300', // 5 minutes in seconds
    });
    setModalVisible(true);
  };

  const handleEditRouteMapping = (mapping) => {
    setEditingRouteMapping(mapping);
    setEditingBin(null);
    setEditingMagnet(null);
    const sourceType = mapping.source_godown_id ? 'godown' : 'bin';
    setRouteMappingFormData({
      magnet_id: String(mapping.magnet_id),
      source_type: sourceType,
      source_godown_id: mapping.source_godown_id ? String(mapping.source_godown_id) : '',
      source_bin_id: mapping.source_bin_id ? String(mapping.source_bin_id) : '',
      destination_bin_id: String(mapping.destination_bin_id),
      cleaning_interval_hours: String(mapping.cleaning_interval_hours),
    });
    setModalVisible(true);
  };

  const handleAddCleaningRecord = () => {
    setEditingBin(null);
    setEditingMagnet(null);
    setEditingRouteMapping(null);
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
    setEditingBin(null);
    setEditingMagnet(null);
    setEditingRouteMapping(null);
    setCleaningRecordFormData({
      magnet_id: String(record.magnet_id),
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
      const formData = new FormData();
      formData.append('magnet_id', cleaningRecordFormData.magnet_id);
      if (cleaningRecordFormData.transfer_session_id) {
        formData.append('transfer_session_id', cleaningRecordFormData.transfer_session_id);
      }
      formData.append('cleaning_timestamp', cleaningRecordFormData.cleaning_timestamp);
      if (cleaningRecordFormData.notes) {
        formData.append('notes', cleaningRecordFormData.notes);
      }

      if (cleaningRecordFormData.before_cleaning_photo) {
        formData.append('before_cleaning_photo', cleaningRecordFormData.before_cleaning_photo);
      }

      if (cleaningRecordFormData.after_cleaning_photo) {
        formData.append('after_cleaning_photo', cleaningRecordFormData.after_cleaning_photo);
      }

      if (editingCleaningRecord) {
        await magnetCleaningRecordApi.update(editingCleaningRecord.id, formData);
        Alert.alert('Success', 'Cleaning record updated successfully');
      } else {
        await magnetCleaningRecordApi.create(formData);
        Alert.alert('Success', 'Cleaning record added successfully');
      }

      setModalVisible(false);
      
      // Refresh cleaning records immediately to get the latest data
      console.log('🔄 Refreshing cleaning records after submission...');
      const updatedCleaningRecordsResponse = await magnetCleaningRecordApi.getAll();
      setCleaningRecords(updatedCleaningRecordsResponse.data);
      
      // Check the session for this cleaning record
      const sessionId = cleaningRecordFormData.transfer_session_id ? parseInt(cleaningRecordFormData.transfer_session_id) : null;
      
      if (sessionId && Platform.OS === 'web') {
        const session = transferSessions.find(s => s.id === sessionId);
        
        if (session && session.status?.toLowerCase() === 'active' && !session.stop_timestamp) {
          // Find all magnets on this route
          const routeMagnetsOnThisRoute = routeMappings.filter(mapping => 
            mapping.source_godown_id === session.source_godown_id &&
            mapping.destination_bin_id === session.destination_bin_id
          );
          
          const cleaningIntervalSeconds = session.cleaning_interval_hours || 300;
          const now = new Date();
          
          // Check if ALL magnets on this route are now cleaned WITHIN THE CURRENT INTERVAL
          const allMagnetsCleaned = routeMagnetsOnThisRoute.every(mapping => {
            const recentCleaningRecord = updatedCleaningRecordsResponse.data
              .filter(record =>
                record.magnet_id === mapping.magnet_id && 
                record.transfer_session_id === session.id
              )
              .sort((a, b) => new Date(b.cleaning_timestamp) - new Date(a.cleaning_timestamp))[0];
            
            if (!recentCleaningRecord) {
              console.log(`  ❌ Magnet ${mapping.magnet_id}: No cleaning record`);
              return false;
            }
            
            const cleaningTime = new Date(recentCleaningRecord.cleaning_timestamp);
            const timeSinceCleaningSeconds = (now - cleaningTime) / 1000;
            
            const isCleaned = timeSinceCleaningSeconds < cleaningIntervalSeconds;
            console.log(`  ${isCleaned ? '✅' : '❌'} Magnet ${mapping.magnet_id}: cleaned ${Math.floor(timeSinceCleaningSeconds)}s ago`);
            
            return isCleaned;
          });
          
          console.log(`✅ Cleaning record submitted for session ${session.id}: All magnets cleaned? ${allMagnetsCleaned}`);
          
          // If all magnets are cleaned, IMMEDIATELY remove the notification
          if (allMagnetsCleaned) {
            const notification = document.getElementById(`cleaning-notification-${session.id}`);
            if (notification) {
              console.log(`🗑️ IMMEDIATELY removing notification for session ${session.id} - all magnets cleaned!`);
              notification.remove();
            }
          } else {
            console.log(`⚠️ Session ${session.id} still has uncleaned magnets - notification will continue`);
          }
        }
      }
    } catch (error) {
      console.error('Error saving cleaning record:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save cleaning record');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTransfer = () => {
    setEditingTransferSession(null);
    setTransferSessionFormData({
      source_godown_id: '',
      destination_bin_id: '',
      notes: '',
    });
    setModalVisible(true);
  };

  const handleSubmitStartTransfer = async () => {
    if (!transferSessionFormData.source_godown_id || !transferSessionFormData.destination_bin_id) {
      if (Platform.OS === 'web') {
        alert('⚠️ Missing Information\n\nPlease select both:\n• Source Godown\n• Destination Bin\n\nThese are required to start the transfer.');
      } else {
        Alert.alert(
          '⚠️ Missing Information',
          'Please select both source godown and destination bin to start the transfer.',
          [{ text: 'OK', style: 'default' }]
        );
      }
      return;
    }

    try {
      setLoading(true);
      const response = await transferSessionApi.start({
        source_godown_id: parseInt(transferSessionFormData.source_godown_id),
        destination_bin_id: parseInt(transferSessionFormData.destination_bin_id),
        notes: transferSessionFormData.notes,
      });

      console.log('✅ Transfer session started:', response.data);
      console.log('Cleaning interval (seconds):', response.data.cleaning_interval_hours);

      const sourceName = godowns.find(g => g.id === parseInt(transferSessionFormData.source_godown_id))?.name || 'Unknown';
      const destBin = bins.find(b => b.id === parseInt(transferSessionFormData.destination_bin_id))?.bin_number || 'Unknown';
      const magnetName = response.data.magnet?.name || 'Unknown';
      const intervalSec = response.data.cleaning_interval_hours || 300;
      const intervalMin = Math.floor(intervalSec / 60);
      const intervalDisplay = intervalMin > 0 ? `${intervalMin} minute${intervalMin > 1 ? 's' : ''}` : `${intervalSec} seconds`;

      if (Platform.OS === 'web') {
        alert(`✅ Transfer Started Successfully!\n\n📍 Route: ${sourceName} → Bin ${destBin}\n🧲 Magnet: ${magnetName}\n⏱️ Cleaning Interval: ${intervalDisplay}\n\n🔔 First notification will appear in ${intervalDisplay}\n\nThe system will remind you to clean the magnet at regular intervals during the transfer.`);
      } else {
        Alert.alert(
          '✅ Transfer Started',
          `Route: ${sourceName} → Bin ${destBin}\nMagnet: ${magnetName}\nCleaning Interval: ${intervalDisplay}\n\nFirst notification in ${intervalDisplay}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
      
      setModalVisible(false);
      await fetchTransferSessions();
    } catch (error) {
      console.error('❌ Error starting transfer:', error);
      console.error('Error details:', error.response?.data);
      
      let errorMessage = 'An unexpected error occurred while starting the transfer.';
      let errorTitle = '❌ Transfer Failed';
      
      if (error.response?.status === 404) {
        const detail = error.response?.data?.detail || '';
        if (detail.includes('No route mapping found')) {
          errorTitle = '⚠️ Route Not Configured';
          const sourceName = godowns.find(g => g.id === parseInt(transferSessionFormData.source_godown_id))?.name || 'selected godown';
          const destBin = bins.find(b => b.id === parseInt(transferSessionFormData.destination_bin_id))?.bin_number || 'selected bin';
          errorMessage = `No route mapping exists for:\n${sourceName} → Bin ${destBin}\n\n📋 To fix this:\n1. Go to "Route Mappings" tab\n2. Click "Add Route Mapping"\n3. Configure the route with a magnet and cleaning interval\n\nThen try starting the transfer again.`;
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

  const handleStopTransfer = (session) => {
    setEditingTransferSession(session);
    setStopTransferFormData({ transferred_quantity: '' });
    setStopTransferModal(true);
  };

  const handleSubmitStopTransfer = async () => {
    if (!stopTransferFormData.transferred_quantity) {
      if (Platform.OS === 'web') {
        alert('⚠️ Quantity Required\n\nPlease enter the quantity that was transferred (in tons) before stopping the session.');
      } else {
        Alert.alert(
          '⚠️ Quantity Required',
          'Please enter the transferred quantity in tons.',
          [{ text: 'OK', style: 'default' }]
        );
      }
      return;
    }

    const quantity = parseFloat(stopTransferFormData.transferred_quantity);
    if (isNaN(quantity) || quantity <= 0) {
      if (Platform.OS === 'web') {
        alert('⚠️ Invalid Quantity\n\nPlease enter a valid positive number for the transferred quantity.');
      } else {
        Alert.alert(
          '⚠️ Invalid Quantity',
          'Please enter a valid positive number.',
          [{ text: 'OK', style: 'default' }]
        );
      }
      return;
    }

    try {
      setLoading(true);
      await transferSessionApi.stop(editingTransferSession.id, quantity);

      const sourceName = editingTransferSession.source_godown?.name || 'Unknown';
      const destBin = editingTransferSession.destination_bin?.bin_number || 'Unknown';

      if (Platform.OS === 'web') {
        alert(`✅ Transfer Completed Successfully!\n\n📦 Quantity: ${quantity} tons\n📍 Route: ${sourceName} → Bin ${destBin}\n\nGodown and bin quantities have been updated.`);
      } else {
        Alert.alert(
          '✅ Transfer Completed',
          `${quantity} tons transferred from ${sourceName} to Bin ${destBin}.\n\nQuantities have been updated.`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      setStopTransferModal(false);
      setLastAlertTimes(prev => {
        const updated = { ...prev };
        delete updated[editingTransferSession.id];
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

    if (!routeMappingFormData.magnet_id || !sourceId || 
        !routeMappingFormData.destination_bin_id || !routeMappingFormData.cleaning_interval_hours) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const mappingData = {
        magnet_id: parseInt(routeMappingFormData.magnet_id),
        destination_bin_id: parseInt(routeMappingFormData.destination_bin_id),
        cleaning_interval_hours: parseInt(routeMappingFormData.cleaning_interval_hours),
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
              style={[styles.tab, activeTab === 'bins' && styles.activeTab, isMobile && styles.tabMobile]}
              onPress={() => setActiveTab('bins')}
            >
              <Text style={[styles.tabText, activeTab === 'bins' && styles.activeTabText, isMobile && styles.tabTextMobile]}>
                Bins
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'magnets' && styles.activeTab, isMobile && styles.tabMobile]}
              onPress={() => setActiveTab('magnets')}
            >
              <Text style={[styles.tabText, activeTab === 'magnets' && styles.activeTabText, isMobile && styles.tabTextMobile]}>
                Magnets
              </Text>
            </TouchableOpacity>
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

        {activeTab === 'bins' ? (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Add Bin"
                onPress={handleAddBin}
                variant="primary"
              />
            </View>

            <DataTable
              columns={binColumns}
              data={bins}
              onEdit={handleEditBin}
              onDelete={handleDeleteBin}
              loading={loading}
              emptyMessage="No bins found"
            />
          </>
        ) : activeTab === 'magnets' ? (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Add Magnet"
                onPress={handleAddMagnet}
                variant="primary"
              />
            </View>

            <DataTable
              columns={magnetColumns}
              data={magnets}
              onEdit={handleEditMagnet}
              onDelete={handleDeleteMagnet}
              loading={loading}
              emptyMessage="No magnets found"
            />
          </>
        ) : activeTab === 'routeMappings' ? (
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
                  handleStopTransfer(session);
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
                    onPress={handleSubmitStartTransfer}
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
                  placeholder="Cleaning timestamp"
                  value={cleaningRecordFormData.cleaning_timestamp ? formatISTDateTime(cleaningRecordFormData.cleaning_timestamp) : ''}
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