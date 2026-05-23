import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Image, ScrollView, Alert, ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// 1. Updated import to expo-image-picker
import * as ImagePicker from 'expo-image-picker';
import { fetchMyProfile, updateProfile } from '../api';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

const EditProfile = () => {
  const navigation = useNavigation();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePic, setProfilePic] = useState('https://via.placeholder.com/100');
  // 2. State to hold the selected image URI
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchMyProfile();
        if (data.user) {
          setName(data.user.username);
          setEmail(data.user.email);
          setPhone(data.user.phone_number || '');
          if (data.user.avatar_url) setProfilePic(data.user.avatar_url);
        }
      } catch (error: any) {
        Alert.alert("Error", "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 3. Updated function to handle image selection using expo-image-picker
  const handleSelectImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to update your profile picture.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square crop for profile picture
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfilePic(uri); // Preview instantly
      setSelectedImageUri(uri); // Store for upload
    }
  };

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert("Validation Error", "Username and Email are required.");
      return;
    }

    setLoading(true);
    try {
      // 4. Construct FormData for multipart request
      const formData = new FormData();
      formData.append('username', name);
      formData.append('email', email);
      formData.append('phone_number', phone);
      
      if (selectedImageUri) {
        // Construct file object for FormData based on your CreatePost reference
        const filename = selectedImageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('profilePic', {
          uri: selectedImageUri,
          name: filename,
          type: type,
        } as any);
      }
      
      const response = await updateProfile(formData);
      
      Alert.alert("Success", response.message || "Profile updated successfully!");
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.safeAreaSpacer} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Edit Profile</Text>
        
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.headerBtn}>
          {loading ? (
            <ActivityIndicator size="small" color="#7F9460" />
          ) : (
            <Text style={styles.doneText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageSection}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: profilePic }} 
              style={styles.avatar} 
            />
            {/* Attach handler to camera icon */}
            <TouchableOpacity onPress={handleSelectImage} style={styles.cameraIcon}>
                <Text style={{fontSize: 12}}>📷</Text>
            </TouchableOpacity>
          </View>
          {/* Attach handler to text */}
          <TouchableOpacity onPress={handleSelectImage}>
            <Text style={styles.changePhotoText}>Change Profile Picture</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          {/* USERNAME */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName} 
              placeholder="Enter username"
            />
          </View>

          {/* EMAIL */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput 
              style={styles.input} 
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter email"
            />
          </View>

          {/* PHONE */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput 
              style={styles.input} 
              value={phone} 
              onChangeText={setPhone} 
              keyboardType="phone-pad"
              placeholder="Enter phone number"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
  safeAreaSpacer: { height: STATUS_BAR_HEIGHT, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 15, height: 60, borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE'
  },
  headerBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cancelText: { color: '#666', fontSize: 16 },
  doneText: { color: '#7F9460', fontSize: 16, fontWeight: 'bold' },
  container: { flex: 1 },
  imageSection: { alignItems: 'center', paddingVertical: 30 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F0F0F0' },
  cameraIcon: { 
    position: 'absolute', bottom: 0, right: 5, backgroundColor: '#7F9460', 
    padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFF'
  },
  changePhotoText: { color: '#7F9460', marginTop: 15, fontWeight: '600', fontSize: 14 },
  inputSection: { paddingHorizontal: 25 },
  inputWrapper: { marginBottom: 25 },
  label: { color: '#7F9460', fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  input: { fontSize: 16, borderBottomWidth: 1.5, borderBottomColor: '#EEEEEE', paddingVertical: 10, color: '#333' }
});

export default EditProfile;