import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList,
  TouchableOpacity, Dimensions, Platform, StatusBar, ActivityIndicator, ScrollView,
  Modal, TextInput, KeyboardAvoidingView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchPosts, toggleReaction, togglePostBookmark, toggleFollowShop, fetchComments, addComment, BASE_URL } from '../api';
import { Ionicons } from '@expo/vector-icons';
import PostComments from '../components/PostComments';

const { width, height } = Dimensions.get('window');

const CATEGORIES = ['All', 'Coffee', 'Salon', 'Cosmetics', 'Restaurant', 'Other'];
const SORT_OPTIONS = [
  { key: 'recent', label: 'Recent' },
  { key: 'popular', label: '🔥 Popular' },
];

const PostScreen = () => {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndices, setActiveIndices] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Comment Modal State
  const [showComments, setShowComments] = useState(false);
  const [activePostId, setActivePostId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeCategory, activeSort, searchQuery])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (activeCategory !== 'All') filters.category = activeCategory;
      if (activeSort !== 'recent') filters.sort = activeSort;
      if (searchQuery.trim()) filters.q = searchQuery;
      const data = await fetchPosts(filters);
      setPosts(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (shopId: number) => {
    setPosts(prev => prev.map(p => {
      if (p.shop_id === shopId) {
        return { ...p, is_followed: !p.is_followed };
      }
      return p;
    }));
    try {
      await toggleFollowShop(shopId);
    } catch (err) {
      loadData();
    }
  };

  const handleReact = async (postId: number) => {
    setPosts(prev => prev.map(p => {
      if (p.post_id === postId) {
        const wasReacted = p.is_reacted;
        return {
          ...p,
          is_reacted: !wasReacted,
          reaction_count: wasReacted ? p.reaction_count - 1 : p.reaction_count + 1
        };
      }
      return p;
    }));

    try {
      await toggleReaction(postId);
    } catch (err) {
      loadData();
    }
  };

  const handleBookmark = async (postId: number) => {
    setPosts(prev => prev.map(p => {
      if (p.post_id === postId) {
        return { ...p, is_bookmarked: !p.is_bookmarked };
      }
      return p;
    }));

    try {
      const res = await togglePostBookmark(postId);
      if (res.error) {
        // Blocked by backend (e.g. self-bookmark)
        setPosts(prev => prev.map(p => {
          if (p.post_id === postId) {
            return { ...p, is_bookmarked: false };
          }
          return p;
        }));
        // alert(res.error); 
      }
    } catch (err) {
      loadData();
    }
  };

  const handleScroll = (event: any, postId: string) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (activeIndices[postId] !== index) {
      setActiveIndices(prev => ({ ...prev, [postId]: index }));
    }
  };


  const renderPost = ({ item }: any) => {
    const currentIndex = activeIndices[item.post_id] || 0;
    const totalPhotos = item.photos?.length || 0;

    return (
      <View style={styles.postCard}>
        {/* HEADER */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => {
              if (item.post_type === 'shop' && item.shop_id) {
                navigation.navigate('ShopProfile', { shopId: item.shop_id });
              } else {
                navigation.navigate('UserProfile', { username: item.username });
              }
            }}
          >
            <Image
              source={{
                uri: (item.post_type === 'shop' && item.shop_logo_url)
                  ? `${BASE_URL}${item.shop_logo_url}`
                  : (item.avatar_url || 'https://via.placeholder.com/100')
              }}
              style={styles.profilePic}
            />
            <View style={styles.postInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.username}>
                  {item.post_type === 'shop' ? item.shop_name : item.username}
                </Text>
                {item.post_type === 'shop' && (
                  <View style={styles.shopBadge}>
                    <Text style={styles.shopBadgeText}>SHOP</Text>
                  </View>
                )}
              </View>
              <Text style={styles.location}>{item.location || 'Explore'}</Text>
            </View>
          </TouchableOpacity>
          {item.post_type === 'shop' && item.shop_id && (
            <TouchableOpacity
              style={[styles.followBtn, item.is_followed && styles.followBtnActive]}
              onPress={() => handleFollow(item.shop_id)}
            >
              <Text style={[styles.followBtnText, item.is_followed && styles.followBtnTextActive]}>
                {item.is_followed ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* IMAGE CAROUSEL */}
        <View>
          <FlatList
            data={item.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => handleScroll(e, item.post_id)}
            scrollEventThrottle={16}
            renderItem={({ item: photoUrl }) => (
              <Image source={{ uri: photoUrl }} style={styles.postImage} />
            )}
            keyExtractor={(_, index) => index.toString()}
          />
        </View>

        {/* DOTS PAGINATION */}
        {totalPhotos > 1 && (
          <View style={styles.dotContainer}>
            {item.photos.map((_: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: currentIndex === index ? '#7F9460' : '#D3D3D3' }
                ]}
              />
            ))}
          </View>
        )}

        {/* ACTIONS BAR */}
        <View style={styles.actionsBar}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleReact(item.post_id)}
            >
              <Ionicons
                name={item.is_reacted ? "heart" : "heart-outline"}
                size={22}
                color={item.is_reacted ? "#FF6B6B" : "#555"}
              />
              <Text style={styles.actionCount}>{item.reaction_count || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setActivePostId(item.post_id);
                setShowComments(true);
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#555" />
              <Text style={styles.actionCount}>{item.comment_count || 0}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => handleBookmark(item.post_id)} style={styles.actionBtn}>
            <Ionicons
              name={item.is_bookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={item.is_bookmarked ? "#7F9460" : "#555"}
            />
          </TouchableOpacity>
        </View>

        {/* CONTENT SECTION */}
        <View style={styles.postContent}>
          <Text style={styles.contentText}>
            <Text style={styles.boldUsername}>
              {item.post_type === 'shop' ? item.shop_name : item.username}{' '}
            </Text>
            {item.content}
          </Text>
          {/* Tags - Only for user posts */}
          {item.post_type !== 'shop' && item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.map((tag: string, i: number) => (
                <Text key={i} style={styles.tagText}>#{tag}</Text>
              ))}
            </View>
          )}
          <Text style={styles.timeAgo}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topHeader}>
        {showSearchBar ? (
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search posts..."
              placeholderTextColor="#EEE"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setShowSearchBar(false); setSearchQuery(''); }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.logoText}>FindMe</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSearchBar(true)}>
                <Ionicons name="search" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, activeSort === opt.key && styles.filterChipActive]}
              onPress={() => setActiveSort(opt.key)}
            >
              <Text style={[styles.filterChipText, activeSort === opt.key && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onRefresh={loadData}
        refreshing={loading}
      />

      {activePostId && (
        <PostComments
          isVisible={showComments}
          onClose={() => setShowComments(false)}
          postId={activePostId}
          onCommentAdded={() => loadData()}
        />
      )}
    </View>
  );
};

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    backgroundColor: '#7F9460', paddingTop: STATUS_BAR_HEIGHT, height: STATUS_BAR_HEIGHT + 60,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { marginLeft: 15 },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchBarInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 0,
  },
  filterBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterScroll: { paddingHorizontal: 15, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F2F5', marginRight: 6 },
  filterChipActive: { backgroundColor: '#7F9460' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  filterChipTextActive: { color: '#FFF' },
  filterDivider: { width: 1, backgroundColor: '#DDD', marginHorizontal: 4 },
  postCard: { backgroundColor: '#fff', marginBottom: 8 },
  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  profilePic: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  postInfo: { marginLeft: 10 },
  username: { fontWeight: '700', fontSize: 14, color: '#262626' },
  location: { fontSize: 11, color: '#8E8E8E' },
  shopBadge: { backgroundColor: '#7F9460', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 6 },
  shopBadgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  postImage: { width: width, height: width, resizeMode: 'cover' },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 3 },
  actionsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  leftActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 6, marginRight: 12 },
  actionCount: { fontSize: 13, fontWeight: '600', color: '#555', marginLeft: 5 },
  postContent: { paddingHorizontal: 12, marginTop: 2, paddingBottom: 12 },
  boldUsername: { fontWeight: '700', color: '#262626' },
  contentText: { fontSize: 14, lineHeight: 18, color: '#262626' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
  tagText: { color: '#00376B', fontSize: 13, fontWeight: '500' },
  timeAgo: { color: '#8E8E8E', fontSize: 10, marginTop: 6, textTransform: 'uppercase' },
  followBtn: { backgroundColor: '#7F9460', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, marginRight: 4 },
  followBtnActive: { backgroundColor: '#F0F2F5' },
  followBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  followBtnTextActive: { color: '#333' },

  // Comments Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  commentContainer: { backgroundColor: '#FFF', height: height * 0.7, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  commentList: { padding: 16 },
  commentItem: { flexDirection: 'row', marginBottom: 16 },
  commentAva: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEE', marginRight: 12 },
  commentContent: { flex: 1, backgroundColor: '#F8F9FA', padding: 10, borderRadius: 12 },
  commentUser: { fontWeight: '700', fontSize: 13, color: '#333' },
  commentText: { fontSize: 13, color: '#444', marginTop: 2 },
  commentTime: { fontSize: 10, color: '#999', marginTop: 4 },
  noComments: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: '#FFF' },
  commentInput: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 14 },
  sendBtn: { marginLeft: 12, padding: 4 },
  sendBtnDisabled: { opacity: 0.5 },
});

export default PostScreen;
