import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Image,
  RefreshControl,
} from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PostsGrid from '../components/posts-grid';
import PostsMapView from '../components/map-view';
import FloatingActionButton from '../components/floating-action-button';
import { useAddPost } from '../contexts/AddPostContext';
import Header from '../components/header';
import { Hero } from '../components/hero';
import LocationPicker from '../components/location-picker';
import * as ImagePicker from 'expo-image-picker';
import { setLostPostMatchRules } from '../lib/notifications';

/**
 * AllPostsScreen Component
 *
 * Displays all posts in grid or map view with search and filter capabilities.
 * Includes:
 * - Search bar (by title, description, category)
 * - Category filter (Electronics, Pets, Accessories, Clothing, Other)
 * - Type filter (Lost, Found, All)
 * - Date range filter
 * - View toggle (Grid/Map)
 *
 * This screen is accessible to both authenticated and guest users.
 */
export default function AllPostsScreen() {
  const { user } = useAuth();
  const { modalVisible, openModal, closeModal } = useAddPost();

  // Posts data
  const [posts, setPosts] = useState<any[]>([]);

  // View mode state (grid or map)
  const [viewMode, setViewMode] = useState('grid');

  // Search & filter state
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [modalCategoryMenuVisible, setModalCategoryMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New-post form state (mirrors previous Home screen behavior)
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newLatitude, setNewLatitude] = useState<number | null>(null);
  const [newLongitude, setNewLongitude] = useState<number | null>(null);

  const CATEGORIES = [
    'Electronics',
    'Wallet/ID',
    'Clothes/Accessories',
    'Pets',
    'Keys',
    'Bags/Backpacks',
    'Bottles',
    'Persons',
    'Miscellaneous',
  ];

  /**
   * Fetch posts from Supabase with optional filters
   *
   * Supports filtering by:
   * - search: Text search in title, description, and category
   * - type: Lost or Found
   * - category: Category selection
   * - startDate/endDate: Date range filter
   * - bounds: Geographic bounding box (for map view)
   */
  const fetchPosts = async (filters: any = {}) => {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('active', true)  // Only show active posts (not marked as found)
      .order('created_at', { ascending: false });

    // Type filter (lost/found)
    if (filters.type && filters.type !== 'All') {
      query = query.eq('type', String(filters.type).toLowerCase());
    }

    // Category filter
    if (filters.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }

    // Search filter (searches title, description, and category)
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`
      );
    }

    // Date range filter
    if (filters.startDate) {
      const s = new Date(filters.startDate + 'T00:00:00Z').toISOString();
      query = query.gte('created_at', s);
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate + 'T23:59:59Z').toISOString();
      query = query.lte('created_at', e);
    }

    // Bounding box filter (for map view - only show posts within visible area)
    if (filters.bounds) {
      const { north, south, east, west } = filters.bounds;
      query = query
        .gte('latitude', south)
        .lte('latitude', north)
        .gte('longitude', west)
        .lte('longitude', east)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } else {
      setPosts(data || []);
    }
  };

  // Image picker for new posts (same pattern as other screens)
  // requests media permission and launches expo-image-picker
  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'We need photo access to attach an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length) {
        setNewImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      console.error('Error picking image:', e?.message || e);
    }
  };

  const guessMimeFromUri = (uri: string | null) => {
    const lower = (uri || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    return 'image/jpeg';
  };

  // Very small keyword extractor, used to build simple match rules for LOST posts
  const extractKeywords = (text: string) => {
    const stop = new Set([
      'the','and','for','with','that','this','you','your','from','near','lost','found','item','items','a','an','of','to','in','on','at','is','it'
    ]);
    return String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((w) => w && w.length >= 3 && !stop.has(w));
  };

  // fetches selected file
  // uploads to Supabase Storage
  // returns URL or null on failure
  // able to see image as return
  const uploadImageIfNeeded = async (uri: string | null): Promise<string | null> => {
    if (!uri) return null;
    try {
      const fileName = `uploads/${Date.now()}_${uri.split('/').pop() || 'image.jpg'}`;
      const res = await fetch(uri);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const contentType = guessMimeFromUri(uri);
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, bytes, {
          cacheControl: '3600',
          upsert: false,
          contentType,
        });
      if (error) {
        console.error('Upload error:', error);
        return null;
      }
      const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
      return data?.publicUrl || null;
    } catch (e) {
      console.error('Upload exception:', e);
      return null;
    }
  };

  const handleAddPost = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    const safeTitle = newTitle.trim();
    const safeDescription = newContent.trim();
    const safeType = newType.toLowerCase().trim();
    const safeCategory = newCategory.trim();

    if (!safeTitle || !safeCategory || !['lost', 'found'].includes(safeType)) {
      Alert.alert('Error', 'Title, category, and type are required');
      return;
    }

    const uploadedUrl = await uploadImageIfNeeded(newImageUri);

    const payload: any = {
      title: safeTitle,
      description: safeDescription || null,
      type: safeType,
      category: safeCategory,
      image_url: uploadedUrl || null,
      latitude: newLatitude,
      longitude: newLongitude,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('posts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding post:', error);
      Alert.alert('Error', 'Failed to create post');
      return;
    }

    setPosts((prev) => [data, ...prev]);
    // Notifications: similar-listing flow
    // For LOST posts, upsert simple keyword/category rules in lost_match_rules.
    // The DB trigger notify_on_found_post reads these rules when a FOUND post is created
    // and enqueues a row in notifications, which the Edge Function dispatches.
    if (safeType === 'lost') {
      try {
        const post_keywords = extractKeywords(`${safeTitle} ${safeDescription}`).slice(0, 5);
        await setLostPostMatchRules(data.id as number, { keywords: post_keywords, category: safeCategory || null });
      } catch (e: any) {
        console.warn('[match] rules upsert failed', e?.message || e);
      }
    }
    // Reset form and close modal
    setNewTitle('');
    setNewContent('');
    setNewType('');
    setNewCategory('');
    setNewImageUri(null);
    setNewLatitude(null);
    setNewLongitude(null);
    closeModal();
  };

  /**
   * Edit a post (title, description, type, category, image)
   * Called with full post object from PostsGrid
   */
  const handleEditPost = async (updatedPost: any) => {
    if (!updatedPost.title || !updatedPost.description) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }

    const updatePayload: any = {
      title: updatedPost.title,
      description: updatedPost.description,
    };
    if (updatedPost.type && typeof updatedPost.type === 'string') {
      updatePayload.type = updatedPost.type.toLowerCase().trim();
    }
    if (updatedPost.category && typeof updatedPost.category === 'string') {
      updatePayload.category = updatedPost.category.trim();
    }
    if (updatedPost.contact_info) {
      updatePayload.contact_info = updatedPost.contact_info;
    }
    if (typeof updatedPost.image_url !== 'undefined') {
      updatePayload.image_url = updatedPost.image_url;
    }

    const { error } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', updatedPost.id);

    if (error) {
      console.error('Error editing post:', error);
      Alert.alert('Error', 'Failed to update post');
    } else {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === updatedPost.id ? { ...post, ...updatePayload } : post
        )
      );
    }
  };

  /**
   * Delete a post
   * Only the post owner can delete their posts
   */
  const handleDeletePost = async (postId: string | number) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to delete posts');
      return;
    }

    // Verify ownership
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post && post.user_id !== user.id) {
      Alert.alert('Error', 'You can only delete your own posts');
      return;
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  // Initial load
  useEffect(() => {
    fetchPosts();
  }, []);

  // Debounced search/filtering - 300ms delay to avoid too many queries
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts({
        search: searchText,
        category: filterCategory,
        type: filterType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, filterCategory, filterType, startDate, endDate]);

  /**
   * Handle date range confirmation from date picker
   */
  const onConfirmDateRange = ({ startDate: s, endDate: e }: any) => {
    const fmt = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    setStartDate(fmt(s));
    setEndDate(fmt(e));
    setDatePickerOpen(false);
  };

  /**
   * Pull-to-refresh handler for the All Posts feed
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts({
      search: searchText,
      category: filterCategory,
      type: filterType,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setRefreshing(false);
  };

  /**
   * Clear date range filter
   */
  const onClearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setDatePickerOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Header />
        <Hero />

        {/* Page Title */}
        <Text style={styles.pageTitle}>All Posts</Text>

        {/* Search Bar, allows users to search based on keyword find
        Whatever the user types is stored in searchText
        Inside fetchPosts(),  tells Supabase to return all posts with the title, description, or category that contains the keyword*/}
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, item, or category..."
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {/* Filters Row - Category and Type */}
        <View style={styles.filtersRow}>
          {/* Category Filter */}
          <View style={{ flex: 1 }}>
            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCategoryMenuVisible(true)}
                  icon="chevron-down"
                >
                  {filterCategory === 'All' ? 'Category: All' : filterCategory}
                </Button>
              }
              contentStyle={{ backgroundColor: '#fff' }}
            >
              <Menu.Item
                onPress={() => {
                  setFilterCategory('All');
                  setCategoryMenuVisible(false);
                }}
                title="Category: All"
              />
              {CATEGORIES.map((cat) => (
                <Menu.Item
                  key={cat}
                  onPress={() => {
                    setFilterCategory(cat);
                    setCategoryMenuVisible(false);
                  }}
                  title={cat}
                />
              ))}
            </Menu>
          </View>

          <View style={{ width: 8 }} />

          {/* Type Filter */}
          <View style={{ flex: 1 }}>
            <Menu
              visible={typeMenuVisible}
              onDismiss={() => setTypeMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setTypeMenuVisible(true)}
                  icon="chevron-down"
                >
                  {filterType === 'All'
                    ? 'Type: All'
                    : filterType === 'lost'
                    ? 'Lost'
                    : 'Found'}
                </Button>
              }
              contentStyle={{ backgroundColor: '#fff' }}
            >
              <Menu.Item
                onPress={() => {
                  setFilterType('All');
                  setTypeMenuVisible(false);
                }}
                title="Type: All"
              />
              <Menu.Item
                onPress={() => {
                  setFilterType('lost');
                  setTypeMenuVisible(false);
                }}
                title="Lost"
              />
              <Menu.Item
                onPress={() => {
                  setFilterType('found');
                  setTypeMenuVisible(false);
                }}
                title="Found"
              />
            </Menu>
          </View>
        </View>

        {/* Date Range Selector */}
        <View style={styles.datesRow}>
          <Button mode="outlined" onPress={() => setDatePickerOpen(true)}>
            {startDate && endDate
              ? `${startDate} → ${endDate}`
              : 'Select Date'}
          </Button>
          <View style={{ width: 8 }} />
          {startDate || endDate ? (
            <Button mode="text" onPress={onClearDateRange}>
              Clear
            </Button>
          ) : null}
        </View>

        <DatePickerModal
          locale="en"
          mode="range"
          visible={datePickerOpen}
          onDismiss={() => setDatePickerOpen(false)}
          startDate={startDate ? new Date(startDate) : undefined}
          endDate={endDate ? new Date(endDate) : undefined}
          onConfirm={onConfirmDateRange}
          saveLabel="Apply"
          closeIcon="close"
          startLabel="From"
          endLabel="To"
        />

        {/* View Toggle - Grid or Map */}
        <View style={styles.viewToggleContainer}>
          <Button
            mode={viewMode === 'grid' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('grid')}
            icon="view-grid"
            style={styles.viewToggleBtn}
          >
            Grid View
          </Button>
          <Button
            mode={viewMode === 'map' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('map')}
            icon="map"
            style={styles.viewToggleBtn}
          >
            Map View
          </Button>
        </View>

        {/* Posts Display - Grid or Map */}
        <View style={styles.postsSection}>
          {viewMode === 'grid' ? (
            <PostsGrid
              posts={posts}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          ) : (
            <PostsMapView
              posts={posts}
              onBoundsChange={(bounds) =>
                fetchPosts({
                  search: searchText,
                  type: filterType,
                  category: filterCategory,
                  startDate,
                  endDate,
                  bounds,
                })
              }
              onRefresh={() =>
                fetchPosts({
                  search: searchText,
                  type: filterType,
                  category: filterCategory,
                  startDate,
                  endDate,
                })
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button - Fixed position, bottom-right corner */}
      <FloatingActionButton onPress={openModal} />

      {/* Add Post Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {/* Modal header with title and explicit X close control */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Post</Text>
                <Text
                  style={styles.modalClose}
                  onPress={() => {
                    closeModal();
                    setNewTitle('');
                    setNewContent('');
                    setNewType('');
                    setNewCategory('');
                    setNewImageUri(null);
                    setNewLatitude(null);
                    setNewLongitude(null);
                  }}
                >
                  ×
                </Text>
              </View>
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

              {/*Type selector -- lost or found */}
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

              {/* Category selector coming from CATEGORIES list*/}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Category</Text>
                <Button
                  mode="outlined"
                  onPress={() => setModalCategoryMenuVisible((v) => !v)}
                  icon="chevron-down"
                >
                  {newCategory ? `Category: ${newCategory}` : 'Select category'}
                </Button>
                {modalCategoryMenuVisible && (
                  <View style={{ marginTop: 8 }}>
                    {CATEGORIES.map((cat) => (
                      <Button
                        key={cat}
                        mode={newCategory === cat ? 'contained' : 'text'}
                        onPress={() => {
                          setNewCategory(cat);
                          setModalCategoryMenuVisible(false);
                        }}
                        style={{ justifyContent: 'flex-start' }}
                        contentStyle={{ justifyContent: 'flex-start' }}
                      >
                        {cat}
                      </Button>
                    ))}
                  </View>
                )}
              </View>

              {newImageUri ? (
                <Image
                  source={{ uri: newImageUri }}
                  style={{ width: '100%', height: 160, borderRadius: 8, marginBottom: 12 }}
                  resizeMode="cover"
                />
              ) : null}

              <View style={styles.imageRow}>
                <Button mode="outlined" onPress={handlePickImage} style={styles.addImageBtn}>
                  + Add Image
                </Button>
              </View>

              <LocationPicker
                onLocationSelect={(lat, lng) => {
                  setNewLatitude(lat);
                  setNewLongitude(lng);
                }}
                initialLatitude={newLatitude}
                initialLongitude={newLongitude}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    closeModal();
                    setNewTitle('');
                    setNewContent('');
                    setNewType('');
                    setNewCategory('');
                    setNewImageUri(null);
                    setNewLatitude(null);
                    setNewLongitude(null);
                  }}
                  style={styles.cancelBtn}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddPost}
                  style={styles.submitBtn}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  // Page title styling - 24px for prominence
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  // Search bar with rounded corners (border-radius: 999 for pill shape)
  searchBarContainer: {
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44, // Standard touch target height
    backgroundColor: '#fff',
  },
  // Filters row - two dropdowns side by side
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  // Date range row
  datesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  // View toggle buttons - centered with gap
  viewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  viewToggleBtn: {
    flex: 1,
  },
  // Posts section - minimum height ensures content doesn't jump
  postsSection: {
    marginTop: 10,
    minHeight: 500, // Prevents layout shift when switching views
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalClose: {
    fontSize: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    backgroundColor: '#fff',
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
});
