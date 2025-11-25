import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MyPostsScreen from '../screens/MyPostsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import RatingScreen from '../screens/RatingScreen';
import MainApp from '../App';
import { View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main tabs for authenticated users
 *
 * Bottom tab navigation with 3 tabs:
 * 1. Home - All posts feed (MainApp component)
 * 2. My Posts - User's own posts (MyPostsScreen)
 * 3. Profile - User profile (ProfileScreen)
 *
 * Tab colors:
 * - Active: #0ea5a4 (teal) for consistency with existing design
 * - Inactive: #666 (gray)
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0ea5a4',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="AllPosts"
        component={MainApp}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MyPosts"
        component={MyPostsScreen}
        options={{
          tabBarLabel: 'My Posts',
          tabBarIcon: ({ color, size }) => (
            <Icon name="file-document-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0ea5a4" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth screens - only shown when NOT logged in */}
        {!user && (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}

        {/*
          Main app screens - available to both authenticated AND guest users
          Bottom tabs are always visible for better UX
        */}
        <Stack.Screen name="Main" component={MainTabs} />

        {/*
          Additional screens with headers (EditProfile, Rating)
          Only accessible when authenticated
        */}
        {user && (
          <>
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                headerShown: true,
                title: 'Edit Profile',
                headerStyle: { backgroundColor: '#6d28d9' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen
              name="Rating"
              component={RatingScreen}
              options={{
                headerShown: true,
                title: 'Rate Exchange',
                headerStyle: { backgroundColor: '#6d28d9' },
                headerTintColor: '#fff',
                // Prevent back navigation during rating (users should complete or cancel)
                headerBackVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}