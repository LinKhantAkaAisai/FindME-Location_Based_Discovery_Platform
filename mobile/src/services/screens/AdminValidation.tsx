import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
    ActivityIndicator, Alert, Modal, Dimensions, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    fetchPendingShops, approveShop, rejectShop,
    freezeShop, unfreezeShop, validateMonthlyPayment
} from '../api';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type FilterTab = 'pending' | 'active' | 'frozen' | 'all';

const AdminValidation = () => {
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FilterTab>('pending');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchPendingShops();
            setShops(data.shops || []);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (title: string, msg: string, action: () => Promise<any>) => {
        Alert.alert(title, msg, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm', onPress: async () => {
                    try { await action(); loadData(); } catch (err: any) { Alert.alert('Error', err.message); }
                }
            }
        ]);
    };

    const filtered = shops.filter((s) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'pending') return s.payment_status === 'Pending';
        if (activeTab === 'active') return s.business_valid === true;
        if (activeTab === 'frozen') return s.business_valid === false && s.payment_status !== 'Pending';
        return true;
    });

    const tabConfig: { key: FilterTab; label: string; icon: string }[] = [
        { key: 'pending', label: 'Pending', icon: 'time-outline' },
        { key: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
        { key: 'frozen', label: 'Frozen', icon: 'snow-outline' },
        { key: 'all', label: 'All', icon: 'list-outline' },
    ];

    const renderShopCard = ({ item }: any) => {
        const isPending = item.payment_status === 'Pending';
        const isActive = item.business_valid === true;
        const isFrozen = !item.business_valid && item.payment_status !== 'Pending';

        let statusColor = '#EF6C00';
        let statusText = 'PENDING';
        if (isActive) { statusColor = '#2E7D32'; statusText = 'ACTIVE'; }
        else if (isFrozen) { statusColor = '#5C6BC0'; statusText = 'FROZEN'; }

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.shopName}>{item.name}</Text>
                        <Text style={styles.shopCategory}>{item.category}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={13} color="#888" />
                    <Text style={styles.infoText}>{item.owner_name} ({item.owner_email})</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={13} color="#888" />
                    <Text style={styles.infoText}>{item.address || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={13} color="#888" />
                    <Text style={styles.infoText}>{item.phone_number || '—'}</Text>
                </View>

                {/* Payment & Documents */}
                {item.payment_id && (
                    <View style={styles.docSection}>
                        <Text style={styles.docSectionLabel}>PAYMENT: ${item.amount} • {new Date(item.payment_date).toLocaleDateString()}</Text>
                        {item.documents && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                {item.documents.receipt && (
                                    <TouchableOpacity style={styles.docCard} onPress={() => setPreviewImage(item.documents.receipt)}>
                                        <Image source={{ uri: item.documents.receipt }} style={styles.docThumb} />
                                        <Text style={styles.docLabel}>💳 Receipt</Text>
                                    </TouchableOpacity>
                                )}
                                {item.documents.ownership_form && (
                                    <TouchableOpacity style={styles.docCard} onPress={() => setPreviewImage(item.documents.ownership_form)}>
                                        <Image source={{ uri: item.documents.ownership_form }} style={styles.docThumb} />
                                        <Text style={styles.docLabel}>📋 Ownership</Text>
                                    </TouchableOpacity>
                                )}
                                {item.documents.certificate && (
                                    <TouchableOpacity style={styles.docCard} onPress={() => setPreviewImage(item.documents.certificate)}>
                                        <Image source={{ uri: item.documents.certificate }} style={styles.docThumb} />
                                        <Text style={styles.docLabel}>🏅 Certificate</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}
                    </View>
                )}

                {/* Actions */}
                {isPending && item.payment_type !== 'Monthly' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#2E7D32' }]}
                            onPress={() => handleAction('Approve', `Approve "${item.name}"?`, () => approveShop(item.shop_id))}
                        >
                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#C62828' }]}
                            onPress={() => handleAction('Reject', `Reject "${item.name}"?`, () => rejectShop(item.shop_id))}
                        >
                            <Ionicons name="close-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {isPending && item.payment_type === 'Monthly' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#2E7D32', marginTop: 12, alignSelf: 'stretch' }]}
                        onPress={() => handleAction('Validate Monthly', `Approve monthly payment for "${item.name}"?`, () => validateMonthlyPayment(item.payment_id))}
                    >
                        <Ionicons name="checkmark-done" size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>Validate Monthly Payment</Text>
                    </TouchableOpacity>
                )}
                {isActive && !isPending && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#5C6BC0', marginTop: 12, alignSelf: 'stretch' }]}
                        onPress={() => handleAction('Freeze Shop', `Freeze "${item.name}"? Dashboard access will be limited.`, () => freezeShop(item.shop_id))}
                    >
                        <Ionicons name="snow" size={16} color="#FFF" />
                        <Text style={styles.actionBtnText}>Freeze Subscription</Text>
                    </TouchableOpacity>
                )}
                {isFrozen && !isPending && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#2E7D32', marginTop: 12, alignSelf: 'stretch' }]}
                        onPress={() => handleAction('Unfreeze Shop', `Reactivate "${item.name}"?`, () => unfreezeShop(item.shop_id))}
                    >
                        <Ionicons name="flame" size={16} color="#FFF" />
                        <Text style={styles.actionBtnText}>Unfreeze / Reactivate</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.dateText}>Registered: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Sub Tabs */}
            <View style={styles.tabBar}>
                {tabConfig.map((tab) => {
                    const count = shops.filter(s => {
                        if (tab.key === 'all') return true;
                        if (tab.key === 'pending') return s.payment_status === 'Pending';
                        if (tab.key === 'active') return s.business_valid === true;
                        if (tab.key === 'frozen') return s.business_valid === false && s.payment_status !== 'Pending';
                        return true;
                    }).length;

                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Ionicons
                                name={tab.icon as any}
                                size={16}
                                color={activeTab === tab.key ? '#1A237E' : '#999'}
                            />
                            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                            <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                                <Text style={[styles.tabBadgeText, activeTab === tab.key && { color: '#FFF' }]}>{count}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1A237E" /></View>
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={renderShopCard}
                    keyExtractor={(item) => `${item.shop_id}-${item.payment_id || 'np'}`}
                    contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name={activeTab === 'frozen' ? 'snow-outline' : 'checkmark-done-circle-outline'} size={50} color="#DDD" />
                            <Text style={styles.emptyText}>No shops here</Text>
                        </View>
                    }
                    onRefresh={loadData}
                    refreshing={loading}
                />
            )}

            {/* Preview Modal */}
            <Modal visible={!!previewImage} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPreviewImage(null)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Document Preview</Text>
                        {previewImage && <Image source={{ uri: previewImage }} style={styles.modalImage} resizeMode="contain" />}
                        <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewImage(null)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

    tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingTop: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', gap: 2 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#1A237E' },
    tabText: { fontSize: 10, color: '#999', fontWeight: '600' },
    tabTextActive: { color: '#1A237E', fontWeight: 'bold' },
    tabBadge: { backgroundColor: '#F0F0F0', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
    tabBadgeActive: { backgroundColor: '#1A237E' },
    tabBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#999' },

    card: {
        backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    shopName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
    shopCategory: { fontSize: 11, color: '#7F9460', fontWeight: '600', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    infoText: { fontSize: 11, color: '#777', flex: 1 },

    docSection: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 10, marginTop: 10 },
    docSectionLabel: { fontSize: 9, fontWeight: '700', color: '#999', letterSpacing: 0.5 },
    docCard: { width: 90, marginRight: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#EEE' },
    docThumb: { width: 90, height: 70, backgroundColor: '#DDD' },
    docLabel: { fontSize: 8, fontWeight: 'bold', color: '#666', textAlign: 'center', paddingVertical: 3 },

    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 5 },
    actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    dateText: { fontSize: 9, color: '#CCC', marginTop: 8 },
    emptyText: { color: '#BBB', fontSize: 13, marginTop: 10 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width - 40, backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center' },
    modalTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    modalImage: { width: width - 80, height: width, borderRadius: 8 },
    modalClose: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 28, backgroundColor: '#1A237E', borderRadius: 10 },
    modalCloseText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});

export default AdminValidation;
