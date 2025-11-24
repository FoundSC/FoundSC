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

// Main tabs for authenticated users
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
        {user ? (
          <>
            {/* Main tabs (Home + My Posts) */}
            <Stack.Screen name="Main" component={MainTabs} />

            {/*
              Profile and Rating Screens
              These are added as stack screens so they can be navigated to from anywhere.
              headerShown is set per screen for back navigation.
            */}
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profile',
                // Purple header to match app theme (#6d28d9 used in buttons)
                headerStyle: { backgroundColor: '#6d28d9' },
                headerTintColor: '#fff',
              }}
            />
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
        ) : (
          <>
            {/* Auth screens for non-authenticated users */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

            {/*
              Guest mode: Allow unauthenticated users to access main app
              This enables the "Continue as Guest" flow from login/signup screens
            */}
            <Stack.Screen name="App" component={MainApp} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}