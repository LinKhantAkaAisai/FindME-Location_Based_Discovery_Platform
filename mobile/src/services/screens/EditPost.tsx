import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
    Image, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updatePost, deletePost_User, fetchShops, BASE_URL } from '../api';

const EditPost = ({ route, navigation }: any) => {
    const { postId, content: initialContent, hashtags: initialHashtags, shopId: initialShopId, imageUrl: initialImageUrl } = route.params;

    const [content, setContent] = useState(initialContent || '');
    const [hashtags, setHashtags] = useState(initialHashtags || '');
    const [shopId, setShopId] = useState(initialShopId || null);
    const [selectedShopName, setSelectedShopName] = useState('');
    const [image, setImage] = useState<string | null>(initialImageUrl ? `${BASE_URL}${initialImageUrl}` : null);
    const [newImageFile, setNewImageFile] = useState<any>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [showShopModal, setShowShopModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [shops, setShops] = useState<any[]>([]);
    const [loadingShops, setLoadingShops] = useState(false);

    useEffect(() => {
        if (initialShopId) {
            // Find shop name if we have the ID
            loadInitialShop();
        }
    }, [initialShopId]);

    const loadInitialShop = async () => {
        try {
            const allShops = await fetchShops();
            const shop = allShops.find((s: any) => s.shop_id === initialShopId);
            if (shop) setSelectedShopName(shop.name);
        } catch (err) {
            console.error("Failed to load shop name:", err);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll permissions are needed.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 5],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selected = result.assets[0];
            setImage(selected.uri);
            setNewImageFile({
                uri: selected.uri,
                name: `post_${Date.now()}.jpg`,
                type: 'image/jpeg',
            });
        }
    };

    const handleSearchShops = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setShops([]);
            return;
        }
        try {
            setLoadingShops(true);
            const data = await fetchShops(query);
            setShops(data || []);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoadingShops(false);
        }
    };

    const selectShop = (shop: any) => {
        setShopId(shop.shop_id);
        setSelectedShopName(shop.name);
        setShowShopModal(false);
        setSearchQuery('');
        setShops([]);
    };

    const handleSave = async () => {
        if (!content.trim()) {
            Alert.alert("Error", "Caption cannot be empty.");
            return;
        }

        try {
            setIsSaving(true);
            const formData = new FormData();
            formData.append('content', content);
            formData.append('hashtags', hashtags);
            if (shopId) formData.append('shop_id', shopId.toString());

            if (newImageFile) {
                formData.append('image', newImageFile as any);
            }

            await updatePost(postId, formData);
            Alert.alert("Success", "Post updated successfully!");
            navigation.goBack();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update post");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post permanently?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsSaving(true);
                            await deletePost_User(postId);
                            Alert.alert("Success", "Post deleted successfully!");
                            navigation.goBack();
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to delete post");
                        } finally {
                            setIsSaving(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.headerAction}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Post</Text>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#7F9460" />
                    ) : (
                        <Text style={[styles.headerAction, { color: '#7F9460', fontWeight: 'bold' }]}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Photo Section */}
                <View style={styles.photoContainer}>
                    <Image source={{ uri: image }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
                        <Ionicons name="camera" size={20} color="#FFF" />
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Caption Section */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>CAPTION</Text>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="Write a caption..."
                        placeholderTextColor="#757575"
                        multiline
                        value={content}
                        onChangeText={setContent}
                        textAlignVertical="top"
                    />
                </View>

                {/* Tagged Shop Section */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>TAGGED SHOP</Text>
                    <TouchableOpacity style={styles.shopSelector} onPress={() => setShowShopModal(true)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Ionicons name="location" size={20} color="#7F9460" />
                            <Text style={[styles.shopText, !selectedShopName && { color: '#999' }]}>
                                {selectedShopName || "Select a shop"}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#999" />
                    </TouchableOpacity>
                </View>

                {/* Hashtags Section */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>HASHTAGS</Text>
                    <TextInput
                        style={styles.hashtagInput}
                        placeholder="coffee, mandalay, tech"
                        placeholderTextColor="#555"
                        value={hashtags}
                        onChangeText={setHashtags}
                    />
                    <Text style={styles.hint}>Separate codes with commas</Text>
                </View>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                    disabled={isSaving}
                >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                    <Text style={styles.deleteButtonText}>Delete Post Permanently</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Shop Search Modal */}
            <Modal visible={showShopModal} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowShopModal(false)}>
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Tag a Shop</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search shops..."
                            value={searchQuery}
                            onChangeText={handleSearchShops}
                            autoFocus
                        />
                    </View>

                    {loadingShops ? (
                        <ActivityIndicator style={{ marginTop: 50 }} color="#7F9460" />
                    ) : (
                        <FlatList
                            data={shops}
                            keyExtractor={(item) => item.shop_id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.shopItem} onPress={() => selectShop(item)}>
                                    <View>
                                        <Text style={styles.shopItemName}>{item.name}</Text>
                                        <Text style={styles.shopItemType}>{item.shop_type}</Text>
                                    </View>
                                    <Ionicons name="add-circle-outline" size={24} color="#7F9460" />
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ padding: 20 }}
                            ListEmptyComponent={
                                searchQuery.length > 2 ? (
                                    <Text style={styles.emptyText}>No shops found matching "{searchQuery}"</Text>
                                ) : null
                            }
                        />
                    )}
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE'
    },
    headerAction: { color: '#666', fontSize: 16 },
    headerTitle: { color: '#333', fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 20 },
    photoContainer: { width: '100%', height: 300, backgroundColor: '#F0F0F0', borderRadius: 15, overflow: 'hidden', marginBottom: 25, position: 'relative' },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    changePhotoButton: {
        position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20
    },
    changePhotoText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    inputSection: { marginBottom: 25 },
    label: { fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 8 },
    captionInput: {
        color: '#333',
        fontSize: 16,
        minHeight: 100,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    shopSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    shopText: { fontSize: 16, color: '#333' },
    hashtagInput: {
        color: '#333',
        fontSize: 14,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    hint: { fontSize: 10, color: '#999', marginTop: 6, marginLeft: 4 },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 40,
        backgroundColor: '#FFF0F0',
        padding: 16,
        borderRadius: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: '#FFE0E0'
    },
    deleteButtonText: {
        color: '#FF6B6B',
        fontSize: 15,
        fontWeight: 'bold'
    },
    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#FFF' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE'
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5',
        margin: 20, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, gap: 10
    },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    shopItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
    },
    shopItemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    shopItemType: { fontSize: 12, color: '#666', marginTop: 2 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 40 }
});

export default EditPost;
