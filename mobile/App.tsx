import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import LoginScreen from './src/services/screens/LoginScreen';
import SignUpScreen from './src/services/screens/SignUpScreen';
import PostScreen from './src/services/screens/PostScreen';
import MapScreen from './src/services/screens/MapScreen';
import Profile from './src/services/screens/Profile';
import MyProfile from './src/services/screens/MyProfile';
import EditProfile from './src/services/screens/EditProfile';
import ShopProfile from './src/services/screens/ShopProfile';
import CreatePost from './src/services/screens/CreatePost';
import UserProfile from './src/services/screens/UserProfile';
import RegisterShop from './src/services/screens/RegisterShop';
import DevScreen from './src/services/screens/DevScreen';
import EditShopProfile from './src/services/screens/EditShopProfile';
import ShopDashboard from './src/services/screens/ShopDashboard';
import AdminDashboard from './src/services/screens/AdminDashboard';
import BookmarksScreen from './src/services/screens/BookmarksScreen';
import EditPost from './src/services/screens/EditPost';
import ShopAdmins from './src/services/screens/ShopAdmins';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/* ---------- Bottom Tabs (MainTabs) ---------- */
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Discover"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#8B9D70',
          height: 85,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          position: 'absolute',
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#1D3021',
        tabBarLabelStyle: { fontWeight: 'bold', fontSize: 10 },
      }}
    >
      <Tab.Screen
        name="Posts"
        component={PostScreen}
        options={{ tabBarLabel: 'Post', tabBarIcon: () => <Text style={{ fontSize: 22 }}>⊞</Text> }}
      />
      <Tab.Screen
        name="Discover"
        component={MapScreen}
        options={{ tabBarLabel: 'Discover', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🧭</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text style={{ fontSize: 22 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

/* ---------- Root App ---------- */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignUpScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ShopProfile" component={ShopProfile} />

        <Stack.Screen
          name="MyProfile"
          component={MyProfile}
          options={{
            headerShown: true,
            title: 'My Account',
            headerStyle: { backgroundColor: '#7F9460' },
            headerTintColor: '#fff'
          }}
        />

        <Stack.Screen
          name="EditProfile"
          component={EditProfile}
          options={{ headerShown: false }}
        />

        {/* 2. UNCOMMENT AND USE THE CORRECT COMPONENT NAME */}
        <Stack.Screen
          name="CreatePost"
          component={CreatePost}
          options={{
            headerShown: false, // Or true if you want a back button header
            presentation: 'modal' // This makes it slide up from the bottom like Facebook/Instagram
          }}
        />
        <Stack.Screen name="UserProfile" component={UserProfile} />
        <Stack.Screen name="RegisterShop" component={RegisterShop} options={{ presentation: 'modal' }} />
        <Stack.Screen name="DevScreen" component={DevScreen} />
        <Stack.Screen name="EditShopProfile" component={EditShopProfile} options={{ headerShown: false }} />
        <Stack.Screen name="ShopDashboard" component={ShopDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="EditPost"
          component={EditPost}
          options={{
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen
          name="ShopAdminsManagement"
          component={ShopAdmins}
          options={{ headerShown: false }}
        />

      </Stack.Navigator>


    </NavigationContainer>
  );
}