import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";

export const metadata = {
  title: "FoundSC - Reunite with Your Lost Items",
  description: "A modern platform to connect lost items with their owners through community-driven discovery.",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SafeAreaView style={styles.container}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Set your desired background color
  },
});
