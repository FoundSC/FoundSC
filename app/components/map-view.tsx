import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Button } from 'react-native-paper';

interface Post {
  id: number;
  title: string;
  description: string;
  type: 'lost' | 'found';
  category: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  created_at: string;
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

// Default location (Santa Cruz, CA)
const DEFAULT_REGION: Region = {
  latitude: 36.9741,
  longitude: -122.0308,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function PostsMapView({ posts, onBoundsChange, onRefresh }: PostsMapViewProps) {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        Alert.alert(
          'Location Permission',
          'Location access was denied. Using default location (Santa Cruz, CA). You can still view and add items manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Using default location.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);

    if (onBoundsChange) {
      const bounds = {
        north: newRegion.latitude + newRegion.latitudeDelta / 2,
        south: newRegion.latitude - newRegion.latitudeDelta / 2,
        east: newRegion.longitude + newRegion.longitudeDelta / 2,
        west: newRegion.longitude - newRegion.longitudeDelta / 2,
      };
      onBoundsChange(bounds);
    }
  }, [onBoundsChange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  };

  const getMarkerColor = (type: string) => {
    return type === 'lost' ? '#FF6B6B' : '#51CF66';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  // Filter posts that have valid coordinates
  const postsWithCoordinates = posts.filter(
    post => post.latitude !== null && post.longitude !== null
  );

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={region}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          showsScale
          loadingEnabled
          loadingIndicatorColor="#6200ee"
          loadingBackgroundColor="#f5f5f5"
        >
          {postsWithCoordinates.map((post) => (
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
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    minHeight: 500,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 500,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: 500,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
