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
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';


type Post = {
  id: string;
  title: string;
  content: string;
  type?: string;
  category?: string;
  imageUri?: string;
  createdAt: Date;
};

interface PostsGridProps {
  posts: Post[];
  onEdit: (id: string, title: string, content: string) => void;
  onDelete: (id: string) => void;
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
    setEditContent(post.content);
  };

  const handleEditSubmit = () => {
    if (
      editingPost &&
      editTitle.trim() &&
      editContent.trim()
    ) {
      onEdit(editingPost.id, {
        ...editingPost,
        title: editTitle,
        content: editContent,
        imageUri: editImageUri || editingPost.imageUri,
        type: editingPost.type,
        category: editingPost.category,
      });

      setEditingPost(null);
      setEditTitle('');
      setEditContent('');
      setEditImageUri(null);
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

  const [editImageUri, setEditImageUri] = useState<string | null>(null);

// function to pick new image
const pickEditImage = async () => {
  // Ask permission to access media library
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need media library permissions to change the image.');
    return;
  }

  // Launch picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  // Handle selection
  if (!result.canceled && result.assets && result.assets.length > 0) {
    const uri = result.assets[0].uri;
    setEditImageUri(uri);
    setEditingPost((prev) => (prev ? { ...prev, imageUri: uri } : prev));
  }
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
              <IconButton icon="delete" size={18} onPress={() => handleDeleteClick(item.id)} />
            </View>
          </View>

          <Text style={styles.date}>
            {item.createdAt instanceof Date
              ? item.createdAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : ''}
          </Text>

          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={{
                width: '100%',
                height: 160,
                borderRadius: 8,
                marginBottom: 10,
              }}
              resizeMode="cover"
            />
          ) : null}

          <Text style={styles.content} numberOfLines={4}>
            {item.content}
          </Text>
          <Text style={styles.meta}>Type: {item.type || '-'}</Text>
          <Text style={styles.meta}>Category: {item.category || '-'}</Text>
          
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
        keyExtractor={(item) => item.id}
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

                {/* Title */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter post title"
                    value={editTitle}
                    onChangeText={setEditTitle}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Write your post content..."
                    value={editContent}
                    onChangeText={setEditContent}
                    multiline
                  />
                </View>

                {/* Type Dropdown */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.dropdownContainer}>
                    <Picker
                      selectedValue={editingPost.type || 'Lost'}
                      onValueChange={(value) =>
                        setEditingPost((prev) => (prev ? { ...prev, type: value } : prev))
                      }
                      style={styles.dropdown}
                    >
                      <Picker.Item label="Lost" value="Lost" />
                      <Picker.Item label="Found" value="Found" />
                    </Picker>
                  </View>
                </View>

                {/* Category Dropdown */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.dropdownContainer}>
                    <Picker
                      selectedValue={editingPost.category || 'Other'}
                      onValueChange={(value) =>
                        setEditingPost((prev) => (prev ? { ...prev, category: value } : prev))
                      }
                      style={styles.dropdown}
                    >
                      <Picker.Item label="Electronics" value="Electronics" />
                      <Picker.Item label="Pets" value="Pets" />
                      <Picker.Item label="Accessories" value="Accessories" />
                      <Picker.Item label="Clothing" value="Clothing" />
                      <Picker.Item label="Other" value="Other" />
                    </Picker>
                  </View>
                </View>

                {/* Image Preview */}
                {editingPost.imageUri ? (
                  <Image
                    source={{ uri: editingPost.imageUri }}
                    style={{
                      width: '100%',
                      height: 160,
                      borderRadius: 8,
                      marginBottom: 10,
                    }}
                    resizeMode="cover"
                  />
                ) : null}

                {/* Change Image Button */}
                <Button
                  mode="outlined"
                  onPress={pickEditImage}
                  style={{ marginBottom: 12 }}
                >
                  Change Image
                </Button>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <Button mode="outlined" onPress={() => setEditingPost(null)} style={styles.button}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleEditSubmit}
                    style={styles.button}
                  >
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
  meta: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
    fontStyle: 'italic',
  }
});
