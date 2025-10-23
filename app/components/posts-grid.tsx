import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, Button, Dialog, IconButton } from 'react-native-paper';

type Post = {
  id: string | number;
  title: string;
  description: string;
  created_at?: string;
};

interface PostsGridProps {
  posts: Post[];
  onEdit: (id: string | number, title: string, description: string) => void;
  onDelete: (id: string | number) => void;
}

export default function PostsGrid({ posts, onEdit, onDelete }: PostsGridProps) {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const handleEditClick = (post: Post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.description ?? '');
  };

  const handleEditSubmit = () => {
    if (editingPost && editTitle.trim() && editContent.trim()) {
      onEdit(editingPost.id, editTitle, editContent);
      setEditingPost(null);
      setEditTitle('');
      setEditContent('');
    }
  };

  const handleDeleteClick = (postId: string) => {
    setPostToDelete(postId);
    setDeleteDialogVisible(true);
  };

  const handleDeleteConfirm = () => {
    if (postToDelete) {
      onDelete(postToDelete);
      setPostToDelete(null);
    }
    setDeleteDialogVisible(false);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.cardContainer}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.actions}>
              <IconButton icon="pencil" size={18} onPress={() => handleEditClick(item)} />
              <IconButton icon="delete" size={18} onPress={() => handleDeleteClick(item.id as any)} />
            </View>
          </View>

          <Text style={styles.date}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : ''}
          </Text>

          <Text style={styles.content} numberOfLines={4}>
            {item.description}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No posts yet. Click "Add Post" to create your first post.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
      />

      {editingPost && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
          >
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>Edit Post</Text>
                <Text style={styles.modalDescription}>Make changes to your post.</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter post title"
                    value={editTitle}
                    onChangeText={setEditTitle}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Write your post description..."
                    value={editContent}
                    onChangeText={setEditContent}
                    multiline
                  />
                </View>

                <View style={styles.modalActions}>
                  <Button mode="outlined" onPress={() => setEditingPost(null)} style={styles.button}>
                    Cancel
                  </Button>
                  <Button mode="contained" onPress={handleEditSubmit} style={styles.button}>
                    Save Changes
                  </Button>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
        <Dialog.Title>Are you sure?</Dialog.Title>
        <Dialog.Content>
          <Text>This action cannot be undone. This will permanently delete your post.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
          <Button onPress={handleDeleteConfirm}>Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { padding: 8 },
  row: { justifyContent: 'space-between' },
  cardContainer: { width: '48%', marginBottom: 16 },
  card: { minHeight: 280, backgroundColor: '#ffffff' },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
  actions: { flexDirection: 'row', marginTop: -8, marginRight: -8 },
  date: { fontSize: 12, color: '#666', marginBottom: 12 },
  content: { fontSize: 14, lineHeight: 20, color: '#333' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyBox: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#ddd', borderRadius: 8, padding: 48, width: '100%' },
  emptyText: { textAlign: 'center', fontSize: 16, color: '#666' },
  modalOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1000,
  },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  button: { minWidth: 100, marginLeft: 12 },
});
