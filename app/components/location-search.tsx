import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

interface LocationSearchProps {
  onLocationSelect: (latitude: number, longitude: number, address: string) => void;
  placeholder?: string;
}

export default function LocationSearch({
  onLocationSelect,
  placeholder = 'Search for a location...',
}: LocationSearchProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('Google Places API key is not configured. Search functionality will not work.');
    return null;
  }

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        onPress={(data, details = null) => {
          if (details && details.geometry) {
            const { lat, lng } = details.geometry.location;
            const address = data.description;
            onLocationSelect(lat, lng, address);
          }
        }}
        query={{
          key: apiKey,
          language: 'en',
          components: 'country:us', // Restrict to US, adjust as needed
        }}
        fetchDetails={true}
        enablePoweredByContainer={false}
        styles={{
          container: styles.autocompleteContainer,
          textInput: styles.textInput,
          listView: styles.listView,
          row: styles.row,
          description: styles.description,
        }}
        nearbyPlacesAPI="GooglePlacesSearch"
        debounce={300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  autocompleteContainer: {
    flex: 0,
  },
  textInput: {
    height: 44,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  listView: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  row: {
    padding: 12,
    backgroundColor: 'white',
  },
  description: {
    fontSize: 14,
    color: '#333',
  },
});
