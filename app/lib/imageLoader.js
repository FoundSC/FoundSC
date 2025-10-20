// lib/imageLoader.js
// Utility functions for uploading and managing images in Supabase Storage

import { supabase } from './supabase';

/**
 * Upload an image to Supabase Storage
 * @param {File|Blob} imageFile - The image file to upload
 * @param {string} fileName - Optional custom filename (will auto-generate if not provided)
 * @returns {Promise<{url: string|null, error: Error|null}>} - Public URL of uploaded image or error
 */
export async function uploadImage(imageFile, fileName = null) {
  try {
    // Generate unique filename if not provided
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileExt = imageFile.name?.split('.').pop() || 'jpg';
    const finalFileName = fileName || `${timestamp}_${randomString}.${fileExt}`;

    // Construct the file path (must be in uploads/ folder per policy)
    const filePath = `uploads/${finalFileName}`;

    console.log('Uploading image to:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false // Set to true if you want to overwrite existing files
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error };
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    console.log('Image uploaded successfully:', publicUrl);

    return { url: publicUrl, error: null };

  } catch (error) {
    console.error('Upload exception:', error);
    return { url: null, error };
  }
}

/**
 * Delete an image from Supabase Storage
 * @param {string} imageUrl - The full public URL of the image
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteImage(imageUrl) {
  try {
    // Extract the file path from the URL
    // Example URL: http://127.0.0.1:8000/storage/v1/object/public/post-images/uploads/image.jpg
    // We need: uploads/image.jpg
    const urlParts = imageUrl.split('post-images/');
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL format');
    }

    const filePath = urlParts[1];

    console.log('Deleting image:', filePath);

    const { error } = await supabase.storage
      .from('post-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error };
    }

    console.log('Image deleted successfully');
    return { success: true, error: null };

  } catch (error) {
    console.error('Delete exception:', error);
    return { success: false, error };
  }
}

/**
 * Create a post with an image
 * @param {Object} postData - Post data (title, description, type, category, location, contact_info)
 * @param {File|Blob} imageFile - Optional image file to upload
 * @returns {Promise<{post: Object|null, error: Error|null}>}
 */
export async function createPostWithImage(postData, imageFile = null) {
  try {
    let imageUrl = null;

    // Upload image if provided
    if (imageFile) {
      const { url, error: uploadError } = await uploadImage(imageFile);

      if (uploadError) {
        console.error('Failed to upload image:', uploadError);
        return { post: null, error: uploadError };
      }

      imageUrl = url;
    }

    // Create post with image URL
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: postData.title,
        description: postData.description,
        type: postData.type,
        category: postData.category,
        image_url: imageUrl,
        location: postData.location,
        contact_info: postData.contact_info
      })
      .select()
      .single();

    if (error) {
      console.error('Post creation error:', error);

      // If post creation failed but image was uploaded, clean up the image
      if (imageUrl) {
        await deleteImage(imageUrl);
      }

      return { post: null, error };
    }

    console.log('Post created successfully:', data);
    return { post: data, error: null };

  } catch (error) {
    console.error('Create post exception:', error);
    return { post: null, error };
  }
}

/**
 * Update a post's image
 * @param {number} postId - The ID of the post to update
 * @param {File|Blob} newImageFile - The new image file
 * @param {string} oldImageUrl - Optional: URL of old image to delete
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
export async function updatePostImage(postId, newImageFile, oldImageUrl = null) {
  try {
    // Upload new image
    const { url: newImageUrl, error: uploadError } = await uploadImage(newImageFile);

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Update post with new image URL
    const { error: updateError } = await supabase
      .from('posts')
      .update({ image_url: newImageUrl })
      .eq('id', postId);

    if (updateError) {
      console.error('Post update error:', updateError);
      // Clean up newly uploaded image since update failed
      await deleteImage(newImageUrl);
      return { url: null, error: updateError };
    }

    // Delete old image if provided
    if (oldImageUrl) {
      await deleteImage(oldImageUrl);
    }

    return { url: newImageUrl, error: null };

  } catch (error) {
    console.error('Update post image exception:', error);
    return { url: null, error };
  }
}

/**
 * Get all posts with their images
 * @param {Object} filters - Optional filters (type, category)
 * @returns {Promise<{posts: Array|null, error: Error|null}>}
 */
export async function getPostsWithImages(filters = {}) {
  try {
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch posts error:', error);
      return { posts: null, error };
    }

    return { posts: data, error: null };

  } catch (error) {
    console.error('Get posts exception:', error);
    return { posts: null, error };
  }
}

/**
 * Validate image file before upload
 * @param {File|Blob} file - The file to validate
 * @param {number} maxSizeMB - Maximum file size in MB (default: 5MB)
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export function validateImageFile(file, maxSizeMB = 5) {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed' };
  }

  return { valid: true, error: null };
}
