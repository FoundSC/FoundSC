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
// import { useTheme, baseStyles } from './styles/theme';

import Header from './components/header';
import CTA from './components/cta';
import { AddPostButton } from './components/add-post-button';
import PostsGrid from './components/posts-grid';
import {Features} from './components/features';
import {Hero} from './components/hero';

export default function App() {
  const [posts, setPosts] = useState([]);

  // Add a new post
  const handleAddPost = (title, content) => {
    const newPost = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date(),
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  // Edit an existing post
  const handleEditPost = (id, title, content) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === id ? { ...post, title, content } : post))
    );
  };


  const handleDeletePost = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
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
            <AddPostButton onAddPost={handleAddPost} />
          </View>

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
});

