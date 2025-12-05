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
  StatusBar,
} from 'react-native';

import { Provider as PaperProvider, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

import Header from './components/header';
import { Hero } from './components/hero';
import PostsMapView from './components/map-view';
import FloatingActionButton from './components/floating-action-button';
import LocationPicker from './components/location-picker';
// Notifications: Expo APIs to request permission and get Expo push token
import * as Notifications from 'expo-notifications';
// Constants: used to read EAS projectId required by getExpoPushTokenAsync
import Constants from 'expo-constants';
// App-side helpers for registering device token and managing match rules
import { registerDevicePushToken } from './lib/notifications';
import AlertsModal from './components/alerts';
import { setLostPostMatchRules } from './lib/notifications';
import { en, registerTranslation } from 'react-native-paper-dates';

// Register date picker translations for English locale
registerTranslation('en', en);

// Supabase client
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext'; // Add this import at the top
import { useAddPost } from './contexts/AddPostContext';

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
  const { modalVisible, openModal, closeModal } = useAddPost();
  const [posts, setPosts] = useState([]);
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

  // Fetch all posts for map view
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      console.log('Fetched posts:', data);
      setPosts(data);
    }
  };

  // Open the system image picker and let the user select a photo for a new post
  async function pickImage() {
    // Request media library permissions on native platforms (web doesn't need this)
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
      // User canceled the picker
      if (result.canceled) {
        console.log('[pickImage] selection canceled');
        return;
      }
      // If at least one asset was returned, store its URI in state
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

  // Infer an appropriate MIME type from a file URI/extension
  function guessMimeFromUri(uri) {
    const lower = (uri || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    // Default to jpeg if we don't recognize the extension
    return 'image/jpeg';
  }

  // Upload the selected image to Supabase Storage and return its public URL
  async function uploadImageIfNeeded(uri) {
    // If no image was selected, skip the upload entirely
    if (!uri) return null;
    try {
      // Build a unique path inside the post-images bucket
      const fileName = `uploads/${Date.now()}_${uri.split('/').pop() || 'image.jpg'}`;
      console.log('[upload] starting', { uri, fileName });

      // Fetch the local URI into an ArrayBuffer so we can upload raw bytes
      const res = await fetch(uri);
      if (!res.ok) {
        console.error('[upload] fetch failed', res.status);
        return null;
      }
      const ab = await res.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const contentType = guessMimeFromUri(uri);
      console.log('[upload] buffer built', { bytes: bytes.byteLength, contentType });

      // Simple retry loop to be resilient to transient 5xx errors from storage
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
        // Only retry for typical server-side failures (5xx, internal error)
        const retryable = String(error?.message || '').includes('Internal Server Error') || (status >= 500 && status < 600);
        if (attempt < maxAttempts && retryable) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          continue;
        }
        break;
      }
      // If we still have an error after retries, give up and return null
      if (lastError) {
        console.error('[upload] supabase upload error via blob:', lastError?.message || lastError);
        return null;
      }

      // Generate a publicly accessible URL for the uploaded image
      const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
      const publicUrl = data?.publicUrl || null;
      console.log('[upload] publicUrl', publicUrl);
      return publicUrl;
    } catch (e) {
      console.error('Upload exception:', e);
      return null;
    }
  }

  // Turn a free-form text description into a list of meaningful keywords
  function extractKeywords(text) {
    // Very small stop-word list to ignore extremely common words
    const stop = new Set(['the','and','for','with','that','this','you','your','from','near','lost','found','item','items','a','an','of','to','in','on','at','is','it']);
    return String(text || '')
      .toLowerCase()
      // Split on non-alphanumeric boundaries
      .split(/[^a-z0-9]+/g)
      // Keep only words with length >= 3 that are not stop words
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

  useEffect(() => {
    fetchPosts();
  }, []);

  // On mount: request notification permissions and register device token
  useEffect(() => {
    (async () => {
      try {
        const { status: existingStatus} = await Notifications.getPermissionsAsync();
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

  return (
    <PaperProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0ea5a4" />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header />
          <Hero />

          {/* Map View - Always Visible */}
          <View style={styles.postsSection}>
            <PostsMapView
              posts={posts}
              onRefresh={() => fetchPosts()}
            />
          </View>
        </ScrollView>

        {/* Floating Action Button - Fixed position, bottom-right corner */}
        <FloatingActionButton onPress={openModal} />

        {/* Add Post Modal */}
        <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={closeModal}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView>
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
                      textColor="#5b21b6"
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={async () => {
                        console.log('[submit] adding post');
                        await handleAddPost(newTitle, newContent, newType, newCategory, undefined);
                        closeModal();
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
    marginTop: 10,
    minHeight: 500,
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