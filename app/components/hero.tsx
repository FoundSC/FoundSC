import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/Ionicons'; 


export function Hero() {
  return (
    <View style={styles.container}>
      {/* Badge */}
      <View style={styles.badge}>
        <View style={styles.pingContainer}>
          <View style={styles.pingOuter} />
          <View style={styles.pingInner} />
        </View>
        <Text style={styles.badgeText}>Now Available</Text>
      </View>

      {/* Heading */}
      <Text style={styles.heading}>
        Discover What's Been <Text style={styles.accent}>Found</Text>
      </Text>

      {/* Subheading */}
      <Text style={styles.subheading}>
        Connect lost items with their owners. A modern platform designed to reunite people with their belongings through community-driven discovery.
      </Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => console.log('Start Searching')}
        >
          Start Searching
          <Icon name="arrow-forward" size={16} style={styles.buttonIcon} />
        </Button>

        <Button
          mode="outlined"
          style={styles.button}
          onPress={() => console.log('Report Found Item')}
        >
          Report Found Item
        </Button>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerText}>Trusted by 10,000+ users</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pingContainer: {
    width: 8,
    height: 8,
    marginRight: 6,
  },
  pingOuter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0ea5a4',
    borderRadius: 4,
    opacity: 0.3,
    // For animation, you can use Animated API
  },
  pingInner: {
    width: 8,
    height: 8,
    backgroundColor: '#0ea5a4',
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#555',
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  accent: {
    color: '#0ea5a4',
  },
  subheading: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  button: {
    marginHorizontal: 8,
  },
  buttonIcon: {
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  footerDivider: {
    width: 32,
    height: 1,
    backgroundColor: '#ccc',
    marginRight: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#555',
  },
});
