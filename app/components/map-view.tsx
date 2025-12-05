import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Button } from 'react-native-paper';

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
  initialRegion?: Region;
  height?: number;
  interactive?: boolean;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  onRefresh?: () => void;
}

const DEFAULT_REGION: Region = {
  latitude: 36.9741,
  longitude: -122.0308,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function PostsMapView({
  posts,
  initialRegion,
  height = 220,
  interactive = true,
  onBoundsChange,
  onRefresh,
}: PostsMapViewProps) {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasInitializedRegion, setHasInitializedRegion] = useState(false);

  // Determine preferred region: explicit initialRegion > first post coords > default
  const preferredRegion = useMemo<Region>(() => {
    if (initialRegion) return initialRegion;
    const firstWithCoords = posts.find(p => p.latitude && p.longitude);
    if (firstWithCoords) {
      return {
        latitude: firstWithCoords.latitude as number,
        longitude: firstWithCoords.longitude as number,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    return DEFAULT_REGION;
  }, [initialRegion, posts]);

  useEffect(() => {
    if (hasInitializedRegion) return; // Do not override user-controlled panning after first init

    // If we already have an item-based or provided region, use it and skip user location
    const hasItemCoords = posts.some(p => p.latitude && p.longitude);
    if (initialRegion || hasItemCoords) {
      setRegion(preferredRegion);
      setLoading(false);
      setHasInitializedRegion(true);
      return;
    }
    // Fallback: try user location once
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        } else {
          Alert.alert(
            'Location Permission',
            'Location denied. Using default map region.'
          );
          setRegion(preferredRegion);
        }
      } catch {
        setRegion(preferredRegion);
      } finally {
        setLoading(false);
        setHasInitializedRegion(true);
      }
    })();
  }, [preferredRegion, initialRegion, posts, hasInitializedRegion]);

  const handleRegionChangeComplete = useCallback(
    (r: Region) => {
      setRegion(r);
      if (onBoundsChange) {
        const bounds = {
          north: r.latitude + r.latitudeDelta / 2,
          south: r.latitude - r.latitudeDelta / 2,
          east: r.longitude + r.longitudeDelta / 2,
          west: r.longitude - r.longitudeDelta / 2,
        };
        onBoundsChange(bounds);
      }
    },
    [onBoundsChange]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) await onRefresh();
    setRefreshing(false);
  };

  const getMarkerColor = (type: string) => (type === 'lost' ? '#FF6B6B' : '#51CF66');

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { height }]}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  const postsWithCoordinates = posts.filter(p => p.latitude !== null && p.longitude !== null);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={region}   // Center on item or provided region
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={false}        // Do not auto-center on user
        showsMyLocationButton={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        loadingEnabled
        loadingIndicatorColor="#6200ee"
        loadingBackgroundColor="#f5f5f5"
      >
        {postsWithCoordinates.map(post => (
          <Marker
            key={post.id}
            coordinate={{
              latitude: post.latitude!,
              longitude: post.longitude!,
            }}
            title={post.title}
            description={`${post.type.toUpperCase()} - ${post.category}`}
            pinColor={getMarkerColor(post.type)}
          />
        ))}
      </MapView>

      {onRefresh && (
        <View style={styles.refreshButton}>
          <Button
            mode="contained"
            onPress={handleRefresh}
            loading={refreshing}
            disabled={refreshing}
            icon="refresh"
          >
            Refresh Map
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    width: '100%',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
