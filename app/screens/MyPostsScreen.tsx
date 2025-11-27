import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import PostsGrid from '../components/posts-grid';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function MyPostsScreen({ navigation }: any) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();

  const fetchMyPosts = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyPosts();
  }, [user]);

  const handleEdit = async (updatedPost: any) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    const { error } = await supabase
      .from('posts')
      .update({
        title: updatedPost.title,
        description: updatedPost.description,
        type: updatedPost.type,
        category: updatedPost.category,
        contact_info: updatedPost.contact_info,
      })
      .eq('id', updatedPost.id);

    if (error) {
      Alert.alert('Update failed', error.message);
    } else {
      Alert.alert('Success', 'Post updated successfully');
      fetchMyPosts(); // Refresh the list
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      console.error('Error deleting post:', error);
    } else {
      fetchMyPosts();
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Posts</Text>
        <Button mode="outlined" onPress={handleLogout} textColor="#ef4444">
          Logout
        </Button>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You haven't created any posts yet</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Home')}
              style={styles.createButton}
              buttonColor="#0ea5a4"
            >
              Create Your First Post
            </Button>
          </View>
        ) : (
          <PostsGrid 
            posts={posts} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onRefresh={fetchMyPosts} 
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  createButton: {
    borderRadius: 8,
  },
});