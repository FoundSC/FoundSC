import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Platform } from 'react-native';
// IMPORTANT: don't statically import react-native-maps on web
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}
import { Button } from 'react-native-paper';
import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const supabase = createClient(String(supabaseUrl), String(supabaseKey));

interface MapScreenProps {
  onClose: () => void;
}

export default function MapScreen({ onClose }: MapScreenProps) {
  const [region, setRegion] = useState<any | null>(null);
  const [markers, setMarkers] = useState<Array<{ id: number | string; title: string; latitude: number; longitude: number }>>([]);
  const [loading, setLoading] = useState(true);

  const initialRegion = useMemo(
    () => ({ latitude: 37.7749, longitude: -122.4194, latitudeDelta: 0.3, longitudeDelta: 0.3 }),
    []
  );

  const fetchLostItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id,title,location_lat,location_lng')
      .eq('type', 'lost')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMarkers(
        data.map((p: any) => ({
          id: p.id,
          title: p.title || 'Lost item',
          latitude: p.location_lat,
          longitude: p.location_lng,
        }))
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          if (mounted) {
            setRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.2,
              longitudeDelta: 0.2,
            });
          }
        } else {
          setRegion(initialRegion);
        }
      } catch {
        setRegion(initialRegion);
      } finally {
        await fetchLostItems();
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchLostItems, initialRegion]);

  const onRefresh = async () => {
    await fetchLostItems();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {/* Web fallback while using Expo Go web: */}
          <View>
            
          </View>
        </View>
      ) : region && MapView ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton={Platform.OS === 'android'}
          zoomEnabled
          zoomControlEnabled={Platform.OS === 'android'}
          scrollEnabled
          rotateEnabled
          pitchEnabled
        >
          {Marker && markers.map((m) => (
            <Marker
              key={String(m.id)}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.title}
            />
          ))}
        </MapView>
      ) : null}

      <View style={{ position: 'absolute', top: 50, right: 16, gap: 8 }}>
        <Button mode="contained" onPress={onClose}>Close</Button>
        <Button mode="outlined" onPress={onRefresh}>Reload</Button>
      </View>
    </View>
  );
}
