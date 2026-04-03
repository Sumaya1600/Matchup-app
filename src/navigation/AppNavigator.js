import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MatchScreen from '../screens/main/MatchScreen';
import MapScreen from '../screens/main/MapScreen';
import ChatListScreen from '../screens/main/ChatListScreen';
import ChatRoomScreen from '../screens/main/ChatRoomScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import PendingMatchesScreen from '../screens/PendingMatchesScreen';
import { COLORS } from '../constants';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = {
    Match:    { icon: '🎾' },
    Courts:   { icon: '📍' },
    Messages: { icon: '💬' },
    Profile:  { icon: '😊' },
  };

  const icon = icons[name];

  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
        {icon.icon}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarLabel: ({ focused }) => (
          <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
            {route.name}
          </Text>
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.darkCard,
          borderTopColor: COLORS.primary + '20',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
          paddingTop: 10,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Match" component={MatchScreen} />
      <Tab.Screen name="Courts" component={MapScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ user }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={{ headerShown: true }} />
            <Stack.Screen
              name="PendingMatches"
              component={PendingMatchesScreen}
              options={{ headerShown: true, title: 'Match Requests' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: COLORS.primary + '25',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '60',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
    fontSize: 26,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});