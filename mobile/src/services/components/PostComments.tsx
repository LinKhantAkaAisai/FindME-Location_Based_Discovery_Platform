import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchComments, addComment } from '../api';

interface PostCommentsProps {
    isVisible: boolean;
    onClose: () => void;
    postId: number;
    onCommentAdded?: () => void;
}

const PostComments = ({ isVisible, onClose, postId, onCommentAdded }: PostCommentsProps) => {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isVisible && postId) {
            loadComments();
        }
    }, [isVisible, postId]);

    const loadComments = async () => {
        try {
            setLoading(true);
            const data = await fetchComments(postId);
            setComments(data.comments || []);
        } catch (error) {
            console.error('Fetch comments error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            setSending(true);
            const result = await addComment(postId, newComment);
            if (result.commentId) {
                // Optimistic update or just reload
                const addedComment = {
                    comment_id: result.commentId,
                    content: newComment,
                    created_at: result.created_at || new Date().toISOString(),
                    username: 'Me', // This will be updated on next refresh
                    avatar_url: null
                };
                setComments(prev => [...prev, addedComment]);
                setNewComment('');
                if (onCommentAdded) onCommentAdded();

                // Reload to get real username/avatar if needed
                loadComments();
            }
        } catch (error) {
            console.error('Add comment error:', error);
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.commentContainer}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Comments</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="small" color="#7F9460" />
                        </View>
                    ) : (
                        <FlatList
                            data={comments}
                            keyExtractor={(item) => item.comment_id.toString()}
                            contentContainerStyle={styles.commentList}
                            renderItem={({ item }) => (
                                <View style={styles.commentItem}>
                                    <Image
                                        source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
                                        style={styles.commentAva}
                                    />
                                    <View style={styles.commentContent}>
                                        <Text style={styles.commentUser}>{item.username}</Text>
                                        <Text style={styles.commentText}>{item.content}</Text>
                                        <Text style={styles.commentTime}>
                                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.noComments}>No comments yet. Be the first!</Text>
                            }
                        />
                    )}

                    <View style={styles.inputArea}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!newComment.trim() || sending) && styles.sendBtnDisabled]}
                            onPress={handleAddComment}
                            disabled={!newComment.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#7F9460" />
                            ) : (
                                <Ionicons name="send" size={20} color={newComment.trim() ? "#7F9460" : "#CCC"} />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    commentContainer: { backgroundColor: '#FFF', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    commentList: { padding: 15, paddingBottom: 30 },
    commentItem: { flexDirection: 'row', marginBottom: 20 },
    commentAva: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    commentContent: { flex: 1 },
    commentUser: { fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 2 },
    commentText: { fontSize: 14, color: '#444', lineHeight: 18 },
    commentTime: { fontSize: 10, color: '#999', marginTop: 4 },
    noComments: { textAlign: 'center', color: '#999', marginTop: 30 },
    inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#F0F2F5', paddingBottom: Platform.OS === 'ios' ? 30 : 12 },
    commentInput: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 14 },
    sendBtn: { marginLeft: 10, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.5 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default PostComments;
