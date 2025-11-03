import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Modal,
  Text,
  TextInput,
  Platform,
} from 'react-native';
import { Provider as PaperProvider, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';

import { createClient } from '@supabase/supabase-js';

import Header from './components/header';
import CTA from './components/cta';
import { AddPostButton } from './components/add-post-button';
import PostsGrid from './components/posts-grid';
import { Features } from './components/features';
import { Hero } from './components/hero';

const supabaseUrl = 'https://jvxyoybuwxtpzsvzevbp.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eHlveWJ1d3h0cHpzdnpldmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mzc4NzEsImV4cCI6MjA3NjExMzg3MX0.Bkk6ef-W7yVlhBnWwSkG7qolmmEW9LSBy6cGZPNAMzA'; // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newImageUri, setNewImageUri] = useState(null);

  const CATEGORIES = [
    'Electronics',
    'Pets',
    'Accessories',
    'Clothing',
    'Other',
  ];

  
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*');

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      console.log('Fetched posts:', data);
      setPosts(data);
    }
  };

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.error('Permission to access media library was denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      // new API per expo-image-picker
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setNewImageUri(result.assets[0].uri);
    }
  }

  function guessMimeFromUri(uri) {
    const lower = (uri || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    return 'image/jpeg';
  }

  async function uploadImageIfNeeded(uri) {
    if (!uri) return null;
    try {
      const fileName = `uploads/${Date.now()}_${uri.split('/').pop() || 'image.jpg'}`;
      console.log('[upload] starting', { uri, fileName });

      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        console.log('[upload] blob built', { type: blob.type, size: blob.size });
        const { error } = await supabase.storage.from('post-images').upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type || guessMimeFromUri(uri),
        });
        if (error) {
          console.error('Upload error:', error.message);
          return null;
        }
      } else {
        // Native: upload binary directly via REST to avoid blob conversion issues
        const uploadUrl = `${supabaseUrl}/storage/v1/object/post-images/${fileName}`;
        const mime = guessMimeFromUri(uri);
        const resp = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'x-upsert': 'false',
            'Content-Type': mime,
          },
        });
        if (!(resp.status >= 200 && resp.status < 300)) {
          console.error('Upload error (native):', resp.status, resp.body);
          return null;
        }
      }
      const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
      const publicUrl = data?.publicUrl || null;
      console.log('[upload] publicUrl', publicUrl);
      return publicUrl;
    } catch (e) {
      console.error('Upload exception:', e);
      return null;
    }
  }

  // Add a new post
  const handleAddPost = async (title, description, type, category, image_url) => {
    const safeTitle = (title || '').trim();
    const safeDescription = (description || '').trim();
    const safeType = (type || '').toLowerCase().trim();
    const safeCategory = (category || '').trim();

    const allowedTypes = new Set(['lost', 'found']);
    if (!safeTitle) {
      console.error('Validation: title is required');
      return;
    }
    if (!safeCategory) {
      console.error('Validation: category is required');
      return;
    }
    if (!allowedTypes.has(safeType)) {
      console.error("Validation: type must be 'lost' or 'found'");
      return;
    }

    const uploadedUrl = image_url || (await uploadImageIfNeeded(newImageUri));
    if (newImageUri && !uploadedUrl) {
      console.warn('[upload] image selected but no public URL returned; saving without image');
    }

    const payload = {
      title: safeTitle,
      description: safeDescription || null,
      type: safeType,
      category: safeCategory,
      image_url: uploadedUrl || null,
    };

    const { data, error } = await supabase.from('posts').insert([payload]).select();

    if (error) {
      console.error('Error adding post:', error?.message || error, error?.details || '', error?.hint || '');
      return;
    }
    if (data && data[0]) {
      setPosts((prev) => [data[0], ...prev]);
      setNewImageUri(null);
    }
  };

  // Edit an existing post
  const handleEditPost = async (id, title, description) => {
    if (!title || !description) {
    console.error('Title or content is missing');
    return; 
    }
    const { error } = await supabase
      .from('posts')
      .update({ title, description })
      .eq('id', id);

    if (error) {
      console.error('Error editing post:', error);
    } else {
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? { ...post, title, description } : post))
      );
    }
  };

  // Delete a post
  const handleDeletePost = async (id) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting post:', error);
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  useEffect(() => {
    fetchPosts(); 
  }, []);

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header />
          <CTA />
          <Hero />
          <Features />
          <View style={styles.section}>
            <AddPostButton onAddPost={() => setModalVisible(true)} />
          </View>
          <View style={styles.postsSection}>
            <PostsGrid
              posts={posts}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          </View>

          {/* Add Post Modal */}
          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView>
                  <Text style={styles.modalTitle}>Create New Post</Text>
                  <Text style={styles.modalDescription}>
                    Add a new post to your feed.
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter post title"
                      value={newTitle}
                      onChangeText={setNewTitle}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Write your post description..."
                      value={newContent}
                      onChangeText={setNewContent}
                      multiline
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Type</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button
                        mode={newType === 'lost' ? 'contained' : 'outlined'}
                        onPress={() => setNewType('lost')}
                        style={{ borderRadius: 20 }}
                      >
                        Lost
                      </Button>
                      <Button
                        mode={newType === 'found' ? 'contained' : 'outlined'}
                        onPress={() => setNewType('found')}
                        style={{ borderRadius: 20 }}
                      >
                        Found
                      </Button>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. electronics, books, personal"
                      value={newCategory}
                      onChangeText={setNewCategory}
                      autoCapitalize="none"
                    />
                  </View>

                  {newImageUri ? (
                    <Image
                      source={{ uri: newImageUri }}
                      style={{ width: '100%', height: 160, borderRadius: 8, marginBottom: 12 }}
                      resizeMode="cover"
                    />
                  ) : null}

                  <View style={styles.imageRow}>
                    <Button mode="outlined" onPress={pickImage} style={styles.addImageBtn}>
                      + Add Image
                    </Button>
                  </View>

                  <View style={styles.modalActions}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setModalVisible(false);
                        setNewTitle('');
                        setNewContent('');
                        setNewType('');
                        setNewCategory('');
                        setNewImageUri(null);
                      }}
                      style={styles.cancelBtn}
                      textColor="#5b21b6"
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => {
                        handleAddPost(newTitle, newContent, newType, newCategory, undefined);
                        setModalVisible(false);
                        setNewTitle('');
                        setNewContent('');
                        setNewType('');
                        setNewCategory('');
                        setNewImageUri(null);
                      }}
                      style={styles.submitBtn}
                      buttonColor="#6d28d9"
                      disabled={
                        !newTitle.trim() ||
                        !newCategory.trim() ||
                        !['lost', 'found'].includes(newType.toLowerCase().trim())
                      }
                    >
                      Add Post
                    </Button>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
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
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdown: {
    width: '100%',
    height: 44,
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  imageRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  addImageBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  cancelBtn: {
    minWidth: 100,
    marginRight: 12,
    borderRadius: 20,
  },
  submitBtn: {
    flexGrow: 1,
    borderRadius: 24,
  },
  button: {
    minWidth: 100,
    marginLeft: 12,
  },
});