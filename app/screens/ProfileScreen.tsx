import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { StarRatingDisplay } from '../components/star-rating';
import { getUserProfile, getUserRatingsReceived } from '../lib/ratings';
import { supabase } from '../lib/supabase';
import AlertsModal from '../components/alerts';
import FloatingActionButton from '../components/floating-action-button';
import { useAddPost } from '../contexts/AddPostContext';

/**
 * ProfileScreen Component
 *
 * Displays a user's complete profile including:
 * - Profile picture, display name, and user ID (for sharing with others)
 * - Average rating and total rating count
 * - Number of successful exchanges completed
 * - User's posts (both active and completed)
 * - Recent ratings received from other users
 *
 * This screen supports viewing both:
 * 1. Your own profile (with edit button)
 * 2. Other users' profiles (read-only)
 *
 * @param route - Navigation route params, expects { userId?: string }
 *                If userId is provided, shows that user's profile
 *                If userId is omitted, shows current user's profile
 * @param navigation - React Navigation object for screen transitions
 */
export default function ProfileScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { openModal } = useAddPost();
  // Get userId from route params, or default to current user's ID
  const profileUserId = route?.params?.userId || user?.id;
  const isOwnProfile = profileUserId === user?.id;

  // Profile data state
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'ratings'>('posts');
  const [alertsVisible, setAlertsVisible] = useState(false);

  useEffect(() => {
    if (profileUserId) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [profileUserId]);

  /**
   * Load all profile data (profile info, posts, ratings)
   * Called on mount and when profileUserId changes
   */
  const loadProfileData = async () => {
    setLoading(true);
    await Promise.all([
      loadProfile(),
      loadUserPosts(),
      loadUserRatings(),
    ]);
    setLoading(false);
  };

  /**
   * Load user profile data from user_profiles table
   * Includes: display_name, profile_picture, rating_avg, rating_count, successful_exchanges
   */
  const loadProfile = async () => {
    const { data, error } = await getUserProfile(profileUserId);
    if (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      return;
    }
    setProfile(data);
  };

  /**
   * Load posts created by this user
   * Orders by creation date (newest first)
   * Limits to 20 most recent posts for performance
   */
  const loadUserPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error loading posts:', error);
      return;
    }
    setPosts(data || []);
  };

  /**
   * Load ratings received by this user
   * Includes rater profile and related exchange/post info
   * Limits to 10 most recent for performance
   */
  const loadUserRatings = async () => {
    const { data, error } = await getUserRatingsReceived(profileUserId, 10);
    if (error) {
      console.error('Error loading ratings:', error);
      return;
    }
    setRatings(data || []);
  };

  /**
   * Refresh handler for pull-to-refresh
   * Sets refreshing state for visual feedback
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  /**
   * Copy user ID to clipboard for sharing
   * Displays success message to user
   */
  const handleCopyUserId = () => {
    // In React Native, we'd use @react-native-clipboard/clipboard
    // For now, show alert with user ID
    Alert.alert(
      'User ID',
      profileUserId,
      [
        { text: 'OK' }
      ]
    );
  };

  /**
   * Navigate to edit profile screen
   * Only available on own profile
   */
  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  /**
   * Render a single post card
   * Shows image, title, category, status, and creation date
   *
   * @param item - Post object from database
   */
  const renderPostCard = (item: any) => {
    // Status badge colors
    // green = found items returned to owner
    // amber = currently being exchanged
    // blue = still available/active
    const statusColors: Record<string, string> = {
      found: '#4CAF50',
      in_exchange: '#FF9800',
      active: '#2196F3',
    };

    // TODO: Implement PostDetail screen
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.postCard}
        // onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
      >
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.postInfo}>
          <Text style={styles.postTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.postCategory}>{item.category}</Text>
          <View style={styles.postFooter}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[item.status] || '#999' },
              ]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.postDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render a single rating card
   * Shows who rated, their star rating, optional comment, and context
   *
   * @param item - Rating object with rater profile and exchange info
   */
  const renderRatingCard = (item: any) => {
    return (
      <View key={item.id} style={styles.ratingCard}>
        <View style={styles.ratingHeader}>
          <View style={styles.raterInfo}>
            {item.rater?.profile_picture ? (
              <Image
                source={{ uri: item.rater.profile_picture }}
                style={styles.raterAvatar}
              />
            ) : (
              <MaterialCommunityIcons name="account-circle" size={40} color="#ccc" />
            )}
            <View style={styles.raterDetails}>
              <Text style={styles.raterName}>
                {item.rater?.display_name || 'Anonymous'}
              </Text>
              <StarRatingDisplay rating={item.rating} size={14} />
            </View>
          </View>
          <Text style={styles.ratingDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {item.comment && (
          <Text style={styles.ratingComment}>{item.comment}</Text>
        )}

        {item.exchange?.post && (
          <View style={styles.ratingContext}>
            <MaterialCommunityIcons name="package-variant" size={14} color="#666" />
            <Text style={styles.contextText} numberOfLines={1}>
              {item.exchange.post.title}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!profileUserId) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="account-off" size={64} color="#ccc" />
        <Text style={styles.errorText}>Please log in to view your profile</Text>
        <Button mode="contained" onPress={() => navigation.navigate('Login')}>
          Log In
        </Button>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6d28d9" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="account-alert" size={64} color="#ccc" />
        <Text style={styles.errorText}>Profile not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
      {/* Profile Header Section */}
      <View style={styles.header}>
        {/* Profile Picture - 120x120 for clear visibility while not dominating screen */}
        <View style={styles.avatarContainer}>
          {profile.profile_picture ? (
            <Image
              source={{ uri: profile.profile_picture }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={60} color="#999" />
            </View>
          )}
        </View>

        {/* Display Name */}
        <Text style={styles.displayName}>
          {profile.display_name || 'Anonymous User'}
        </Text>

        {/* User ID with Copy Button - Important for others to find this user */}
        <TouchableOpacity
          style={styles.userIdContainer}
          onPress={handleCopyUserId}
        >
          <Text style={styles.userId} numberOfLines={1}>
            ID: {profileUserId}
          </Text>
          <MaterialCommunityIcons name="content-copy" size={16} color="#666" />
        </TouchableOpacity>

        {/* Edit Profile Button - Only shown on own profile */}
        {isOwnProfile && (
          <>
            <Button
              mode="outlined"
              onPress={handleEditProfile}
              style={styles.editButton}
              icon="pencil"
            >
              Edit Profile
            </Button>

            {/* Notifications Button - Opens alerts/notifications modal */}
            <Button
              mode="outlined"
              onPress={() => setAlertsVisible(true)}
              style={styles.notificationsButton}
              icon="bell"
            >
              Notifications
            </Button>
          </>
        )}
      </View>

      {/* Statistics Section */}
      {/* Grid layout with 3 stats: Rating, Total Ratings, Successful Exchanges */}
      <View style={styles.statsSection}>
        {/* Average Rating Stat */}
        <View style={styles.statCard}>
          <StarRatingDisplay
            rating={profile.rating_avg || 0}
            count={profile.rating_count}
            size={16}
          />
          <Text style={styles.statLabel}>Rating</Text>
        </View>

        {/* Rating Count Stat */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.rating_count || 0}</Text>
          <Text style={styles.statLabel}>Ratings</Text>
        </View>

        {/* Successful Exchanges Stat */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.successful_exchanges || 0}</Text>
          <Text style={styles.statLabel}>Exchanges</Text>
        </View>
      </View>

      {/* Tab Navigation - Posts vs Ratings */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text
            style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}
          >
            Posts ({posts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'ratings' && styles.tabActive]}
          onPress={() => setActiveTab('ratings')}
        >
          <Text
            style={[styles.tabText, activeTab === 'ratings' && styles.tabTextActive]}
          >
            Ratings ({ratings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'posts' ? (
          // Posts Tab
          posts.length > 0 ? (
            <View style={styles.postsList}>
              {posts.map(renderPostCard)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="post-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )
        ) : (
          // Ratings Tab
          ratings.length > 0 ? (
            <View style={styles.ratingsList}>
              {ratings.map(renderRatingCard)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="star-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No ratings yet</Text>
            </View>
          )
        )}
      </View>

      {/* Alerts Modal - Shows notifications for matching posts */}
      <AlertsModal
        visible={alertsVisible}
        onDismiss={() => setAlertsVisible(false)}
      />
      </ScrollView>

      {/* Floating Action Button - Fixed position, bottom-right corner */}
      <FloatingActionButton onPress={openModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },

  // Header section - 24px padding for consistent spacing throughout app
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32, // Larger vertical padding for header prominence
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 16, // Space between avatar and name
  },
  // 120x120 avatar size - large enough to see details, not too dominant
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60, // Half of width/height for perfect circle
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
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    maxWidth: '80%', // Prevent very long IDs from stretching too wide
  },
  userId: {
    fontSize: 12,
    color: '#666',
    marginRight: 6,
    fontFamily: 'monospace', // Monospace for UUID readability
  },
  editButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  // Notifications button - matches Edit Profile style, positioned below it
  notificationsButton: {
    marginTop: 8,        // 8px spacing from Edit Profile button above
    borderRadius: 8,
  },

  // Statistics section - 3-column grid layout
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 8, // Small gap between sections
  },
  statCard: {
    flex: 1, // Equal width columns
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  // Tab bar - 2 tabs for Posts and Ratings
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1, // Equal width tabs
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6d28d9', // Purple accent color
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#6d28d9',
  },

  // Tab content area
  tabContent: {
    paddingTop: 8,
  },

  // Posts list styling
  postsList: {
    padding: 8,
  },
  postCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1, // Subtle shadow on Android
    shadowColor: '#000', // Shadow on iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  // 80x80 post thumbnail - small enough for list view, large enough to see details
  postImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
  },
  postInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  postCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize', // e.g., "electronics" -> "Electronics"
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  postDate: {
    fontSize: 11,
    color: '#999',
  },

  // Ratings list styling
  ratingsList: {
    padding: 16,
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  raterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // 40x40 avatar in rating card - smaller than profile header for list context
  raterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  raterDetails: {
    flex: 1,
  },
  raterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  ratingDate: {
    fontSize: 11,
    color: '#999',
  },
  ratingComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Context section - shows which post this rating is about
  ratingContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contextText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },

  // Empty state for no posts/ratings
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});