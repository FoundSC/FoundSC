// lib/posts.example.js
// Example usage of the posts.js module

import { createPost, getPosts, getPostById, updatePost, deletePost } from './posts';

// ============================================
// Example 1: Create a post WITH an image
// ============================================
async function example1_CreatePostWithImage(imageFile) {
  const postData = {
    title: 'Lost iPhone 15',
    description: 'Black iPhone 15 Pro lost near McHenry Library around 2pm',
    type: 'lost',
    category: 'electronics',
    location: 'McHenry Library',
    contact_info: 'student@ucsc.edu'
  };

  const { post, error } = await createPost(postData, imageFile);

  if (error) {
    console.error('Failed to create post:', error.message);
    return;
  }

  console.log('Post created with image:', post);
  // Output:
  // {
  //   id: 1,
  //   title: 'Lost iPhone 15',
  //   description: 'Black iPhone 15 Pro...',
  //   type: 'lost',
  //   category: 'electronics',
  //   image_url: 'http://127.0.0.1:8000/storage/v1/object/public/post-images/uploads/123456.jpg',
  //   location: 'McHenry Library',
  //   contact_info: 'student@ucsc.edu',
  //   created_at: '2025-10-18T12:00:00Z',
  //   updated_at: '2025-10-18T12:00:00Z'
  // }
}

// ============================================
// Example 2: Create a post WITHOUT an image
// ============================================
async function example2_CreatePostNoImage() {
  const postData = {
    title: 'Found Keys',
    description: 'Set of keys with blue keychain found at Quarry Plaza',
    type: 'found',
    category: 'keys',
    location: 'Quarry Plaza',
    contact_info: 'finder@ucsc.edu'
  };

  // Don't pass imageFile parameter (or pass null)
  const { post, error } = await createPost(postData);

  if (error) {
    console.error('Failed to create post:', error.message);
    return;
  }

  console.log('Post created without image:', post);
  // image_url will be null
}

// ============================================
// Example 3: Get all posts
// ============================================
async function example3_GetAllPosts() {
  const { posts, error } = await getPosts();

  if (error) {
    console.error('Failed to fetch posts:', error.message);
    return;
  }

  console.log('All posts:', posts);
  console.log(`Total: ${posts.length} posts`);
}

// ============================================
// Example 4: Get filtered posts
// ============================================
async function example4_GetFilteredPosts() {
  // Get only lost items
  const { posts: lostItems } = await getPosts({ type: 'lost' });
  console.log('Lost items:', lostItems);

  // Get only electronics
  const { posts: electronics } = await getPosts({ category: 'electronics' });
  console.log('Electronics:', electronics);

  // Get lost electronics
  const { posts: lostElectronics } = await getPosts({
    type: 'lost',
    category: 'electronics'
  });
  console.log('Lost electronics:', lostElectronics);
}

// ============================================
// Example 5: Get a specific post by ID
// ============================================
async function example5_GetPostById(postId) {
  const { post, error } = await getPostById(postId);

  if (error) {
    console.error('Failed to fetch post:', error.message);
    return;
  }

  console.log('Post details:', post);
}

// ============================================
// Example 6: Update a post
// ============================================
async function example6_UpdatePost(postId) {
  const updates = {
    description: 'Updated description with more details',
    location: 'Updated location'
  };

  const { post, error } = await updatePost(postId, updates);

  if (error) {
    console.error('Failed to update post:', error.message);
    return;
  }

  console.log('Post updated:', post);
}

// ============================================
// Example 7: Delete a post
// ============================================
async function example7_DeletePost(postId) {
  const { success, error } = await deletePost(postId);

  if (error) {
    console.error('Failed to delete post:', error.message);
    return;
  }

  console.log('Post deleted successfully!');
}

// ============================================
// Example 8: Complete workflow
// ============================================
async function example8_CompleteWorkflow(imageFile) {
  // Step 1: Create a post
  const { post, error: createError } = await createPost(
    {
      title: 'Lost Laptop',
      description: 'MacBook Pro 14 inch',
      type: 'lost',
      category: 'electronics',
      location: 'Science Library',
      contact_info: 'owner@ucsc.edu'
    },
    imageFile
  );

  if (createError) {
    console.error('Create failed:', createError.message);
    return;
  }

  console.log('Created post:', post);

  // Step 2: Retrieve the post
  const { post: retrievedPost } = await getPostById(post.id);
  console.log('Retrieved post:', retrievedPost);

  // Step 3: Update the post
  const { post: updatedPost } = await updatePost(post.id, {
    description: 'MacBook Pro 14 inch with stickers'
  });
  console.log('Updated post:', updatedPost);

  // Step 4: Get all posts to see our new post
  const { posts } = await getPosts();
  console.log('All posts:', posts);

  // Step 5: Delete the post (optional)
  // await deletePost(post.id);
}

export {
  example1_CreatePostWithImage,
  example2_CreatePostNoImage,
  example3_GetAllPosts,
  example4_GetFilteredPosts,
  example5_GetPostById,
  example6_UpdatePost,
  example7_DeletePost,
  example8_CompleteWorkflow
};
