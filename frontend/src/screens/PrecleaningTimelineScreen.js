
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Layout from '../components/Layout';
import DatePicker from '../components/DatePicker';
import { transferSessionApi, magnetCleaningRecordApi, godownApi, binApi, magnetApi } from '../api/client';
import colors from '../theme/colors';
import { formatISTDateTime } from '../utils/dateUtils';
import { showError } from '../utils/customAlerts';

export default function PrecleaningTimelineScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [bins, setBins] = useState([]);
  const [magnets, setMagnets] = useState([]);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadTimelineData();
  }, [selectedDate]);

  const loadMasterData = async () => {
    try {
      const [godownsRes, binsRes, magnetsRes] = await Promise.all([
        godownApi.getAll(),
        binApi.getAll(),
        magnetApi.getAll(),
      ]);
      setGodowns(godownsRes.data);
      setBins(binsRes.data);
      setMagnets(magnetsRes.data);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, cleaningRecordsRes] = await Promise.all([
        transferSessionApi.getAll(),
        magnetCleaningRecordApi.getAll(),
      ]);

      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      const filteredSessions = sessionsRes.data.filter(session => {
        const sessionDate = new Date(session.start_timestamp).toISOString().split('T')[0];
        return sessionDate === selectedDateStr;
      });

      const enrichedTimeline = filteredSessions.map(session => {
        const sessionCleaningRecords = cleaningRecordsRes.data.filter(
          record => record.transfer_session_id === session.id
        );

        const events = [];
        
        events.push({
          type: 'start',
          timestamp: session.start_timestamp,
          description: `Transfer started from ${getGodownName(session.source_godown_id)} to ${getBinName(session.destination_bin_id)}`,
        });

        if (session.bin_transfers && session.bin_transfers.length > 0) {
          session.bin_transfers.forEach((transfer, index) => {
            if (index > 0) {
              events.push({
                type: 'divert',
                timestamp: transfer.start_timestamp,
                description: `Diverted to ${getBinName(transfer.bin_id)}`,
                quantity: transfer.quantity,
              });
            }
          });
        }

        sessionCleaningRecords.forEach(record => {
          events.push({
            type: 'cleaning',
            timestamp: record.cleaning_timestamp,
            description: `Magnet cleaned: ${getMagnetName(record.magnet_id)}`,
            magnetDetails: magnets.find(m => m.id === record.magnet_id),
            notes: record.notes,
          });
        });

        if (session.stop_timestamp) {
          events.push({
            type: 'stop',
            timestamp: session.stop_timestamp,
            description: `Transfer completed`,
            quantity: session.transferred_quantity,
          });
        }

        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return {
          session,
          events,
          cleaningRecords: sessionCleaningRecords,
        };
      });

      setTimelineData(enrichedTimeline);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      showError('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const getGodownName = (id) => {
    if (!id) return 'Unknown';
    const godown = godowns.find(g => g.id === parseInt(id));
    return godown ? godown.name : `Godown #${id}`;
  };

  const getBinName = (id) => {
    if (!id) return 'Unknown';
    const bin = bins.find(b => b.id === parseInt(id));
    return bin ? bin.bin_number : `Bin #${id}`;
  };

  const getMagnetName = (id) => {
    if (!id) return 'Unknown';
    const magnet = magnets.find(m => m.id === parseInt(id));
    return magnet ? magnet.name : `Magnet #${id}`;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'start':
        return '🚀';
      case 'divert':
        return '🔀';
      case 'cleaning':
        return '🧹';
      case 'stop':
        return '✅';
      default:
        return '📍';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'start':
        return '#3b82f6';
      case 'divert':
        return '#f59e0b';
      case 'cleaning':
        return '#10b981';
      case 'stop':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

  const renderTimelineSession = (data, index) => (
    <View key={index} style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle}>
          Session #{data.session.id}
        </Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: data.session.status === 'active' ? '#10b981' : '#6b7280' 
        }]}>
          <Text style={styles.statusText}>{data.session.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.sessionInfo}>
        <Text style={styles.sessionRoute}>
          {getGodownName(data.session.source_godown_id)} → {getBinName(data.session.destination_bin_id)}
        </Text>
        {data.session.transferred_quantity && (
          <Text style={styles.sessionQuantity}>
            Transferred: {data.session.transferred_quantity} tons
          </Text>
        )}
      </View>

      <View style={styles.timeline}>
        {data.events.map((event, eventIndex) => (
          <View key={eventIndex} style={styles.timelineEvent}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, { backgroundColor: getEventColor(event.type) }]}>
                <Text style={styles.timelineIconText}>{getEventIcon(event.type)}</Text>
              </View>
              {eventIndex < data.events.length - 1 && <View style={styles.timelineLine} />}
            </View>
            
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTime}>{formatISTDateTime(event.timestamp)}</Text>
              <Text style={styles.timelineDescription}>{event.description}</Text>
              
              {event.quantity && (
                <Text style={styles.timelineQuantity}>Quantity: {event.quantity} tons</Text>
              )}
              
              {event.magnetDetails && (
                <View style={styles.magnetDetails}>
                  <Text style={styles.magnetDetailLabel}>Magnet Details:</Text>
                  <Text style={styles.magnetDetailText}>• Name: {event.magnetDetails.name}</Text>
                  {event.magnetDetails.description && (
                    <Text style={styles.magnetDetailText}>• Description: {event.magnetDetails.description}</Text>
                  )}
                  {event.notes && (
                    <Text style={styles.magnetDetailText}>• Notes: {event.notes}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {data.cleaningRecords.length > 0 && (
        <View style={styles.cleaningSummary}>
          <Text style={styles.cleaningSummaryTitle}>
            Total Cleanings: {data.cleaningRecords.length}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Layout navigation={navigation} title="Raw Wheat Timeline" currentRoute="PrecleaningTimeline">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Raw Wheat Bin Process Timeline</Text>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={setSelectedDate}
          />
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadTimelineData}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? 'Loading...' : 'Refresh Timeline'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading timeline...</Text>
            </View>
          ) : timelineData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transfer sessions found for this date</Text>
            </View>
          ) : (
            timelineData.map((data, index) => renderTimelineSession(data, index))
          )}
        </ScrollView>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sessionInfo: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sessionRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sessionQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeline: {
    marginTop: 8,
  },
  timelineEvent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  timelineIconText: {
    fontSize: 20,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#d1d5db',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  timelineDescription: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  magnetDetails: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  magnetDetailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
  },
  magnetDetailText: {
    fontSize: 13,
    color: '#15803d',
    marginBottom: 3,
  },
  cleaningSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cleaningSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
