import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PostsGrid from '../components/posts-grid';
import PostsMapView from '../components/map-view';

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

  const CATEGORIES = [
    'Electronics',
    'Pets',
    'Accessories',
    'Clothing',
    'Other',
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

  /**
   * Edit a post (title, description, type, category, image)
   * Only the post owner can edit their posts
   */
  const handleEditPost = async (
    id: string | number,
    title: string,
    description: string,
    type?: string,
    category?: string,
    imageCandidate?: string
  ) => {
    if (!title || !description) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }

    const updatePayload: any = { title, description };
    if (type && typeof type === 'string') {
      updatePayload.type = type.toLowerCase().trim();
    }
    if (category && typeof category === 'string') {
      updatePayload.category = category.trim();
    }

    const { error } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error editing post:', error);
      Alert.alert('Error', 'Failed to update post');
    } else {
      // Update local state
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, ...updatePayload } : post
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
   * Clear date range filter
   */
  const onClearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setDatePickerOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Page Title */}
        <Text style={styles.pageTitle}>All Posts</Text>

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
});
