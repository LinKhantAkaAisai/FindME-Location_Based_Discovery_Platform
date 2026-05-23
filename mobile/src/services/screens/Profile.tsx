import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMyShops, fetchNotifications, markNotificationsSeen, respondToInvitation } from '../api';

/* ---------------- Navigation Types ---------------- */
type RootStackParamList = {
  Profile: undefined;
  Login: undefined;
  MyProfile: undefined;
  RegisterShop: undefined;
  Bookmarks: undefined;
  DevScreen: undefined;
  EditShopProfile: { shopId: number };
  ShopDashboard: undefined;
  ShopProfile: { shopId: number };
};

type ProfileNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileNavigationProp;
}

/* ---------------- 1. Define the Props Interface ---------------- */
interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress?: () => void;
  danger?: boolean;
  subtitle?: string;
}

/* ---------------- Profile Screen ---------------- */
const Profile = ({ navigation }: Props) => {
  const [activeMode, setActiveMode] = useState<'user' | 'shop'>('user');
  const [activeShop, setActiveShop] = useState<any>(null);
  const [myShops, setMyShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Notifications Integration
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [processingNotif, setProcessingNotif] = useState<number | null>(null);

  useEffect(() => {
    loadAccountState();
    loadMyShops();
    loadNotifications();
  }, []);

  const loadAccountState = async () => {
    const mode = await AsyncStorage.getItem('account_mode');
    const shopData = await AsyncStorage.getItem('active_shop');
    if (mode === 'shop' && shopData) {
      setActiveMode('shop');
      setActiveShop(JSON.parse(shopData));
    }
  };

  const loadMyShops = async () => {
    setLoadingShops(true);
    try {
      const data = await fetchMyShops();
      const shops = data.shops || [];
      setMyShops(shops);

      // Refresh activeShop if it matches one of the shops
      const shopData = await AsyncStorage.getItem('active_shop');
      if (shopData) {
        const parsed = JSON.parse(shopData);
        const updated = shops.find((s: any) => s.shop_id === parsed.shop_id);
        if (updated) {
          await AsyncStorage.setItem('active_shop', JSON.stringify(updated));
          setActiveShop(updated);
        }
      }
    } catch (err: any) {
      setMyShops([]);
    } finally {
      setLoadingShops(false);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const data = await fetchNotifications();
      const notifs = data.notifications || [];
      setNotifications(notifs);
      setNotificationCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Notification check error:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleRespond = async (invitationId: number, action: 'Accept' | 'Decline') => {
    try {
      setProcessingNotif(invitationId);
      const res = await respondToInvitation(invitationId, action);
      Alert.alert(action === 'Accept' ? 'Accepted!' : 'Declined', res.message);
      await loadNotifications();
      if (action === 'Accept') {
        loadMyShops(); // Refresh shop list to show the new shop
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessingNotif(null);
    }
  };

  const switchToShop = async (shop: any) => {
    await AsyncStorage.setItem('account_mode', 'shop');
    await AsyncStorage.setItem('active_shop', JSON.stringify(shop));
    setActiveMode('shop');
    setActiveShop(shop);
    Alert.alert('Switched!', `Now managing: ${shop.name}`);
  };

  const switchToUser = async () => {
    await AsyncStorage.setItem('account_mode', 'user');
    await AsyncStorage.removeItem('active_shop');
    setActiveMode('user');
    setActiveShop(null);
    Alert.alert('Switched!', 'Back to personal account.');
  };

  if (showNotifications) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' }]}>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: '#F0F0F0' }]} onPress={() => setShowNotifications(false)}>
            <Ionicons name="chevron-back" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#333' }]}>Notification</Text>
          <View style={{ width: 40 }} />
        </View>

        {loadingNotifs ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#7F9460" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item, index) => item.type + '_' + item.id + '_' + index}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => {
              const isInvitation = item.type === 'invitation';

              if (isInvitation) {
                const diffDays = Math.ceil((new Date(item.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <View style={styles.notifCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={styles.notifIconContainer}>
                        <Ionicons name="storefront" size={20} color="#7F9460" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifShopName}>{item.shop_name}</Text>
                        <Text style={styles.notifInvitedBy}>by @{item.actor_name}</Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>INVITATION</Text>
                      </View>
                    </View>
                    <Text style={styles.notifMessage}>{item.message}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                      <Ionicons name="time-outline" size={12} color="#999" />
                      <Text style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>Expires in {diffDays} days</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[styles.notifBtn, styles.declineBtn]}
                        onPress={() => handleRespond(item.id, 'Decline')}
                        disabled={processingNotif === item.id}
                      >
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.notifBtn, styles.acceptBtn]}
                        onPress={() => handleRespond(item.id, 'Accept')}
                        disabled={processingNotif === item.id}
                      >
                        {processingNotif === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptText}>Accept</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              } else {
                // Shop Post Notification
                return (
                  <TouchableOpacity
                    style={styles.notifCard}
                    onPress={() => {
                      setShowNotifications(false);
                      navigation.navigate('ShopProfile', { shopId: item.shop_id });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={[styles.notifIconContainer, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="newspaper-outline" size={20} color="#1976D2" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifShopName}>{item.shop_name}</Text>
                        <Text style={styles.notifInvitedBy}>New Update</Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={[styles.typeBadgeText, { color: '#1976D2' }]}>POST</Text>
                      </View>
                    </View>
                    <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                      <Ionicons name="calendar-outline" size={12} color="#999" />
                      <Text style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#1976D2', fontWeight: 'bold', marginLeft: 'auto' }}>View Shop →</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 100 }}>
                <Ionicons name="notifications-off-outline" size={60} color="#DDD" />
                <Text style={{ color: '#BBB', marginTop: 10 }}>No new notifications</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.menu}>

          {/* Active Session Banner */}
          <View style={styles.sessionBanner}>
            <Ionicons
              name={activeMode === 'shop' ? 'storefront' : 'person-circle'}
              size={24}
              color="#FFF"
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.sessionLabel}>
                {activeMode === 'shop' ? 'SHOP MODE' : 'PERSONAL MODE'}
              </Text>
              <Text style={styles.sessionName}>
                {activeMode === 'shop' && activeShop ? activeShop.name : 'User Account'}
              </Text>
            </View>
            {activeMode === 'shop' && (
              <TouchableOpacity style={styles.switchBackBtn} onPress={switchToUser}>
                <Text style={styles.switchBackText}>Switch Back</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>PERSONAL</Text>
          <MenuItem
            icon="person-circle-outline"
            text="My Profile"
            onPress={() => navigation.navigate('MyProfile')}
          />

          <Text style={styles.sectionTitle}>BUSINESS</Text>
          <MenuItem
            icon="storefront-outline"
            text="Register Your Shop"
            onPress={() => navigation.navigate('RegisterShop')}
          />
          {activeMode === 'shop' && activeShop && activeShop.user_role === 'owner' && (
            <MenuItem
              icon="create-outline"
              text="Edit Shop Profile"
              onPress={() => navigation.navigate('EditShopProfile', { shopId: activeShop.shop_id })}
            />
          )}
          {activeMode === 'shop' && activeShop && activeShop.plan_type === 'premium' && activeShop.business_valid && (
            <MenuItem
              icon="stats-chart-outline"
              text="Shop Dashboard"
              onPress={() => navigation.navigate('ShopDashboard')}
            />
          )}

          {/* Account Switcher */}
          {loadingShops ? (
            <ActivityIndicator color="rgba(255,255,255,0.5)" style={{ marginVertical: 10 }} />
          ) : myShops.length > 0 ? (
            <View style={styles.shopSwitcher}>
              <Text style={styles.switcherLabel}>SWITCH TO SHOP ACCOUNT</Text>
              {myShops.map((shop) => (
                <TouchableOpacity
                  key={shop.shop_id}
                  style={[
                    styles.shopOption,
                    activeShop?.shop_id === shop.shop_id && styles.shopOptionActive
                  ]}
                  onPress={() => switchToShop(shop)}
                >
                  <View style={styles.shopOptionIcon}>
                    <Ionicons name="storefront" size={18} color={activeShop?.shop_id === shop.shop_id ? '#7F9460' : '#FFF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.shopOptionName,
                      activeShop?.shop_id === shop.shop_id && styles.shopOptionNameActive
                    ]}>
                      {shop.name}
                    </Text>
                    <Text style={styles.shopOptionCategory}>
                      {shop.user_role === 'owner' ? 'Owner' : 'Admin'} • {shop.category}
                    </Text>
                  </View>
                  {activeShop?.shop_id === shop.shop_id && (
                    <Ionicons name="checkmark-circle" size={20} color="#7F9460" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>GENERAL</Text>
          <MenuItem
            icon="bookmark-outline"
            text="My Bookmarks"
            onPress={() => navigation.navigate('Bookmarks')}
          />
          <MenuItem icon="information-circle-outline" text="About App" />
          <MenuItem icon="document-lock-outline" text="Terms & Conditions" />
          <MenuItem
            icon="notifications-outline"
            text="Notifications"
            onPress={() => {
              setShowNotifications(true);
              setNotificationCount(0);
              markNotificationsSeen().catch(e => console.error('Mark seen error:', e));
            }}
            subtitle={notificationCount > 0 ? `${notificationCount} new` : undefined}
          />
          <MenuItem
            icon="code-working-outline"
            text="Developer View"
            onPress={() => navigation.navigate('DevScreen')}
          />


          <View style={styles.footer}>
            <MenuItem
              icon="log-out-outline"
              text="Logout"
              danger
              onPress={() => navigation.navigate('Login')}
            />
          </View>

          <View style={{ height: 50 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ---------------- 2. MenuItem Component ---------------- */
const MenuItem = ({ icon, text, onPress, danger, subtitle }: MenuItemProps) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.iconContainer, danger && styles.dangerIconBg]}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? '#FF6B6B' : '#FFFFFF'}
      />
    </View>

    <Text style={[styles.menuText, danger && styles.dangerText]}>
      {text}
    </Text>

    {subtitle && (
      <View style={styles.subtitleBadge}>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>
    )}

    <Ionicons
      name="chevron-forward"
      size={16}
      color="rgba(255,255,255,0.3)"
    />
  </TouchableOpacity>
);

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7F9460',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    zIndex: 10,
  },
  roundBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  menu: {
    paddingHorizontal: 25,
  },
  sectionTitle: {
    marginTop: 30,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  dangerIconBg: {
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dangerText: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  // Account Switcher Styles
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 15,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 5,
  },
  sessionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 2,
  },
  switchBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchBackText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  shopSwitcher: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
  },
  switcherLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  shopOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  shopOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shopOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shopOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  shopOptionNameActive: {
    color: '#E8F5E9',
  },
  shopOptionCategory: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  subtitleBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  subtitleText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  notifCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifShopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  notifInvitedBy: {
    fontSize: 12,
    color: '#7F9460',
    fontWeight: '600',
  },
  notifMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginVertical: 10,
  },
  notifBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: '#F5F5F5',
  },
  acceptBtn: {
    backgroundColor: '#7F9460',
  },
  declineText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 14,
  },
  acceptText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  typeBadge: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 5
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7F9460'
  }
});

export default Profile;