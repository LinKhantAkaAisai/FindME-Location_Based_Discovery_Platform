import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, View, TextInput, Text,
  Alert, TouchableOpacity, Modal, ScrollView, Dimensions, ActivityIndicator, Linking, Image, Keyboard,
  LayoutAnimation, Platform, UIManager
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

import { fetchShops, BASE_URL } from '../api';

// --- ROUTING UTILITY ---
const getRoadRoute = async (userCoords: any, shopCoords: any, preference: 'fastest' | 'shortest' = 'fastest') => {
  const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImY1MDI3MWEwZGVmNzRkOGY5ZWE3MDAzMzM4MjE4Yjk2IiwiaCI6Im11cm11cjY0In0=';

  const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;

  const body = {
    coordinates: [
      [userCoords.longitude, userCoords.latitude],
      [shopCoords.longitude, shopCoords.latitude]
    ],
    preference: preference
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ORS_API_KEY
      },
      body: JSON.stringify(body)
    });

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
}

const getShopStatus = (timeStr?: any) => {
  // If it's an object from JSONB, try to extract the string or use as is
  let str = timeStr;
  if (typeof timeStr === 'object' && timeStr !== null) {
    str = timeStr.text || timeStr.display || JSON.stringify(timeStr);
  }

  if (!str || typeof str !== 'string' || !str.includes(' to ')) {
    return { status: 'UNKNOWN', color: '#757575', open: '--', close: '--' };
  }

  // Remove extra quotes if stored as a JSON string
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
    color: isOpen ? '#4CAF50' : '#F44336',
    open: startStr.trim(),
    close: endStr.trim()
  };
};


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MapScreen = ({ navigation }: any) => {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all', 'nearest', 'visited'
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
  };

  const handleResetFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory('all');
    setFilterType('all');
    setSearchQuery('');
  };

  // New state for routing
  const [routeCoords, setRouteCoords] = useState<{ latitude: number, longitude: number }[] | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
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
    const performSearch = async () => {
      setLoading(true);
      try {
        const data = await fetchShops(searchQuery);
        setShops(data);

        let filtered = data;

        // 1. Apply category filter
        if (selectedCategory !== 'all') {
          filtered = filtered.filter((shop: any) =>
            shop.category?.toLowerCase().includes(selectedCategory.toLowerCase())
          );
        }

        // 2. Apply distance filter for nearest
        if (filterType === 'nearest' && location) {
          filtered = filtered
            .map((shop: any) => ({
              ...shop,
              distance: calculateDistance(
                location.latitude,
                location.longitude,
                Number(shop.lat),
                Number(shop.lon)
              )
            }))
            .sort((a: any, b: any) => (a as any).distance - (b as any).distance)
            .slice(0, 10);
        }
        setFilteredShops(filtered);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, filterType, location]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
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

    setRoutingLoading(true);
    const coords = await getRoadRoute(location, { latitude: Number(shop.lat), longitude: Number(shop.lon) }, 'fastest');

    if (coords) {
      setRouteCoords(coords);
      setModalVisible(false);

      // Zoom into the route
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 150, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    } else {
      Alert.alert("Error", "Could not calculate route.");
    }
    setRoutingLoading(false);
  };

  const renderFilterChip = (label: string, isActive: boolean, onPress: () => void, icon?: string) => (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.chipActive]}
      onPress={onPress}
    >
      {icon && <Text style={styles.chipIcon}>{icon}</Text>}
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="none"
        showsCompass={true}
        onPress={() => Keyboard.dismiss()}
        showsPointsOfInterest={false}
        mapPadding={{ top: 140, right: 20, bottom: 0, left: 0 }}
        initialRegion={{
          latitude: 21.9470,
          longitude: 96.1080,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        <UrlTile
          /**
           * 🛠️ FIX: "dark_all" includes street names but removes commercial shop icons.
           * Use "light_all" if you prefer a white map.
           */
          urlTemplate="https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          maximumZ={19}
          shouldReplaceMapContent={true}
          {...({ userAgent: "ExpoApp/1.0" } as any)}
        />

        {location && (
          <Marker coordinate={location} title="You">
            <View style={styles.userMarker} />
          </Marker>
        )}
        {filteredShops.map((shop) => {
          // 1. Determine the icon based on category
          let categoryIcon = '📍'; // Default
          const category = shop.category?.toLowerCase();

          if (category === 'cafe') {
            categoryIcon = '🍵';
          } else if (category === 'beauty salon') {
            categoryIcon = '💈';
          }

          return (
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
                shop.business_valid ? styles.registeredMarker : styles.nonRegisteredMarker
              ]}>
                {shop.logo_url ? (
                  <Image
                    source={{ uri: `${BASE_URL}${shop.logo_url}` }}
                    style={styles.markerLogo}
                  />
                ) : (
                  <Text style={{ fontSize: 18 }}>{categoryIcon}</Text>
                )}
              </View>
            </Marker>
          );
        })}

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

      <View style={[styles.searchWrapper, showFilters && styles.searchWrapperExpanded]}>
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder={loading ? "Connecting..." : `Search shops...`}
            placeholderTextColor="#757575"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {(loading || routingLoading) ? (
            <ActivityIndicator size="small" color="#7F9460" />
          ) : (
            <TouchableOpacity onPress={toggleFilters} style={styles.filterToggle}>
              <Text style={{ fontSize: 18, color: showFilters ? '#7F9460' : '#8ab4f8' }}>
                {showFilters ? '✕' : '⚙️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showFilters && (
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterSectionTitle}>Filters</Text>
              <TouchableOpacity onPress={handleResetFilters}>
                <Text style={styles.resetText}>Reset All</Text>
              </TouchableOpacity>
            </View>

            {/* Proximity / Sort */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {renderFilterChip('All Shops', filterType === 'all', () => setFilterType('all'))}
              {renderFilterChip('Nearby', filterType === 'nearest', () => setFilterType('nearest'), '📍')}
            </ScrollView>



            {/* Categories */}
            <Text style={styles.filterLabel}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {['all', 'Cafe', 'Salon', 'Cosmetic', 'Restaurant', 'Retail'].map(category =>
                renderFilterChip(category === 'all' ? 'All' : category, selectedCategory === category, () => setSelectedCategory(category))
              )}
            </ScrollView>
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
                            { backgroundColor: selectedShop.business_valid ? '#1B5E20' : '#333' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: selectedShop.business_valid ? '#81C784' : '#BBB' }
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
                      {/* GO BUTTON */}
                      <TouchableOpacity
                        style={styles.goBtn}
                        onPress={() => handleGetDirections(selectedShop)}
                      >
                        <Text style={styles.goBtnText}>🚀 Go</Text>
                      </TouchableOpacity>

                      {selectedShop.business_valid && (
                        <TouchableOpacity
                          style={styles.profileBtn}
                          onPress={() => {
                            setModalVisible(false);
                            navigation.navigate('ShopProfile', { shopId: selectedShop.shop_id });
                          }}
                        >
                          <Text style={styles.profileBtnText}>🏪 Profile</Text>
                        </TouchableOpacity>
                      )}

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
                      {selectedShop.description && <Text style={styles.descriptionText}>{selectedShop.description}</Text>}

                      <View style={styles.timingCard}>
                        <View style={styles.timingIconWrapper}><Text style={{ fontSize: 14 }}>⏰</Text></View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={styles.timingTitle}>WORKING HOURS</Text>
                            <View style={{
                              backgroundColor: shopTime.color + '22',
                              paddingHorizontal: 8, paddingVertical: 2,
                              borderRadius: 4, borderWidth: 1, borderColor: shopTime.color
                            }}>
                              <Text style={{ color: shopTime.color, fontSize: 10, fontWeight: '800' }}>{shopTime.status}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View>
                              <Text style={{ color: '#757575', fontSize: 11 }}>Opening Time</Text>
                              <Text style={styles.timingValue}>{shopTime.open}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ color: '#757575', fontSize: 11 }}>Closing Time</Text>
                              <Text style={styles.timingValue}>{shopTime.close}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.infoSection}>
                      <Text style={styles.label}>LOCATION & CONTACT</Text>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📍</Text>
                        <Text style={styles.addressText}>{selectedShop.address || "No physical address listed."}</Text>
                      </View>
                      {selectedShop.phone_number && (
                        <View style={[styles.infoRow, { marginTop: 15 }]}>
                          <Text style={styles.infoIcon}>📱</Text>
                          <Text style={styles.addressText}>{selectedShop.phone_number}</Text>
                        </View>
                      )}
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
  container: { flex: 1, backgroundColor: '#000' },
  map: { ...StyleSheet.absoluteFillObject },
  userMarker: { width: 18, height: 18, backgroundColor: '#007AFF', borderRadius: 9, borderWidth: 3, borderColor: 'white', elevation: 5 },
  shopMarker: { width: 38, height: 38, borderRadius: 19, elevation: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  registeredMarker: { backgroundColor: '#4E342E', borderColor: '#FFD700', overflow: 'hidden' },
  nonRegisteredMarker: { backgroundColor: 'white', borderColor: '#4E342E', overflow: 'hidden' },
  markerLogo: { width: '100%', height: '100%', resizeMode: 'cover' },
  searchWrapper: {
    position: 'absolute',
    top: 60,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 10
  },
  searchWrapperExpanded: {
    borderRadius: 20,
    paddingBottom: 20
  },
  searchBar: {
    flexDirection: 'row',
    height: 45,
    alignItems: 'center',
    paddingHorizontal: 15
  },
  input: { flex: 1, color: '#333', fontSize: 16, fontWeight: '500' },
  filterToggle: { padding: 5 },
  filterSection: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 15 },
  filterSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#121212' },
  resetText: { color: '#FF5252', fontSize: 14, fontWeight: '600' },
  filterLabel: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 10, marginVertical: 10 },
  chipScroll: { paddingHorizontal: 5 },
  chip: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center'
  },
  chipActive: { backgroundColor: '#7F9460', borderColor: '#7F9460' },
  chipIcon: { fontSize: 14, marginRight: 6 },
  chipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  chipTextActive: { color: 'white' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#121212', height: SCREEN_HEIGHT * 0.55, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  shopName: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  badgeRow: { flexDirection: 'row', marginTop: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  statusText: { fontSize: 11, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, backgroundColor: '#222', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  goBtn: {
    flex: 1.1,
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  goBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  profileBtn: {
    flex: 1,
    backgroundColor: '#7F9460',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  profileBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  callBtn: {
    flex: 0.8,
    backgroundColor: '#1E1E1E',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  callBtnText: { color: '#8ab4f8', fontWeight: '600', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#222', marginBottom: 20 },
  infoSection: { marginBottom: 30 },
  label: { color: '#8ab4f8', fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  descriptionText: { color: '#E0E0E0', fontSize: 16, lineHeight: 24, marginBottom: 15 },
  timingCard: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center' },
  timingIconWrapper: { width: 34, height: 34, backgroundColor: '#333', borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  timingTitle: { color: '#8ab4f8', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  timingValue: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { fontSize: 18, marginRight: 15, color: '#8ab4f8' },
  addressText: { color: '#E0E0E0', fontSize: 16, flex: 1, lineHeight: 22 },
  clearBtn: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 20
  },
});

export default MapScreen;