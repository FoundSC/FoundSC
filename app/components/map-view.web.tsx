import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button } from 'react-native-paper';

// Mirror the Post shape from the grid component so web map props stay compatible
interface Post {
  id?: string | number;
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  created_at?: string;
}

interface PostsMapViewProps {
  posts: Post[];
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  onRefresh?: () => void;
}

export default function PostsMapView({ posts, onBoundsChange, onRefresh }: PostsMapViewProps) {
  const postsWithCoordinates = posts.filter(
    post => post.latitude !== null && post.longitude !== null
  );

  return (
    <View style={styles.container}>
      <View style={styles.webNotice}>
        <Text style={styles.title}>Map View Not Available on Web</Text>
        <Text style={styles.description}>
          The map view is only available on mobile devices (iOS/Android).
        </Text>
        <Text style={styles.stats}>
          {postsWithCoordinates.length} of {posts.length} posts have location data.
        </Text>
        <Button
          mode="outlined"
          onPress={() => {
            window.open('https://www.google.com/maps', '_blank');
          }}
          icon="map"
          style={styles.button}
        >
          Open Google Maps
        </Button>
        <Text style={styles.hint}>
          To view items on a map, please use the mobile app.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 400,
  },
  webNotice: {
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  stats: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 20,
    fontWeight: '500',
  },
  button: {
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
