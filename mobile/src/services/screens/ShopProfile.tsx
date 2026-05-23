import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, Image, ScrollView,
  TouchableOpacity, Dimensions, FlatList, StatusBar, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchShopById, fetchShopPosts, toggleFollowShop, fetchFollowStatus, BASE_URL } from '../api';
import PostComments from '../components/PostComments';

const { width } = Dimensions.get('window');

const ShopProfile = ({ route, navigation }: any) => {
  const shopId = route?.params?.shopId;
  const [shop, setShop] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'official' | 'community'>('official');
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [activePostId, setActivePostId] = useState<number | null>(null);

  // Fallback assets for UI
  const PLACEHOLDERS = {
    profilePic: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24',
  };

  useEffect(() => {
    if (shopId) {
      fetchShopData();
      fetchPostsData();
      loadFollowStatus();
    }
  }, [shopId]);

  const loadFollowStatus = async () => {
    try {
      const data = await fetchFollowStatus(shopId);
      setIsFollowing(data.following);
      setFollowerCount(data.follower_count);
    } catch (err) {
      // Not logged in or error — ignore
    }
  };

  const handleFollow = async () => {
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(prev => wasFollowing ? prev - 1 : prev + 1);
    try {
      const data = await toggleFollowShop(shopId);
      setIsFollowing(data.following);
      setFollowerCount(data.follower_count);
    } catch (err) {
      setIsFollowing(wasFollowing);
      loadFollowStatus();
    }
  };

  const handleCheckIn = () => {
    navigation.navigate('CreatePost', {
      shopId: shop.shop_id,
      shopName: shop.name
    });
  };

  const fetchShopData = async () => {
    try {
      setLoading(true);
      const data = await fetchShopById(shopId);

      setShop(data);
    } catch (error) {
      console.error("Error fetching shop:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostsData = async () => {
    try {
      setLoadingPosts(true);
      const [officialData, communityData] = await Promise.all([
        fetchShopPosts(shopId),
        fetch(`${BASE_URL}/api/shop-posts/${shopId}/community`).then(res => res.json())
      ]);
      setPosts(officialData.posts || []);
      setCommunityPosts(communityData.posts || []);
    } catch (error) {
      console.error("Error fetching shop posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#7F9460" /></View>;
  if (!shop) return <View style={styles.container}><Text>Shop not found</Text></View>;

  const renderTimelinePost = ({ item }: any) => {
    const photos = item.photos || [];
    const isOfficial = activeTab === 'official';

    return (
      <View style={styles.postItem}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => {
              if (!isOfficial && item.username) {
                navigation.navigate('UserProfile', { username: item.username });
              }
            }}
          >
            <Image
              source={{ uri: shop.logo_url ? `${BASE_URL}${shop.logo_url}` : (isOfficial ? PLACEHOLDERS.profilePic : (item.avatar_url || 'https://via.placeholder.com/100')) }}
              style={styles.miniLogo}
            />
            <View>
              <Text style={styles.postAuthor}>{isOfficial ? shop.name : item.username}</Text>
              <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
          {!isOfficial && (
            <View style={styles.communityBadge}>
              <Text style={styles.communityBadgeText}>COMMUNITY</Text>
            </View>
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={activeTab === 'official' ? posts : communityPosts}
        renderItem={renderTimelinePost}
        keyExtractor={(item) => item.post_id.toString()}
        contentContainerStyle={{ backgroundColor: '#F0F2F5', paddingBottom: 50 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loadingPosts ? (
              <ActivityIndicator color="#7F9460" />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons
                  name={activeTab === 'official' ? "newspaper-outline" : "people-outline"}
                  size={40}
                  color="#CCC"
                />
                <Text style={styles.emptyText}>
                  {activeTab === 'official'
                    ? "No updates from this shop yet."
                    : "No community posts mentioning this shop yet."}
                </Text>
              </View>
            )}
          </View>
        }
        ListHeaderComponent={
          <View style={{ backgroundColor: '#FFF' }}>
            <View>
              <Image
                source={{ uri: shop.logo_url ? `${BASE_URL}${shop.logo_url}` : PLACEHOLDERS.profilePic }}
                style={styles.coverPhoto}
              />
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.categoryText}>{shop.category}</Text>

              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color="#666" />
                <Text style={styles.contactText}>{shop.phone_number}</Text>
              </View>

              <View style={styles.contactRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.contactText}>{shop.address}</Text>
              </View>

              {shop.opening_hours && (
                <View style={styles.contactRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.contactText}>
                    {typeof shop.opening_hours === 'object' ? shop.opening_hours.display : shop.opening_hours}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followingBtn]}
                  onPress={handleFollow}
                >
                  <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkInBtn}
                  onPress={handleCheckIn}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="location" size={16} color="#FFF" />
                      <Text style={styles.checkInBtnText}>Check-in</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#666', fontSize: 13, marginBottom: 15 }}>{followerCount} followers</Text>

              <Text style={styles.description}>{shop.description}</Text>

              <View style={styles.divider} />

              {/* Tabs */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'official' && styles.activeTab]}
                  onPress={() => setActiveTab('official')}
                >
                  <Text style={[styles.tabText, activeTab === 'official' && styles.activeTabText]}>Updates</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'community' && styles.activeTab]}
                  onPress={() => setActiveTab('community')}
                >
                  <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>Community</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
      />

      {activePostId && (
        <PostComments
          isVisible={showComments}
          onClose={() => setShowComments(false)}
          postId={activePostId}
          onCommentAdded={() => {
            fetchPostsData();
          }}
        />
      )}
    </View>
  );
};


// ... keep your existing styles ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  coverPhoto: { width: width, height: 250, resizeMode: 'cover' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  contactText: { marginLeft: 8, color: '#666', fontSize: 13 },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  profileSection: { backgroundColor: '#FFF', padding: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -25 },
  shopName: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  categoryText: { color: '#7F9460', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  followBtn: { backgroundColor: '#7F9460', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  followingBtn: { backgroundColor: '#EFEFEF', borderWidth: 1, borderColor: '#DDD' },
  followBtnText: { color: '#FFF', fontWeight: 'bold' },
  followingBtnText: { color: '#333' },
  checkInBtn: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  checkInBtnText: { color: '#FFF', fontWeight: 'bold' },
  description: { color: '#444', fontSize: 15, lineHeight: 22 },
  featureRow: { marginTop: 15, marginBottom: 5 },
  featureTag: { backgroundColor: '#F0F2F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8 },
  tagText: { fontSize: 12, color: '#666', fontWeight: '500' },
  divider: { height: 8, backgroundColor: '#F0F2F5', marginHorizontal: -20, marginTop: 20 },
  feedTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginVertical: 15, paddingHorizontal: 20 },
  postItem: { backgroundColor: '#FFF', marginBottom: 10, paddingVertical: 15 },
  postHeader: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, alignItems: 'center' },
  miniLogo: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  postAuthor: { fontWeight: 'bold', fontSize: 14 },
  postDate: { fontSize: 11, color: '#888' },
  postText: { paddingHorizontal: 15, fontSize: 14, color: '#333', marginBottom: 10, lineHeight: 20 },
  postMedia: { width: width, height: width * 0.8 },
  postMediaScroll: { width: width, height: width * 0.8 },
  postActions: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: 12, paddingBottom: 5 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 25, paddingVertical: 4 },
  actionText: { marginLeft: 6, color: '#555', fontSize: 13, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },

  // New Styles
  tabsContainer: { flexDirection: 'row', marginTop: 15, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#7F9460' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '600' },
  activeTabText: { color: '#7F9460' },
  communityBadge: { backgroundColor: '#E3F2FD', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto' },
  communityBadgeText: { color: '#1976D2', fontSize: 9, fontWeight: '800' },
});

export default ShopProfile;