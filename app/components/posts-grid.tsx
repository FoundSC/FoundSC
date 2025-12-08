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
  TextInput,
  Platform,
} from 'react-native';
import { Card, Button, IconButton, Dialog, Portal, Paragraph } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import PostsMapView from './map-view';
import { supabase } from '../lib/supabase';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import RateFinderModal from './rate-finder-modal';
import { createSuccessfulReturn, rateUser } from '../lib/returns';
import { listComments, createComment, deleteComment, type Comment } from '../lib/comments';

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
  latitude?: number | null;
  longitude?: number | null;
  user_email?: string | null;
  contact_info?: string | null;
  status?: string; // status of the post (i.e.'active', 'in_exchange', 'found', etc.)
}

interface PostsGridProps {
  posts: Post[];
  onEdit?: (post: Post) => void;
  onDelete?: (id: string | number) => void;
  onRefresh?: () => void;
}

// Navigation type for routes used here
type RootStackParamList = {
  Chat: {
    conversationId: string | number;
    otherUserId: string;
    otherUserEmail: string | null;
  };
  Rating: {
    exchangeId: number;
  };
};

export default function PostsGrid({ posts, onEdit, onDelete, onRefresh }: PostsGridProps) {
  const { user } = useAuth();
  const navigation = useNavigation<any>(); // Use any for navigation to support multiple screen types
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);

  // Currently selected post for the detail dialog
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // User selection dialog for mark as found flow
  const [userSelectionVisible, setUserSelectionVisible] = useState(false);
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedPostForRating, setSelectedPostForRating] = useState<Post | null>(null);

  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [finderToRate, setFinderToRate] = useState<any>(null);
  const [returnedPostId, setReturnedPostId] = useState<number | null>(null);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContactInfo, setEditContactInfo] = useState(''); // Add state for contact info
  const [editImageUri, setEditImageUri] = useState<string | null>(null); // Add state for image URI

  // Comments state for the currently viewed post
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentBody, setNewCommentBody] = useState('');

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

  // Load comments whenever a post is opened in the detail dialog
  useEffect(() => {
    if (!viewPost?.id) {
      setComments([]);
      setNewCommentBody('');
      return;
    }

    const postIdNum = Number(viewPost.id);
    if (!Number.isFinite(postIdNum)) {
      setComments([]);
      setNewCommentBody('');
      return;
    }

    setCommentsLoading(true);
    listComments(postIdNum)
      .then((rows) => setComments(rows))
      .catch((err) => {
        console.error('[comments] load failed', err?.message || err);
      })
      .finally(() => {
        setCommentsLoading(false);
      });
  }, [viewPost?.id]);

  const handleAddComment = async () => {
    if (!viewPost?.id || !newCommentBody.trim()) return;

    const postIdNum = Number(viewPost.id);
    if (!Number.isFinite(postIdNum)) return;

    try {
      const created = await createComment(postIdNum, newCommentBody, user?.id);
      setComments((prev) => [created, ...prev]);
      setNewCommentBody('');
    } catch (e: any) {
      console.error('[comments] add failed', e?.message || e);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      console.error('[comments] delete failed', e?.message || e);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  // Helper function to mark post as found without rating (when no contacts)
  const markPostAsFoundOnly = async (post: Post) => {
    const { error } = await supabase
      .from('posts')
      .update({
        is_found: true,
        active: false,
        description: `${post.description || ''}\n✅ This item has been found!`
      })
      .eq('id', post.id);

    if (error) {
      console.error('Error marking post as found:', error);
      Alert.alert('Error', 'Failed to mark post as found');
    } else {
      // Refresh posts and close dialog
      if (onRefresh) onRefresh();
      setViewPost(null);
    }
  };

  // Function to handle marking a post as found
  // Shows user selection dialog to choose who helped find the item
  const handleMarkFound = async (post: Post) => {
    if (!user || user.id !== post.user_id) {
      Alert.alert('Not allowed', 'You can only mark your own posts as found.');
      return;
    }

    setSelectedPostForRating(post);
    setLoadingContacts(true);
    setUserSelectionVisible(true);

    // Fetch all users who contacted this post
    const { data, error } = await supabase.rpc('get_post_contacts', {
      in_post_id: post.id,
    });

    setLoadingContacts(false);

    if (error) {
      console.error('Error fetching contacted users:', error);
      Alert.alert('Error', 'Failed to load contacted users');
      setUserSelectionVisible(false);
      return;
    }

    if (!data || data.length === 0) {
      setUserSelectionVisible(false);
      Alert.alert(
        'No Contacts',
        'No one has contacted you about this post yet. Are you sure you want to mark it as found?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              await markPostAsFoundOnly(post);
            }
          }
        ]
      );
      return;
    }

    setContactedUsers(data);
  };

  // Handle user selection - create successful return and show rating modal
  const handleUserSelected = async (selectedUser: any) => {
    if (!selectedPostForRating || !user) return;

    setUserSelectionVisible(false);

    // Create successful return (this also marks post as found)
    const { data: returnData, error } = await createSuccessfulReturn(
      selectedPostForRating.id as number,
      user.id,
      selectedUser.user_id
    );

    if (error) {
      Alert.alert('Error', 'Failed to mark as found. Please try again.');
      console.error('Error creating successful return:', error);
      return;
    }
    
    // Show rating modal immediately
    setFinderToRate(selectedUser);
    setReturnedPostId(selectedPostForRating.id as number);
    setRatingModalVisible(true);
    setViewPost(null);
    setSelectedPostForRating(null);
  };

  // Handle rating submission
  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!finderToRate || !returnedPostId || !user) return;

    const { success, error } = await rateUser(
      user.id,
      finderToRate.user_id,
      returnedPostId,
      rating,
      comment
    );

    setRatingModalVisible(false);

    if (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Note', 'Item marked as found, but rating could not be saved.');
    } else {
      Alert.alert('Success', 'Thank you for your rating!');
    }

    // Refresh posts
    if (onRefresh) onRefresh();
    setFinderToRate(null);
    setReturnedPostId(null);
  };

  // Handle skip rating
  const handleSkipRating = () => {
    setRatingModalVisible(false);
    setFinderToRate(null);
    setReturnedPostId(null);
    Alert.alert('Success', 'Item marked as found!');
    if (onRefresh) onRefresh();
  };

  // Function to unmark a post as found (revert to active)
  const handleUnmark = async (post: Post) => {
    if (!user || user.id !== post.user_id) {
      Alert.alert('Not allowed', 'You can only unmark your own posts.');
      return;
    }

    Alert.alert(
      'Unmark as Found',
      'Are you sure you want to mark this post as active again?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            // Remove the found message from description
            const cleanedDescription = post.description?.replace('\n✅ This item has been found!', '') || '';

            const { error } = await supabase
              .from('posts')
              .update({
                is_found: false,
                active: true,
                description: cleanedDescription
              })
              .eq('id', post.id);

            if (error) {
              console.error('Error unmarking post:', error);
              Alert.alert('Error', 'Failed to unmark post');
            } else {
              // Update viewPost if it's the current one
              if (viewPost?.id === post.id) {
                setViewPost({
                  ...viewPost,
                  description: cleanedDescription
                });
              }
              // Refresh posts
              if (onRefresh) onRefresh();
            }
          }
        }
      ]
    );
  };

  // Handle editing a post
  const handleEditClick = (post: Post) => {
    if (!user || user.id !== post.user_id) {
      Alert.alert('Not allowed', 'You can only edit your own posts.');
      return;
    }
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditDescription(post.description || '');
    setEditType(post.type || '');
    setEditCategory(post.category || '');
    setEditContactInfo(post.contact_info || '');
    setEditImageUri(post.image_url || null); 
    setEditModalVisible(true);
    setViewPost(null);
  };

  // Save edited post
  const handleSaveEdit = () => {
    if (!editingPost) return;

    const updatedPost = {
      ...editingPost,
      title: editTitle,
      description: editDescription,
      type: editType,
      category: editCategory,
      contact_info: editContactInfo,
      image_url: editImageUri, 
    };

    onEdit && onEdit(updatedPost);
    setEditModalVisible(false);
    setEditingPost(null);
    setEditTitle('');
    setEditDescription('');
    setEditType('');
    setEditCategory('');
    setEditContactInfo('');
    setEditImageUri(null); 
  };

  // Handle deleting a post
  const handleDeleteClick = (id: string | number) => {
    setDeleteTargetId(id);
    setDeleteDialogVisible(true);
  };

  // Confirm deletion
  const confirmDelete = () => {
    if (deleteTargetId != null) {
      onDelete && onDelete(deleteTargetId);
    }
    setDeleteDialogVisible(false);
    setDeleteTargetId(null);
  };

  // Render each post card
  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={(e) => {
          const { pageY, pageX } = e.nativeEvent;
          setTapPos({ x: pageX, y: pageY });
          setViewPost(item);
        }}
      >
        <Card style={styles.card}>
          <View style={styles.cardInner}>
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
            
            {/* Show "Found" badge if description contains the found message */}
            {item.description?.includes('✅ This item has been found!') && (
              <View style={{ 
                backgroundColor: '#dcfce7', 
                borderLeftWidth: 3, 
                borderLeftColor: '#16a34a', 
                padding: 8, 
                marginBottom: 8, 
                borderRadius: 6 
              }}>
                <Text style={{ 
                  fontSize: 11, 
                  fontWeight: 'bold', 
                  color: '#16a34a', 
                }}>
                  ✅ This item has been found!
                </Text>
              </View>
            )}
            
            <Text style={styles.content} numberOfLines={4}>
              {item.description?.replace('\n✅ This item has been found!', '')}
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
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );

  // Function to pick and set image for editing
  async function pickEditImage() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access photos');
        return;
      }
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length) {
        setEditImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking image:', e);
    }
  }

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
      {/* Details Popup using Portal Dialog */}
      <Portal>
        <Dialog
          visible={!!viewPost && !editingPost}
          onDismiss={() => {
            setViewPost(null);
            setTapPos(null);
          }}
          style={{ maxHeight: '85%', backgroundColor: '#fff' }}
        >
          <Dialog.Title style={{ fontSize: 22, fontWeight: '700', backgroundColor: '#fff', color: '#111827' }}>
            {viewPost?.title}
          </Dialog.Title>
          
          <Dialog.ScrollArea style={{ backgroundColor: '#fff' }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, backgroundColor: '#fff' }}>
             {/* Show "Mark as Found" or "Unmark" button for lost posts owned by the user */}
              {viewPost && user?.id === viewPost.user_id && viewPost.type === 'lost' && (
                viewPost.description?.includes('✅ This item has been found!') ? (
                  // Show Unmark button if already marked as found
                  <Button
                    mode="contained"
                    onPress={() => handleUnmark(viewPost)}
                    style={{ marginTop: 8, marginBottom: 12 }}
                    buttonColor="#dc2626"
                  >
                    Unmark
                  </Button>
                ) : (
                  // Show Mark as Found button if not yet marked
                  <Button
                    mode="contained"
                    onPress={() => handleMarkFound(viewPost)}
                    loading={updatingId === viewPost.id}
                    style={{ marginTop: 8, marginBottom: 12 }}
                    buttonColor="#16a34a"
                  >
                    Mark as Found
                  </Button>
                )
              )}

              {/* Post Details */}
              {viewPost && (
                <>
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
                    {viewPost.created_at
                      ? new Date(viewPost.created_at).toLocaleString()
                      : ''}
                  </Text>

                  {(viewPost.image_url || viewPost.imageUri) && (
                    <View style={{
                      width: '100%',
                      backgroundColor: '#f3f4f6',
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                      marginBottom: 18,
                    }}>
                      <Image
                        source={{ uri: (viewPost.image_url || viewPost.imageUri) as string }}
                        style={[
                          { width: '100%', maxHeight: 420 },
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
                  {/* Show special found message styling if applicable */}
                  {viewPost.description?.includes('✅ This item has been found!') ? (
                    <View>
                      <Text style={styles.detailBody}>
                        {viewPost.description.replace('\n✅ This item has been found!', '')}
                      </Text>
                      <View style={{ 
                        backgroundColor: '#dcfce7', 
                        borderLeftWidth: 4, 
                        borderLeftColor: '#16a34a', 
                        padding: 12, 
                        marginTop: 16, 
                        borderRadius: 8 
                      }}>
                        <Text style={{ 
                          fontSize: 16, 
                          fontWeight: 'bold', 
                          color: '#16a34a', 
                          letterSpacing: 0.5 
                        }}>
                          ✅ This item has been found!
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.detailBody}>
                      {viewPost.description || 'No description provided.'}
                    </Text>
                  )}

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
                    {viewPost.contact_info ? viewPost.contact_info : 'Not available'}
                  </Text>

                  {viewPost.latitude && viewPost.longitude ? (
                    <View style={{
                      width: '100%',
                      borderRadius: 16,
                      overflow: 'hidden',
                      marginTop: 18,
                      backgroundColor: '#eef2ff',
                      borderWidth: 1,
                      borderColor: '#c7d2fe',
                    }}>
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
                    <Text style={{ marginTop: 18, fontSize: 14, fontStyle: 'italic', color: '#666' }}>
                      Item not on map
                    </Text>
                  )}

                  {/* Comments Section */}
                  <Text style={styles.detailLabel}>Comments</Text>
                  {commentsLoading ? (
                    <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                      Loading comments...
                    </Text>
                  ) : comments.length === 0 ? (
                    <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                      No comments yet.
                    </Text>
                  ) : (
                    <View style={{ marginBottom: 12 }}>
                      {comments.map((c) => (
                        <View
                          key={c.id}
                          style={{
                            paddingVertical: 6,
                            borderBottomWidth: 1,
                            borderBottomColor: '#e5e7eb',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 13, color: '#111827' }}>{c.body}</Text>
                            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                              {new Date(c.created_at).toLocaleString()}
                            </Text>
                          </View>
                          {user && user.id === c.author_id && (
                            <IconButton
                              icon="delete"
                              size={16}
                              onPress={() => handleDeleteComment(c.id)}
                            />
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* New Comment Input (only meaningful when logged in) */}
                  <View style={{ marginTop: 4, marginBottom: 8 }}>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 14,
                        minHeight: 40,
                      }}
                      placeholder={user ? 'Add a comment...' : 'Log in to add a comment'}
                      value={newCommentBody}
                      onChangeText={setNewCommentBody}
                      editable={!!user}
                      multiline
                    />
                    <Button
                      mode="contained"
                      onPress={handleAddComment}
                      disabled={!user || !newCommentBody.trim()}
                      style={{ marginTop: 6, alignSelf: 'flex-end' }}
                    >
                      Post Comment
                    </Button>
                  </View>
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions style={{ backgroundColor: '#fff' }}>
            {/* Owner-only Edit button */}
            {viewPost && user?.id === viewPost.user_id && (
              <Button
                mode="contained"
                onPress={() => {
                  handleEditClick(viewPost);
                  setViewPost(null);
                  setTapPos(null);
                }}
              >
                Edit
              </Button>
            )}
            {/* Contact button for viewers; opens DM chat when signed in */}
            {viewPost && viewPost.user_id !== user?.id && (
              <Button
                mode="contained"
                onPress={async () => {
                  // Guests cannot start a direct message conversation
                  if (!user) {
                    Alert.alert(
                      'Sign in required',
                      'You cannot contact the poster as a guest. Please log in or create a profile to send a message.'
                    );
                    return;
                  }

                  if (!viewPost?.user_id) {
                    Alert.alert(
                      'Unavailable',
                      'The poster is not signed in, so direct messaging is unavailable. Use the contact info if provided.'
                    );
                    return;
                  }

                  // Close the popup first so it doesn't persist over the Chat screen
                  setViewPost(null);
                  setTapPos(null);

                  const { data, error } = await supabase.rpc('get_or_create_conversation', {
                    user1_id: user.id,
                    user2_id: viewPost.user_id,
                    in_post_id: viewPost.id,
                  });

                  if (error) {
                    console.error('get_or_create_conversation failed:', error);
                    Alert.alert('Error', error.message);
                    return;
                  }

                  const cid = Array.isArray(data)
                    ? data[0]?.conversation_id
                    : (data as any)?.conversation_id;
                  if (!cid) {
                    Alert.alert('Error', 'Could not create or load the conversation.');
                    return;
                  }

                  // Navigate after dialog is dismissed
                  navigation.navigate('Chat', {
                    conversationId: cid,
                    otherUserId: viewPost.user_id!,
                    otherUserEmail: viewPost.user_email ?? null,
                  });
                }}
              >
                Contact
              </Button>
            )}
            <Button
              onPress={() => {
                setViewPost(null);
                setTapPos(null);
              }}
            >
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Modal */}
      <Portal>
        <Dialog
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          style={{ maxHeight: '80%', backgroundColor: '#fff' }}
        >
          <Dialog.Title style={{ backgroundColor: '#fff', color: '#111827' }}>Edit Post</Dialog.Title>
          <Dialog.ScrollArea style={{ backgroundColor: '#fff' }}>
            <ScrollView contentContainerStyle={{ backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#374151' }}>Title</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#fff' }}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Post title"
              />

              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#374151' }}>Description</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#fff', height: 100, textAlignVertical: 'top' }}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Post description"
                multiline
                numberOfLines={4}
              />

              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#374151' }}>Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Button
                  mode={editType === 'lost' ? 'contained' : 'outlined'}
                  onPress={() => setEditType('lost')}
                  style={{ flex: 1 }}
                >
                  Lost
                </Button>
                <Button
                  mode={editType === 'found' ? 'contained' : 'outlined'}
                  onPress={() => setEditType('found')}
                  style={{ flex: 1 }}
                >
                  Found
                </Button>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#374151' }}>Category</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#fff' }}
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="e.g. Electronics, Pets"
              />

              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#374151' }}>Contact Information (Optional)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#fff' }}
                value={editContactInfo}
                onChangeText={setEditContactInfo}
                placeholder="Email, phone, or other contact method"
              />

              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#374151' }}>Image</Text>
              {editImageUri && (
                <Image
                  source={{ uri: editImageUri }}
                  style={{ width: '100%', height: 160, borderRadius: 8, marginBottom: 12 }}
                  resizeMode="cover"
                />
              )}
              <Button
                mode="outlined"
                onPress={pickEditImage}
                style={{ marginBottom: 12 }}
              >
                {editImageUri ? 'Change Image' : 'Add Image'}
              </Button>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions style={{ backgroundColor: '#fff' }}>
            <Button onPress={() => setEditModalVisible(false)}>Cancel</Button>
            <Button
              onPress={handleSaveEdit}
              disabled={!editTitle.trim() || !editCategory.trim()}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
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

        {/* User Selection Dialog for Mark as Found */}
        <Dialog
          visible={userSelectionVisible}
          onDismiss={() => setUserSelectionVisible(false)}
          style={{ maxHeight: '70%', backgroundColor: '#fff' }}
        >
          <Dialog.Title style={{ backgroundColor: '#fff', color: '#111827' }}>
            Select Who Found the Item
          </Dialog.Title>
          <Dialog.Content style={{ backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
              Choose the person who helped you retrieve your item to rate them.
            </Text>
            {loadingContacts ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>Loading contacts...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {contactedUsers.map((contactUser, index) => (
                  <TouchableOpacity
                    key={contactUser.user_id}
                    onPress={() => handleUserSelected(contactUser)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      marginBottom: 8,
                      backgroundColor: '#f9fafb',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                    }}
                  >
                    {contactUser.profile_picture ? (
                      <Image
                        source={{ uri: contactUser.profile_picture }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          marginRight: 12,
                          backgroundColor: '#f0f0f0',
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          marginRight: 12,
                          backgroundColor: '#e5e7eb',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <IconButton icon="account" size={24} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111' }}>
                        {contactUser.display_name || contactUser.user_email || 'Anonymous'}
                      </Text>
                      {contactUser.last_message_time && (
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          Last contacted:{' '}
                          {new Date(contactUser.last_message_time).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    <IconButton icon="chevron-right" size={20} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ backgroundColor: '#fff' }}>
            <Button onPress={() => setUserSelectionVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Rating Modal - Shows after selecting finder */}
      <RateFinderModal
        visible={ratingModalVisible}
        finderName={finderToRate?.display_name || finderToRate?.user_email || 'this user'}
        onSubmit={handleRatingSubmit}
        onSkip={handleSkipRating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  listContent: { paddingBottom: 32, paddingHorizontal: 4 },
  row: { justifyContent: 'space-between' },
  cardContainer: { flex: 1, marginBottom: 14, paddingHorizontal: 6 },
  card: { borderRadius: 14, overflow: 'visible', backgroundColor: '#fff' },
  cardInner: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
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
  // "Mark as Found" button styling
  // marginTop: 12px provides spacing from location/metadata above
  // borderRadius: 8px matches other buttons in the app for consistency
  markFoundButton: {
    marginTop: 12,
    borderRadius: 8,
  },
});
