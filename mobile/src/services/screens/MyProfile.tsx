import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList,
  TouchableOpacity, Dimensions, ActivityIndicator, Alert, StatusBar, Platform, ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchMyProfile, fetchMyCheckIns, deletePost_User } from '../api';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;

const MyProfile = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(true);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [followedShops, setFollowedShops] = useState(0);
  const [activeView, setActiveView] = useState<'grid' | 'list' | 'visited'>('grid');
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);

  useEffect(() => {
    loadData();
  }, [route.params?.refresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchMyProfile();
      setUser(data.user);
      setGalleryPhotos(data.allPhotos || []);
      setUserPosts(data.posts || []);
      setPhotoCount(data.totalPhotos || 0);
      setPostCount(data.postCount || 0);
      setFollowedShops(data.followedShops || 0);
    } catch (error: any) {
      console.error("Profile Fetch Error:", error);
      Alert.alert("Error", "Could not load profile.");
    } finally {
      setLoading(false);
    }
    loadCheckIns();
  };

  const loadCheckIns = async () => {
    try {
      setLoadingCheckIns(true);
      const data = await fetchMyCheckIns();
      setCheckIns(data.checkIns || []);
    } catch (error) {
      console.error("Check-ins fetch error:", error);
    } finally {
      setLoadingCheckIns(false);
    }
  };

  const handleEditPost = (post: any) => {
    navigation.navigate('EditPost', {
      postId: post.post_id,
      content: post.content,
      hashtags: post.hashtags,
      shopId: post.shop_id,
      imageUrl: post.image_url
    });
  };

  const handleDeletePost = (postId: number) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost_User(postId);
              Alert.alert("Success", "Post deleted successfully.");
              loadData(); // Refresh profile data
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete post");
            }
          }
        }
      ]
    );
  };

  const showPostOptions = (post: any) => {
    Alert.alert(
      "Post Options",
      "Choose an action for this post",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Edit Caption", onPress: () => handleEditPost(post) },
        { text: "Delete Post", style: "destructive", onPress: () => handleDeletePost(post.post_id) }
      ]
    );
  };

  const renderGridItem = ({ item }: any) => (
    <View style={styles.gridItem}>
      <Image
        source={{ uri: item.photo_url }}
        style={styles.gridImage}
        resizeMode="cover"
      />
    </View>
  );

  const renderListItem = ({ item }: any) => {
    const photos = item.photos || [];
    const hasPhotos = photos.length > 0 && photos[0] !== null;
    return (
      <View style={styles.listItem}>
        <View style={styles.listHeader}>
          <Image
            source={{ uri: user?.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.listAvatar}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.listUsername}>{user?.username}</Text>
              <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={() => handleEditPost(item)}>
                  <Ionicons name="pencil-outline" size={18} color="#7F9460" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.listDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
        {hasPhotos && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
            {photos.map((uri: string, idx: number) => (
              <Image key={idx} source={{ uri }} style={styles.listImage} resizeMode="cover" />
            ))}
          </ScrollView>
        )}
        <Text style={styles.listContent}>{item.content}</Text>
      </View>
    );
  };

  const renderVisitedItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.visitedItem}
      onPress={() => navigation.navigate('ShopProfile', { shopId: item.shop_id })}
    >
      <View style={styles.visitedIconHeader}>
        <Ionicons name="location" size={20} color="#7F9460" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.visitedShopName}>{item.shop_name}</Text>
        <Text style={styles.visitedCategory}>{item.category} • {item.address}</Text>
        <Text style={styles.visitedDate}>Visited on {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CCC" />
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={{ backgroundColor: '#fff' }}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Image
          source={{ uri: user?.avatar_url || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.username || 'Loading...'}</Text>
        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{photoCount}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{followedShops}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="create-outline" size={16} color="#333" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newPostBtn}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.newPostBtnText}>New Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Tabs */}
      <View style={styles.viewTabs}>
        <TouchableOpacity
          style={[styles.viewTab, activeView === 'grid' && styles.viewTabActive]}
          onPress={() => setActiveView('grid')}
        >
          <Ionicons name="grid-outline" size={20} color={activeView === 'grid' ? '#7F9460' : '#999'} />
          <Text style={[styles.viewTabText, activeView === 'grid' && styles.viewTabTextActive]}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, activeView === 'list' && styles.viewTabActive]}
          onPress={() => setActiveView('list')}
        >
          <Ionicons name="list-outline" size={20} color={activeView === 'list' ? '#7F9460' : '#999'} />
          <Text style={[styles.viewTabText, activeView === 'list' && styles.viewTabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, activeView === 'visited' && styles.viewTabActive]}
          onPress={() => setActiveView('visited')}
        >
          <Ionicons name="location-outline" size={20} color={activeView === 'visited' ? '#7F9460' : '#999'} />
          <Text style={[styles.viewTabText, activeView === 'visited' && styles.viewTabTextActive]}>Visited</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#7F9460" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={activeView === 'grid' ? galleryPhotos : activeView === 'list' ? userPosts : checkIns}
        renderItem={activeView === 'grid' ? renderGridItem : activeView === 'list' ? renderListItem : renderVisitedItem}
        keyExtractor={(item: any, index: number) => (item.photo_id || item.post_id || item.check_in_id || index).toString()}
        numColumns={activeView === 'grid' ? 3 : 1}
        key={activeView}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={activeView === 'grid' ? "images-outline" : activeView === 'list' ? "document-text-outline" : "location-outline"}
              size={48}
              color="#CCC"
            />
            <Text style={styles.emptyText}>
              {activeView === 'grid' ? 'No photos yet. Create a post!' :
                activeView === 'list' ? 'No posts yet. Share something!' :
                  'No check-ins yet. Visit a shop and check in!'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Profile Card
  profileCard: {
    alignItems: 'center',
    paddingTop: STATUS_BAR_HEIGHT + 15,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45, marginBottom: 12,
    borderWidth: 3, borderColor: '#7F9460',
  },
  name: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  bio: { color: '#666', fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },

  // Stats
  statsRow: {
    flexDirection: 'row', width: '100%', justifyContent: 'center',
    marginTop: 20, marginBottom: 16,
    backgroundColor: '#F8F9FA', borderRadius: 14, paddingVertical: 14,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  statLabel: { color: '#888', fontSize: 11, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0', height: '80%', alignSelf: 'center' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  editProfileBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F2F5', paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  editBtnText: { fontWeight: '600', color: '#333', fontSize: 14 },
  newPostBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7F9460', paddingVertical: 10, borderRadius: 10, gap: 4,
  },
  newPostBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // View Tabs
  viewTabs: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  viewTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6,
  },
  viewTabActive: { borderBottomWidth: 2, borderBottomColor: '#7F9460' },
  viewTabText: { fontSize: 13, fontWeight: '600', color: '#999' },
  viewTabTextActive: { color: '#7F9460' },

  // Grid
  gridItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH, padding: 1 },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#f0f0f0', borderRadius: 2 },

  // List
  listItem: {
    backgroundColor: '#FFF', marginHorizontal: 0, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
  },
  listAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE' },
  listUsername: { fontWeight: '700', fontSize: 14, color: '#1A1A1A' },
  listDate: { fontSize: 11, color: '#999' },
  listImage: { width: '100%', height: width, backgroundColor: '#F0F0F0' },
  listContent: { fontSize: 14, color: '#333', padding: 12, lineHeight: 20 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { color: '#999', fontSize: 14, marginTop: 12 },

  // Visited styles
  visitedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  visitedIconHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  visitedShopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  visitedCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  visitedDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  }
});

export default MyProfile;