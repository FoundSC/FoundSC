import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

// Adds a button with a "+" icon and "Add Post" label
export function AddPostButton({ onAddPost }) {
  return (
    <Button
      mode="contained"
      onPress={onAddPost}
      icon="plus"
      style={styles.button}
      labelStyle={styles.label}
      contentStyle={styles.content}
    >
      Add Post
    </Button>
  );
}

// Styles for the AddPostButton component
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#00B3B3', // teal color
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 10,
  },
  content: {
    flexDirection: 'row-reverse', // puts "+" before text
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  label: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 16,
  },
});
