import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

export function Hero() {
  return (
    <View style={styles.section}>
      <View style={styles.content}>
        <Text style={styles.badge}>Community-Driven Discovery</Text>
        <Text style={styles.heading}>Lost something? Found something?</Text>
        <Text style={styles.subheading}>
          Connect with your community to reunite lost items with their owners.
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={() => { /* navigate to report lost */ }}>
            <Text style={styles.primaryText}>Report Lost Item</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => { /* navigate to report found */ }}>
            <Text style={styles.secondaryText}>Report Found Item</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  content: {
    maxWidth: 600,
    alignItems: "center",
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0ea5a4",
    backgroundColor: "#e0f7f7",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 36,
  },
  subheading: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  primary: {
    backgroundColor: "#0ea5a4",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  secondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryText: {
    color: "#111",
    fontWeight: "600",
    fontSize: 14,
  },
});
