import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, SafeAreaView, StatusBar, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
type Tab = 'stats' | 'shops' | 'users' | 'database' | 'tools';
import { fetchShops, fetchDevUsers, fetchDevStats, fetchDevLatestInserts, loginUser } from '../api';

const DevScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('stats');

    // Stats
    const [stats, setStats] = useState<any>(null);

    // Shops
    const [shops, setShops] = useState<any[]>([]);
    const [shopFilter, setShopFilter] = useState('');

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [userFilter, setUserFilter] = useState('');

    // Quick Login
    const [quickEmail, setQuickEmail] = useState('');
    const [quickPass, setQuickPass] = useState('');

    // Database Inserts
    const [latestInserts, setLatestInserts] = useState<any>(null);

    const testAccounts = [
        { email: 'roaster@mdy.com', pass: 'password123', label: '☕ Roaster', role: 'Business' },
        { email: 'salon@mdy.com', pass: 'password123', label: '💇 Salon', role: 'Business' },
        { email: 'cosmetics@mdy.com', pass: 'password123', label: '💄 Cosmetics', role: 'Business' },
        { email: 'admin@findme.com', pass: 'password123', label: '🛡️ Admin', role: 'Admin' },
    ];

    useEffect(() => {
        loadTab(activeTab);
    }, [activeTab]);

    const loadTab = async (tab: Tab) => {
        setLoading(true);
        try {
            if (tab === 'stats') {
                const data = await fetchDevStats();
                setStats(data);
            } else if (tab === 'shops') {
                const data = await fetchShops();
                setShops(data);
            } else if (tab === 'users') {
                const data = await fetchDevUsers();
                setUsers(data.users || []);
            } else if (tab === 'database') {
                const data = await fetchDevLatestInserts();
                setLatestInserts(data);
            }
        } catch (err: any) {
            // Silent fail for dev view
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async (email: string, pass: string) => {
        setLoading(true);
        try {
            const data = await loginUser(email, pass);
            if (data.token) {
                await AsyncStorage.setItem('findme_token', data.token);
                await AsyncStorage.setItem('username', data.username);
                if (data.role) {
                    await AsyncStorage.setItem('user_role', data.role);
                }
                Alert.alert('✅ Logged In', `Now logged in as: ${data.username}\nRole: ${data.role || 'Consumer'}`);
                if (data.role === 'Platform Admin') {
                    navigation.navigate('AdminDashboard');
                } else {
                    navigation.navigate('Main');
                }
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (err: any) {
            Alert.alert('❌ Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filtered data
    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(userFilter.toLowerCase()) ||
        u.email?.toLowerCase().includes(userFilter.toLowerCase()) ||
        u.role?.toLowerCase().includes(userFilter.toLowerCase())
    );

    const filteredShops = shops.filter(s =>
        s.name?.toLowerCase().includes(shopFilter.toLowerCase()) ||
        s.category?.toLowerCase().includes(shopFilter.toLowerCase())
    );

    const renderStats = () => (
        <View>
            <Text style={styles.sectionHeader}>DATABASE OVERVIEW</Text>
            {stats ? (
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.users}</Text>
                        <Text style={styles.statLabel}>Users</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.shops}</Text>
                        <Text style={styles.statLabel}>Shops</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.posts}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardHighlight]}>
                        <Text style={[styles.statNumber, { color: '#2E7D32' }]}>{stats.premiumShops}</Text>
                        <Text style={styles.statLabel}>Premium</Text>
                    </View>
                </View>
            ) : (
                <ActivityIndicator color="#7F9460" />
            )}

            <Text style={styles.sectionHeader}>QUICK LOGIN</Text>
            <View style={styles.card}>
                {testAccounts.map((acc, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.quickLoginBtn}
                        onPress={() => handleQuickLogin(acc.email, acc.pass)}
                    >
                        <View>
                            <Text style={styles.quickLoginLabel}>{acc.label}</Text>
                            <Text style={styles.quickLoginCode}>{acc.email} / {acc.pass}</Text>
                        </View>
                        <View style={[styles.roleBadge, acc.role === 'Admin' ? styles.roleBadgeAdmin : styles.roleBadgeBiz]}>
                            <Text style={styles.roleBadgeText}>{acc.role}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionHeader}>CUSTOM LOGIN</Text>
            <View style={styles.card}>
                <TextInput
                    style={styles.devInput}
                    placeholder="Email"
                    value={quickEmail}
                    onChangeText={setQuickEmail}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.devInput}
                    placeholder="Password"
                    value={quickPass}
                    onChangeText={setQuickPass}
                    secureTextEntry
                />
                <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => handleQuickLogin(quickEmail, quickPass)}
                >
                    <Text style={styles.loginBtnText}>Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderShops = () => (
        <View>
            <TextInput
                style={styles.filterInput}
                placeholder="🔍 Filter shops by name or category..."
                value={shopFilter}
                onChangeText={setShopFilter}
            />
            <View style={styles.tableHeader}>
                <Text style={[styles.thText, { flex: 0.4 }]}>ID</Text>
                <Text style={[styles.thText, { flex: 1.5 }]}>Name</Text>
                <Text style={[styles.thText, { flex: 1 }]}>Category</Text>
                <Text style={[styles.thText, { flex: 0.8 }]}>Status</Text>
            </View>
            {filteredShops.map((shop) => (
                <View key={shop.shop_id} style={styles.tableRow}>
                    <Text style={[styles.tdText, { flex: 0.4 }]}>{shop.shop_id}</Text>
                    <Text style={[styles.tdText, { flex: 1.5 }]} numberOfLines={1}>{shop.name}</Text>
                    <Text style={[styles.tdText, { flex: 1 }]}>{shop.category}</Text>
                    <View style={{ flex: 0.8 }}>
                        <Text style={[styles.badge, shop.business_valid ? styles.badgeGreen : styles.badgeOrange]}>
                            {shop.business_valid ? 'PRE' : 'STD'}
                        </Text>
                    </View>
                </View>
            ))}
            <Text style={styles.rowCount}>{filteredShops.length} rows</Text>
        </View>
    );

    const renderUsers = () => (
        <View>
            <TextInput
                style={styles.filterInput}
                placeholder="🔍 Filter by username, email, or role..."
                value={userFilter}
                onChangeText={setUserFilter}
            />
            <View style={styles.tableHeader}>
                <Text style={[styles.thText, { flex: 0.3 }]}>ID</Text>
                <Text style={[styles.thText, { flex: 1 }]}>Username</Text>
                <Text style={[styles.thText, { flex: 1.2 }]}>Email</Text>
                <Text style={[styles.thText, { flex: 1 }]}>Pass Hash</Text>
                <Text style={[styles.thText, { flex: 0.6 }]}>Role</Text>
            </View>
            {filteredUsers.map((user) => (
                <TouchableOpacity
                    key={user.user_id}
                    style={styles.tableRow}
                    onPress={() => {
                        Alert.alert(
                            `User: ${user.username}`,
                            `ID: ${user.user_id}\nEmail: ${user.email}\nRole: ${user.role}\nPhone: ${user.phone_number || 'N/A'}\nHash: ${user.password_hash?.substring(0, 30)}...`,
                            [
                                { text: 'Close', style: 'cancel' },
                                {
                                    text: '🔑 Login As',
                                    onPress: () => {
                                        setQuickEmail(user.email);
                                        setActiveTab('stats');
                                        Alert.alert('Hint', `Enter the password for ${user.email} in the Custom Login section.`);
                                    }
                                },
                            ]
                        );
                    }}
                >
                    <Text style={[styles.tdText, { flex: 0.3 }]}>{user.user_id}</Text>
                    <Text style={[styles.tdText, { flex: 1 }]} numberOfLines={1}>{user.username}</Text>
                    <Text style={[styles.tdText, { flex: 1.2, fontSize: 10 }]} numberOfLines={1}>{user.email}</Text>
                    <Text style={[styles.tdText, { flex: 1, fontSize: 8, color: '#BBB' }]} numberOfLines={1}>
                        {user.password_hash?.substring(0, 12)}...
                    </Text>
                    <Text style={[styles.tdText, { flex: 0.6, fontSize: 9 }]}>{user.role}</Text>
                </TouchableOpacity>
            ))}
            <Text style={styles.rowCount}>{filteredUsers.length} rows</Text>
        </View>
    );

    const renderTools = () => (
        <View>
            <Text style={styles.sectionHeader}>STORAGE</Text>
            <View style={styles.card}>
                <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={async () => {
                        const token = await AsyncStorage.getItem('findme_token');
                        const user = await AsyncStorage.getItem('username');
                        const mode = await AsyncStorage.getItem('account_mode');
                        const shop = await AsyncStorage.getItem('active_shop');
                        const role = await AsyncStorage.getItem('user_role');
                        Alert.alert('Local Storage', `Token: ${token ? '✅' : '❌'}\nUser: ${user || 'none'}\nRole: ${role || 'unknown'}\nMode: ${mode || 'user'}\nShop: ${shop ? JSON.parse(shop).name : 'none'}`);
                    }}
                >
                    <Text style={styles.toolBtnText}>📋 View Local Storage</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.toolBtn, styles.toolBtnDanger]}
                    onPress={() => AsyncStorage.clear().then(() => Alert.alert('Done', 'Local storage cleared.'))}
                >
                    <Text style={[styles.toolBtnText, { color: '#FF6B6B' }]}>🗑️ Clear Local Storage</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>NAVIGATION</Text>
            <View style={styles.card}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => navigation.navigate('Main')}>
                    <Text style={styles.toolBtnText}>🏠 Go to Main Tabs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.toolBtnText}>🔑 Go to Login</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => navigation.navigate('RegisterShop')}>
                    <Text style={styles.toolBtnText}>🏪 Go to Register Shop</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderDatabase = () => {
        if (!latestInserts) return <ActivityIndicator color="#7F9460" style={{ marginTop: 20 }} />;

        const renderSection = (title: string, data: any[], icon: string, fields: string[]) => (
            <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionHeader}>{icon} LATEST {title.toUpperCase()}</Text>
                <View style={styles.card}>
                    {data.length === 0 ? (
                        <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>No data</Text>
                    ) : (
                        data.map((row: any, idx: number) => (
                            <View key={idx} style={[styles.dbRow, idx < data.length - 1 && styles.dbDivider]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={styles.dbId}>ID: {row.user_id || row.shop_id || row.post_id || row.payment_id}</Text>
                                    <Text style={styles.dbDate}>{new Date(row.created_at).toLocaleTimeString()}</Text>
                                </View>
                                {fields.map(field => (
                                    <Text key={field} style={styles.dbText} numberOfLines={1}>
                                        <Text style={{ fontWeight: '700' }}>{field}:</Text> {String(row[field])}
                                    </Text>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </View>
        );

        return (
            <View>
                {renderSection('Users', latestInserts.users, '👤', ['username', 'email', 'role'])}
                {renderSection('Shops', latestInserts.shops, '🏪', ['name', 'category', 'business_valid'])}
                {renderSection('Posts', latestInserts.posts, '📝', ['content', 'user_id', 'shop_id'])}
                {renderSection('Payments', latestInserts.payments, '💰', ['amount', 'payment_status', 'shop_id'])}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>🛠 Developer</Text>
                <TouchableOpacity onPress={() => loadTab(activeTab)}>
                    <Text style={styles.refreshBtn}>↻</Text>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {(['stats', 'shops', 'users', 'database', 'tools'] as Tab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'stats' ? '📊' : tab === 'shops' ? '🏪' : tab === 'users' ? '👥' : tab === 'database' ? '🗄️' : '🔧'}
                            {' '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {loading ? (
                    <ActivityIndicator color="#7F9460" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {activeTab === 'stats' && renderStats()}
                        {activeTab === 'shops' && renderShops()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'database' && renderDatabase()}
                        {activeTab === 'tools' && renderTools()}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE'
    },
    backBtn: { color: '#7F9460', fontWeight: 'bold', fontSize: 15 },
    title: { fontSize: 17, fontWeight: 'bold', color: '#333' },
    refreshBtn: { fontSize: 22, color: '#7F9460' },
    tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#7F9460' },
    tabText: { fontSize: 12, color: '#999' },
    tabTextActive: { color: '#7F9460', fontWeight: 'bold' },
    scroll: { padding: 16, paddingBottom: 40 },
    sectionHeader: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
    card: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, elevation: 1, marginBottom: 8 },
    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
        flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 12, padding: 16,
        alignItems: 'center', elevation: 1
    },
    statCardHighlight: { backgroundColor: '#E8F5E9' },
    statNumber: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '600' },
    // Quick Login
    quickLoginBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    quickLoginLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
    quickLoginCode: { fontSize: 10, color: '#999', marginTop: 2 },
    quickLoginEmail: { fontSize: 12, color: '#999' },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    roleBadgeAdmin: { backgroundColor: '#E8EAF6' },
    roleBadgeBiz: { backgroundColor: '#E8F5E9' },
    roleBadgeText: { fontSize: 9, fontWeight: '800', color: '#333' },
    devInput: { borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 10, fontSize: 14, color: '#333', marginBottom: 8 },
    loginBtn: { backgroundColor: '#7F9460', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
    loginBtnText: { color: '#FFF', fontWeight: 'bold' },
    // Filter
    filterInput: {
        backgroundColor: '#FFF', borderRadius: 10, padding: 12, fontSize: 13, color: '#333',
        marginBottom: 10, borderWidth: 1, borderColor: '#EEE',
    },
    rowCount: { fontSize: 10, color: '#BBB', textAlign: 'right', marginTop: 8 },
    // Table
    tableHeader: { flexDirection: 'row', backgroundColor: '#F0F2F5', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
    thText: { fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
    tdText: { fontSize: 12, color: '#333' },
    badge: { fontSize: 9, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', textAlign: 'center' },
    badgeGreen: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
    badgeOrange: { backgroundColor: '#FFF3E0', color: '#EF6C00' },
    // Tools
    toolBtn: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 10, marginBottom: 4 },
    toolBtnDanger: { borderBottomWidth: 0 },
    toolBtnText: { fontSize: 14, color: '#333' },
    // Database Styles
    dbRow: { paddingVertical: 10 },
    dbDivider: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    dbId: { fontSize: 10, fontWeight: 'bold', color: '#7F9460' },
    dbDate: { fontSize: 9, color: '#BBB' },
    dbText: { fontSize: 11, color: '#444', marginTop: 2 }
});

export default DevScreen;
