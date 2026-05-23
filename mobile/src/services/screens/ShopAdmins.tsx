import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    TextInput, ActivityIndicator, Alert, SafeAreaView, StatusBar, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchShopAdmins, inviteShopAdmin, removeShopAdmin, searchUsers } from '../api';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

const ShopAdmins = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { shopId, shopName } = route.params;

    const [admins, setAdmins] = useState<any[]>([]);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);

    // Search state
    const [username, setUsername] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (username.trim().length >= 2) {
                performUserSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchShopAdmins(shopId);
            setAdmins(data.admins || []);
            setPendingInvites(data.pendingInvites || []);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const performUserSearch = async () => {
        try {
            setSearching(true);
            const res = await searchUsers(username);
            const currentAdminIds = admins.map(a => a.user_id);
            const pendingUserIds = pendingInvites.map(i => i.invited_user_id || i.user_id);
            const filtered = (res.users || []).filter((u: any) =>
                !currentAdminIds.includes(u.user_id) &&
                !pendingUserIds.includes(u.user_id)
            );
            setSearchResults(filtered);
        } catch (err) {
            console.error('User search error:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleInvite = async (userId: number, name: string) => {
        try {
            setInviting(true);
            await inviteShopAdmin(shopId, userId);
            Alert.alert('Success', `Invitation sent to @${name}!`);
            setUsername('');
            setSearchResults([]);
            loadData();
        } catch (err: any) {
            Alert.alert('Invite Failed', err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = (userId: number, adminName: string) => {
        Alert.alert(
            'Remove Administrator',
            `Are you sure you want to remove ${adminName} as an administrator?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeShopAdmin(shopId, userId);
                            Alert.alert('Success', 'Administrator removed.');
                            loadData();
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    const renderAdminItem = ({ item }: any) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.adminName}>{item.username}</Text>
                <Text style={styles.adminDate}>Added on {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.user_id, item.username)} style={styles.removeBtn}>
                <Ionicons name="person-remove-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
        </View>
    );

    const renderPendingItem = ({ item }: any) => (
        <View style={[styles.card, styles.pendingCard]}>
            <View style={styles.cardInfo}>
                <Text style={styles.adminName}>{item.username}</Text>
                <Text style={styles.adminDate}>Expires on {new Date(item.expires_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>PENDING</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Administrators</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={admins}
                keyExtractor={(item) => item.user_id.toString()}
                renderItem={renderAdminItem}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        {/* Search Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>INVITE NEW ADMIN</Text>
                            <View style={styles.searchBar}>
                                <Ionicons name="search-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Search by username..."
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                />
                                {searching && <ActivityIndicator size="small" color="#7F9460" />}
                            </View>

                            {username.trim().length >= 2 && (
                                <View style={styles.resultsList}>
                                    {searchResults.length > 0 ? (
                                        searchResults.map(user => (
                                            <View key={user.user_id} style={styles.resultItem}>
                                                <Text style={styles.resultText}>@{user.username}</Text>
                                                <TouchableOpacity
                                                    style={[styles.inviteBtn, inviting && styles.inviteBtnDisabled]}
                                                    onPress={() => handleInvite(user.user_id, user.username)}
                                                    disabled={inviting}
                                                >
                                                    <Text style={styles.inviteBtnText}>Invite</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    ) : !searching ? (
                                        <Text style={styles.noResults}>No available users found.</Text>
                                    ) : null}
                                </View>
                            )}
                        </View>

                        {admins.length > 0 && <Text style={styles.sectionTitle}>ACTIVE ADMINISTRATORS ({admins.length}/5)</Text>}
                    </View>
                }
                ListFooterComponent={
                    pendingInvites.length > 0 ? (
                        <View style={styles.listFooter}>
                            <Text style={styles.sectionTitle}>PENDING INVITATIONS</Text>
                            {pendingInvites.map((item) => renderPendingItem({ item }))}
                        </View>
                    ) : null
                }
                contentContainerStyle={styles.scrollContent}
                ListEmptyComponent={
                    !loading && admins.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No administrators added yet.</Text>
                        </View>
                    ) : null
                }
            />
            {loading && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="#7F9460" />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
        borderBottomWidth: 1, borderBottomColor: '#EEE',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    scrollContent: { paddingBottom: 40 },
    listHeader: { paddingHorizontal: 20, paddingTop: 20 },
    listFooter: { paddingHorizontal: 20, marginTop: 20 },
    section: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 25, elevation: 1 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 15, paddingHorizontal: 20 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
        borderRadius: 10, paddingHorizontal: 12, height: 45
    },
    input: { flex: 1, paddingHorizontal: 8, fontSize: 14, color: '#333' },
    resultsList: { marginTop: 10 },
    resultItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F5'
    },
    resultText: { fontWeight: '600', color: '#333' },
    inviteBtn: { backgroundColor: '#7F9460', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
    inviteBtnDisabled: { backgroundColor: '#CCC' },
    inviteBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    noResults: { textAlign: 'center', color: '#999', fontSize: 12, paddingVertical: 10, fontStyle: 'italic' },
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
        marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 12,
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2,
    },
    pendingCard: { opacity: 0.8 },
    cardInfo: { flex: 1 },
    adminName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    adminDate: { fontSize: 11, color: '#999', marginTop: 2 },
    removeBtn: { padding: 8 },
    pendingBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    pendingText: { fontSize: 10, fontWeight: '800', color: '#EF6C00' },
    empty: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#999', fontSize: 14 },
    loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' }
});

export default ShopAdmins;
