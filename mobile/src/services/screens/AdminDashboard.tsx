import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminValidation from './AdminValidation';
import AdminModerate from './AdminModerate';

const AdminTab = createBottomTabNavigator();

const AdminDashboard = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.headerBtn}>
                    <Ionicons name="log-out-outline" size={20} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🛡️ Admin Panel</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Tabs */}
            <AdminTab.Navigator
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: styles.tabBar,
                    tabBarActiveTintColor: '#1A237E',
                    tabBarInactiveTintColor: '#999',
                    tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: -2 },
                }}
            >
                <AdminTab.Screen
                    name="Validation"
                    component={AdminValidation}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="shield-checkmark" size={22} color={color} />
                        ),
                        tabBarLabel: 'Validation',
                    }}
                />
                <AdminTab.Screen
                    name="Moderate"
                    component={AdminModerate}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="flag" size={22} color={color} />
                        ),
                        tabBarLabel: 'Moderate',
                    }}
                />
            </AdminTab.Navigator>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A237E' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#1A237E',
    },
    headerBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },
    headerTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
    tabBar: {
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        height: 60,
        paddingBottom: 6,
        paddingTop: 4,
        elevation: 8,
    },
});

export default AdminDashboard;
