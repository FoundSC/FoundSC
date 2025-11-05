import 'react-native-url-polyfill/auto';
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Provider as PaperProvider, Button } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

import Header from './components/header';
import CTA from './components/cta';
import { AddPostButton } from './components/add-post-button';
import PostsGrid from './components/posts-grid';
import { Features } from './components/features';
import { Hero } from './components/hero';

export default function App() {
  // POSTS
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // FORM
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [image, setImage] = useState(null);

  // SEARCH
  const [searchQuery, setSearchQuery] = useState('');

  // ADD POST
  const handleAddPost = (title, content, type, category) => {
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required');
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      title,
      content,
      type,
      category,
      imageUri: image?.uri || null,
      createdAt: new Date(),
    };

    setPosts((prev) => [newPost, ...prev]);

    // reset
    setNewTitle('');
    setNewContent('');
    setNewType('');
    setNewCategory('');
    setImage(null);
    setModalVisible(false);
  };

  // EDIT POST
  const handleEditPost = (id, updatedPost) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, ...updatedPost } : post
      )
    );
  };

  // DELETE POST
  const handleDeletePost = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  // PICK IMAGE
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      if (file.fileSize && file.fileSize > 5 * 1024 * 1024) {
        alert('Image too large (max 5MB)');
        return;
      }
      setImage(file);
    }
  };

  // FILTER POSTS BY SEARCH
  const filteredPosts = posts.filter((p) =>
    (p.title + p.content + (p.category || '') + (p.type || ''))
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header />
          <CTA />
          <Hero />
          <Features />

          { /* SEARCH BAR */ }
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, item, or category..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.section}>
            <AddPostButton onAddPost={() => setModalVisible(true)} />
          </View>

          {/* CREATE POST MODAL */}
          <Modal visible={modalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Create a New Post</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Title"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  value={newContent}
                  onChangeText={setNewContent}
                  multiline
                />

                <View style={styles.pickerWrapper}>
                  <Text style={styles.pickerLabel}>Type</Text>
                  <Picker selectedValue={newType} onValueChange={setNewType}>
                    <Picker.Item label="Select Type" value="" />
                    <Picker.Item label="Lost" value="Lost" />
                    <Picker.Item label="Found" value="Found" />
                  </Picker>
                </View>

                <View style={styles.pickerWrapper}>
                  <Text style={styles.pickerLabel}>Category</Text>
                  <Picker selectedValue={newCategory} onValueChange={setNewCategory}>
                    <Picker.Item label="Select Category" value="" />
                    <Picker.Item label="Electronics" value="Electronics" />
                    <Picker.Item label="Pets" value="Pets" />
                    <Picker.Item label="Clothing" value="Clothing" />
                    <Picker.Item label="Accessories" value="Accessories" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                </View>

                {/* Image Picker */}
                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                  {image ? (
                    <>
                      <Image
                        source={{ uri: image.uri }}
                        style={{ width: 120, height: 120, borderRadius: 10 }}
                      />
                      <Button mode="outlined" style={{ marginTop: 8 }} onPress={() => setImage(null)}>
                        Remove Image
                      </Button>
                    </>
                  ) : (
                    <Button icon="plus" mode="outlined" onPress={pickImage}>
                      Add Image
                    </Button>
                  )}
                </View>

                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.button}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() =>
                      handleAddPost(newTitle, newContent, newType, newCategory)
                    }
                    style={styles.button}
                  >
                    Add Post
                  </Button>
                </View>
              </View>
            </View>
          </Modal>

          {/* POSTS GRID */}
          <View style={styles.postsSection}>
            <PostsGrid
              posts={filteredPosts}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderColor: '#00B3B3',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    marginTop: 5,
  },
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16 },
  section: { alignItems: 'center', marginVertical: 20 },
  postsSection: { flex: 1, marginTop: 10 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 20, width: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#ccc',
    borderRadius: 8, padding: 10, marginBottom: 12,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, marginHorizontal: 4 },
  pickerWrapper: { marginBottom: 10 },
  pickerLabel: { fontWeight: 'bold', marginBottom: 4 },
});
