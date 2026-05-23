import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchShopById, updateShop, BASE_URL } from '../api';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

const EditShopProfile = ({ navigation, route }: any) => {
    const shopId = route?.params?.shopId;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [openingHours, setOpeningHours] = useState('');
    const [logo, setLogo] = useState<string | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);

    const categories = ['Cafe', 'Beauty Salon', 'Cosmetic Shop', 'Restaurant', 'Other'];

    useEffect(() => {
        if (shopId) loadShopData();
    }, [shopId]);

    const loadShopData = async () => {
        try {
            setLoading(true);
            const shop = await fetchShopById(shopId);
            setName(shop.name || '');
            setDescription(shop.description || '');
            setCategory(shop.category || '');
            setAddress(shop.address || '');
            setPhone(shop.phone_number || '');
            setIsPremium(shop.plan_type === 'premium');
            setExistingLogoUrl(shop.logo_url || null);

            // Parse opening_hours from JSONB
            if (shop.opening_hours) {
                if (typeof shop.opening_hours === 'object' && shop.opening_hours.display) {
                    setOpeningHours(shop.opening_hours.display);
                } else if (typeof shop.opening_hours === 'string') {
                    setOpeningHours(shop.opening_hours);
                }
            }
        } catch (err: any) {
            Alert.alert('Error', 'Could not load shop data.');
        } finally {
            setLoading(false);
        }
    };

    const pickLogo = async () => {
        if (!isPremium) {
            Alert.alert('Premium Feature', 'Shop logos are only available for premium shops. Please complete your monthly payment to access this feature.');
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your photos to upload a logo!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setLogo(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name || !category) {
            Alert.alert('Error', 'Shop name and category are required.');
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('address', address);
            formData.append('phone_number', phone);
            if (openingHours) formData.append('opening_hours', openingHours);

            if (logo) {
                const filename = logo.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('logo', {
                    uri: logo,
                    name: filename,
                    type: type,
                } as any);
            }

            await updateShop(shopId, formData, true);

            // Update stored shop data
            const stored = await AsyncStorage.getItem('active_shop');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.name = name;
                parsed.category = category;
                await AsyncStorage.setItem('active_shop', JSON.stringify(parsed));
            }

            Alert.alert('Success', 'Shop profile updated!');
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not update shop.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
                <ActivityIndicator size="large" color="#7F9460" />
            </View>
        );
    }

    return (
        <View style={styles.mainWrapper}>
            <View style={styles.safeAreaSpacer} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Shop</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerBtn}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#7F9460" />
                    ) : (
                        <Text style={styles.doneText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Logo Upload */}
                <View style={styles.logoSection}>
                    <TouchableOpacity
                        style={[styles.logoPlaceholder, !isPremium && styles.logoDisabled]}
                        onPress={pickLogo}
                    >
                        {logo ? (
                            <Image source={{ uri: logo }} style={styles.logoImage} />
                        ) : existingLogoUrl ? (
                            <Image source={{ uri: `${BASE_URL}${existingLogoUrl}` }} style={styles.logoImage} />
                        ) : (
                            <View style={styles.logoEmpty}>
                                <Text style={{ fontSize: 30 }}>🏪</Text>
                                <Text style={styles.logoText}>Add Shop Logo</Text>
                            </View>
                        )}
                        {!isPremium && (
                            <View style={styles.premiumLock}>
                                <Text style={{ fontSize: 16 }}>🔒</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {!isPremium && <Text style={styles.premiumHint}>Premium Feature</Text>}
                </View>

                {/* Shop Name */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>SHOP NAME</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter shop name" />
                </View>

                {/* Category */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>CATEGORY</Text>
                    <View style={styles.categoryRow}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Description */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>DESCRIPTION</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe your shop"
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Address */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>ADDRESS</Text>
                    <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Shop address" />
                </View>

                {/* Phone */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>PHONE NUMBER</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="09-XXXXXXXXX"
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Opening Hours */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>OPENING HOURS</Text>
                    <TextInput
                        style={styles.input}
                        value={openingHours}
                        onChangeText={setOpeningHours}
                        placeholder="e.g. 8:30AM to 5:00PM"
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
    safeAreaSpacer: { height: STATUS_BAR_HEIGHT, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 15, height: 60, borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE'
    },
    headerBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    cancelText: { color: '#666', fontSize: 16 },
    doneText: { color: '#7F9460', fontSize: 16, fontWeight: 'bold' },
    container: { flex: 1, paddingHorizontal: 25, paddingTop: 20 },
    inputWrapper: { marginBottom: 25 },
    label: { color: '#7F9460', fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    input: { fontSize: 16, borderBottomWidth: 1.5, borderBottomColor: '#EEEEEE', paddingVertical: 10, color: '#333' },
    textArea: { minHeight: 60, textAlignVertical: 'top' },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#F0F2F5', marginBottom: 6,
    },
    categoryBtnActive: { backgroundColor: '#7F9460' },
    categoryText: { fontSize: 13, color: '#666' },
    categoryTextActive: { color: '#FFF', fontWeight: '600' },

    // Logo Styles
    logoSection: { alignItems: 'center', marginBottom: 30 },
    logoPlaceholder: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F2F5',
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
        borderWidth: 1, borderStyle: 'dashed', borderColor: '#CCC'
    },
    logoDisabled: { opacity: 0.6, borderStyle: 'solid' },
    logoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    logoEmpty: { alignItems: 'center' },
    logoText: { color: '#666', fontSize: 10, marginTop: 5, fontWeight: 'bold' },
    premiumLock: {
        position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center'
    },
    premiumHint: { color: '#7F9460', fontSize: 12, marginTop: 8, fontWeight: '600' }
});

export default EditShopProfile;
