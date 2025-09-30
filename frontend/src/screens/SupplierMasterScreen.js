import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supplierApi, stateCityApi } from '../api/client';

export default function SupplierMasterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    address: '',
    state: '',
    city: '',
  });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    loadStates();
    loadSuppliers();
  }, []);

  const loadStates = async () => {
    const statesData = await stateCityApi.getStates();
    setStates(statesData || []);
  };

  const loadSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleStateChange = async (stateId, stateName) => {
    setSelectedStateId(stateId);
    setFormData({ ...formData, state: stateName, city: '' });
    setCities([]);
    
    if (stateId) {
      const citiesData = await stateCityApi.getCities(stateId);
      setCities(citiesData || []);
    }
  };

  const handleCityChange = (cityName) => {
    setFormData({ ...formData, city: cityName });
  };

  const handleSubmit = async () => {
    if (!formData.supplier_name || !formData.state || !formData.city) {
      Alert.alert('Error', 'Please fill in all required fields (Supplier Name, State, City)');
      return;
    }

    setLoading(true);
    try {
      await supplierApi.create(formData);
      Alert.alert('Success', 'Supplier created successfully');
      setFormData({
        supplier_name: '',
        contact_person: '',
        phone: '',
        address: '',
        state: '',
        city: '',
      });
      setSelectedStateId('');
      setCities([]);
      loadSuppliers();
    } catch (error) {
      Alert.alert('Error', 'Failed to create supplier');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Add Supplier</Text>
        
        <Text style={styles.label}>Supplier Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.supplier_name}
          onChangeText={(text) => setFormData({ ...formData, supplier_name: text })}
          placeholder="Enter supplier name"
        />

        <Text style={styles.label}>Contact Person</Text>
        <TextInput
          style={styles.input}
          value={formData.contact_person}
          onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
          placeholder="Enter contact person"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholder="Enter address"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>State *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedStateId}
            onValueChange={(itemValue, itemIndex) => {
              const state = states.find(s => s.state_id === itemValue);
              if (state) {
                handleStateChange(itemValue, state.state_name);
              }
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select State" value="" />
            {states.map((state) => (
              <Picker.Item
                key={state.state_id}
                label={state.state_name}
                value={state.state_id}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>City *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.city}
            onValueChange={handleCityChange}
            enabled={cities.length > 0}
            style={styles.picker}
          >
            <Picker.Item label="Select City" value="" />
            {cities.map((city) => (
              <Picker.Item
                key={city.district_id}
                label={city.district_name}
                value={city.district_name}
              />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Submitting...' : 'Add Supplier'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Suppliers List</Text>
        {suppliers.map((supplier) => (
          <View key={supplier.id} style={styles.supplierItem}>
            <Text style={styles.supplierName}>{supplier.supplier_name}</Text>
            <Text style={styles.supplierDetail}>
              Contact: {supplier.contact_person || 'N/A'}
            </Text>
            <Text style={styles.supplierDetail}>
              Location: {supplier.city}, {supplier.state}
            </Text>
            {supplier.phone && (
              <Text style={styles.supplierDetail}>Phone: {supplier.phone}</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  supplierItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  supplierDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
});
