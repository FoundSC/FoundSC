// app/components/map-picker-modal.tsx
import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
// IMPORTANT: don't statically import react-native-maps on web
// We'll require it only on native platforms to avoid bundling internals on web
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}
import * as Location from 'expo-location';
import { Button, Modal, Portal } from 'react-native-paper';

export default function MapPickerModal({ visible, onDismiss, onPick }) {
  const [region, setRegion] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        if (mounted) {
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          });
        }
      } else {
        // fallback to a default region
        setRegion({
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        });
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={{ backgroundColor: '#fff', margin: 16, borderRadius: 12, overflow: 'hidden' }}>
        {Platform.OS === 'web' ? (
          <View style={{ padding: 16 }}>
            <View style={{ marginBottom: 12 }}>
              <Button mode="contained" disabled>
                Map picker is unavailable on Web in Expo Go
              </Button>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button onPress={onDismiss}>Close</Button>
            </View>
          </View>
        ) : (
          <>
            <View style={{ height: 380 }}>
              {region && MapView && (
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={region}
                  onRegionChangeComplete={setRegion}
                  showsUserLocation
                >
                  {Marker ? (
                    <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
                  ) : null}
                </MapView>
              )}
            </View>
            <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button onPress={onDismiss}>Cancel</Button>
              <Button mode="contained" onPress={() => onPick({ lat: region?.latitude, lng: region?.longitude })}>Use this location</Button>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}