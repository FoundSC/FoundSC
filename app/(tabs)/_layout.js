import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function TabLayout() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <Tabs screenOptions={{
        tabBarActiveTintColor: '#6d28d9',
        headerShown: false,
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
