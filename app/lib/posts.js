// lib/posts.js
// Post management functions using imageLoader

import { supabase } from './supabase';
import { uploadImage, validateImageFile } from './imageLoader';

/**
 * Create a new post with optional image
 * @param {Object} postData - Post data
 * @param {string} postData.title - Post title (required)
 * @param {string} postData.description - Post description
 * @param {string} postData.type - 'lost' or 'found' (required)
 * @param {string} postData.category - Category (required)
 * @param {string} postData.location - Location
 * @param {string} postData.contact_info - Contact information
 * @param {File|Blob} imageFile - Optional image file to upload
 * @returns {Promise<{post: Object|null, error: Error|null}>}
 */
export async function createPost(postData, imageFile = null) {
  try {
    let imageUrl = null;

    // If image is provided, validate and upload it
    if (imageFile) {
      // Validate the image file
      const validation = validateImageFile(imageFile);
      if (!validation.valid) {
        return {
          post: null,
          error: new Error(`Image validation failed: ${validation.error}`)
        };
      }

      // Upload the image
      const { url, error: uploadError } = await uploadImage(imageFile);

      if (uploadError) {
        return {
          post: null,
          error: new Error(`Image upload failed: ${uploadError.message}`)
        };
      }

      imageUrl = url;
      console.log('Image uploaded:', imageUrl);
    }

    // Insert post into database
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: postData.title,
        description: postData.description || null,
        type: postData.type,
        category: postData.category,
        image_url: imageUrl,
        location: postData.location || null,
        contact_info: postData.contact_info || null
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);

      // If post creation failed but image was uploaded, we should clean up
      // (optional: implement cleanup logic here if needed)

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
 * Get all posts or filter by criteria
 * @param {Object} filters - Optional filters
 * @param {string} filters.type - Filter by type ('lost' or 'found')
 * @param {string} filters.category - Filter by category
 * @returns {Promise<{posts: Array|null, error: Error|null}>}
 */
export async function getPosts(filters = {}) {
  try {
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
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
 * Get a single post by ID
 * @param {number} postId - Post ID
 * @returns {Promise<{post: Object|null, error: Error|null}>}
 */
export async function getPostById(postId) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Fetch post error:', error);
      return { post: null, error };
    }

    return { post: data, error: null };

  } catch (error) {
    console.error('Get post exception:', error);
    return { post: null, error };
  }
}

/**
 * Update a post
 * @param {number} postId - Post ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{post: Object|null, error: Error|null}>}
 */
export async function updatePost(postId, updates) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      console.error('Update post error:', error);
      return { post: null, error };
    }

    console.log('Post updated successfully:', data);
    return { post: data, error: null };

  } catch (error) {
    console.error('Update post exception:', error);
    return { post: null, error };
  }
}

/**
 * Delete a post
 * @param {number} postId - Post ID
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deletePost(postId) {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Delete post error:', error);
      return { success: false, error };
    }

    console.log('Post deleted successfully');
    return { success: true, error: null };

  } catch (error) {
    console.error('Delete post exception:', error);
    return { success: false, error };
  }
}
