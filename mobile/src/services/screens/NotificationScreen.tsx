import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    FlatList,
    Alert,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchNotifications, respondToInvitation } from '../api';

const NotificationScreen = () => {
    const navigation = useNavigation<any>();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingNotif, setProcessingNotif] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [])
    );

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await fetchNotifications();
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error('Notification check error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (invitationId: number, action: 'Accept' | 'Decline') => {
        try {
            setProcessingNotif(invitationId);
            const res = await respondToInvitation(invitationId, action);
            Alert.alert(action === 'Accept' ? 'Accepted!' : 'Declined', res.message);
            await loadNotifications();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setProcessingNotif(null);
        }
    };

    const renderNotification = ({ item }: any) => {
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
            return (
                <TouchableOpacity
                    style={styles.notifCard}
                    onPress={() => navigation.navigate('ShopProfile', { shopId: item.shop_id })}
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
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            {loading && notifications.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7F9460" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item, index) => item.type + '_' + item.id + '_' + index}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.listContent}
                    onRefresh={loadNotifications}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="notifications-off-outline" size={60} color="#DDD" />
                            <Text style={styles.emptyText}>No new notifications</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        alignItems: 'center'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    listContent: { padding: 15, paddingBottom: 100 },
    notifCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
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
    notifShopName: { fontSize: 16, fontWeight: '700', color: '#333' },
    notifInvitedBy: { fontSize: 12, color: '#666' },
    notifMessage: { fontSize: 14, color: '#444', marginVertical: 8, lineHeight: 20 },
    typeBadge: { backgroundColor: '#F1F8E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeBadgeText: { fontSize: 9, fontWeight: '900', color: '#7F9460' },
    notifBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    declineBtn: { backgroundColor: '#F5F5F5' },
    acceptBtn: { backgroundColor: '#7F9460' },
    declineText: { color: '#666', fontWeight: '700' },
    acceptText: { color: '#FFF', fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: '#AAA', marginTop: 10, fontSize: 16 }
});

export default NotificationScreen;
