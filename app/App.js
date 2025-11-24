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
  Alert,
} from 'react-native';

import { Provider as PaperProvider, Button, Menu } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

import { createClient } from '@supabase/supabase-js';
import Header from './components/header';
import CTA from './components/cta';
import { AddPostButton } from './components/add-post-button';
import PostsGrid from './components/posts-grid';
import { Features } from './components/features';
import { Hero } from './components/hero';
import PostsMapView from './components/map-view';
import LocationPicker from './components/location-picker';
// Removed native Picker in favor of react-native-paper Menu
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates';
// Notifications: Expo APIs to request permission and get Expo push token
import * as Notifications from 'expo-notifications';
// Constants: used to read EAS projectId required by getExpoPushTokenAsync
import Constants from 'expo-constants';
// App-side helpers for registering device token and managing match rules
import { registerDevicePushToken } from './lib/notifications';
import AlertsModal from './components/alerts';
import { setLostPostMatchRules } from './lib/notifications';
registerTranslation('en', en);

// Supabase client
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext'; // Add this import at the top

// Configure how notifications are displayed while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const { user } = useAuth(); // ✅ Add this at the top of component
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  // Holds the Expo push token for this device/session (set after permission)
  const [pushToken, setPushToken] = useState(null);
  const [alertsVisible, setAlertsVisible] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newImageUri, setNewImageUri] = useState(null);
  const [newLatitude, setNewLatitude] = useState(null);
  const [newLongitude, setNewLongitude] = useState(null);

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

  const CATEGORIES = [
    'Electronics',
    'Pets',
    'Accessories',
    'Clothing',
    'Other',
  ];

  const fetchPosts = async (filters = {}) => {
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.type && filters.type !== 'All') {
      query = query.eq('type', String(filters.type).toLowerCase());
    }
    if (filters.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      // Search title, description, and category
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`
      );
    }
    // Date range on created_at
    if (filters.startDate) {
      const s = new Date(filters.startDate + 'T00:00:00Z').toISOString();
      query = query.gte('created_at', s);
    }
    if (filters.endDate) {
      // include entire end day by setting to 23:59:59Z
      const e = new Date(filters.endDate + 'T23:59:59Z').toISOString();
      query = query.lte('created_at', e);
    }

    // Bounding box filter for map viewport queries
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
      console.error('Error fetching posts:', error);
    } else {
      console.log('Fetched posts:', data);
      setPosts(data);
    }
  };

  async function pickImage() {
    // On web, the picker doesn't require permissions in the same way
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access media library was denied');
        return;
      }
    }
    try {
      console.log('[pickImage] opening image library');
      const result = await ImagePicker.launchImageLibraryAsync({
        // Use Options enum for broader compatibility on iOS
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled) {
        console.log('[pickImage] selection canceled');
        return;
      }
      if (result.assets?.length) {
        console.log('[pickImage] selected', result.assets[0].uri);
        setNewImageUri(result.assets[0].uri);
      } else {
        console.log('[pickImage] no assets returned');
      }
    } catch (e) {
      console.error('[pickImage] error:', e?.message || e);
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

      const res = await fetch(uri);
      if (!res.ok) {
        console.error('[upload] fetch failed', res.status);
        return null;
      }
      const ab = await res.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const contentType = guessMimeFromUri(uri);
      console.log('[upload] buffer built', { bytes: bytes.byteLength, contentType });

      const maxAttempts = 3;
      let lastError = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { error } = await supabase.storage
          .from('post-images')
          .upload(fileName, bytes, {
            cacheControl: '3600',
            upsert: false,
            contentType,
          });
        if (!error) {
          lastError = null;
          break;
        }
        lastError = error;
        const status = (error && (error.statusCode || error.status)) || 'n/a';
        console.warn(
          `[upload] attempt ${attempt}/${maxAttempts} failed:`,
          typeof error === 'string' ? error : (error.message || JSON.stringify(error)),
          'status:',
          status
        );
        const retryable = String(error?.message || '').includes('Internal Server Error') || (status >= 500 && status < 600);
        if (attempt < maxAttempts && retryable) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          continue;
        }
        break;
      }
      if (lastError) {
        console.error('[upload] supabase upload error via blob:', lastError?.message || lastError);
        return null;
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

  function extractKeywords(text) {
    const stop = new Set(['the','and','for','with','that','this','you','your','from','near','lost','found','item','items','a','an','of','to','in','on','at','is','it']);
    return String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((w) => w && w.length >= 3 && !stop.has(w));
  }

  // Add a new post
  const handleAddPost = async (title, description, type, category, image_url) => {
    // ✅ Changed: use the user from top-level hook
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

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
      latitude: newLatitude,
      longitude: newLongitude,
      user_id: user.id,
      ...(safeType === 'lost' && pushToken ? { creator_device_token: pushToken } : {}),
    };

    const { data, error } = await supabase.from('posts').insert([payload]).select();

    if (error) {
      console.error('Error adding post:', error?.message || error, error?.details || '', error?.hint || '');
      return;
    }
    if (data && data[0]) {
      setPosts((prev) => [data[0], ...prev]);
      setNewImageUri(null);
      // After creating a LOST post, upsert simple keyword/category match rules used by the DB trigger
      if (safeType === 'lost') {
        try {
          const kws = extractKeywords(`${safeTitle} ${safeDescription}`).slice(0, 5);
          await setLostPostMatchRules(data[0].id, { keywords: kws, category: safeCategory || null });
        } catch (e) {
          console.warn('[match] rules upsert failed', e?.message || e);
        }
      }
    }
  };

  // Edit an existing post (optionally updates type, category, image)
  const handleEditPost = async (id, title, description, type, category, imageCandidate) => {
    if (!title || !description) {
      console.error('Title or content is missing');
      return;
    }

    let image_url_to_set = undefined;
    // If an image candidate is provided and looks like a local uri, upload first
    if (imageCandidate && typeof imageCandidate === 'string') {
      const isRemote = imageCandidate.startsWith('http://') || imageCandidate.startsWith('https://');
      if (!isRemote) {
        image_url_to_set = await uploadImageIfNeeded(imageCandidate);
      } else {
        image_url_to_set = imageCandidate;
      }
    }

    const updatePayload = { title, description };
    if (typeof type === 'string' && type.trim()) updatePayload.type = type.toLowerCase().trim();
    if (typeof category === 'string' && category.trim()) updatePayload.category = category.trim();
    if (image_url_to_set) updatePayload.image_url = image_url_to_set;

    const { error } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error editing post:', error);
    } else {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id
            ? { ...post, ...updatePayload }
            : post
        )
      );
      try {
        const existing = posts.find((p) => p.id === id) || {};
        const finalType = (typeof type === 'string' && type.trim()) ? type.toLowerCase().trim() : (existing.type || '');
        if (finalType === 'lost') {
          const finalCategory = (typeof category === 'string' && category.trim()) ? category.trim() : (existing.category || null);
          const kws = extractKeywords(`${title} ${description}`).slice(0, 5);
          await setLostPostMatchRules(id, { keywords: kws, category: finalCategory || null });
        }
      } catch (e) {
        console.warn('[match] rules upsert (edit) failed', e?.message || e);
      }
    }
  };

  // Delete a post
  const handleDeletePost = async (postId) => {
  if (!user) {
    Alert.alert('Error', 'You must be logged in to delete posts');
    return;
  }

  // Check if the user owns the post
  const { data: post } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single();

  if (post && post.user_id !== user.id) {
    Alert.alert('Error', 'You can only delete your own posts');
    return;
  }

  // delete logic
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    Alert.alert('Error', 'Failed to delete post');
  } else {
    // Update UI
    setPosts(posts.filter(post => post.id !== postId));
  }
};

  useEffect(() => {
    fetchPosts();
  }, []);

  // On mount: request notification permissions and register device token
  useEffect(() => {
    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        // EAS projectId is required on EAS-managed projects to get an Expo push token
        const projectId = (Constants?.expoConfig?.extra?.eas?.projectId) || (Constants?.easConfig?.projectId);
        const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        const token = tokenResult?.data;
        if (token) {
          setPushToken(token);
          // Persist the token in the backend for future use (ties to user_id if logged in)
          await registerDevicePushToken(token);
        }
      } catch (e) {
        console.warn('[push] registration failed', e?.message || e);
      }
    })();
  }, []);

  // Debounced search/filtering
  useEffect(() => {
    const t = setTimeout(() => {
      fetchPosts({
        search: searchText,
        category: filterCategory,
        type: filterType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchText, filterCategory, filterType, startDate, endDate]);

  const onConfirmDateRange = ({ startDate: s, endDate: e }) => {
    const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    setStartDate(fmt(s));
    setEndDate(fmt(e));
    setDatePickerOpen(false);
  };

  const onClearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setDatePickerOpen(false);
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header />
          <CTA />
          <Hero />
          <Features />
          {/* Search Bar */}
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

          {/* Filters */}
          <View style={styles.filtersRow}>
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
                <Menu.Item onPress={() => { setFilterCategory('All'); setCategoryMenuVisible(false); }} title="Category: All" />
                <Menu.Item onPress={() => { setFilterCategory('Electronics'); setCategoryMenuVisible(false); }} title="Electronics" />
                <Menu.Item onPress={() => { setFilterCategory('Pets'); setCategoryMenuVisible(false); }} title="Pets" />
                <Menu.Item onPress={() => { setFilterCategory('Accessories'); setCategoryMenuVisible(false); }} title="Accessories" />
                <Menu.Item onPress={() => { setFilterCategory('Clothing'); setCategoryMenuVisible(false); }} title="Clothing" />
                <Menu.Item onPress={() => { setFilterCategory('Other'); setCategoryMenuVisible(false); }} title="Other" />
              </Menu>
            </View>
            <View style={{ width: 8 }} />
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
                    {filterType === 'All' ? 'Type: All' : (filterType === 'lost' ? 'Lost' : 'Found')}
                  </Button>
                }
                contentStyle={{ backgroundColor: '#fff' }}
              >
                <Menu.Item onPress={() => { setFilterType('All'); setTypeMenuVisible(false); }} title="Type: All" />
                <Menu.Item onPress={() => { setFilterType('lost'); setTypeMenuVisible(false); }} title="Lost" />
                <Menu.Item onPress={() => { setFilterType('found'); setTypeMenuVisible(false); }} title="Found" />
              </Menu>
            </View>
          </View>

          {/* Date range selector */}
          <View style={styles.datesRow}>
            <Button
              mode="outlined"
              onPress={() => setDatePickerOpen(true)}
            >
              {startDate && endDate
                ? `${startDate} → ${endDate}`
                : 'Select Date'}
            </Button>
            <View style={{ width: 8 }} />
            {(startDate || endDate) ? (
              <Button mode="text" onPress={onClearDateRange}>Clear</Button>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
            <Button mode="outlined" onPress={() => setAlertsVisible(true)}>Alerts</Button>
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

          <View style={styles.section}>
            <AddPostButton onAddPost={() => setModalVisible(true)} />
          </View>

          {/* View Toggle */}
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

          {/* Posts Display (Grid or Map) */}
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
                onBoundsChange={(bounds) => fetchPosts({ search: searchText, type: filterType, category: filterCategory, startDate, endDate, bounds })}
                onRefresh={() => fetchPosts({ search: searchText, type: filterType, category: filterCategory, startDate, endDate })}
              />
            )}
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

                  {/* Location Picker */}
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
                        setModalVisible(false);
                        setNewTitle('');
                        setNewContent('');
                        setNewType('');
                        setNewCategory('');
                        setNewImageUri(null);
                        setNewLatitude(null);
                        setNewLongitude(null);
                      }}
                      style={styles.cancelBtn}
                      textColor="#5b21b6"
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={async () => {
                        console.log('[submit] adding post');
                        await handleAddPost(newTitle, newContent, newType, newCategory, undefined);
                        setModalVisible(false);
                        setNewTitle('');
                        setNewContent('');
                        setNewType('');
                        setNewCategory('');
                        setNewImageUri(null);
                        setNewLatitude(null);
                        setNewLongitude(null);
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
          <AlertsModal visible={alertsVisible} onDismiss={() => setAlertsVisible(false)} />
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
  searchBarContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: '#fff',
  },
  section: {
    alignItems: 'center',
    marginVertical: 20,
  },
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
  postsSection: {
    marginTop: 10,
    minHeight: 500,
  },
  filtersRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  datesRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    marginLeft: 4,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    // Important for Android dropdown and iOS popover layering
    zIndex: 10,
    elevation: 2,
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