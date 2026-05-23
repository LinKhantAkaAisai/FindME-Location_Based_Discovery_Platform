import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Image, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchUsers, BASE_URL } from '../api';

const { width } = Dimensions.get('window');

const CreatePost = ({ route, navigation }: any) => {
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [locationType, setLocationType] = useState<'current' | 'shop' | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Shop mode (premium dashboard)
  const shopMode = route.params?.shopMode || false;
  const shopId = route.params?.shopId || null;
  const shopName = route.params?.shopName || '';

  // Mention suggestions
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    if (route.params?.autoOpenPicker) {
      pickImage();
    }
    fetchShopsData();
    if (shopMode && shopId) {
      setSelectedShop({ shop_id: shopId, name: shopName });
      setLocation(shopName);
      setLocationType('shop');
    }
  }, [route.params]);

  const pickImage = async () => {
    if (images.length >= 10) {
      Alert.alert('Limit Reached', 'You can only add up to 10 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to post!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const fetchShopsData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/shops`);
      const data = await response.json();
      setShops(data);
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  // Mention handling
  const handleCaptionChange = async (text: string) => {
    setCaption(text);

    // Check for @mention
    const words = text.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.substring(1);
      setMentionQuery(query);
      try {
        const data = await searchUsers(query);
        setMentionResults(data.users || []);
        setShowMentions(data.users?.length > 0);
      } catch (err) {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const words = caption.split(' ');
    words[words.length - 1] = `@${username} `;
    setCaption(words.join(' '));
    setShowMentions(false);
  };

  const handleAddLocation = () => {
    setLocationModalVisible(true);
  };

  const handleCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;

      const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setLocation(locationString);
      setLocationType('current');
      setLocationModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Could not get location. Please try again.');
    }
  };

  const handleShopSelect = (shop: any) => {
    setSelectedShop(shop);
    setLocation(shop.name);
    setLocationType('shop');
    setLocationModalVisible(false);
  };

  const filteredShops = shops.filter((shop: any) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = async () => {
    if (images.length === 0) {
      Alert.alert("Error", "Please select at least one image!");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('content', caption);
    if (hashtags) formData.append('hashtags', hashtags);
    if (location) formData.append('location', location);

    // In shop mode, always use the shop ID and mark as official
    if (shopMode && shopId) {
      formData.append('shopId', shopId.toString());
      formData.append('isOfficial', 'true');
    } else if (selectedShop) {
      formData.append('shopId', selectedShop.shop_id.toString());
      formData.append('isOfficial', 'false');
    } else {
      formData.append('isOfficial', 'false');
    }

    images.forEach((uri, index) => {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('photos', {
        uri: uri,
        name: filename || `photo_${index}.jpg`,
        type: type,
      } as any);
    });

    try {
      const token = await AsyncStorage.getItem('findme_token');

      const response = await fetch(`${BASE_URL}/api/posts/create`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Post Shared Successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Upload Failed", result.error || "Something went wrong");
      }
    } catch (error) {
      Alert.alert("Upload Failed", "Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {shopMode ? `Post as ${shopName}` : 'New Post'}
        </Text>
        <TouchableOpacity onPress={handleShare} disabled={isUploading}>
          {isUploading ? (
            <ActivityIndicator size="small" color="#7F9460" />
          ) : (
            <Text style={[styles.headerAction, { color: '#7F9460', fontWeight: 'bold' }]}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Shop Mode Banner */}
      {shopMode && (
        <View style={styles.shopModeBanner}>
          <Text style={styles.shopModeText}>🏪 Posting as: {shopName}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 10 && (
              <TouchableOpacity style={styles.addButton} onPress={pickImage}>
                <Text style={styles.addButtonIcon}>+</Text>
                <Text style={styles.addButtonText}>Add Photo</Text>
                <Text style={styles.photoCount}>{images.length}/10</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Caption with mention support */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption... (use @ to mention)"
            placeholderTextColor="#757575"
            multiline
            value={caption}
            onChangeText={handleCaptionChange}
            textAlignVertical="top"
          />

          {/* Mention Suggestions */}
          {showMentions && (
            <View style={styles.mentionBox}>
              {mentionResults.map((user) => (
                <TouchableOpacity
                  key={user.user_id}
                  style={styles.mentionItem}
                  onPress={() => insertMention(user.username)}
                >
                  <Text style={styles.mentionUsername}>@{user.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Hashtags */}
        <View style={styles.hashtagSection}>
          <Text style={styles.hashtagLabel}>HASHTAGS</Text>
          <TextInput
            style={styles.hashtagInput}
            placeholder="coffee, mandalay, newshop"
            placeholderTextColor="#555"
            value={hashtags}
            onChangeText={setHashtags}
          />
          <Text style={styles.hashtagHint}>Separate with commas</Text>
        </View>

        <View style={styles.divider} />

        {/* Location */}
        {!shopMode && (
          <TouchableOpacity style={styles.actionItem} onPress={handleAddLocation}>
            <Text style={styles.actionIcon}>📍</Text>
            <View style={styles.locationTextContainer}>
              <Text style={styles.actionText}>
                {locationType === 'shop' ? `🏪 ${location}` : locationType === 'current' ? `📍 Current Location` : 'Add Location'}
              </Text>
              {location && <Text style={styles.locationSubtext}>{locationType === 'shop' ? selectedShop?.address : location}</Text>}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Location</Text>
              <View style={{ width: 50 }} />
            </View>

            <TouchableOpacity style={styles.locationOption} onPress={handleCurrentLocation}>
              <Text style={styles.locationOptionIcon}>📍</Text>
              <View style={styles.locationOptionText}>
                <Text style={styles.locationOptionTitle}>Use Current Location</Text>
                <Text style={styles.locationOptionSubtitle}>Tag your current GPS position</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search shops..."
                placeholderTextColor="#757575"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredShops}
              keyExtractor={(item) => item.shop_id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.shopItem} onPress={() => handleShopSelect(item)}>
                  <View style={styles.shopInfo}>
                    <Text style={styles.shopName}>{item.name}</Text>
                    <Text style={styles.shopCategory}>{item.category}</Text>
                    <Text style={styles.shopAddress}>{item.address}</Text>
                  </View>
                  <Text style={styles.shopChevron}>›</Text>
                </TouchableOpacity>
              )}
              style={styles.shopList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222'
  },
  headerAction: { color: '#8ab4f8', fontSize: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  shopModeBanner: { backgroundColor: '#7F9460', paddingVertical: 8, paddingHorizontal: 20 },
  shopModeText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  scrollContent: { paddingBottom: 30 },
  imageSection: { height: 180, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#050505' },
  imageScroll: { paddingHorizontal: 15, alignItems: 'center' },
  imageContainer: { width: 140, height: 140, marginRight: 15, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeButton: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  addButton: { width: 140, height: 140, backgroundColor: '#111', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#444', justifyContent: 'center', alignItems: 'center' },
  addButtonIcon: { color: '#7F9460', fontSize: 30, marginBottom: 5 },
  addButtonText: { color: '#757575', fontSize: 13 },
  photoCount: { color: '#444', fontSize: 11, marginTop: 4 },
  imageArea: { width: width, height: width, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { color: '#757575', marginTop: 10 },
  inputSection: { padding: 20 },
  captionInput: { color: 'white', fontSize: 16, minHeight: 80 },
  // Mentions
  mentionBox: { backgroundColor: '#222', borderRadius: 8, marginTop: 8, overflow: 'hidden' },
  mentionItem: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  mentionUsername: { color: '#8ab4f8', fontSize: 14, fontWeight: '600' },
  // Hashtags
  hashtagSection: { paddingHorizontal: 20, paddingBottom: 15 },
  hashtagLabel: { color: '#7F9460', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  hashtagInput: { color: 'white', fontSize: 14, borderBottomWidth: 1, borderBottomColor: '#333', paddingVertical: 8 },
  hashtagHint: { color: '#555', fontSize: 10, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#222' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  actionIcon: { fontSize: 20, marginRight: 15 },
  actionText: { color: 'white', fontSize: 16, flex: 1 },
  chevron: { color: '#555', fontSize: 20 },
  locationTextContainer: { flex: 1 },
  locationSubtext: { color: '#757575', fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { flex: 1, backgroundColor: '#000', marginTop: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalCancel: { color: '#8ab4f8', fontSize: 16 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  locationOption: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  locationOptionIcon: { fontSize: 24, marginRight: 15 },
  locationOptionText: { flex: 1 },
  locationOptionTitle: { color: 'white', fontSize: 16, fontWeight: '500' },
  locationOptionSubtitle: { color: '#757575', fontSize: 14, marginTop: 2 },
  searchSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  searchInput: { backgroundColor: '#111', color: 'white', borderRadius: 10, padding: 15, fontSize: 16 },
  shopList: { flex: 1 },
  shopItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  shopInfo: { flex: 1 },
  shopName: { color: 'white', fontSize: 16, fontWeight: '500' },
  shopCategory: { color: '#7F9460', fontSize: 14, marginTop: 2 },
  shopAddress: { color: '#757575', fontSize: 12, marginTop: 2 },
  shopChevron: { color: '#555', fontSize: 20 },
});

export default CreatePost;
