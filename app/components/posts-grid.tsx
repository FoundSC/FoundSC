import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, IconButton, Dialog, Portal, Paragraph } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import PostsMapView from './map-view'; 

// Extend Post interface to include poster email
interface Post {
  id?: string | number;
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  image_url?: string | null;
  imageUri?: string | null;
  created_at?: string;
  user_id?: string;
  latitude?: number;
  longitude?: number;
  user_email?: string | null; 
}

interface PostsGridProps {
  posts: Post[];
  onEdit?: (post: Post) => void;
  onDelete?: (id: string | number) => void;
}

export default function PostsGrid({ posts, onEdit, onDelete }: PostsGridProps) {
  const { user } = useAuth();

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);

  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  // Compute aspect ratio for detail image
  useEffect(() => {
    if (viewPost && (viewPost.image_url || viewPost.imageUri)) {
      const uri = (viewPost.image_url || viewPost.imageUri) as string;
      Image.getSize(
        uri,
        (w, h) => {
          if (w > 0 && h > 0) setImageAspect(w / h);
        },
        () => setImageAspect(null)
      );
    } else {
      setImageAspect(null);
    }
  }, [viewPost]);

  const handleEditClick = (post: Post) => {
    if (!user || user.id !== post.user_id) {
      Alert.alert('Not allowed', 'You can only edit your own posts.');
      return;
    }
    setEditingPost(post);
    onEdit && onEdit(post);
  };

  const handleDeleteClick = (id: string | number) => {
    setDeleteTargetId(id);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId != null) {
      onDelete && onDelete(deleteTargetId);
    }
    setDeleteDialogVisible(false);
    setDeleteTargetId(null);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={(e) => {
          const { pageY } = e.nativeEvent;
            setTapPos({ x: 0, y: pageY });
            setViewPost(item);
        }}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {user?.id === item.user_id && (
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil"
                    size={18}
                    onPress={() => handleEditClick(item)}
                  />
                  <IconButton
                    icon="delete"
                    size={18}
                    onPress={() => handleDeleteClick(item.id as any)}
                  />
                </View>
              )}
            </View>
            <Text style={styles.date}>
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : ''}
            </Text>
            {(item.image_url || item.imageUri) && (
              <Image
                source={{ uri: (item.image_url || item.imageUri) as string }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.content} numberOfLines={4}>
              {item.description}
            </Text>
            <Text style={styles.meta}>Type: {item.type || '-'}</Text>
            <Text style={styles.meta}>Category: {item.category || '-'}</Text>
            {item.latitude && item.longitude ? (
              <Text style={styles.meta}>
                📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </Text>
            ) : (
              <Text style={styles.meta}>Location: Not set</Text>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No posts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          scrollEnabled={false}
        />
      )}

      {/* Details Popup (uses map abstraction, safe on web) */}
      {viewPost && !editingPost && (
        <View style={styles.anchorOverlay}>
          <View
            style={[
              styles.anchorDetailModal,
              tapPos ? { top: Math.max(60, tapPos.y - 180) } : { top: 80 },
            ]}
          >
            <ScrollView>
              <Text style={styles.detailTitle}>{viewPost.title}</Text>
              <Text style={styles.detailDate}>
                {viewPost.created_at
                  ? new Date(viewPost.created_at).toLocaleString()
                  : ''}
              </Text>

              {(viewPost.image_url || viewPost.imageUri) && (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: (viewPost.image_url || viewPost.imageUri) as string }}
                    style={[
                      styles.detailImage,
                      imageAspect ? { aspectRatio: imageAspect } : { height: 260 },
                    ]}
                    resizeMode="contain"
                  />
                </View>
              )}

              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{viewPost.type || '-'}</Text>

              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{viewPost.category || '-'}</Text>

              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailBody}>
                {viewPost.description || 'No description provided.'}
              </Text>

              <Text style={styles.detailLabel}>Location</Text>
              {viewPost.latitude && viewPost.longitude ? (
                <Text style={styles.detailValue}>
                  {viewPost.latitude.toFixed(5)}, {viewPost.longitude.toFixed(5)}
                </Text>
              ) : (
                <Text style={styles.detailValue}>No coordinates</Text>
              )}

              <Text style={styles.detailLabel}>Contact Information</Text>
              <Text style={styles.detailValue}>
                {viewPost.user_email ? viewPost.user_email : 'Not available'}
              </Text>

              {viewPost.latitude && viewPost.longitude ? (
                <View style={styles.mapBlock}>
                  <PostsMapView
                    posts={[viewPost]}
                    initialRegion={{
                      latitude: viewPost.latitude,
                      longitude: viewPost.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    interactive={false}
                    height={220}
                  />
                  <Text style={styles.mapCaption}>Item location</Text>
                </View>
              ) : (
                <Text style={styles.mapMissing}>Item not on map</Text>
              )}

              <View style={styles.detailActions}>
                {user?.id === viewPost.user_id && (
                  <Button
                    mode="contained"
                    onPress={() => {
                      handleEditClick(viewPost);
                      setViewPost(null);
                      setTapPos(null);
                    }}
                    style={{ marginRight: 12 }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  mode="outlined"
                  onPress={() => {
                    setViewPost(null);
                    setTapPos(null);
                  }}
                >
                  Close
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Post</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to delete this post? This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  listContent: { paddingBottom: 32, paddingHorizontal: 4 },
  row: { justifyContent: 'space-between' },
  cardContainer: { flex: 1, marginBottom: 14, paddingHorizontal: 6 },
  card: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
  cardContent: { paddingBottom: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  actions: { flexDirection: 'row' },
  title: { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 4 },
  date: { fontSize: 11, color: '#666', marginBottom: 8 },
  thumbnailImage: { width: '100%', height: 130, borderRadius: 8, marginBottom: 10, backgroundColor: '#f3f4f6' },
  content: { fontSize: 12, lineHeight: 16, color: '#333', marginBottom: 6 },
  meta: { fontSize: 11, color: '#555', marginBottom: 2 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#666' },

  // Details modal anchoring
  anchorOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 1000,
  },
  anchorDetailModal: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    maxHeight: '72%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  imageWrapper: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 18,
  },
  detailImage: { width: '100%', maxHeight: 420 },
  detailTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  detailDate: { fontSize: 12, color: '#666', marginBottom: 16 },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: { fontSize: 15, color: '#111827' },
  detailBody: { fontSize: 15, lineHeight: 22, color: '#333', marginTop: 2 },

  mapBlock: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 18,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  mapCaption: {
    position: 'absolute',
    bottom: 6,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
  },
  mapMissing: { marginTop: 18, fontSize: 14, fontStyle: 'italic', color: '#666' },

  detailActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 28 },
});
