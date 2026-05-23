import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    Image, ActivityIndicator, SafeAreaView, StatusBar, Dimensions, Platform, Alert, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    fetchShopPosts,
    fetchSubscriptionStatus,
    fetchPaymentHistory,
    submitMonthlyPayment,
    fetchShopAdmins,
    inviteShopAdmin,
    removeShopAdmin,
    searchUsers,
    deletePost_User
} from '../api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
        borderBottomWidth: 1, borderBottomColor: '#EEE',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statsRow: { flexDirection: 'row', padding: 20, gap: 12 },
    statBox: {
        flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 16,
        alignItems: 'center', elevation: 1,
    },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '600' },
    createBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#7F9460', marginHorizontal: 20, padding: 14,
        borderRadius: 14, gap: 8,
    },
    createBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
    sectionTitle: {
        fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1,
        paddingHorizontal: 20, marginTop: 20, marginBottom: 10,
    },
    postCard: { marginBottom: 12 },
    postCardInner: {
        flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14,
        overflow: 'hidden', elevation: 1,
    },
    postImage: { width: 80, height: 80 },
    postDetails: { flex: 1, padding: 12, justifyContent: 'center' },
    postContent: { fontSize: 13, color: '#333', fontWeight: '500' },
    postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#666' },
    postDate: { fontSize: 10, color: '#999' },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#999', fontSize: 14 },
    tabToggle: {
        flexDirection: 'row', backgroundColor: '#F0F0F0', margin: 20, padding: 4, borderRadius: 12,
    },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabBtnActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    tabBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
    tabBtnTextActive: { color: '#1A237E' },
    subsPanel: {
        backgroundColor: '#FFF', marginHorizontal: 20, padding: 25, borderRadius: 16, alignItems: 'center',
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
    },
    countdownCircle: {
        width: 120, height: 120, borderRadius: 60, borderWidth: 8, borderColor: '#E8F5E9',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    countdownNumber: { fontSize: 36, fontWeight: '900', color: '#2E7D32' },
    countdownLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
    subsInfo: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 18, marginBottom: 25 },
    payBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#1A237E', paddingVertical: 14, paddingHorizontal: 30,
        borderRadius: 12, gap: 10, width: '100%',
    },
    payBtnDisabled: { backgroundColor: '#CCC' },
    payBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    historyCard: {
        flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF',
        marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: 14,
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2,
    },
    historyInfo: { gap: 4 },
    historyType: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    historyDate: { fontSize: 11, color: '#999' },
    historyAmountRow: { alignItems: 'flex-end', gap: 6 },
    historyAmount: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 9, fontWeight: '800' },
    adminTag: {
        fontSize: 10,
        color: '#7F9460',
        fontWeight: 'bold',
        marginTop: 4,
        backgroundColor: '#F1F8E9',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    adminSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 1 },
    adminSectionTitle: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 15, marginTop: 10 },
    adminInput: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14 },
    adminBtn: { backgroundColor: '#7F9460', padding: 8, borderRadius: 8, alignItems: 'center' },
    adminBtnDisabled: { backgroundColor: '#CCC' },
    adminBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    adminCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
    adminName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    adminSince: { fontSize: 11, color: '#999', marginTop: 2 },
    pendingBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    pendingText: { fontSize: 10, fontWeight: '800', color: '#EF6C00' },
    searchResultItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
    },
    searchPlaceholder: { paddingVertical: 20, alignItems: 'center' },
    searchPlaceholderText: { color: '#CCC', fontSize: 13, fontStyle: 'italic' },
});

const ShopDashboard = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const [shop, setShop] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'posts' | 'pay' | 'admins'>('posts');
    const [totalReactions, setTotalReactions] = useState(0);

    // Subscription State
    const [subStatus, setSubStatus] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Admin State
    const [admins, setAdmins] = useState<any[]>([]);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [inviting, setInviting] = useState(false);
    const [adminUsername, setAdminUsername] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) setCurrentUser(JSON.parse(userData));
        };
        loadUser();
    }, []);

    // Debounced Search for Users
    useEffect(() => {
        const timer = setTimeout(() => {
            if (adminUsername.trim().length >= 2) {
                performUserSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [adminUsername]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const shopData = await AsyncStorage.getItem('active_shop');
            if (shopData) {
                const parsed = JSON.parse(shopData);
                setShop(parsed);

                const [postsData, subData, historyData, adminData] = await Promise.all([
                    fetchShopPosts(parsed.shop_id),
                    fetchSubscriptionStatus(parsed.shop_id),
                    fetchPaymentHistory(parsed.shop_id),
                    fetchShopAdmins(parsed.shop_id).catch(() => ({ admins: [], pendingInvites: [] }))
                ]);

                setPosts(postsData.posts || []);
                setTotalReactions((postsData.posts || []).reduce((sum: number, p: any) => sum + (p.reaction_count || 0), 0));
                setSubStatus(subData);
                setHistory(historyData.payments || []);
                setAdmins(adminData.admins || []);
                setPendingInvites(adminData.pendingInvites || []);
            }
        } catch (err: any) {
            console.error('Dashboard load error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const performUserSearch = async () => {
        try {
            setSearching(true);
            const res = await searchUsers(adminUsername);
            // Filter out users already in admins or pendingInvites list
            const currentAdminIds = admins.map(a => a.user_id);
            const pendingUserIds = pendingInvites.map(i => i.invited_user_id);
            const filtered = (res.users || []).filter((u: any) =>
                !currentAdminIds.includes(u.user_id) &&
                !pendingUserIds.includes(u.user_id) &&
                u.user_id !== currentUser?.user_id
            );
            setSearchResults(filtered);
        } catch (err) {
            console.error('User search error:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleInviteAdmin = async (userId: number, username: string) => {
        try {
            setInviting(true);
            await inviteShopAdmin(shop.shop_id, userId);
            Alert.alert('Success', `Invitation sent to @${username}!`);
            setAdminUsername('');
            setSearchResults([]);
            loadData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveAdmin = (userId: number, name: string) => {
        Alert.alert('Remove Admin', `Remove ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                        await removeShopAdmin(shop.shop_id, userId);
                        loadData();
                    } catch (err: any) { Alert.alert('Error', err.message); }
                }
            }
        ]);
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
            "Are you sure you want to delete this official shop post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deletePost_User(postId);
                            Alert.alert("Success", "Post deleted successfully.");
                            loadData();
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
            "Shop Post Options",
            "Manage this post",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Edit Content", onPress: () => handleEditPost(post) },
                { text: "Delete Post", style: "destructive", onPress: () => handleDeletePost(post.post_id) }
            ]
        );
    };

    const handlePayMonthly = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your photos to upload receipts!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (result.canceled) return;
        const image = result.assets[0].uri;

        try {
            setIsUploading(true);
            const fd = new FormData();
            fd.append('shop_id', shop.shop_id.toString());
            fd.append('amount', '50'); // Example monthly fee
            fd.append('receipt', {
                uri: image,
                name: `monthly_receipt_${Date.now()}.jpg`,
                type: 'image/jpeg',
            } as any);

            await submitMonthlyPayment(fd);
            Alert.alert('✅ Success', 'Payment submitted! Admin will validate it soon.');
            loadData();
        } catch (err: any) {
            Alert.alert('❌ Error', err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const renderPost = ({ item }: any) => {
        const photo = item.photos?.[0];
        return (
            <View style={styles.postCard}>
                <View style={styles.postCardInner}>
                    {photo && <Image source={{ uri: photo }} style={styles.postImage} />}
                    <View style={styles.postDetails}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={[styles.postContent, { flex: 1 }]} numberOfLines={2}>{item.content || 'No caption'}</Text>
                            <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 10 }}>
                                <TouchableOpacity onPress={() => handleEditPost(item)}>
                                    <Ionicons name="pencil-outline" size={16} color="#7F9460" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {item.posted_by_admin_name && (
                            <Text style={styles.adminTag}>Posted by @{item.posted_by_admin_name}</Text>
                        )}
                        <View style={styles.postMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="heart" size={14} color="#FF6B6B" />
                                <Text style={styles.metaText}>{item.reaction_count || 0}</Text>
                            </View>
                            <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderHistoryItem = ({ item }: any) => (
        <View style={styles.historyCard}>
            <View style={styles.historyInfo}>
                <Text style={styles.historyType}>{item.payment_type || 'Registration'}</Text>
                <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.payment_status === 'Approved' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.statusText, { color: item.payment_status === 'Approved' ? '#2E7D32' : '#EF6C00' }]}>
                    {item.payment_status.toUpperCase()}
                </Text>
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

    const daysLeft = subStatus?.days_left || 0;
    const canPay = daysLeft <= 10;
    const isOwner = shop?.user_role === 'owner' || (currentUser && shop?.owner_id === currentUser.user_id);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{shop?.name || 'Dashboard'}</Text>
                {isOwner ? (
                    <TouchableOpacity onPress={() => navigation.navigate('ShopAdminsManagement', { shopId: shop.shop_id, shopName: shop.name })}>
                        <Ionicons name="settings-outline" size={22} color="#333" />
                    </TouchableOpacity>
                ) : <View style={{ width: 24 }} />}
            </View>

            {/* Tab Toggle */}
            <View style={styles.tabToggle}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'posts' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('posts')}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'posts' && styles.tabBtnTextActive]}>Feed</Text>
                </TouchableOpacity>
                {isOwner && (
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'pay' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('pay')}
                    >
                        <Text style={[styles.tabBtnText, activeTab === 'pay' && styles.tabBtnTextActive]}>Pay & Subs</Text>
                    </TouchableOpacity>
                )}
                {isOwner && (
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'admins' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('admins')}
                    >
                        <Text style={[styles.tabBtnText, activeTab === 'admins' && styles.tabBtnTextActive]}>Admins</Text>
                    </TouchableOpacity>
                )}
            </View>

            {activeTab === 'posts' ? (
                <>
                    <TouchableOpacity
                        style={[styles.createBtn, { marginTop: 0, marginBottom: 10 }]}
                        onPress={() => navigation.navigate('CreatePost', {
                            shopMode: true,
                            shopId: shop.shop_id,
                            shopName: shop.name
                        })}
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.createBtnText}>Create New Post</Text>
                    </TouchableOpacity>
                    <FlatList
                        data={posts}
                        renderItem={renderPost}
                        keyExtractor={(item) => item.post_id.toString()}
                        ListHeaderComponent={
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{posts.length}</Text>
                                    <Text style={styles.statLabel}>POSTS</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{totalReactions}</Text>
                                    <Text style={styles.statLabel}>REACTIONS</Text>
                                </View>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>No posts yet.</Text>
                            </View>
                        }
                    />
                </>
            ) : activeTab === 'pay' ? (
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={{ padding: 20 }}>
                        <View style={styles.subsPanel}>
                            <View style={styles.countdownCircle}>
                                <Text style={styles.countdownNumber}>{daysLeft}</Text>
                                <Text style={styles.countdownLabel}>DAYS LEFT</Text>
                            </View>

                            <Text style={styles.subsInfo}>
                                Your shop's visibility depends on your subscription.
                                Please pay the monthly fee to keep it active.
                            </Text>

                            <TouchableOpacity
                                style={[styles.payBtn, (!canPay || isUploading) && styles.payBtnDisabled]}
                                onPress={handlePayMonthly}
                                disabled={!canPay || isUploading}
                            >
                                {isUploading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="card-outline" size={22} color="#FFF" />
                                        <Text style={styles.payBtnText}>
                                            {canPay ? 'Pay Monthly Fee ($50)' : `Enabled in ${daysLeft - 10} days`}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Payment History */}
                    <Text style={styles.sectionTitle}>PAYMENT HISTORY</Text>
                    <FlatList
                        data={history}
                        renderItem={renderHistoryItem}
                        keyExtractor={(item) => item.payment_id.toString()}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>No payment history found.</Text>
                            </View>
                        }
                    />
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={{ padding: 20 }}>
                        {/* Invite Form Refactored to Search */}
                        <View style={styles.adminSection}>
                            <Text style={styles.adminSectionTitle}>INVITE NEW ADMIN</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 12 }}>
                                <Ionicons name="search-outline" size={20} color="#999" />
                                <TextInput
                                    style={[styles.adminInput, { backgroundColor: 'transparent', flex: 1, marginBottom: 0 }]}
                                    placeholder="Search user by username..."
                                    value={adminUsername}
                                    onChangeText={setAdminUsername}
                                    autoCapitalize="none"
                                />
                                {searching && <ActivityIndicator size="small" color="#7F9460" />}
                            </View>

                            {/* Search Results */}
                            {adminUsername.length >= 2 && (
                                <View style={{ marginTop: 10 }}>
                                    {searchResults.length > 0 ? (
                                        searchResults.map(user => (
                                            <View key={user.user_id} style={styles.searchResultItem}>
                                                <Text style={{ fontWeight: '600', color: '#333' }}>@{user.username}</Text>
                                                <TouchableOpacity
                                                    style={[styles.adminBtn, inviting && styles.adminBtnDisabled]}
                                                    onPress={() => handleInviteAdmin(user.user_id, user.username)}
                                                    disabled={inviting}
                                                >
                                                    <Text style={styles.adminBtnText}>Invite</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    ) : !searching ? (
                                        <View style={styles.searchPlaceholder}>
                                            <Text style={styles.searchPlaceholderText}>No available users found.</Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}
                            {adminUsername.length > 0 && adminUsername.length < 2 && (
                                <View style={styles.searchPlaceholder}>
                                    <Text style={styles.searchPlaceholderText}>Type at least 2 characters to search...</Text>
                                </View>
                            )}
                        </View>

                        {/* Active Admins */}
                        {admins.length > 0 && <Text style={styles.adminSectionTitle}>ACTIVE ADMINISTRATORS ({admins.length}/5)</Text>}
                        {admins.map(admin => (
                            <View key={admin.user_id} style={styles.adminCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.adminName}>{admin.username}</Text>
                                    <Text style={styles.adminSince}>Since {new Date(admin.created_at).toLocaleDateString()}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveAdmin(admin.user_id, admin.username)}>
                                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Pending Invites */}
                        {pendingInvites.length > 0 && <Text style={styles.adminSectionTitle}>PENDING INVITATIONS</Text>}
                        {pendingInvites.map(invite => (
                            <View key={invite.invitation_id} style={[styles.adminCard, { opacity: 0.7 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.adminName}>{invite.username}</Text>
                                    <Text style={styles.adminSince}>Expires {new Date(invite.expires_at).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.pendingBadge}>
                                    <Text style={styles.pendingText}>PENDING</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default ShopDashboard;
