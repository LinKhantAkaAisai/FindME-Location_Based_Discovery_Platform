import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Switch, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';

import { registerShop } from '../api';

const RegisterShop = ({ navigation }: any) => {
  // --- STATE MANAGEMENT ---
  const [plan, setPlan] = useState<'standard' | 'premium'>('standard');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [isMapPickerVisible, setIsMapPickerVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  // Basic Info States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
    address: '',
  });

  // Time Picker States
  const [startHr, setStartHr] = useState('08');
  const [startMin, setStartMin] = useState('30');
  const [startAmPm, setStartAmPm] = useState('AM');
  const [endHr, setEndHr] = useState('05');
  const [endMin, setEndMin] = useState('00');
  const [endAmPm, setEndAmPm] = useState('PM');

  // Document uploads
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [ownershipImage, setOwnershipImage] = useState<string | null>(null);
  const [certificateImage, setCertificateImage] = useState<string | null>(null);

  // Dev mode
  const [devMode, setDevMode] = useState(false);

  const categories = ['Cafe', 'Beauty Salon', 'Cosmetic Shop'];

  // --- LOGIC ---

  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({});
          setLocation(currentLocation.coords);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, []);

  const getFormattedTimeRange = () => {
    return `${startHr}:${startMin}${startAmPm} to ${endHr}:${endMin}${endAmPm}`;
  };

  const pickImage = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const handleConfirmLocation = () => {
    if (tempLocation) {
      setLocation(tempLocation);
      setIsMapPickerVisible(false);
    }
  };

  const jumpToMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        mapRef.current?.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (error) {
      console.error('Error jumping to location:', error);
    }
  };

  const handleDevAutoFill = () => {
    setFormData({
      name: 'Test Shop ' + Math.floor(Math.random() * 1000),
      email: 'test@shop.com',
      phone_number: '09123456789',
      password: 'password123',
      address: '123 Main St, Mandalay',
    });
    setCategory('Cafe');
    setDescription('A test shop created via dev mode.');
    setPlan('premium');
  };

  const handleFinalSubmit = async () => {
    const finalTime = getFormattedTimeRange();

    if (!formData.name || !formData.phone_number || !category) {
      Alert.alert("Error", "Please fill in all required business details.");
      return;
    }

    if (plan === 'premium' && !devMode) {
      if (!receiptImage || !ownershipImage || !certificateImage) {
        Alert.alert("Error", "Please upload all required documents (receipt, ownership form, certificate).");
        return;
      }
    }

    try {
      setIsLoading(true);

      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('phone_number', formData.phone_number);
      fd.append('category', category);
      fd.append('description', description);
      fd.append('address', formData.address);
      fd.append('location_latitude', String(location?.latitude || 21.9470));
      fd.append('location_longitude', String(location?.longitude || 96.1080));
      fd.append('opening_hours', finalTime);
      fd.append('plan', plan);
      fd.append('devMode', String(devMode));

      if (plan === 'premium' && !devMode) {
        const appendFile = (fieldName: string, uri: string) => {
          const filename = uri.split('/').pop() || `${fieldName}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          fd.append(fieldName, { uri, name: filename, type } as any);
        };
        if (receiptImage) appendFile('receipt', receiptImage);
        if (ownershipImage) appendFile('ownership_form', ownershipImage);
        if (certificateImage) appendFile('certificate', certificateImage);
      }

      const result = await registerShop(fd);

      Alert.alert("Success", result.message);
      navigation.goBack();
    } catch (error: any) {
      console.error("Registration Error:", error);
      Alert.alert("Registration Failed", error.message || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Business</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* DEV MODE TOGGLE */}
          <View style={styles.devToggleRow}>
            <Text style={styles.devToggleLabel}>🛠 Dev Mode</Text>
            <Switch
              value={devMode}
              onValueChange={(val) => setDevMode(val)}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#FFD700' }}
              thumbColor={devMode ? '#FFF' : '#DDD'}
            />
          </View>
          {devMode && (
            <TouchableOpacity style={styles.devAutoFillBtn} onPress={handleDevAutoFill}>
              <Text style={styles.devAutoFillText}>⚡ Auto-Fill All Fields</Text>
            </TouchableOpacity>
          )}

          {/* SECTION 1: IDENTITY */}
          <Text style={styles.sectionHeader}>BUSINESS DETAILS</Text>
          <TextInput
            style={styles.input}
            placeholder="Shop Name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.name}
            onChangeText={(v) => setFormData({ ...formData, name: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Business Email"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(v) => setFormData({ ...formData, email: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="phone-pad"
            value={formData.phone_number}
            onChangeText={(v) => setFormData({ ...formData, phone_number: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Shop Address"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.address}
            onChangeText={(v) => setFormData({ ...formData, address: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Shop Password"
            placeholderTextColor="rgba(255,255,255,0.4)"
            secureTextEntry
            value={formData.password}
            onChangeText={(v) => setFormData({ ...formData, password: v })}
          />

          {/* SECTION 2: CATEGORY & DESCRIPTION */}
          <Text style={styles.sectionHeader}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {categories.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.categoryBtn, category === item && styles.categoryBtnActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.categoryBtnText, category === item && styles.categoryTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionHeader}>SHORT DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write a few lines about your shop..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          {/* SECTION 3: OPERATING HOURS */}
          <Text style={styles.sectionHeader}>OPERATING HOURS</Text>
          <View style={styles.timeCard}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Opens:</Text>
              <View style={styles.timePickerContainer}>
                <TextInput style={styles.timeInput} value={startHr} onChangeText={setStartHr} keyboardType="numeric" maxLength={2} />
                <Text style={styles.colon}>:</Text>
                <TextInput style={styles.timeInput} value={startMin} onChangeText={setStartMin} keyboardType="numeric" maxLength={2} />
                <TouchableOpacity onPress={() => setStartAmPm(startAmPm === 'AM' ? 'PM' : 'AM')} style={styles.ampmBtn}>
                  <Text style={styles.ampmText}>{startAmPm}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Closes:</Text>
              <View style={styles.timePickerContainer}>
                <TextInput style={styles.timeInput} value={endHr} onChangeText={setEndHr} keyboardType="numeric" maxLength={2} />
                <Text style={styles.colon}>:</Text>
                <TextInput style={styles.timeInput} value={endMin} onChangeText={setEndMin} keyboardType="numeric" maxLength={2} />
                <TouchableOpacity onPress={() => setEndAmPm(endAmPm === 'AM' ? 'PM' : 'AM')} style={styles.ampmBtn}>
                  <Text style={styles.ampmText}>{endAmPm}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SECTION 4: LOCATION */}
          <Text style={styles.sectionHeader}>LOCATION</Text>
          <TouchableOpacity
            style={[styles.locationBtn, location && { borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setIsMapPickerVisible(true)}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name={location ? "location" : "map-outline"}
                size={20}
                color={location ? "#4CAF50" : "#7F9460"}
              />
            </View>
            <Text style={styles.locationBtnText}>
              {location
                ? "📍 Location Selected"
                : "Select Shop Location on Map"
              }
            </Text>
            {location ? (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
            )}
          </TouchableOpacity>

          {/* SECTION 5: PLAN SELECTION */}
          <Text style={styles.sectionHeader}>CHOOSE A PLAN</Text>
          <View style={styles.planRow}>
            <TouchableOpacity
              style={[styles.planCard, plan === 'standard' && styles.activePlan]}
              onPress={() => setPlan('standard')}
            >
              <Ionicons name="map-outline" size={22} color={plan === 'standard' ? '#FFF' : '#FFFFFF66'} />
              <Text style={styles.planTitle}>Standard</Text>
              <Text style={styles.planPrice}>Free</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, plan === 'premium' && styles.activePlan]}
              onPress={() => setPlan('premium')}
            >
              <Ionicons name="star" size={22} color={plan === 'premium' ? '#FFD700' : '#FFFFFF66'} />
              <Text style={styles.planTitle}>Premium</Text>
              <Text style={styles.planPrice}>50,000 MMK</Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 6: PREMIUM DOCUMENTS */}
          {plan === 'premium' && (
            <View style={styles.paymentContainer}>
              <Text style={styles.sectionHeader}>VERIFICATION DOCUMENTS</Text>

              {devMode ? (
                <View style={styles.devPaymentSkip}>
                  <Ionicons name="flash" size={24} color="#FFD700" />
                  <Text style={styles.devPaymentText}>Dev Mode: All documents auto-approved</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.paymentInstructions}>
                    Upload the following documents for admin verification. All 3 are required.
                  </Text>

                  {/* 1. Payment Receipt */}
                  <Text style={styles.docLabel}>💳 Payment Receipt</Text>
                  <TouchableOpacity style={styles.receiptUploadBtn} onPress={() => pickImage(setReceiptImage)}>
                    {receiptImage ? (
                      <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
                    ) : (
                      <View style={styles.receiptPlaceholder}>
                        <Ionicons name="receipt-outline" size={28} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.receiptPlaceholderText}>Upload Payment Screenshot</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* 2. Ownership Form */}
                  <Text style={styles.docLabel}>📋 Ownership Form</Text>
                  <TouchableOpacity style={styles.receiptUploadBtn} onPress={() => pickImage(setOwnershipImage)}>
                    {ownershipImage ? (
                      <Image source={{ uri: ownershipImage }} style={styles.receiptPreview} />
                    ) : (
                      <View style={styles.receiptPlaceholder}>
                        <Ionicons name="document-text-outline" size={28} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.receiptPlaceholderText}>Upload Ownership Document</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* 3. Certificate */}
                  <Text style={styles.docLabel}>🏅 Business Certificate</Text>
                  <TouchableOpacity style={styles.receiptUploadBtn} onPress={() => pickImage(setCertificateImage)}>
                    {certificateImage ? (
                      <Image source={{ uri: certificateImage }} style={styles.receiptPreview} />
                    ) : (
                      <View style={styles.receiptPlaceholder}>
                        <Ionicons name="ribbon-outline" size={28} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.receiptPlaceholderText}>Upload Business Certificate</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* SUBMIT */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
            onPress={handleFinalSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#7F9460" />
            ) : (
              <Text style={styles.submitBtnText}>
                {plan === 'premium' ? (devMode ? '⚡ Register (Dev)' : 'Submit for Review') : 'Register Free'}
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODERN MAP PICKER MODAL */}
      <Modal visible={isMapPickerVisible} animationType="fade" transparent={false}>
        <View style={styles.mapModalContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullMap}
            initialRegion={{
              latitude: location?.latitude || 21.9470,
              longitude: location?.longitude || 96.1080,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onRegionChangeComplete={(region) => {
              setTempLocation({
                latitude: region.latitude,
                longitude: region.longitude
              });
            }}
          />

          {/* Floating Header */}
          <View style={styles.floatingHeader}>
            <Text style={styles.floatingHeaderTitle}>Move map to center your shop</Text>
          </View>

          {/* Fixed Central Pin */}
          <View style={styles.pinOverlay} pointerEvents="none">
            <Ionicons name="location" size={48} color="#FF5252" />
            <View style={styles.pinShadow} />
          </View>

          {/* Floating My Location Button */}
          <TouchableOpacity style={styles.myLocBtn} onPress={jumpToMyLocation}>
            <Ionicons name="locate" size={24} color="#007AFF" />
          </TouchableOpacity>

          {/* Floating Action Buttons */}
          <View style={styles.mapActionWrapper}>
            <TouchableOpacity
              style={styles.mapFabCancel}
              onPress={() => setIsMapPickerVisible(false)}
            >
              <Text style={styles.mapFabCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapFabConfirm}
              onPress={handleConfirmLocation}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.mapFabConfirmText}>Confirm Choice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7F9460' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#FFF' },
  scrollContent: { paddingHorizontal: 25 },
  sectionHeader: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.5)', marginBottom: 12, letterSpacing: 1.5, marginTop: 25 },

  // Dev Mode
  devToggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)', padding: 14, borderRadius: 14, marginTop: 10,
  },
  devToggleLabel: { color: '#FFD700', fontSize: 14, fontWeight: 'bold' },
  devAutoFillBtn: {
    backgroundColor: 'rgba(255,215,0,0.2)', padding: 12, borderRadius: 12,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#FFD700',
  },
  devAutoFillText: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },

  // Inputs
  input: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 15, color: '#FFF', marginBottom: 15 },
  textArea: { height: 100, paddingTop: 15 },

  // Category Chips
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 5 },
  categoryBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  categoryBtnActive: { backgroundColor: '#FFF' },
  categoryBtnText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13 },
  categoryTextActive: { color: '#7F9460' },

  // Time Picker
  timeCard: { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, padding: 15 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 14, width: 60 },
  timePickerContainer: { flexDirection: 'row', alignItems: 'center' },
  timeInput: { backgroundColor: 'rgba(255,255,255,0.1)', width: 42, height: 38, borderRadius: 10, textAlign: 'center', color: '#FFF', fontWeight: 'bold' },
  colon: { color: '#FFF', marginHorizontal: 5, fontWeight: 'bold' },
  ampmBtn: { backgroundColor: '#FFF', marginLeft: 10, paddingHorizontal: 10, height: 38, borderRadius: 10, justifyContent: 'center' },
  ampmText: { color: '#7F9460', fontWeight: '900', fontSize: 12 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 12 },

  // Location Button
  locationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconCircle: { backgroundColor: '#FFF', padding: 8, borderRadius: 10, marginRight: 15 },
  locationBtnText: { flex: 1, color: '#FFF', fontWeight: '600', fontSize: 14 },

  // Plan Cards
  planRow: { flexDirection: 'row', justifyContent: 'space-between' },
  planCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  activePlan: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: '#FFF' },
  planTitle: { color: '#FFF', fontWeight: 'bold', marginTop: 8 },
  planPrice: { color: '#FFD700', fontSize: 16, fontWeight: '800', marginTop: 2 },

  // Payment
  paymentContainer: { marginTop: 20, padding: 15, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20 },
  paymentInstructions: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, marginBottom: 15 },
  docLabel: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  receiptUploadBtn: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', marginBottom: 5 },
  receiptPreview: { width: '100%', height: 200, borderRadius: 14 },
  receiptPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  receiptPlaceholderText: { color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 13 },
  devPaymentSkip: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 20 },
  devPaymentText: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },

  submitBtn: { backgroundColor: '#FFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  submitBtnText: { color: '#7F9460', fontWeight: 'bold', fontSize: 16 },

  // Map Picker Modal Styles
  mapModalContainer: { flex: 1, backgroundColor: '#000' },
  fullMap: { ...StyleSheet.absoluteFillObject },
  floatingHeader: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 20, alignItems: 'center', zIndex: 10 },
  floatingHeaderTitle: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  pinOverlay: { position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -48, alignItems: 'center', justifyContent: 'center' },
  pinShadow: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.3)', marginTop: -2 },
  myLocBtn: { position: 'absolute', bottom: 120, right: 20, backgroundColor: '#FFF', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  mapActionWrapper: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', gap: 15 },
  mapFabCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.9)', height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  mapFabCancelText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
  mapFabConfirm: { flex: 2, backgroundColor: '#7F9460', height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', elevation: 5 },
  mapFabConfirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default RegisterShop;