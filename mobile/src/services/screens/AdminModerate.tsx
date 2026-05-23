import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
    ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAllPosts, deletePost_Admin } from '../api';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const AdminModerate = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchAllPosts();
            setPosts(data.posts || []);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (postId: number, content: string) => {
        Alert.alert(
            '🚫 Delete Post',
            `Remove this post?\n\n"${(content || '').substring(0, 80)}..."`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            await deletePost_Admin(postId);
                            Alert.alert('Done', 'Post deleted.');
                            loadData();
                        } catch (err: any) { Alert.alert('Error', err.message); }
                    }
                }
            ]
        );
    };

    const renderPost = ({ item }: any) => {
        const photos = typeof item.photos === 'string' ? JSON.parse(item.photos) : (item.photos || []);
        const isShopPost = !!item.shop_id;

        return (
            <View style={styles.card}>
                {/* Author */}
                <View style={styles.authorRow}>
                    <View style={[styles.avatar, isShopPost ? styles.avatarShop : styles.avatarUser]}>
                        <Text style={styles.avatarText}>
                            {isShopPost ? '🏪' : '👤'}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.authorName}>
                            {isShopPost ? item.shop_name : item.username}
                        </Text>
                        <Text style={styles.authorMeta}>
                            {isShopPost ? `Shop Post` : item.user_email} • {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={[styles.typeBadge, isShopPost ? styles.typeBadgeShop : styles.typeBadgeUser]}>
                        <Text style={styles.typeBadgeText}>{isShopPost ? 'SHOP' : 'USER'}</Text>
                    </View>
                </View>

                {/* Content */}
                {item.content && (
                    <Text style={styles.content} numberOfLines={4}>{item.content}</Text>
                )}

                {/* Photos */}
                {photos.length > 0 && (
                    <View style={styles.photoRow}>
                        {photos.slice(0, 3).map((photo: any, i: number) => (
                            <Image
                                key={photo.photo_id || i}
                                source={{ uri: photo.photo_url }}
                                style={[styles.photo, photos.length === 1 && styles.photoSingle]}
                            />
                        ))}
                        {photos.length > 3 && (
                            <View style={styles.photoMore}>
                                <Text style={styles.photoMoreText}>+{photos.length - 3}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Post ID + Delete */}
                <View style={styles.bottomRow}>
                    <Text style={styles.postId}>ID: {item.post_id}</Text>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.post_id, item.content)}
                    >
                        <Ionicons name="trash-outline" size={14} color="#C62828" />
                        <Text style={styles.deleteBtnText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Stats bar */}
            <View style={styles.statsBar}>
                <Text style={styles.statsText}>
                    📝 {posts.length} total posts • 🏪 {posts.filter(p => p.shop_id).length} shop • 👤 {posts.filter(p => !p.shop_id).length} user
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1A237E" /></View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={(item) => String(item.post_id)}
                    contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="newspaper-outline" size={50} color="#DDD" />
                            <Text style={styles.emptyText}>No posts to moderate</Text>
                        </View>
                    }
                    onRefresh={loadData}
                    refreshing={loading}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

    statsBar: { backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    statsText: { fontSize: 11, color: '#777', fontWeight: '600' },

    card: {
        backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    avatarShop: { backgroundColor: '#E8F5E9' },
    avatarUser: { backgroundColor: '#E3F2FD' },
    avatarText: { fontSize: 16 },
    authorName: { fontSize: 13, fontWeight: 'bold', color: '#1A1A1A' },
    authorMeta: { fontSize: 10, color: '#999', marginTop: 1 },

    typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    typeBadgeShop: { backgroundColor: '#E8F5E9' },
    typeBadgeUser: { backgroundColor: '#E3F2FD' },
    typeBadgeText: { fontSize: 8, fontWeight: '800', color: '#555', letterSpacing: 0.5 },

    content: { fontSize: 13, color: '#333', lineHeight: 19, marginBottom: 10 },

    photoRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    photo: { flex: 1, height: 80, borderRadius: 8, backgroundColor: '#EEE' },
    photoSingle: { height: 150, flex: 1 },
    photoMore: { width: 50, height: 80, borderRadius: 8, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
    photoMoreText: { fontSize: 14, fontWeight: 'bold', color: '#999' },

    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 8 },
    postId: { fontSize: 9, color: '#CCC', fontWeight: '600' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FFEBEE', borderRadius: 8 },
    deleteBtnText: { fontSize: 11, color: '#C62828', fontWeight: 'bold' },

    emptyText: { color: '#BBB', fontSize: 13, marginTop: 10 },
});

export default AdminModerate;
