import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList,
  TouchableOpacity, Dimensions, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
// Assuming Ionicons is installed
import { Ionicons } from '@expo/vector-icons';
import { fetchUserProfile } from '../api';
import PostComments from '../components/PostComments';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

const UserProfile = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(true);

  // 1. Get username from route params
  const { username } = route.params || {};
  const isCurrentUser = username === 'me';

  const [posts, setPosts] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [activePostId, setActivePostId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [username]); // Reload when username changes

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchUserProfile(username);

      setUser(data.user);
      setPosts(data.posts || []);
      setPostCount(data.postCount || 0);

    } catch (error: any) {
      console.error("Profile Fetch Error:", error);
      Alert.alert("Error", "Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  const checkInCount = new Set(
    posts
      .map(item => item.shop_name)
      .filter(loc => loc && loc !== 'General Location')
  ).size;

  const photoCount = posts.reduce((acc, p) => acc + (p.photos?.length || 0), 0);

  const renderGridItem = ({ item }: any) => {
    const mainPhoto = item.photos?.[0];
    if (!mainPhoto) return null;

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => setViewMode('list')}
      >
        <Image
          source={{ uri: mainPhoto }}
          style={styles.gridImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderTimelinePost = ({ item }: any) => {
    const photos = item.photos || [];

    return (
      <View style={styles.postItem}>
        <View style={styles.postHeader}>
          <Image
            source={{ uri: user?.avatar_url || 'https://via.placeholder.com/100' }}
            style={styles.miniLogo}
          />
          <View>
            <Text style={styles.postAuthor}>{user?.username}</Text>
            <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          {item.shop_name && (
            <TouchableOpacity
              style={styles.shopBadge}
              onPress={() => navigation.navigate('ShopProfile', { shopId: item.shop_id })}
            >
              <Text style={styles.shopBadgeText}>{item.shop_name.toUpperCase()}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.postText}>{item.content}</Text>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled style={styles.postMediaScroll}>
            {photos.map((uri: string, idx: number) => (
              <Image key={idx} source={{ uri }} style={styles.postMedia} />
            ))}
          </ScrollView>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {/* Toggle heart locally? */ }}>
            <Ionicons name="heart-outline" size={22} color="#555" />
            <Text style={styles.actionText}>{item.reaction_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setActivePostId(item.post_id);
              setShowComments(true);
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#555" />
            <Text style={styles.actionText}>{item.comment_count || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={{ backgroundColor: '#fff' }}>
      {/* --- ADDED BACK BUTTON: FIXED --- */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* PROFILE INFO */}
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: user?.avatar_url || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.username || 'Loading...'}</Text>
        <Text style={styles.bio}>{user?.bio || 'Digital Explorer | Nature Lover 🌿'}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        {/* --- DYNAMIC BUTTON: FIXED --- */}
        <TouchableOpacity
          style={[styles.btn, !isCurrentUser && styles.followBtn]}
          onPress={() => {
            if (isCurrentUser) {
              navigation.navigate('EditProfile');
            } else {
              Alert.alert("Follow", `Followed ${user?.username}!`);
            }
          }}
        >
          <Text style={[styles.btnText, !isCurrentUser && styles.followBtnText]}>
            {isCurrentUser ? "Edit Profile" : "Follow"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ACTION SECTION */}
      <View style={styles.actionSection}>
        {/* --- REMOVED POST BUTTON FOR OTHER USERS: FIXED --- */}
        {isCurrentUser && (
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Text style={styles.plusIcon}>+</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>🖼️</Text>
            <Text style={styles.infoText}>{photoCount} Uploaded Photos</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>📍</Text>
            <Text style={styles.infoText}>{checkInCount} Check-ins</Text>
          </View>
        </View>
      </View>

      <View style={styles.gridHeader}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'grid' && styles.activeTab]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid-outline" size={20} color={viewMode === 'grid' ? '#7F9460' : '#BBB'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'list' && styles.activeTab]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list-outline" size={22} color={viewMode === 'list' ? '#7F9460' : '#BBB'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7F9460" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <FlatList
        data={viewMode === 'grid' ? posts.filter(p => p.photos?.length > 0) : posts}
        renderItem={viewMode === 'grid' ? renderGridItem : renderTimelinePost}
        keyExtractor={(item: any) => item.post_id.toString()}
        numColumns={viewMode === 'grid' ? 3 : 1}
        key={viewMode} // Re-render FlatList when numColumns changes
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={viewMode === 'list' && { backgroundColor: '#F0F2F5' }}
      />

      {activePostId && (
        <PostComments
          isVisible={showComments}
          onClose={() => setShowComments(false)}
          postId={activePostId}
          onCommentAdded={loadData}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // --- ADDED/UPDATED STYLES FOR BACK BUTTON: FIXED ---
  headerContainer: {
    position: 'absolute',
    top: 40, // Adjust based on your status bar height
    left: 20,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  // --- UPDATED PROFILE HEADER FOR SPACER: FIXED ---
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 60, // Pushes content down to avoid overlapping with back button
  },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  bio: { color: '#666', marginBottom: 10, textAlign: 'center' },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginVertical: 15 },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { color: '#999', fontSize: 12 },
  btn: { backgroundColor: '#F0F2F5', width: '90%', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { fontWeight: '600', color: '#333' },
  // Additional styles for follow button
  followBtn: { backgroundColor: '#7F9460' },
  followBtnText: { color: '#fff' },
  actionSection: { alignItems: 'center', paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  plusButton: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#7F9460',
    justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, marginBottom: 20
  },
  plusIcon: { color: '#fff', fontSize: 35, fontWeight: '300' },
  infoRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoEmoji: { fontSize: 20, marginBottom: 4 },
  infoText: { fontSize: 12, color: '#666', fontWeight: '500' },
  vDivider: { width: 1, backgroundColor: '#f0f0f0', height: '100%' },
  gridHeader: { padding: 15, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  gridHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#999', letterSpacing: 1 },
  gridItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH, padding: 1 },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#f8f8f8' },

  // Timeline Styles
  postItem: { backgroundColor: '#FFF', marginBottom: 10, paddingVertical: 15 },
  postHeader: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, alignItems: 'center' },
  miniLogo: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  postAuthor: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  postDate: { fontSize: 11, color: '#888' },
  postText: { paddingHorizontal: 15, fontSize: 14, color: '#333', marginBottom: 10, lineHeight: 20 },
  postMediaScroll: { width: width, height: width * 0.8 },
  postMedia: { width: width, height: width * 0.8, resizeMode: 'cover' },
  postActions: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: 12, paddingBottom: 5, borderTopWidth: 1, borderTopColor: '#F0F2F5' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 25, paddingVertical: 4 },
  actionText: { marginLeft: 6, color: '#555', fontSize: 13, fontWeight: '600' },
  shopBadge: { backgroundColor: '#E8F5E9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto' },
  shopBadgeText: { color: '#2E7D32', fontSize: 9, fontWeight: '800' },

  // Tab Styles
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#7F9460' }
});

export default UserProfile;