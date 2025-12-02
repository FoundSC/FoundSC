import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AllPostsScreen from '../screens/AllPostsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import RatingScreen from '../screens/RatingScreen';
import MessagesScreen from '../screens/MessagesScreen';
import { View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
        component={AllPostsScreen}
        options={{
          tabBarLabel: 'All Posts',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-grid" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Icon name="message-text" color={color} size={size} />
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

        {/* Main app + Chat - only when authenticated */}
        {user && (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: true, title: 'Chat' }}
            />
          </>
        )}

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