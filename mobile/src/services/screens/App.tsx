import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import PostScreen from './PostScreen';
import MapScreen from './MapScreen';
import Profile from './Profile';
import MyProfile from './MyProfile';
import EditProfile from './EditProfile';
import ShopProfile from './ShopProfile';
import CreatePost from './CreatePost';
import EditPost from './EditPost';
// 1. IMPORT THE NEW SCREEN
import UserProfile from './UserProfile';
import RegisterShop from './RegisterShop';
import BookmarksScreen from './BookmarksScreen';
import ShopAdmins from './ShopAdmins';
import ShopDashboard from './ShopDashboard';
import EditShopProfile from './EditShopProfile';

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

        {/* 2. REGISTER THE USERPROFILE SCREEN */}
        <Stack.Screen name="UserProfile" component={UserProfile} />

        <Stack.Screen
          name="MyProfile"
          component={MyProfile}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="EditProfile"
          component={EditProfile}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CreatePost"
          component={CreatePost}
          options={{
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen
          name="EditPost"
          component={EditPost}
          options={{
            headerShown: false,
            presentation: 'modal'
          }}
        />

        <Stack.Screen
          name="Bookmarks"
          component={BookmarksScreen}
          options={{
            headerShown: false,
            presentation: 'card'
          }}
        />
        {/* ADDED: RegisterShop Screen Registration */}
        <Stack.Screen
          name="RegisterShop"
          component={RegisterShop}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ShopDashboard"
          component={ShopDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditShopProfile"
          component={EditShopProfile}
          options={{ headerShown: false }}
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