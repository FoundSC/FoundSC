// App.tsx
import React, { useState } from 'react'
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  View,
  Modal,
  TextInput,
  Text,
  Pressable,
  ScrollView,
} from 'react-native'
import { PaperProvider, FAB, Button } from 'react-native-paper'
import PostsGrid from './components/posts-grid'

export type Post = {
  id: string
  title: string
  content: string
  createdAt: Date
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const addPost = (title: string, content: string) => {
    if (title.trim() && content.trim()) {
      const newPost: Post = {
        id: Date.now().toString(),
        title,
        content,
        createdAt: new Date(),
      }
      setPosts([newPost, ...posts])
      setNewTitle('')
      setNewContent('')
      setAddModalVisible(false)
    }
  }

  const editPost = (id: string, title: string, content: string) => {
    setPosts(
      posts.map((post) =>
        post.id === id ? { ...post, title, content } : post
      )
    )
  }

  const deletePost = (id: string) => {
    setPosts(posts.filter((post) => post.id !== id))
  }

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FoundSC</Text>
        </View>

        {/* Posts Grid */}
        <PostsGrid posts={posts} onEdit={editPost} onDelete={deletePost} />

        {/* Add Post FAB */}
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setAddModalVisible(true)}
          label="Add Post"
        />

        {/* Add Post Modal */}
        <Modal
          visible={addModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>Create New Post</Text>
                <Text style={styles.modalDescription}>
                  Add a new post to your feed.
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter post title"
                    value={newTitle}
                    onChangeText={setNewTitle}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Content</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Write your post content..."
                    value={newContent}
                    onChangeText={setNewContent}
                    multiline
                    numberOfLines={6}
                  />
                </View>

                <View style={styles.modalActions}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setAddModalVisible(false)
                      setNewTitle('')
                      setNewContent('')
                    }}
                    style={styles.button}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => addPost(newTitle, newContent)}
                    style={styles.button}
                    disabled={!newTitle.trim() || !newContent.trim()}
                  >
                    Add Post
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </PaperProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  button: {
    minWidth: 100,
  },
})