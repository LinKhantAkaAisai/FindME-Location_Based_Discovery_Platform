import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView,
  StatusBar, ActivityIndicator, Dimensions, Image, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchBookmarkedPosts, togglePostBookmark } from '../api';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 2 - 25;

const BookmarksScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchBookmarkedPosts();
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnbookmarkPost = async (postId: number) => {
    try {
      await togglePostBookmark(postId);
      setPosts(prev => prev.filter(p => p.post_id !== postId));
    } catch (error) {
      console.error('Unbookmark error:', error);
    }
  };

  const renderPostItem = ({ item }: any) => {
    const photo = item.photos?.[0];
    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => navigation.navigate('ShopProfile', { shopId: item.shop_id })}
      >
        <Image
          source={{ uri: photo || 'https://via.placeholder.com/150' }}
          style={styles.postImage}
        />
        <TouchableOpacity
          style={styles.unbookmarkBtn}
          onPress={() => handleUnbookmarkPost(item.post_id)}
        >
          <Ionicons name="bookmark" size={18} color="#FF6B6B" />
        </TouchableOpacity>
        <View style={styles.postInfo}>
          <Text style={styles.postContent} numberOfLines={1}>{item.content || 'No description'}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.postLocation}><Ionicons name="location-outline" size={10} /> {item.location}</Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={12} color="#888" />
                <Text style={styles.statText}>{item.comment_count || 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Posts</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7F9460" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item: any) => item.post_id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={60} color="#EEE" />
              <Text style={styles.emptyText}>No saved posts yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 20 : 0, height: 60,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  listContent: { paddingHorizontal: 15, paddingBottom: 40, paddingTop: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Post Grid
  postCard: {
    width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.3,
    backgroundColor: '#F8F9FA', borderRadius: 16, margin: 8,
    overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },
  postImage: { width: '100%', height: '70%' },
  unbookmarkBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#FFF', padding: 6, borderRadius: 12,
  },
  postInfo: { padding: 10 },
  postContent: { fontSize: 12, fontWeight: '600', color: '#333' },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  postLocation: { fontSize: 10, color: '#888', flex: 1 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statText: { fontSize: 10, color: '#888' },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#CCC', fontSize: 16, fontWeight: '600', marginTop: 15 },
});

export default BookmarksScreen;
