import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  TouchableOpacity,
  Text
} from 'react-native';
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
  center?: { latitude: number; longitude: number } | null;
}

const DEFAULT_REGION: Region = {
  latitude: 36.9741,
  longitude: -122.0308,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function PostsMapView({
  posts,
  onBoundsChange,
  onRefresh,
  center,
}: PostsMapViewProps) {

  console.log("GOOGLE KEY:", process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // SEARCH STATES
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [locked, setLocked] = useState(false); // prevents suggestions from reopening

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView | null>(null);

  // --- AUTOCOMPLETE SEARCH ---
  useEffect(() => {
    if (locked) return;      // prevent reopening after selection

    if (search.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          search
        )}&key=${key}&location=${region.latitude},${region.longitude}&radius=20000`;

        const res = await fetch(url);
        const json = await res.json();

        setSuggestions(json.predictions || []);
      } catch (err) {
        console.error("Places API error:", err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, locked]);

  // --- SELECT A SUGGESTION ---
  const handleSelectSuggestion = async (item) => {
    setLocked(true);      // freeze suggestions
    setSearch(item.description);
    setSuggestions([]);

    try {
      const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&key=${key}`;

      const res = await fetch(url);
      const json = await res.json();
      const loc = json.result.geometry.location;

      mapRef.current?.animateToRegion({
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    } catch (e) {
      console.error("Details fetch failed:", e);
    }
  };

  // --- LOCATION ---
  useEffect(() => {
    getUserLocation();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      center &&
      typeof center.latitude === 'number' &&
      typeof center.longitude === 'number'
    ) {
      setRegion(prev => ({
        ...prev,
        latitude: center.latitude,
        longitude: center.longitude,
      }));
    }
  }, [center]);

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
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChangeComplete = useCallback(
    (newRegion: Region) => {
      setRegion(newRegion);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (onBoundsChange) {
          const bounds = {
            north: newRegion.latitude + newRegion.latitudeDelta / 2,
            south: newRegion.latitude - newRegion.latitudeDelta / 2,
            east: newRegion.longitude + newRegion.longitudeDelta / 2,
            west: newRegion.longitude - newRegion.longitudeDelta / 2,
          };
          onBoundsChange(bounds);
        }
      }, 450);
    },
    [onBoundsChange]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const getMarkerColor = (type: string) =>
    type === 'lost' ? '#FF6B6B' : '#51CF66';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  const postsWithCoordinates = (posts ?? []).filter(
    post => post.latitude !== null && post.longitude !== null
  );

  return (
    <View style={styles.container}>
      {/* --- SEARCH BAR --- */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location"
          value={search}
          onChangeText={(text) => {
            setLocked(false); // allow autocomplete again
            setSearch(text);
          }}
        />

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* --- MAP --- */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
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

      {/* REFRESH BUTTON */}
      <View style={styles.refreshButton}>
        <Button
          mode="contained"
          onPress={handleRefresh}
          loading={refreshing}
          icon="refresh"
        >
          Refresh Map
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrapper: {
    position: "absolute",
    top: 40,
    width: "90%",
    left: "5%",
    zIndex: 999999,
  },

  searchInput: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  suggestions: {
    backgroundColor: "white",
    marginTop: 4,
    borderRadius: 8,
    maxHeight: 200,
    overflow: "scroll",
    zIndex: 999999,
    elevation: 10,
  },

  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  refreshButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
});
