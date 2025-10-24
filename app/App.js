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
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const[image, setImage] = useState(null);

  // Add a new post
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

  // reset fields
  setNewTitle('');
  setNewContent('');
  setNewType('');
  setNewCategory('');
  setModalVisible(false);
  };

  const handleEditPost = (id, updatedData) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? {
              ...post,
              title: updatedData.title,
              content: updatedData.content,
              imageUri: updatedData.imageUri,
              type: updatedData.type,
              category: updatedData.category,
            }
          : post
      )
    );
  };

  const handleDeletePost = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      // optional: size check if available
      if (file.fileSize && file.fileSize > 5 * 1024 * 1024) {
        alert('Image too large. Please select one under 5MB.');
        return;
      }
      setImage(file);
    }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header />
          <CTA />
          <Hero />

          {/* Features Section */}
          <Features />

          <View style={styles.section}>
            <AddPostButton onAddPost={() => setModalVisible(true)} />
          </View>


          {/* Add Post Modal */}
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

                {/* Type Picker */}
                <View style={styles.pickerWrapper}>
                  <Text style={styles.pickerLabel}>Type</Text>
                  <Picker selectedValue={newType} onValueChange={(v) => setNewType(v)}>
                    <Picker.Item label="Select Type" value="" />
                    <Picker.Item label="Lost" value="Lost" />
                    <Picker.Item label="Found" value="Found" />
                  </Picker>
                </View>

                {/* Category Picker */}
                <View style={styles.pickerWrapper}>
                  <Text style={styles.pickerLabel}>Category</Text>
                  <Picker
                    selectedValue={newCategory}
                    onValueChange={(v) => setNewCategory(v)}
                  >
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
                      <Button
                        mode="outlined"
                        style={{ marginTop: 8 }}
                        onPress={() => setImage(null)}
                      >
                        Remove Image
                      </Button>
                    </>
                  ) : (
                    <Button
                      icon="plus"
                      mode="outlined"
                      onPress={pickImage}
                      style={styles.addImageButton}
                    >
                      Add Image
                    </Button>
                  )}
                </View>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={() => setModalVisible(false)}
                    style={styles.button}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => {
                      handleAddPost(newTitle, newContent, newType, newCategory);
                      setImage(null);
                    }}
                    style={styles.button}
                  >
                    Add Post
                  </Button>
                </View>
              </View>
            </View>
          </Modal>


          {/* Posts Grid */}
          <View style={styles.postsSection}>
            <PostsGrid
              posts={posts}
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  section: {
    alignItems: 'center',
    marginVertical: 20,
  },
  postsSection: {
    flex: 1,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  addImageButton: {
    borderColor: '#00B3B3',
    borderWidth: 1.5,
    marginTop: 6,
  },
  pickerWrapper: {
    marginBottom: 10,
  },
  pickerLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  }

});