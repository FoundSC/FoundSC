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
} from 'react-native';
import { Provider as PaperProvider, Button } from 'react-native-paper';

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
  const [newType, setNewType] = useState('lost');
  const [newCategory, setNewCategory] = useState('Other');

  const[image, setImage] = useState(null);

  
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

    const payload = {
      title: safeTitle,
      description: safeDescription || null,
      type: safeType,
      category: safeCategory,
      image_url: image_url || null,
    };

    const { data, error } = await supabase.from('posts').insert([payload]).select();

    if (error) {
      console.error('Error adding post:', error?.message || error, error?.details || '', error?.hint || '');
      return;
    }
    if (data && data[0]) {
      setPosts((prev) => [data[0], ...prev]);
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
                    <TextInput
                      style={styles.input}
                      placeholder="Lost or Found"
                      value={newType}
                      onChangeText={setNewType}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Electronics, Pets"
                      value={newCategory}
                      onChangeText={setNewCategory}
                    />
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
                      }}
                      style={styles.button}
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
                      }}
                      style={styles.button}
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
  button: {
    minWidth: 100,
    marginLeft: 12,
  },
});