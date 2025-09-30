import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supplierApi, vehicleApi } from '../api/client';

export default function VehicleEntryScreen({ navigation }) {
  const [formData, setFormData] = useState({
    vehicle_number: '',
    supplier_id: '',
    bill_no: '',
    driver_name: '',
    driver_phone: '',
    arrival_time: new Date(),
    notes: '',
  });
  const [suppliers, setSuppliers] = useState([]);
  const [billPhoto, setBillPhoto] = useState(null);
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library permissions are required for this feature');
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const pickImage = async (type) => {
    Alert.alert(
      'Select Option',
      'Choose how to add the photo',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(type),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => chooseFromGallery(type),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async (type) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'bill') {
        setBillPhoto(result.assets[0]);
      } else {
        setVehiclePhoto(result.assets[0]);
      }
    }
  };

  const chooseFromGallery = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'bill') {
        setBillPhoto(result.assets[0]);
      } else {
        setVehiclePhoto(result.assets[0]);
      }
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, arrival_time: selectedDate });
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_number || !formData.supplier_id || !formData.bill_no) {
      Alert.alert('Error', 'Please fill in all required fields (Vehicle Number, Supplier, Bill No)');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('vehicle_number', formData.vehicle_number);
      submitData.append('supplier_id', formData.supplier_id);
      submitData.append('bill_no', formData.bill_no);
      submitData.append('driver_name', formData.driver_name || '');
      submitData.append('driver_phone', formData.driver_phone || '');
      submitData.append('arrival_time', formData.arrival_time.toISOString());
      submitData.append('notes', formData.notes || '');

      if (billPhoto && billPhoto.base64) {
        submitData.append('supplier_bill_photo', `data:image/jpeg;base64,${billPhoto.base64}`);
      }

      if (vehiclePhoto && vehiclePhoto.base64) {
        submitData.append('vehicle_photo', `data:image/jpeg;base64,${vehiclePhoto.base64}`);
      }

      await vehicleApi.create(submitData);
      Alert.alert('Success', 'Vehicle entry created successfully');
      
      setFormData({
        vehicle_number: '',
        supplier_id: '',
        bill_no: '',
        driver_name: '',
        driver_phone: '',
        arrival_time: new Date(),
        notes: '',
      });
      setBillPhoto(null);
      setVehiclePhoto(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to create vehicle entry');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Vehicle Entry</Text>

        <Text style={styles.label}>Vehicle Number *</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicle_number}
          onChangeText={(text) => setFormData({ ...formData, vehicle_number: text.toUpperCase() })}
          placeholder="e.g., UP16AB1234"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Supplier *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.supplier_id}
            onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
            style={styles.picker}
          >
            <Picker.Item label="Select Supplier" value="" />
            {suppliers.map((supplier) => (
              <Picker.Item
                key={supplier.id}
                label={`${supplier.supplier_name} - ${supplier.contact_person || 'N/A'}`}
                value={supplier.id}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Bill No *</Text>
        <TextInput
          style={styles.input}
          value={formData.bill_no}
          onChangeText={(text) => setFormData({ ...formData, bill_no: text })}
          placeholder="Enter bill number"
        />

        <Text style={styles.label}>Driver Name</Text>
        <TextInput
          style={styles.input}
          value={formData.driver_name}
          onChangeText={(text) => setFormData({ ...formData, driver_name: text })}
          placeholder="Enter driver name"
        />

        <Text style={styles.label}>Driver Phone</Text>
        <TextInput
          style={styles.input}
          value={formData.driver_phone}
          onChangeText={(text) => setFormData({ ...formData, driver_phone: text })}
          placeholder="Enter driver phone"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Arrival Time</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{formData.arrival_time.toLocaleString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={formData.arrival_time}
            mode="datetime"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <Text style={styles.label}>Supplier Bill Photo</Text>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={() => pickImage('bill')}
        >
          <Text style={styles.photoButtonText}>
            {billPhoto ? 'Change Bill Photo' : 'Add Bill Photo'}
          </Text>
        </TouchableOpacity>
        {billPhoto && (
          <Image source={{ uri: billPhoto.uri }} style={styles.preview} />
        )}

        <Text style={styles.label}>Vehicle Photo</Text>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={() => pickImage('vehicle')}
        >
          <Text style={styles.photoButtonText}>
            {vehiclePhoto ? 'Change Vehicle Photo' : 'Add Vehicle Photo'}
          </Text>
        </TouchableOpacity>
        {vehiclePhoto && (
          <Image source={{ uri: vehiclePhoto.uri }} style={styles.preview} />
        )}

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Enter any additional notes"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Submitting...' : 'Submit Entry'}
          </Text>
        </TouchableOpacity>
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
  photoButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 16,
    resizeMode: 'cover',
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
});
