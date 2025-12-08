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
  TextInput,
  Switch,
} from 'react-native';
import { Button, Portal, Dialog, IconButton } from 'react-native-paper';
import PostsMapView from '../components/map-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { StarRatingDisplay } from '../components/star-rating';
import { getUserProfile, getUserRatingsReceived } from '../lib/ratings';
import { supabase } from '../lib/supabase';
import AlertsModal from '../components/alerts';
import FloatingActionButton from '../components/floating-action-button';
import { useAddPost } from '../contexts/AddPostContext';
import { createReport } from '../lib/reports';
import RateFinderModal from '../components/rate-finder-modal';
import { createSuccessfulReturn, rateUser } from '../lib/returns';

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
  const { user, signOut } = useAuth();
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
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportAnonymous, setReportAnonymous] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // State for post detail modal
  const [viewPost, setViewPost] = useState<any | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  // User selection dialog for mark as found flow
  const [userSelectionVisible, setUserSelectionVisible] = useState(false);
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedPostForRating, setSelectedPostForRating] = useState<any | null>(null);

  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [finderToRate, setFinderToRate] = useState<any>(null);
  const [returnedPostId, setReturnedPostId] = useState<number | null>(null);

  useEffect(() => {
    if (profileUserId) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [profileUserId]);

  // Calculate image aspect ratio when viewing post
  useEffect(() => {
    if (viewPost?.image_url) {
      Image.getSize(
        viewPost.image_url,
        (w, h) => {
          if (w > 0 && h > 0) setImageAspect(w / h);
        },
        () => setImageAspect(null)
      );
    } else {
      setImageAspect(null);
    }
  }, [viewPost]);

  // Helper function to mark post as found without rating (when no contacts)
  const markPostAsFoundOnly = async (post: any) => {
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
      await loadUserPosts();
      setViewPost(null);
    }
  };

  // Function to handle marking a post as found
  const handleMarkFound = async (post: any) => {
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
    await loadUserPosts();
    setFinderToRate(null);
    setReturnedPostId(null);
  };

  // Handle skip rating
  const handleSkipRating = async () => {
    setRatingModalVisible(false);
    setFinderToRate(null);
    setReturnedPostId(null);
    Alert.alert('Success', 'Item marked as found!');
    await loadUserPosts();
  };

  // Function to unmark a post as found (revert to active)
  const handleUnmark = async (post: any) => {
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

              // Delete any successful_return records for this post
            const { error: deleteError } = await supabase
              .from('successful_returns')
              .delete()
              .eq('post_id', post.id);
            
            if (deleteError) {
              console.error('Error deleting successful return:', deleteError);
            }

            // Also delete any ratings for this post
            const { error: ratingsDeleteError } = await supabase
              .from('ratings')
              .delete()
              .eq('post_id', post.id);

            if (ratingsDeleteError) {
              console.error('Error deleting ratings:', ratingsDeleteError);
            }
            
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
                  is_found: false,
                  description: cleanedDescription
                });
              }
              // Refresh posts
              await loadUserPosts();
            }
          }
        }
      ]
    );
  };

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

  const handleLogout = async () => {
    await signOut();
    navigation.navigate('Login');
  };

  const handleSubmitReport = async () => {
    if (!profileUserId) return;
    if (!reportReason.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for the report.');
      return;
    }
    try {
      setSubmittingReport(true);
      await createReport({
        reportedUserId: profileUserId,
        reporterUserId: reportAnonymous ? null : user?.id ?? undefined,
        reason: reportReason,
        message: reportMessage || undefined,
      });
      setShowReportForm(false);
      setReportReason('');
      setReportMessage('');
      setReportAnonymous(false);
      Alert.alert('Report submitted', 'Thanks for helping keep the community safe.');
    } catch (e: any) {
      Alert.alert('Failed to submit', e?.message || 'Please try again later');
    } finally {
      setSubmittingReport(false);
    }
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
    // Determine status display - check is_found first, then active
    const getStatusInfo = (post: any) => {
      if (post.is_found) {
        return { label: 'found', color: '#4CAF50' };
      }

      // Simplified - only check active boolean (legacy status field removed)
      return {
        label: post.active ? 'active' : 'inactive',
        color: post.active ? '#2196F3' : '#6b7280'
      };
    };

    const statusInfo = getStatusInfo(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.postCard}
        onPress={() => setViewPost(item)}
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
                { backgroundColor: statusInfo.color },
              ]}
            >
              <Text style={styles.statusText}>{statusInfo.label}</Text>
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
    if (isOwnProfile) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="account-plus" size={64} color="#ccc" />
          <Text style={styles.errorText}>You don't have a profile yet</Text>
          <Button mode="contained" onPress={() => navigation.navigate('EditProfile')}>
            Set Up Profile
          </Button>
        </View>
      );
    }

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

        {/* Edit / Notifications / Logout - Only on own profile */}
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

            <Button
              mode="outlined"
              onPress={() => setAlertsVisible(true)}
              style={styles.notificationsButton}
              icon="bell"
            >
              Notifications
            </Button>

            <Button
              mode="text"
              onPress={handleLogout}
              textColor="#ef4444"
              style={{ marginTop: 8 }}
              icon="logout"
            >
              Log Out
            </Button>
          </>
        )}

        {/* Report User - Only when viewing someone else's profile */}
        {!isOwnProfile && (
          <>
            <Button
              mode="outlined"
              onPress={() => setShowReportForm((s) => !s)}
              style={styles.editButton}
              icon="account-alert"
            >
              {showReportForm ? 'Cancel Report' : 'Report User'}
            </Button>
            {showReportForm && (
              <View style={styles.reportContainer}>
                <Text style={styles.reportTitle}>Report this user</Text>
                <Text style={styles.reportLabel}>Reason</Text>
                <TextInput
                  style={styles.reportInput}
                  placeholder="Short reason (required)"
                  value={reportReason}
                  onChangeText={setReportReason}
                />
                <Text style={styles.reportLabel}>Message (optional)</Text>
                <TextInput
                  style={[styles.reportInput, styles.reportTextarea]}
                  placeholder="Add details to help admins review"
                  value={reportMessage}
                  onChangeText={setReportMessage}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.reportRow}>
                  <Text style={styles.reportAnonText}>Submit anonymously</Text>
                  <Switch value={reportAnonymous} onValueChange={setReportAnonymous} />
                </View>
                <Button
                  mode="contained"
                  onPress={handleSubmitReport}
                  loading={submittingReport}
                  disabled={submittingReport}
                >
                  Submit Report
                </Button>
              </View>
            )}
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

      {/* Post Detail Modal */}
      <Portal>
        <Dialog
          visible={!!viewPost}
          onDismiss={() => setViewPost(null)}
          style={{ maxHeight: '85%', backgroundColor: '#fff' }}
        >
          <Dialog.Title style={{ fontSize: 22, fontWeight: '700', backgroundColor: '#fff', color: '#111827' }}>
            {viewPost?.title}
          </Dialog.Title>
          
          <Dialog.ScrollArea style={{ backgroundColor: '#fff' }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, backgroundColor: '#fff' }}>
              {/* Show "Mark as Found" or "Unmark" button for lost posts owned by the user */}
              {viewPost && user?.id === viewPost.user_id && viewPost.type === 'lost' && (
                viewPost.is_found || viewPost.description?.includes('✅ This item has been found!') ? (
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

                  {viewPost.image_url && (
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
                        source={{ uri: viewPost.image_url }}
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
                  {viewPost.is_found || viewPost.description?.includes('✅ This item has been found!') ? (
                    <View>
                      <Text style={styles.detailBody}>
                        {viewPost.description?.replace('\n✅ This item has been found!', '')}
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
                    </View>
                  ) : (
                    <Text style={{ marginTop: 18, fontSize: 14, fontStyle: 'italic', color: '#666' }}>
                      Item not on map
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions style={{ backgroundColor: '#fff' }}>
            {/* Contact button - only when viewing other user's post */}
            {viewPost && viewPost.user_id !== user?.id && (
              <Button
                mode="contained"
                onPress={async () => {
                  if (!viewPost?.user_id) {
                    Alert.alert('Unavailable', 'The poster is not signed in, so direct messaging is unavailable. Use the contact info if provided.');
                    return;
                  }

                  // Close the popup first
                  const postData = viewPost;
                  setViewPost(null);

                  const { data, error } = await supabase.rpc('get_or_create_conversation', {
                    user1_id: user?.id,
                    user2_id: postData.user_id,
                    in_post_id: postData.id,
                  });

                  if (error) {
                    console.error('get_or_create_conversation failed:', error);
                    Alert.alert('Error', error.message);
                    return;
                  }

                  const cid = Array.isArray(data) ? data[0]?.conversation_id : (data as any)?.conversation_id;
                  if (!cid) {
                    Alert.alert('Error', 'Could not create or load the conversation.');
                    return;
                  }

                  navigation.navigate('Chat', {
                    conversationId: cid,
                    otherUserId: postData.user_id!,
                    otherUserEmail: postData.user_email ?? null,
                  });
                }}
              >
                Contact
              </Button>
            )}
            <Button onPress={() => setViewPost(null)}>
              Close
            </Button>
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

  // Report form styles
  reportContainer: {
    width: '100%',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  reportLabel: {
    fontSize: 12,
    color: '#666',
  },
  reportInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reportTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  reportAnonText: {
    fontSize: 14,
    color: '#333',
  },

  // Post detail modal styles
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
  },
  detailBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginTop: 2,
  },
});