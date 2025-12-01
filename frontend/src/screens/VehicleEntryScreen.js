import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Layout from '../components/Layout';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import DatePicker from '../components/DatePicker';
import ImagePreview from '../components/ImagePreview';
import { vehicleApi, supplierApi } from '../api/client';
import { showNotification } from '../utils/notifications';
import { getFullImageUrl } from '../utils/imageUtils';
import { useFormSubmission } from '../utils/useFormSubmission';
import colors from '../theme/colors';
import { toISTISOString } from '../utils/timeUtils';

export default function VehicleEntryScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Refs for auto-focus on vehicle number fields
  let stateCodeRef = null;
  let secondPartRef = null;
  let thirdPartRef = null;

  const [formData, setFormData] = useState({
    vehicle_state_code: "",
    vehicle_second_part: "",
    vehicle_third_part: "",
    supplier_id: "",
    bill_no: "",
    driver_name: "",
    driver_phone: "",
    arrival_time: new Date(),
    empty_weight: "",
    gross_weight: "",
    notes: "",
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

  const { isSubmitting, handleSubmit } = useFormSubmission(
    async (data) => {
      const formDataToSend = new FormData();
      const vehicleNumber = `${data.vehicle_state_code}-${data.vehicle_second_part}-${data.vehicle_third_part}`;
      formDataToSend.append("vehicle_number", vehicleNumber);
      formDataToSend.append("supplier_id", String(data.supplier_id));
      formDataToSend.append("bill_no", data.bill_no);
      formDataToSend.append("driver_name", data.driver_name || "");
      formDataToSend.append("driver_phone", data.driver_phone || "");
      formDataToSend.append(
        "arrival_time",
        toISTISOString(data.arrival_time),
      );
      formDataToSend.append(
        "empty_weight",
        data.empty_weight ? String(data.empty_weight) : "0",
      );
      formDataToSend.append(
        "gross_weight",
        data.gross_weight ? String(data.gross_weight) : "0",
      );
      formDataToSend.append("notes", data.notes || "");

      // Append photos if they exist
      const appendPhoto = async (field, fileName) => {
        const photoUri = data[field]?.uri || data[field];
        if (photoUri) {
          if (Platform.OS === "web") {
            const response = await fetch(photoUri);
            const blob = await response.blob();
            formDataToSend.append(field, blob, fileName);
          } else {
            formDataToSend.append(field, {
              uri: photoUri,
              type: "image/jpeg",
              name: fileName,
            });
          }
        }
      };

      await appendPhoto("supplier_bill_photo", "supplier_bill.jpg");
      await appendPhoto("vehicle_photo_front", "vehicle_front.jpg");
      await appendPhoto("vehicle_photo_back", "vehicle_back.jpg");
      await appendPhoto("vehicle_photo_side", "vehicle_side.jpg");
      await appendPhoto("internal_weighment_slip", "internal_weighment.jpg");
      await appendPhoto("client_weighment_slip", "client_weighment.jpg");
      await appendPhoto("transportation_copy", "transportation.jpg");


      if (editingVehicle) {
        await vehicleApi.update(editingVehicle.id, formDataToSend);
        showNotification("Gate Entry updated successfully!", "success");
      } else {
        await vehicleApi.create(formDataToSend);
        showNotification("Gate Entry created successfully!", "success");
      }

      fetchVehicles();
      resetForm();
    },
    () => {
      // Validation logic
      if (
        !formData.vehicle_state_code ||
        !formData.vehicle_second_part ||
        !formData.vehicle_third_part ||
        !formData.supplier_id ||
        !formData.bill_no ||
        !formData.arrival_time
      ) {
        showNotification(
          "Please fill all required fields: Vehicle Number, Supplier, Bill Number, and Arrival Time",
          "error",
        );
        return false;
      }
      return true;
    }
  );


  useEffect(() => {
    fetchVehicles();
    fetchSuppliers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data || []);
    } catch (error) {
      showNotification(error.message || "Failed to load gate entries", "error");
      setVehicles([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data || []);
    } catch (error) {
      showNotification(error.message || "Failed to load suppliers", "error");
      setSuppliers([]);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);

    // Split vehicle number into parts (e.g., "KA-01-AB-1234" -> ["KA", "01", "AB-1234"])
    const vehicleNumberParts = vehicle.vehicle_number
      ? vehicle.vehicle_number.split("-")
      : ["", "", ""];
    const stateCode = vehicleNumberParts[0] || "";
    const secondPart = vehicleNumberParts[1] || "";
    const thirdPart = vehicleNumberParts.slice(2).join("-") || "";

    // Load existing images if available (convert relative paths to full URLs)
    const supplierBillPhoto = vehicle.supplier_bill_photo
      ? { uri: getFullImageUrl(vehicle.supplier_bill_photo) }
      : null;
    const vehiclePhotoFront = vehicle.vehicle_photo_front
      ? { uri: getFullImageUrl(vehicle.vehicle_photo_front) }
      : null;
    const vehiclePhotoBack = vehicle.vehicle_photo_back
      ? { uri: getFullImageUrl(vehicle.vehicle_photo_back) }
      : null;
    const vehiclePhotoSide = vehicle.vehicle_photo_side
      ? { uri: getFullImageUrl(vehicle.vehicle_photo_side) }
      : null;
    const internalWeighmentSlip = vehicle.internal_weighment_slip
      ? { uri: getFullImageUrl(vehicle.internal_weighment_slip) }
      : null;
    const clientWeighmentSlip = vehicle.client_weighment_slip
      ? { uri: getFullImageUrl(vehicle.client_weighment_slip) }
      : null;
    const transportationCopy = vehicle.transportation_copy
      ? { uri: getFullImageUrl(vehicle.transportation_copy) }
      : null;

    setFormData({
      vehicle_state_code: stateCode,
      vehicle_second_part: secondPart,
      vehicle_third_part: thirdPart,
      supplier_id: vehicle.supplier_id,
      bill_no: vehicle.bill_no,
      driver_name: vehicle.driver_name || "",
      driver_phone: vehicle.driver_phone || "",
      arrival_time: vehicle.arrival_time
        ? new Date(vehicle.arrival_time)
        : new Date(),
      empty_weight: vehicle.empty_weight?.toString() || "",
      gross_weight: vehicle.gross_weight?.toString() || "",
      notes: vehicle.notes || "",
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
    if (confirm("Are you sure you want to delete this vehicle entry?")) {
      try {
        await vehicleApi.delete(vehicle.id);
        showNotification("Gate Entry deleted successfully!", "success");
        fetchVehicles();
      } catch (error) {
        showNotification("Failed to delete Gate Entry", "error");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_state_code: "",
      vehicle_second_part: "",
      vehicle_third_part: "",
      supplier_id: "",
      bill_no: "",
      driver_name: "",
      driver_phone: "",
      arrival_time: new Date(),
      empty_weight: "",
      gross_weight: "",
      notes: "",
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

  const captureImage = async (field) => {
    // Request camera permission if not already granted
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      showNotification("Camera permission is required to take photos", "error");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, [field]: result.assets[0] });
    }
  };

  const showImageOptions = (field) => {
    if (Platform.OS === "web") {
      // On web, just use file picker
      pickImage(field);
    } else {
      // On mobile, show options
      alert("Choose an option", "", [
        { text: "Take Photo", onPress: () => captureImage(field) },
        { text: "Choose from Library", onPress: () => pickImage(field) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const columns = [
    { label: "ID", field: "id", flex: 0.5 },
    { label: "Vehicle Number", field: "vehicle_number", flex: 1 },
    {
      label: "Supplier",
      field: "supplier",
      flex: 1.5,
      render: (supplier) => supplier?.supplier_name || "-",
    },
    { label: "Bill No", field: "bill_no", flex: 1 },
    {
      label: "Arrival Time",
      field: "arrival_time",
      flex: 1.5,
      type: "datetime",
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
        title={editingVehicle ? "Edit Vehicle Entry" : "New Vehicle Entry"}
      >
        <ScrollView style={styles.form}>
          <Text style={styles.label}>Vehicle Number *</Text>
          <View style={styles.vehicleNumberRow}>
            <TextInput
              ref={(ref) => (stateCodeRef = ref)}
              style={[styles.input, styles.vehicleInput]}
              value={formData.vehicle_state_code}
              onChangeText={(text) => {
                const upperText = text.toUpperCase();
                setFormData({ ...formData, vehicle_state_code: upperText });
                if (upperText.length === 2 && secondPartRef) {
                  secondPartRef.focus();
                }
              }}
              placeholder="KA"
              maxLength={2}
            />
            <TextInput
              ref={(ref) => (secondPartRef = ref)}
              style={[styles.input, styles.vehicleInput]}
              value={formData.vehicle_second_part}
              onChangeText={(text) => {
                setFormData({ ...formData, vehicle_second_part: text });
                if (text.length === 2 && thirdPartRef) {
                  thirdPartRef.focus();
                }
              }}
              placeholder="01"
              keyboardType="numeric"
              maxLength={2}
            />
            <TextInput
              ref={(ref) => (thirdPartRef = ref)}
              style={[
                styles.input,
                styles.vehicleInput,
                styles.vehicleInputLarge,
              ]}
              value={formData.vehicle_third_part}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  vehicle_third_part: text.toUpperCase(),
                })
              }
              placeholder="AB-1234"
              maxLength={7}
            />
          </View>

          <SelectDropdown
            label="Supplier *"
            value={formData.supplier_id}
            onValueChange={(value) =>
              setFormData({ ...formData, supplier_id: value })
            }
            options={suppliers.map((s) => ({
              label: s.supplier_name,
              value: s.id,
            }))}
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
            onChangeText={(text) =>
              setFormData({ ...formData, driver_name: text })
            }
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
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    driver_phone: text.replace(/[^0-9]/g, ""),
                  })
                }
                placeholder="Enter 10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <DatePicker
            label="Arrival Time *"
            value={formData.arrival_time}
            onChange={(date) =>
              setFormData({ ...formData, arrival_time: date })
            }
            mode="datetime"
            placeholder="Select arrival date and time"
          />

          <InputField
            label="Empty Weight (kg)"
            value={formData.empty_weight}
            onChangeText={(text) =>
              setFormData({ ...formData, empty_weight: text })
            }
            placeholder="Enter empty vehicle weight"
            keyboardType="numeric"
          />

          <InputField
            label="Gross Weight (kg)"
            value={formData.gross_weight}
            onChangeText={(text) =>
              setFormData({ ...formData, gross_weight: text })
            }
            placeholder="Enter gross weight"
            keyboardType="numeric"
          />

          <View>
            <Text style={styles.label}>Net Weight (kg)</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={
                formData.empty_weight && formData.gross_weight
                  ? (
                      parseFloat(formData.gross_weight) -
                      parseFloat(formData.empty_weight)
                    ).toFixed(2)
                  : "0.00"
              }
              editable={false}
            />
          </View>

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
                    console.error("Failed to load supplier bill photo:", error);
                    showNotification("Failed to load image", "error");
                  }}
                  onLoad={() =>
                    console.log("Supplier bill photo loaded successfully")
                  }
                />
                <Text style={styles.imageUrlDebug}>URL: {formData.supplier_bill_photo.uri}</Text>
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureImage("supplier_bill_photo")}
                    style={[styles.imageActionButton, styles.cameraButton]}
                  >
                    <Text style={styles.imageActionText}>📷 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage("supplier_bill_photo")}
                    style={[styles.imageActionButton, styles.galleryButton]}
                  >
                    <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage("supplier_bill_photo")}
                  style={[styles.uploadButton, styles.cameraButton]}
                >
                  <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage("supplier_bill_photo")}
                  style={[styles.uploadButton, styles.galleryButton]}
                >
                  <Text style={styles.uploadButtonText}>
                    🖼️ Upload from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Vehicle Photo - Front</Text>
            {formData.vehicle_photo_front ? (
              <View>
                <Image
                  source={{ uri: formData.vehicle_photo_front.uri }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error("Failed to load vehicle photo front:", error);
                    showNotification("Failed to load image", "error");
                  }}
                  onLoad={() =>
                    console.log("Vehicle photo front loaded successfully")
                  }
                />
                <Text style={styles.imageUrlDebug}>
                  URL: {formData.vehicle_photo_front.uri}
                </Text>
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureImage("vehicle_photo_front")}
                    style={[styles.imageActionButton, styles.cameraButton]}
                  >
                    <Text style={styles.imageActionText}>📷 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage("vehicle_photo_front")}
                    style={[styles.imageActionButton, styles.galleryButton]}
                  >
                    <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage("vehicle_photo_front")}
                  style={[styles.uploadButton, styles.cameraButton]}
                >
                  <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage("vehicle_photo_front")}
                  style={[styles.uploadButton, styles.galleryButton]}
                >
                  <Text style={styles.uploadButtonText}>
                    🖼️ Upload from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Vehicle Photo - Back</Text>
            {formData.vehicle_photo_back ? (
              <View>
                <Image
                  source={{ uri: formData.vehicle_photo_back.uri }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error("Failed to load vehicle photo back:", error);
                    showNotification("Failed to load image", "error");
                  }}
                  onLoad={() =>
                    console.log("Vehicle photo back loaded successfully")
                  }
                />
                <Text style={styles.imageUrlDebug}>
                  URL: {formData.vehicle_photo_back.uri}
                </Text>
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureImage("vehicle_photo_back")}
                    style={[styles.imageActionButton, styles.cameraButton]}
                  >
                    <Text style={styles.imageActionText}>📷 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage("vehicle_photo_back")}
                    style={[styles.imageActionButton, styles.galleryButton]}
                  >
                    <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage("vehicle_photo_back")}
                  style={[styles.uploadButton, styles.cameraButton]}
                >
                  <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage("vehicle_photo_back")}
                  style={[styles.uploadButton, styles.galleryButton]}
                >
                  <Text style={styles.uploadButtonText}>
                    🖼️ Upload from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Vehicle Photo - Side</Text>
            {formData.vehicle_photo_side ? (
              <View>
                <Image
                  source={{ uri: formData.vehicle_photo_side.uri }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error("Failed to load vehicle photo side:", error);
                    showNotification("Failed to load image", "error");
                  }}
                  onLoad={() =>
                    console.log("Vehicle photo side loaded successfully")
                  }
                />
                <Text style={styles.imageUrlDebug}>
                  URL: {formData.vehicle_photo_side.uri}
                </Text>
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureImage("vehicle_photo_side")}
                    style={[styles.imageActionButton, styles.cameraButton]}
                  >
                    <Text style={styles.imageActionText}>📷 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage("vehicle_photo_side")}
                    style={[styles.imageActionButton, styles.galleryButton]}
                  >
                    <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage("vehicle_photo_side")}
                  style={[styles.uploadButton, styles.cameraButton]}
                >
                  <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage("vehicle_photo_side")}
                  style={[styles.uploadButton, styles.galleryButton]}
                >
                  <Text style={styles.uploadButtonText}>
                    🖼️ Upload from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
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
                    console.error(
                      "Failed to load internal weighment slip:",
                      error,
                    );
                    showNotification("Failed to load image", "error");
                  }}
                  onLoad={() =>
                    console.log("Internal weighment slip loaded successfully")
                  }
                />
                <Text style={styles.imageUrlDebug}>
                  URL: {formData.internal_weighment_slip.uri}
                </Text>
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureImage("internal_weighment_slip")}
                    style={[styles.imageActionButton, styles.cameraButton]}
                  >
                    <Text style={styles.imageActionText}>📷 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage("internal_weighment_slip")}
                    style={[styles.imageActionButton, styles.galleryButton]}
                  >
                    <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage("internal_weighment_slip")}
                  style={[styles.uploadButton, styles.cameraButton]}
                >
                  <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage("internal_weighment_slip")}
                  style={[styles.uploadButton, styles.galleryButton]}
                >
                  <Text style={styles.uploadButtonText}>
                    🖼️ Upload from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
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
                    console.error(
                      "Failed to load client weighment slip:",
                      error,
                    );
                    showNotification("Failed to load image", "error");
                  }}
                  onLoad={() =>
                    console.log("Client weighment slip loaded successfully")
                  }
                />
                <Text style={styles.imageUrlDebug}>
                  URL: {formData.client_weighment_slip.uri}
                </Text>
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureImage("client_weighment_slip")}
                    style={[styles.imageActionButton, styles.cameraButton]}
                  >
                    <Text style={styles.imageActionText}>📷 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage("client_weighment_slip")}
                    style={[styles.imageActionButton, styles.galleryButton]}
                  >
                    <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage("client_weighment_slip")}
                  style={[styles.uploadButton, styles.cameraButton]}
                >
                  <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage("client_weighment_slip")}
                  style={[styles.uploadButton, styles.galleryButton]}
                >
                  <Text style={styles.uploadButtonText}>
                    🖼️ Upload from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
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
                    console.error("Failed to load transportation copy:", error);
                    showNotification("Failed to load image", "error");
                  }}
                  onLoad={() =>
                    console.log("Transportation copy loaded successfully")
                  }
                />
                <Text style={styles.imageUrlDebug}>
                  URL: {formData.transportation_copy.uri}
                </Text>
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureImage("transportation_copy")}
                    style={[styles.imageActionButton, styles.cameraButton]}
                  >
                    <Text style={styles.imageActionText}>📷 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage("transportation_copy")}
                    style={[styles.imageActionButton, styles.galleryButton]}
                  >
                    <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage("transportation_copy")}
                  style={[styles.uploadButton, styles.cameraButton]}
                >
                  <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage("transportation_copy")}
                  style={[styles.uploadButton, styles.galleryButton]}
                >
                  <Text style={styles.uploadButtonText}>
                    🖼️ Upload from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View
            style={[
              styles.buttonContainer,
              isMobile && styles.buttonContainerMobile,
            ]}
          >
            <Button
              title="Cancel"
              onPress={resetForm}
              variant="secondary"
              style={[styles.button, isMobile && styles.buttonMobile]}
              disabled={isSubmitting}
            />
            <Button
              title={isSubmitting ? "Saving..." : editingVehicle ? "Update" : "Save"}
              onPress={() => handleSubmit(formData)}
              style={[styles.button, isMobile && styles.buttonMobile]}
              disabled={isSubmitting}
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
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  vehicleNumberRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
    flexWrap: "nowrap",
  },
  vehicleInput: {
    flex: 1,
    marginBottom: 0,
    textAlign: "center",
    minWidth: 60,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  vehicleInputLarge: {
    flex: 1.5,
    minWidth: 120,
  },
  imageSection: {
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  buttonContainerMobile: {
    flexDirection: "column",
  },
  button: {
    flex: 1,
  },
  buttonMobile: {
    width: "100%",
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
  },
  imagePreview: {
    width: "100%",
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
    alignItems: "center",
  },
  changeImageText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  uploadPlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  imageButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  imageActionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  cameraButton: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  galleryButton: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  imageActionText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  uploadButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  imageUrlDebug: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
});