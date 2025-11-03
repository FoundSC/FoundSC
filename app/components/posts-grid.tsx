import React, { useState } from 'react';
import {
  View,
  FlatList,
  Modal,
  Pressable,
  Text,
  StyleSheet,
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
  onEdit: (id: string, updatedPost: Partial<Post>) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'Electronics', label: 'Electronics' },
  { key: 'Pets', label: 'Pets' },
  { key: 'Clothing', label: 'Clothing' },
  { key: 'Accessories', label: 'Accessories' },
  { key: 'Other', label: 'Other' },
];

export default function PostsGrid({ posts, onEdit, onDelete }: PostsGridProps) {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all'); // Add this state

  // Filter posts by selected category and type
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesType = selectedType === 'all' || post.type === selectedType;
    return matchesCategory && matchesType;
  });

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
      const updatedPost = {
        title: editTitle,
        content: editContent,
        imageUri: editImageUri || editingPost.imageUri,
        type: editingPost.type,
        category: editingPost.category,
      };

      onEdit(editingPost.id, updatedPost);

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
      {/* Category and Type Dropdown Filters - Navigation Bar Style */}
      <View style={styles.filterNavBar}>
        <View style={styles.filterNavItem}>
          <View style={styles.filterNavDropdown}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value)}
              style={styles.navPicker}
            >
              <Picker.Item 
                label={selectedCategory === 'all' ? 'Category: All' : 'All'} 
                value="all" 
              />
              <Picker.Item 
                label={selectedCategory === 'Electronics' ? 'Category: Electronics' : 'Electronics'} 
                value="Electronics" 
              />
              <Picker.Item 
                label={selectedCategory === 'Pets' ? 'Category: Pets' : 'Pets'} 
                value="Pets" 
              />
              <Picker.Item 
                label={selectedCategory === 'Clothing' ? 'Category: Clothing' : 'Clothing'} 
                value="Clothing" 
              />
              <Picker.Item 
                label={selectedCategory === 'Accessories' ? 'Category: Accessories' : 'Accessories'} 
                value="Accessories" 
              />
              <Picker.Item 
                label={selectedCategory === 'Other' ? 'Category: Other' : 'Other'} 
                value="Other" 
              />
            </Picker>
          </View>
        </View>

        <View style={styles.filterNavItem}>
          <View style={styles.filterNavDropdown}>
            <Picker
              selectedValue={selectedType}
              onValueChange={(value) => setSelectedType(value)}
              style={styles.navPicker}
            >
              <Picker.Item 
                label={selectedType === 'all' ? 'Type: All' : 'All'} 
                value="all" 
              />
              <Picker.Item 
                label={selectedType === 'Lost' ? 'Type: Lost' : 'Lost'} 
                value="Lost" 
              />
              <Picker.Item 
                label={selectedType === 'Found' ? 'Type: Found' : 'Found'} 
                value="Found" 
              />
            </Picker>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No posts found matching the selected filters.
              </Text>
            </View>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={!!editingPost}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPost(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setEditingPost(null)}
          activeOpacity={1}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ justifyContent: 'center', alignItems: 'center', width: '100%' }}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
                      selectedValue={editingPost?.type || 'Lost'}
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
                      selectedValue={editingPost?.category || 'Other'}
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
                {editingPost?.imageUri ? (
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
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialogVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setDeleteDialogVisible(false)}
          activeOpacity={1}
        >
          <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.dialogTitle}>Confirm Deletion</Text>
            <Text style={styles.dialogText}>
              Are you sure you want to delete this post? This action cannot be undone.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable 
                style={[styles.dialogBtn, styles.dialogBtnCancel]} 
                onPress={() => setDeleteDialogVisible(false)}
              >
                <Text style={styles.dialogBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.dialogBtn, styles.dialogBtnDelete]} 
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.dialogBtnDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  
  // Navigation bar style filters
  filterNavBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterNavItem: {
    marginRight: 12,
  },
  filterNavDropdown: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    overflow: 'hidden',
    minWidth: 140,
  },
  navPicker: {
    height: 40,
    color: '#333',
    backgroundColor: 'transparent',
  },

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
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  dialogText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  dialogBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dialogBtnCancel: {
    backgroundColor: "#f3f4f6",
  },
  dialogBtnCancelText: {
    color: "#111",
    fontWeight: "600",
  },
  dialogBtnDelete: {
    backgroundColor: "#ef4444",
  },
  dialogBtnDeleteText: {
    color: "#fff",
    fontWeight: "700",
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
  },
  dropdownContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  dropdown: { height: 50 },
});
