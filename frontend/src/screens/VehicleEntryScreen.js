import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Layout from '../components/Layout';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import DatePicker from '../components/DatePicker';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { vehicleApi, supplierApi } from '../api/client';
import colors from '../theme/colors';
import { showNotification } from '../utils/notifications';
import { formatISTDate, toISTISOString } from '../utils/timeUtils';
import ImagePreview from '../components/ImagePreview';


export default function VehicleEntryScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_state_code: '',
    vehicle_second_part: '',
    vehicle_third_part: '',
    supplier_id: '',
    bill_no: '',
    driver_name: '',
    driver_phone: '',
    arrival_time: new Date(),
    empty_weight: '',
    gross_weight: '',
    notes: '',
    supplier_bill_photo: null,
    vehicle_photo_front: null,
    vehicle_photo_back: null,
    vehicle_photo_side: null,
    internal_weighment_slip: null,
    client_weighment_slip: null,
    transportation_copy: null,
  });
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    fetchVehicles();
    fetchSuppliers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data || []);
    } catch (error) {
      showNotification(error.message || 'Failed to fetch vehicles', 'error');
      setVehicles([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data || []);
    } catch (error) {
      showNotification(error.message || 'Failed to fetch suppliers', 'error');
      setSuppliers([]);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.vehicle_state_code || !formData.vehicle_second_part || !formData.vehicle_third_part || !formData.supplier_id || !formData.bill_no) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      const formDataToSend = new FormData();
      const vehicleNumber = `${formData.vehicle_state_code}-${formData.vehicle_second_part}-${formData.vehicle_third_part}`;
      formDataToSend.append('vehicle_number', vehicleNumber);
      formDataToSend.append('supplier_id', String(formData.supplier_id));
      formDataToSend.append('bill_no', formData.bill_no);
      formDataToSend.append('driver_name', formData.driver_name || '');
      formDataToSend.append('driver_phone', formData.driver_phone || '');
      formDataToSend.append('arrival_time', toISTISOString(formData.arrival_time));
      formDataToSend.append('empty_weight', formData.empty_weight || '0');
      formDataToSend.append('gross_weight', formData.gross_weight || '0');
      formDataToSend.append('notes', formData.notes || '');

      if (formData.supplier_bill_photo) {
        const photoUri = formData.supplier_bill_photo.uri || formData.supplier_bill_photo;
        if (Platform.OS === 'web') {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append('supplier_bill_photo', blob, 'supplier_bill.jpg');
        } else {
          formDataToSend.append('supplier_bill_photo', {
            uri: photoUri,
            type: 'image/jpeg',
            name: 'supplier_bill.jpg',
          });
        }
      }

      if (formData.vehicle_photo_front) {
        const photoUri = formData.vehicle_photo_front.uri || formData.vehicle_photo_front;
        if (Platform.OS === 'web') {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append('vehicle_photo_front', blob, 'vehicle_front.jpg');
        } else {
          formDataToSend.append('vehicle_photo_front', {
            uri: photoUri,
            type: 'image/jpeg',
            name: 'vehicle_front.jpg',
          });
        }
      }

      if (formData.vehicle_photo_back) {
        const photoUri = formData.vehicle_photo_back.uri || formData.vehicle_photo_back;
        if (Platform.OS === 'web') {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append('vehicle_photo_back', blob, 'vehicle_back.jpg');
        } else {
          formDataToSend.append('vehicle_photo_back', {
            uri: photoUri,
            type: 'image/jpeg',
            name: 'vehicle_back.jpg',
          });
        }
      }

      if (formData.vehicle_photo_side) {
        const photoUri = formData.vehicle_photo_side.uri || formData.vehicle_photo_side;
        if (Platform.OS === 'web') {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append('vehicle_photo_side', blob, 'vehicle_side.jpg');
        } else {
          formDataToSend.append('vehicle_photo_side', {
            uri: photoUri,
            type: 'image/jpeg',
            name: 'vehicle_side.jpg',
          });
        }
      }

      if (formData.internal_weighment_slip) {
        const photoUri = formData.internal_weighment_slip.uri || formData.internal_weighment_slip;
        if (Platform.OS === 'web') {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append('internal_weighment_slip', blob, 'internal_weighment.jpg');
        } else {
          formDataToSend.append('internal_weighment_slip', {
            uri: photoUri,
            type: 'image/jpeg',
            name: 'internal_weighment.jpg',
          });
        }
      }

      if (formData.client_weighment_slip) {
        const photoUri = formData.client_weighment_slip.uri || formData.client_weighment_slip;
        if (Platform.OS === 'web') {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append('client_weighment_slip', blob, 'client_weighment.jpg');
        } else {
          formDataToSend.append('client_weighment_slip', {
            uri: photoUri,
            type: 'image/jpeg',
            name: 'client_weighment.jpg',
          });
        }
      }

      if (formData.transportation_copy) {
        const photoUri = formData.transportation_copy.uri || formData.transportation_copy;
        if (Platform.OS === 'web') {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append('transportation_copy', blob, 'transportation.jpg');
        } else {
          formDataToSend.append('transportation_copy', {
            uri: photoUri,
            type: 'image/jpeg',
            name: 'transportation.jpg',
          });
        }
      }

      if (editingVehicle) {
        await vehicleApi.update(editingVehicle.id, formDataToSend);
        showNotification('Vehicle entry updated successfully!', 'success');
      } else {
        await vehicleApi.create(formDataToSend);
        showNotification('Vehicle entry created successfully!', 'success');
      }

      fetchVehicles();
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
      showNotification(error.response?.data?.detail || error.message || 'Failed to save vehicle entry', 'error');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    
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
    
    // Split vehicle number into parts (e.g., "KA-01-AB-1234" -> ["KA", "01", "AB-1234"])
    const vehicleNumberParts = vehicle.vehicle_number ? vehicle.vehicle_number.split('-') : ['', '', ''];
    const stateCode = vehicleNumberParts[0] || '';
    const secondPart = vehicleNumberParts[1] || '';
    const thirdPart = vehicleNumberParts.slice(2).join('-') || '';
    
    // Load existing images if available
    const supplierBillPhoto = constructImageUrl(vehicle.supplier_bill_photo);
    const vehiclePhotoFront = constructImageUrl(vehicle.vehicle_photo_front);
    const vehiclePhotoBack = constructImageUrl(vehicle.vehicle_photo_back);
    const vehiclePhotoSide = constructImageUrl(vehicle.vehicle_photo_side);
    const internalWeighmentSlip = constructImageUrl(vehicle.internal_weighment_slip);
    const clientWeighmentSlip = constructImageUrl(vehicle.client_weighment_slip);
    const transportationCopy = constructImageUrl(vehicle.transportation_copy);
    
    setFormData({
      vehicle_state_code: stateCode,
      vehicle_second_part: secondPart,
      vehicle_third_part: thirdPart,
      supplier_id: vehicle.supplier_id,
      bill_no: vehicle.bill_no,
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      arrival_time: vehicle.arrival_time ? new Date(vehicle.arrival_time) : new Date(),
      empty_weight: vehicle.empty_weight?.toString() || '',
      gross_weight: vehicle.gross_weight?.toString() || '',
      notes: vehicle.notes || '',
      supplier_bill_photo: supplierBillPhoto,
      vehicle_photo_front: vehiclePhotoFront,
      vehicle_photo_back: vehiclePhotoBack,
      vehicle_photo_side: vehiclePhotoSide,
      internal_weighment_slip: internalWeighmentSlip,
      client_weighment_slip: clientWeighmentSlip,
      transportation_copy: transportationCopy,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (vehicle) => {
    if (confirm('Are you sure you want to delete this vehicle entry?')) {
      try {
        await vehicleApi.delete(vehicle.id);
        showNotification('Vehicle entry deleted successfully!', 'success');
        fetchVehicles();
      } catch (error) {
        showNotification('Failed to delete vehicle entry', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_state_code: '',
      vehicle_second_part: '',
      vehicle_third_part: '',
      supplier_id: '',
      bill_no: '',
      driver_name: '',
      driver_phone: '',
      arrival_time: new Date(),
      empty_weight: '',
      gross_weight: '',
      notes: '',
      supplier_bill_photo: null,
      vehicle_photo_front: null,
      vehicle_photo_back: null,
      vehicle_photo_side: null,
      internal_weighment_slip: null,
      client_weighment_slip: null,
      transportation_copy: null,
    });
    setEditingVehicle(null);
    setIsModalVisible(false);
  };

  const pickImage = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, [field]: result.assets[0] });
    }
  };

  const columns = [
    { label: 'ID', field: 'id', flex: 0.5 },
    { label: 'Vehicle Number', field: 'vehicle_number', flex: 1 },
    { 
      label: 'Supplier', 
      field: 'supplier',
      flex: 1.5,
      render: (supplier) => supplier?.supplier_name || '-'
    },
    { label: 'Bill No', field: 'bill_no', flex: 1 },
    { 
      label: 'Arrival Time', 
      field: 'arrival_time',
      flex: 1.5,
      type: 'datetime'
    },
  ];

  return (
    <Layout title="Vehicle Entry">
      <DataTable
        columns={columns}
        data={vehicles}
        onAdd={() => setIsModalVisible(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        visible={isModalVisible}
        onClose={resetForm}
        title={editingVehicle ? 'Edit Vehicle Entry' : 'New Vehicle Entry'}
      >
        <ScrollView style={styles.form}>
          <Text style={styles.label}>Vehicle Number *</Text>
          <View style={styles.vehicleNumberRow}>
            <TextInput
              style={[styles.input, styles.vehicleInput]}
              value={formData.vehicle_state_code}
              onChangeText={(text) => setFormData({ ...formData, vehicle_state_code: text.toUpperCase() })}
              placeholder="KA"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.vehicleInput]}
              value={formData.vehicle_second_part}
              onChangeText={(text) => setFormData({ ...formData, vehicle_second_part: text })}
              placeholder="01"
              keyboardType="numeric"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.vehicleInput, styles.vehicleInputLarge]}
              value={formData.vehicle_third_part}
              onChangeText={(text) => setFormData({ ...formData, vehicle_third_part: text.toUpperCase() })}
              placeholder="AB-1234"
              maxLength={7}
            />
          </View>

          <SelectDropdown
            label="Supplier *"
            value={formData.supplier_id}
            onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
            options={suppliers.map(s => ({ label: s.supplier_name, value: s.id }))}
            placeholder="Select Supplier"
          />

          <InputField
            label="Bill Number *"
            value={formData.bill_no}
            onChangeText={(text) => setFormData({ ...formData, bill_no: text })}
            placeholder="Enter bill number"
          />

          <InputField
            label="Driver Name"
            value={formData.driver_name}
            onChangeText={(text) => setFormData({ ...formData, driver_name: text })}
            placeholder="Enter driver name"
          />

          <View>
            <Text style={styles.label}>Driver Phone</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCodeBox}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={formData.driver_phone}
                onChangeText={(text) => setFormData({ ...formData, driver_phone: text.replace(/[^0-9]/g, '') })}
                placeholder="Enter 10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <DatePicker
            label="Arrival Time"
            value={formData.arrival_time}
            onChange={(date) => setFormData({ ...formData, arrival_time: date })}
            mode="datetime"
          />

          <InputField
            label="Empty Weight (kg)"
            value={formData.empty_weight}
            onChangeText={(text) => setFormData({ ...formData, empty_weight: text })}
            placeholder="Enter empty vehicle weight"
            keyboardType="numeric"
          />

          <InputField
            label="Gross Weight (kg)"
            value={formData.gross_weight}
            onChangeText={(text) => setFormData({ ...formData, gross_weight: text })}
            placeholder="Enter gross weight"
            keyboardType="numeric"
          />

          <InputField
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Additional notes"
            multiline
          />

          <View style={styles.imageSection}>
            <Text style={styles.label}>Supplier Bill Photo</Text>
            {formData.supplier_bill_photo ? (
              <View>
                <Image 
                  source={{ uri: formData.supplier_bill_photo.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load supplier bill photo:', error);
                    showNotification('Failed to load image', 'error');
                  }}
                  onLoad={() => console.log('Supplier bill photo loaded successfully')}
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.supplier_bill_photo.uri}</Text>
                <TouchableOpacity onPress={() => pickImage('supplier_bill_photo')} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => pickImage('supplier_bill_photo')} style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderText}>+ Tap to Upload Bill Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Vehicle Photo - Front *</Text>
            {formData.vehicle_photo_front ? (
              <View>
                <Image 
                  source={{ uri: formData.vehicle_photo_front.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load vehicle photo front:', error);
                    showNotification('Failed to load image', 'error');
                  }}
                  onLoad={() => console.log('Vehicle photo front loaded successfully')}
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.vehicle_photo_front.uri}</Text>
                <TouchableOpacity onPress={() => pickImage('vehicle_photo_front')} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => pickImage('vehicle_photo_front')} style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderText}>+ Tap to Upload Front Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Vehicle Photo - Back *</Text>
            {formData.vehicle_photo_back ? (
              <View>
                <Image 
                  source={{ uri: formData.vehicle_photo_back.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load vehicle photo back:', error);
                    showNotification('Failed to load image', 'error');
                  }}
                  onLoad={() => console.log('Vehicle photo back loaded successfully')}
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.vehicle_photo_back.uri}</Text>
                <TouchableOpacity onPress={() => pickImage('vehicle_photo_back')} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => pickImage('vehicle_photo_back')} style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderText}>+ Tap to Upload Back Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Vehicle Photo - Side *</Text>
            {formData.vehicle_photo_side ? (
              <View>
                <Image 
                  source={{ uri: formData.vehicle_photo_side.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load vehicle photo side:', error);
                    showNotification('Failed to load image', 'error');
                  }}
                  onLoad={() => console.log('Vehicle photo side loaded successfully')}
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.vehicle_photo_side.uri}</Text>
                <TouchableOpacity onPress={() => pickImage('vehicle_photo_side')} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => pickImage('vehicle_photo_side')} style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderText}>+ Tap to Upload Side Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Internal Weighment Slip</Text>
            {formData.internal_weighment_slip ? (
              <View>
                <Image 
                  source={{ uri: formData.internal_weighment_slip.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load internal weighment slip:', error);
                    showNotification('Failed to load image', 'error');
                  }}
                  onLoad={() => console.log('Internal weighment slip loaded successfully')}
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.internal_weighment_slip.uri}</Text>
                <TouchableOpacity onPress={() => pickImage('internal_weighment_slip')} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => pickImage('internal_weighment_slip')} style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderText}>+ Tap to Upload Internal Weighment Slip</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Client Side Weighment Slip</Text>
            {formData.client_weighment_slip ? (
              <View>
                <Image 
                  source={{ uri: formData.client_weighment_slip.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load client weighment slip:', error);
                    showNotification('Failed to load image', 'error');
                  }}
                  onLoad={() => console.log('Client weighment slip loaded successfully')}
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.client_weighment_slip.uri}</Text>
                <TouchableOpacity onPress={() => pickImage('client_weighment_slip')} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => pickImage('client_weighment_slip')} style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderText}>+ Tap to Upload Client Weighment Slip</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Transportation Copy</Text>
            {formData.transportation_copy ? (
              <View>
                <Image 
                  source={{ uri: formData.transportation_copy.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load transportation copy:', error);
                    showNotification('Failed to load image', 'error');
                  }}
                  onLoad={() => console.log('Transportation copy loaded successfully')}
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.transportation_copy.uri}</Text>
                <TouchableOpacity onPress={() => pickImage('transportation_copy')} style={styles.changeImageButton}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => pickImage('transportation_copy')} style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderText}>+ Tap to Upload Transportation Copy</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.buttonContainer, isMobile && styles.buttonContainerMobile]}>
            <Button
              title="Cancel"
              onPress={resetForm}
              variant="secondary"
              style={[styles.button, isMobile && styles.buttonMobile]}
            />
            <Button
              title={editingVehicle ? 'Update' : 'Save'}
              onPress={handleSubmit}
              style={[styles.button, isMobile && styles.buttonMobile]}
            />
          </View>
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  vehicleNumberRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  vehicleInput: {
    flex: 1,
    marginBottom: 0,
    textAlign: 'center',
  },
  vehicleInputLarge: {
    flex: 1.5,
  },
  imageSection: {
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonContainerMobile: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
  },
  buttonMobile: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    minWidth: 60,
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  changeImageButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    alignItems: 'center',
  },
  changeImageText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  imageUrlDebug: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
});