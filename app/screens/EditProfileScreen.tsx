import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../lib/ratings';
import { supabase } from '../lib/supabase';

/**
 * EditProfileScreen Component
 *
 * Allows users to update their profile information:
 * - Display name (shown to other users)
 * - Profile picture (uploaded to Supabase Storage)
 *
 * Features:
 * - Image picker for profile photo selection from gallery or camera
 * - Image upload to Supabase Storage bucket
 * - Form validation (name length, required fields)
 * - Loading states for better UX
 * - Auto-saves on successful update
 *
 * Navigation:
 * - Goes back to Profile screen after successful save
 * - Cancel button returns without saving
 */
export default function EditProfileScreen({ navigation }: any) {
  const { user } = useAuth();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState('');
  const [originalProfilePicture, setOriginalProfilePicture] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  /**
   * Load current profile data from database
   * Populates form fields with existing values
   */
  const loadProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await getUserProfile(user.id);

    if (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      setLoading(false);
      return;
    }

    if (data) {
      setDisplayName(data.display_name || '');
      setProfilePictureUri(data.profile_picture || '');
      setOriginalProfilePicture(data.profile_picture || '');
    }

    setLoading(false);
  };

  /**
   * Open image picker to select profile picture
   *
   * Options:
   * - mediaTypes: Only allow images (no videos)
   * - allowsEditing: Enable crop/resize UI before selection
   * - aspect: 1:1 square ratio for circular profile pictures
   * - quality: 0.8 balances file size vs image quality
   *   (0.8 = 80% quality, reduces upload time while maintaining clarity)
   */
  const handlePickImage = async () => {
    // Request permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photos to change your profile picture.'
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile pictures
      quality: 0.8, // 80% quality - good balance between size and clarity
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePictureUri(result.assets[0].uri);
    }
  };

  /**
   * Upload image to Supabase Storage
   *
   * Process:
   * 1. Convert image URI to blob/file
   * 2. Generate unique filename using user ID and timestamp
   * 3. Upload to 'avatars' bucket in Supabase Storage
   * 4. Get public URL for uploaded image
   *
   * @param uri - Local file URI from image picker
   * @returns Public URL of uploaded image, or null on error
   */
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);

      // Read file as base64 using legacy FileSystem API
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Create unique filename: userId_timestamp.jpg
      const fileExt = 'jpg';
      const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Upload Failed', uploadError.message);
        return null;
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Validate and save profile changes
   *
   * Validation rules:
   * - Display name: 2-50 characters (reasonable name length)
   * - At least one field must be changed
   *
   * Process:
   * 1. Validate display name length
   * 2. Upload new profile picture if changed
   * 3. Update user_profiles table
   * 4. Navigate back to profile on success
   */
  const handleSave = async () => {
    // Validate display name length
    // 2 characters minimum prevents single-letter names
    // 50 characters maximum prevents display issues
    if (displayName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Display name must be at least 2 characters');
      return;
    }

    if (displayName.trim().length > 50) {
      Alert.alert('Invalid Name', 'Display name must be less than 50 characters');
      return;
    }

    setSaving(true);

    try {
      // Prepare updates object
      const updates: any = {
        display_name: displayName.trim(),
      };

      // Handle profile picture upload if changed
      if (profilePictureUri !== originalProfilePicture) {
        if (profilePictureUri) {
          // New image selected - upload it
          const uploadedUrl = await uploadImage(profilePictureUri);
          if (uploadedUrl) {
            updates.profile_picture = uploadedUrl;
          } else {
            // Upload failed, abort save
            setSaving(false);
            return;
          }
        } else {
          // Image removed - set to null
          updates.profile_picture = null;
        }
      }

      // Update profile in database
      const { error } = await updateUserProfile(user!.id, updates);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile');
        setSaving(false);
        return;
      }

      // Success - show confirmation and go back
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Remove profile picture
   * Sets to empty string, which will display default avatar icon
   */
  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setProfilePictureUri(''),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6d28d9" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Picture Section */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>

          {/* Image Preview */}
          <View style={styles.imagePreview}>
            {profilePictureUri ? (
              <Image source={{ uri: profilePictureUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={60} color="#999" />
              </View>
            )}

            {/* Upload indicator overlay */}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </View>

          {/* Image Action Buttons */}
          <View style={styles.imageButtons}>
            <Button
              mode="outlined"
              onPress={handlePickImage}
              disabled={uploading}
              style={styles.imageButton}
              icon="camera"
            >
              Change Photo
            </Button>

            {profilePictureUri && (
              <Button
                mode="text"
                onPress={handleRemoveImage}
                disabled={uploading}
                textColor="#f44336"
              >
                Remove
              </Button>
            )}
          </View>
        </View>

        {/* Display Name Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Display Name</Text>
          <Text style={styles.sectionHint}>
            This is how other users will see you
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your display name"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50} // Enforce max length at input level
            autoCapitalize="words" // Capitalize first letter of each word
          />

          {/* Character counter - shows remaining characters */}
          <Text style={styles.charCounter}>
            {displayName.length}/50 characters
          </Text>
        </View>

        {/* Info Section - Guidelines for users */}
        <View style={styles.infoSection}>
          <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Profile Tips</Text>
            <Text style={styles.infoText}>
              • Use a clear photo so others can recognize you{'\n'}
              • Choose a display name that's easy to remember{'\n'}
              • Your user ID cannot be changed
            </Text>
          </View>
        </View>

        {/* Save/Cancel Buttons */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={saving || uploading}
            style={styles.cancelButton}
          >
            Cancel
          </Button>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving || uploading}
            style={styles.saveButton}
            buttonColor="#6d28d9"
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24, // Consistent padding throughout app
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  // Image section styling
  imageSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start', // Align title to left
  },
  imagePreview: {
    position: 'relative', // For absolute positioned overlay
    marginBottom: 16,
  },
  // 120x120 avatar - same size as ProfileScreen for consistency
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Semi-transparent overlay during upload
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 50% black overlay
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtons: {
    alignItems: 'center',
  },
  imageButton: {
    marginBottom: 8,
    borderRadius: 8,
  },

  // Form section styling
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right', // Align to right for cleaner look
  },

  // Info section - helpful tips for users
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd', // Light blue background for info
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2', // Darker blue for text
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 20, // Increased line height for better readability
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
  },
});
