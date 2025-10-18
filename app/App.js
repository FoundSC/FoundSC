import 'react-native-url-polyfill/auto';
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Alert,
} from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

import Header from './components/header';
import CTA from './components/cta';
import { AddPostButton } from './components/add-post-button';
import PostsGrid from './components/posts-grid';

export default function App() {

  const [posts, setPosts] = useState([]);

  const handleAddPost = (title, content) => {
    const newPost = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date(),
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleEditPost = (id, title, content) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, title, content } : post
      )
    );
  };

  const handleDeletePost = (id) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPosts((prev) => prev.filter((p) => p.id !== id));
          },
        },
      ]
    );
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header />
          <CTA />
    
          <View style={styles.section}>
            <AddPostButton onAddPost={handleAddPost} />
          </View>
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
});

