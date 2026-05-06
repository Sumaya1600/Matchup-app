import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import LoginScreen          from '../screens/auth/LoginScreen';
import RegisterScreen       from '../screens/auth/RegisterScreen';
import MatchScreen          from '../screens/main/MatchScreen';
import MapScreen            from '../screens/main/MapScreen';
import ChatListScreen       from '../screens/main/ChatListScreen';
import ChatRoomScreen       from '../screens/main/ChatRoomScreen';
import ProfileScreen        from '../screens/main/ProfileScreen';
import PendingMatchesScreen from '../screens/PendingMatchesScreen';
import ScheduleScreen       from '../screens/main/ScheduleScreen';
import { COLORS }           from '../constants';
import { auth, db }         from '../config/firebase';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function TabIcon({ name, focused, badgeCount }) {
  const icons = { Match: '🎾', Courts: '📍', Schedule: '🗓️', Messages: '💬', Profile: '😊' };
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icons[name]}</Text>
      {badgeCount > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [uid, setUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Wait for Firebase auth to fully initialize before grabbing uid.
  // This prevents the listener from firing before a valid auth token exists.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !uid) {
      setUnreadCount(0);
      return;
    }

    // Listen to all chats. Sum unread_counts[uid] across every chat.
    // This mirrors the unread_counts map written by ChatRoomScreen on send
    // and then reset to 0 when the chat is opened.
    const chatQ = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', uid)
    );

    const unsubscribe = onSnapshot(chatQ, (snap) => {
      let total = 0;
      snap.docs.forEach(chatDoc => {
        const data = chatDoc.data();
        const unread = data.unread_counts?.[uid] ?? 0;
        total += Number(unread) || 0;
      });
      setUnreadCount(total);
    });

    return () => unsubscribe();
  }, [uid, authReady]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon
            name={route.name}
            focused={focused}
            badgeCount={route.name === 'Messages' ? unreadCount : 0}
          />
        ),
        tabBarLabel: ({ focused }) => (
          <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{route.name}</Text>
        ),
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.darkCard,
          borderTopColor:  COLORS.primary + '20',
          borderTopWidth:  1,
          height:          85,
          paddingBottom:   20,
          paddingTop:      10,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Match"    component={MatchScreen} />
      <Tab.Screen name="Courts"   component={MapScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ user }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={{
                headerShown: true,
                headerStyle:      { backgroundColor: COLORS.darkCard },
                headerTintColor:  COLORS.textLight,
                headerTitleStyle: { fontWeight: '800', color: COLORS.textLight },
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="Pending Matches"
              component={PendingMatchesScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabItem:       { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { backgroundColor: COLORS.primary + '25', borderWidth: 1.5, borderColor: COLORS.primary + '60' },
  tabIcon:       { fontSize: 24, opacity: 0.5 },
  tabIconActive: { opacity: 1, fontSize: 26 },
  tabLabel:      { fontSize: 11, color: COLORS.muted, fontWeight: '600', marginTop: 2 },
  tabLabelActive:{ color: COLORS.primary, fontWeight: '700' },
  tabBadge:      { position: 'absolute', top: 2, right: 2, backgroundColor: COLORS.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.darkCard },
  tabBadgeText:  { color: COLORS.white, fontSize: 9, fontWeight: '900' },
});