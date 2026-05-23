import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, View, TextInput, Text,
  Alert, TouchableOpacity, Modal, ScrollView, Dimensions, ActivityIndicator, Linking, Image, Keyboard
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

import { fetchShops } from '../api';

// --- ROUTING UTILITY ---
const getRoadRoute = async (userCoords: any, shopCoords: any) => {
  const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImY1MDI3MWEwZGVmNzRkOGY5ZWE3MDAzMzM4MjE4Yjk2IiwiaCI6Im11cm11cjY0In0='; // Replace with your actual key

  const start = `${userCoords.longitude},${userCoords.latitude}`;
  const end = `${shopCoords.longitude},${shopCoords.latitude}`;

  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start}&end=${end}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].geometry.coordinates.map((coord: number[]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    }
    return null;
  } catch (error) {
    console.error("Routing Error:", error);
    return null;
  }
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Shop {
  shop_id: number;
  name: string;
  lat: number;
  lon: number;
  business_valid: boolean;
  address?: string;
  phone_number?: string;
  description?: string;
  category?: string;
  opening_hours?: any;
  logo_url?: string;
  plan_type?: string;
}

const BASE_URL = 'http://192.168.1.2:5000';

const getShopStatus = (timeStr?: any) => {
  let str = timeStr;
  if (typeof timeStr === 'object' && timeStr !== null) {
    str = timeStr.text || timeStr.display || JSON.stringify(timeStr);
  }

  if (!str || typeof str !== 'string' || !str.includes(' to ')) {
    return { status: 'UNKNOWN', color: '#757575', open: '--', close: '--' };
  }

  str = str.replace(/^"|"$/g, '');

  const parseToMinutes = (time: string) => {
    const match = time.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!match) return 0;
    let [_, hours, minutes, modifier] = match;
    let h = parseInt(hours);
    let m = minutes ? parseInt(minutes) : 0;
    if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
    if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const [startStr, endStr] = str.split(' to ');
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMin = parseToMinutes(startStr);
  const closeMin = parseToMinutes(endStr);

  const isOpen = currentMinutes >= openMin && currentMinutes <= closeMin;

  return {
    status: isOpen ? 'OPEN NOW' : 'CLOSED',
    color: isOpen ? '#7F9460' : '#F44336',
    open: startStr.trim(),
    close: endStr.trim()
  };
};

const MapScreen = ({ navigation }: any) => {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Derive categories dynamically from shops, EXCLUDING specific ones
  const excludedCategories = ['cosmetic', 'cafe', 'salon'];
  const categories = ['all', ...new Set(shops
    .map(s => s.category)
    .filter(c => c && !excludedCategories.includes(c.toLowerCase()))
  )];

  // New state for routing
  // Inside MapScreen component
  const [routeCoords, setRouteCoords] = useState<{ latitude: number, longitude: number }[] | null>(null); const [routingLoading, setRoutingLoading] = useState(false);
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location to see shops.');
        setLoading(false);
        return;
      }

      let userLoc = await Location.getCurrentPositionAsync({});
      setLocation(userLoc.coords);

      try {
        const data = await fetchShops();
        setShops(data);
        setFilteredShops(data);
      } catch (error: any) {
        console.error("Database connection failed:", error);
        Alert.alert("Connection Error", "Ensure your backend is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let filtered = shops;

    // 1. Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(shop =>
        shop.name.toLowerCase().includes(q) ||
        (shop.category && shop.category.toLowerCase().includes(q)) ||
        (shop.address && shop.address.toLowerCase().includes(q)) ||
        (shop.description && shop.description.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(shop =>
        shop.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 3. Verified Only Filter
    if (verifiedOnly) {
      filtered = filtered.filter(shop => shop.business_valid);
    }

    // 4. Exclude specific categories
    const excluded = ['cosmetic', 'cafe', 'salon'];
    filtered = filtered.filter(shop => !shop.category || !excluded.includes(shop.category.toLowerCase()));

    // 5. Sort and Limit (Nearby within 100m)
    if (filterType === 'nearest' && location) {
      filtered = filtered
        .map(shop => ({
          ...shop,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            Number(shop.lat),
            Number(shop.lon)
          )
        }))
        .filter(shop => (shop as any).distance <= 0.1) // Within 100m (0.1km)
        .sort((a, b) => (a as any).distance - (b as any).distance);
    }

    setFilteredShops(filtered);
  }, [shops, searchQuery, selectedCategory, filterType, location, verifiedOnly]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleMarkerPress = (shop: Shop) => {
    setSelectedShop(shop);
    setModalVisible(true);
  };

  const handleCall = (phone_number?: string) => {
    if (phone_number) {
      Linking.openURL(`tel:${phone_number}`);
    } else {
      Alert.alert("Error", "No phone number available.");
    }
  };

  const handleGetDirections = async (shop: Shop) => {
    if (!location) {
      Alert.alert("Error", "User location not found.");
      return;
    }

    setRoutingLoading(true); // Fix: Use the routing-specific state
    const coords = await getRoadRoute(location, { latitude: Number(shop.lat), longitude: Number(shop.lon) });

    if (coords) {
      setRouteCoords(coords);
      setModalVisible(false);

      // Crucial: Use the ref to zoom into the route
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 150, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    } else {
      Alert.alert("Error", "Could not calculate route.");
    }
    setRoutingLoading(false); // Fix: Use the routing-specific state
  };

  // Helper to get category-specific icons
  const getCategoryIcon = (category?: string) => {
    const cat = category?.toLowerCase();
    if (cat?.includes('coffee') || cat?.includes('cafe')) return '☕';
    if (cat?.includes('salon') || cat?.includes('beauty')) return '💇‍♀️';
    if (cat?.includes('cosmetic')) return '💄';
    return '📍';
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="none"
        showsCompass={true}
        onPress={() => Keyboard.dismiss()}
        mapPadding={{ top: 140, right: 20, bottom: 0, left: 0 }}
        initialRegion={{
          latitude: 21.9470,
          longitude: 96.1080,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      // REMOVE THIS LINE: region={location ? { ... } : undefined} 
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          maximumZ={19}
          shouldReplaceMapContent={true}
          {...({ userAgent: "ExpoApp/1.0" } as any)}
        />

        {location && (
          <Marker coordinate={location}>
            <View style={styles.userMarker} />
          </Marker>
        )}

        {filteredShops.map((shop) => (
          <Marker
            key={shop.shop_id}
            coordinate={{
              latitude: Number(shop.lat),
              longitude: Number(shop.lon)
            }}
            onPress={() => handleMarkerPress(shop)}
          >
            <View style={[
              styles.shopMarker,
              shop.plan_type === 'premium' ? styles.premiumMarker : styles.standardMarker
            ]}>
              {shop.logo_url ? (
                <Image
                  source={{ uri: `${BASE_URL}${shop.logo_url}` }}
                  style={styles.markerLogo}
                />
              ) : (
                <Text style={{ fontSize: 18 }}>{getCategoryIcon(shop.category)}</Text>
              )}
            </View>
          </Marker>
        ))}
        {/* --- ROUTE POLYLINE --- */}
        {routeCoords && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#007AFF"
          />
        )}
      </MapView>
      {/* Route Clear Button */}
      {routeCoords && (
        <TouchableOpacity style={styles.clearBtn} onPress={() => setRouteCoords(null)}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>✕ Clear Route</Text>
        </TouchableOpacity>
      )}
      {/* SEARCH AND FILTER OVERLAY */}
      <View style={styles.topOverlay}>
        <View style={styles.searchBar}>
          <Text style={{ marginRight: 10 }}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder={loading ? "Connecting..." : `Search shops...`}
            placeholderTextColor="#757575"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {(loading || routingLoading) && <ActivityIndicator size="small" color="#7F9460" />}
        </View>

        {/* Filter Trigger Button */}
        <TouchableOpacity
          style={[styles.filterTrigger, showFilters && { backgroundColor: '#7F9460' }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={[styles.filterTriggerText, showFilters && { color: 'white' }]}>
            {showFilters ? '✕ Close' : (selectedCategory !== 'all' || filterType !== 'all' || verifiedOnly) ? 'Filters (Active)' : 'Choose'}
          </Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filterContainer}>
            <Text style={styles.filterTitle}>Sort By</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterBtn, filterType === 'all' && styles.filterBtnActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterBtnText, filterType === 'all' && styles.filterBtnTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterBtn, filterType === 'nearest' && styles.filterBtnActive]}
                onPress={() => setFilterType('nearest')}
              >
                <Text style={[styles.filterBtnText, filterType === 'nearest' && styles.filterBtnTextActive]}>Nearby (100m)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryBtn, selectedCategory === category && styles.categoryBtnActive]}
                  onPress={() => setSelectedCategory(category || 'all')}
                >
                  <Text style={[styles.categoryBtnText, selectedCategory === category && styles.categoryBtnTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ height: 15 }} />

            <TouchableOpacity
              style={styles.verifiedToggle}
              onPress={() => setVerifiedOnly(!verifiedOnly)}
            >
              <View style={[styles.checkbox, verifiedOnly && styles.checkboxActive]}>
                {verifiedOnly && <Text style={{ color: 'white', fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={styles.verifiedToggleText}>Show Verified Premium Only</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {selectedShop && (() => {
                const shopTime = getShopStatus(selectedShop.opening_hours);
                return (
                  <>
                    <View style={styles.header}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shopName}>{selectedShop.name}</Text>
                        <View style={styles.badgeRow}>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: selectedShop.business_valid ? '#7F9460' : '#333' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: '#FFF' }
                            ]}>
                              {selectedShop.business_valid ? "✓ VERIFIED PREMIUM" : "STANDARD SHOP"}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                        <Text style={{ color: 'white' }}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.actionRow}>
                      {/* 1. GO BUTTON - Always Visible */}
                      <TouchableOpacity
                        style={[styles.profileBtn, { backgroundColor: '#007AFF' }]}
                        onPress={() => handleGetDirections(selectedShop)}
                      >
                        <Text style={styles.profileBtnText}>🚀 Go</Text>
                      </TouchableOpacity>

                      {/* 2. PROFILE BUTTON - Only for Verified */}
                      {selectedShop.business_valid && (
                        <TouchableOpacity
                          style={styles.profileBtn}
                          onPress={() => {
                            setModalVisible(false);
                            navigation.navigate('ShopProfile', { shopId: selectedShop.shop_id });
                          }}
                        >
                          <Text style={styles.profileBtnText}>Profile</Text>
                        </TouchableOpacity>
                      )}

                      {/* 3. CALL BUTTON - Always Visible */}
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => handleCall(selectedShop.phone_number)}
                      >
                        <Text style={styles.callBtnText}>📞 Call</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />
                    <View style={styles.infoSection}>
                      <Text style={styles.label}>ABOUT</Text>
                      <Text style={styles.descriptionText}>{selectedShop.description || "Welcome to our shop!"}</Text>

                      <View style={styles.timingCard}>
                        <View style={styles.timingIconWrapper}><Text>⏰</Text></View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.timingTitle}>WORKING HOURS</Text>
                            <Text style={{ color: shopTime.color, fontSize: 10, fontWeight: 'bold' }}>{shopTime.status}</Text>
                          </View>
                          <Text style={styles.timingValue}>{shopTime.open} - {shopTime.close}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.infoSection}>
                      <Text style={styles.label}>LOCATION</Text>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📍</Text>
                        <Text style={styles.addressText}>{selectedShop.address || "Location on Map"}</Text>
                      </View>
                    </View>
                  </>
                )
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { ...StyleSheet.absoluteFillObject },
  userMarker: { width: 18, height: 18, backgroundColor: '#007AFF', borderRadius: 9, borderWidth: 3, borderColor: 'white' },
  shopMarker: { width: 42, height: 42, borderRadius: 21, elevation: 5, alignItems: 'center', justifyContent: 'center' },
  premiumMarker: { backgroundColor: '#7F9460', borderColor: '#FFD700', borderWidth: 2.5 },
  standardMarker: { backgroundColor: 'white', borderWidth: 0 },
  markerLogo: { width: '100%', height: '100%', borderRadius: 21 },

  // Top Overlay
  topOverlay: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10 },
  searchBar: { flexDirection: 'row', backgroundColor: 'white', height: 50, borderRadius: 25, alignItems: 'center', paddingHorizontal: 20, elevation: 5 },
  input: { flex: 1, color: '#333', fontSize: 16 },

  // Filter Button
  filterTrigger: { backgroundColor: 'white', alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, elevation: 3, borderWidth: 1, borderColor: '#eee' },
  filterTriggerText: { color: '#7F9460', fontWeight: 'bold', fontSize: 13 },

  // Filter Box
  filterContainer: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginTop: 10, elevation: 10 },
  filterTitle: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 8, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  filterBtn: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#7F9460' },
  filterBtnText: { color: '#666', fontWeight: '600' },
  filterBtnTextActive: { color: 'white' },
  categoryScroll: { flexDirection: 'row' },
  categoryBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, backgroundColor: '#f5f5f5', marginRight: 8 },
  categoryBtnActive: { backgroundColor: '#7F9460' },
  categoryBtnText: { color: '#666', fontSize: 12 },
  categoryBtnTextActive: { color: 'white' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#121212', height: SCREEN_HEIGHT * 0.5, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  scrollContent: { paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  shopName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  badgeRow: { marginTop: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  closeBtn: { width: 30, height: 30, backgroundColor: '#333', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  profileBtnText: { color: 'white', fontWeight: 'bold' },
  callBtnText: { color: '#7F9460', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#222', marginBottom: 20 },
  infoSection: { marginBottom: 20 },
  label: { color: '#7F9460', fontSize: 11, fontWeight: 'bold', marginBottom: 10 },
  descriptionText: { color: '#ccc', lineHeight: 20 },
  timingCard: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  timingIconWrapper: { marginRight: 12 },
  timingTitle: { color: '#7F9460', fontSize: 10, fontWeight: 'bold' },
  timingValue: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { marginRight: 10 },
  addressText: { color: '#ccc', flex: 1 },
  clearBtn: {
    position: 'absolute',
    bottom: 100, // Increased from 50 to 100 to move it higher
    alignSelf: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000', // Added shadow for iOS support
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 20
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    width: '100%', // Ensure it takes full width of modal
    justifyContent: 'space-between',
  },
  profileBtn: {
    flex: 1, // This allows the button to grow/shrink to fit
    backgroundColor: '#7F9460',
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  callBtn: {
    flex: 1, // Give this flex: 1 as well so it matches the others
    backgroundColor: '#222',
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444'
  },
  verifiedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#7F9460',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7F9460',
  },
  verifiedToggleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default MapScreen;