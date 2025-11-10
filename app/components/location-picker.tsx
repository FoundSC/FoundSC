import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, Platform } from 'react-native';
import { Button, Chip } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE, Region, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';

interface LocationPickerProps {
  onLocationSelect: (latitude: number, longitude: number) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

const DEFAULT_REGION: Region = {
  latitude: 36.9741,
  longitude: -122.0308,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function LocationPicker({
  onLocationSelect,
  initialLatitude,
  initialLongitude,
}: LocationPickerProps) {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);

  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      const coords = {
        latitude: initialLatitude,
        longitude: initialLongitude,
      };
      setMarker(coords);
      setRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setLocationSelected(true);
    }
  }, [initialLatitude, initialLongitude]);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to use your current location. Please grant permission in your device settings.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setMarker(coords);
      setRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setLocationSelected(true);

      onLocationSelect(coords.latitude, coords.longitude);

      Alert.alert('Success', 'Current location set successfully!');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Error',
        'Failed to get your current location. Please try again or tap on the map to set location manually.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    setMarker({ latitude, longitude });
    setLocationSelected(true);
    onLocationSelect(latitude, longitude);
  };

  const handleClearLocation = () => {
    setMarker(null);
    setLocationSelected(false);
    onLocationSelect(null as any, null as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location (Optional)</Text>
      <Text style={styles.hint}>
        Tap on the map or use your current location to mark where the item was lost/found
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={getCurrentLocation}
          loading={loading}
          disabled={loading}
          icon="crosshairs-gps"
          style={styles.button}
        >
          Use Current Location
        </Button>

        {locationSelected && (
          <Button
            mode="outlined"
            onPress={handleClearLocation}
            icon="close"
            style={styles.button}
          >
            Clear Location
          </Button>
        )}
      </View>

      {locationSelected && (
        <Chip icon="map-marker" style={styles.chip}>
          Location selected
        </Chip>
      )}

      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        region={region}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {marker && (
          <Marker
            coordinate={marker}
            pinColor="#6200ee"
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setMarker({ latitude, longitude });
              onLocationSelect(latitude, longitude);
            }}
          />
        )}
      </MapView>

      <Text style={styles.instructions}>
        {marker
          ? 'You can drag the pin to adjust the location'
          : 'Tap anywhere on the map to set the location'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flex: 1,
  },
  chip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  map: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
