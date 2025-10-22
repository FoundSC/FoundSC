import React, { useState } from "react"
import { View, ScrollView } from "react-native"
import Header from "@/components/header" // Ensure these components are compatible with React Native
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import  CTA  from "@/components/cta"
import PostsGrid from "@/components/posts-grid"
import { AddPostButton } from "@/components/add-post-button"

export type Post = {
  id: string
  title: string
  content: string
  createdAt: Date
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])

  const handleAddPost = (title: string, content: string) => {
    const newPost: Post = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date(),
    }
    setPosts([newPost, ...posts])
  }

  const handleEditPost = (id: string, title: string, content: string) => {
    setPosts(posts.map((post) => (post.id === id ? { ...post, title, content } : post)))
  }

  const handleDeletePost = (id: string) => {
    setPosts(posts.filter((post) => post.id !== id))
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <Header />
      <View>
        <Hero />
        <Features />
        <View style={{ padding: 24 }}>
          <View style={{ marginBottom: 12 }}>
            <AddPostButton onAddPost={handleAddPost} />
          </View>
          <PostsGrid {...({ posts, onEditPost: handleEditPost, onDeletePost: handleDeletePost } as any)} />
        </View>
        <CTA />
      </View>
    </ScrollView>
  )
}
