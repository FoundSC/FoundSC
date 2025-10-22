import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
} from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';

import Header from './components/header';
import CTA from './components/cta';
import { AddPostButton } from './components/add-post-button';
import PostsGrid from './components/posts-grid';
import { Features } from './components/features';
import { Hero } from './components/hero';

// Initialize Supabase client
const supabaseUrl = 'https://jvxyoybuwxtpzsvzevbp.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eHlveWJ1d3h0cHpzdnpldmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mzc4NzEsImV4cCI6MjA3NjExMzg3MX0.Bkk6ef-W7yVlhBnWwSkG7qolmmEW9LSBy6cGZPNAMzA'; // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [posts, setPosts] = useState([]);

  // Fetch posts from Supabase
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*');

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data);
    }
  };

  // Add a new post
  const handleAddPost = async (title, content) => {
    const { data, error } = await supabase
      .from('posts')
      .insert([{ title, content, createdAt: new Date() }]);

    if (error) {
      console.error('Error adding post:', error);
    } else {
      setPosts((prev) => [data[0], ...prev]); // Add the new post to the state
    }
  };

  // Edit an existing post
  const handleEditPost = async (id, title, content) => {
    const { error } = await supabase
      .from('posts')
      .update({ title, content })
      .eq('id', id);

    if (error) {
      console.error('Error editing post:', error);
    } else {
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? { ...post, title, content } : post))
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
    fetchPosts(); // Fetch posts when the component mounts
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