import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import axios from 'axios';
import { API_URL } from './src/constants';

const LAST_SEEN_KEY = 'matchup_last_accepted_check';

export default function App() {
  const [user, setUser]       = useState(undefined);
  const hasChecked = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && !hasChecked.current) {
        hasChecked.current = true;
        checkNewlyAcceptedMatches(firebaseUser);
      }

      if (!firebaseUser) {
        hasChecked.current = false;
      }
    });
    return unsub;
  }, []);

  const checkNewlyAcceptedMatches = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const api = axios.create({ baseURL: API_URL, timeout: 10000 });
      const res = await api.get(`/matches/accepted/${firebaseUser.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const accepted = res.data || [];
      const recent = accepted.filter(m => {
        if (!m.created_at) return false;
        const matchDate = new Date(m.created_at);
        const hoursSince = (Date.now() - matchDate.getTime()) / 1000 / 60 / 60;
        return hoursSince < 2;
      });

      if (recent.length > 0) {
        const names = recent.map(m => m.other_name).filter(Boolean);
        const uniqueNames = [...new Set(names)];

        if (uniqueNames.length === 1) {
          Alert.alert(
            '🎾 Match accepted!',
            `${uniqueNames[0]} accepted your match request! Head to the Schedule tab to plan your game.`,
            [{ text: 'Let\'s go! 🎾', style: 'default' }]
          );
        } else if (uniqueNames.length > 1) {
          Alert.alert(
            '🎾 New matches!',
            `${uniqueNames.slice(0, -1).join(', ')} and ${uniqueNames.slice(-1)} accepted your match requests! Check the Schedule tab.`,
            [{ text: 'Let\'s go! 🎾', style: 'default' }]
          );
        }
      }
    } catch (e) {
      console.log('Notification check failed:', e.message);
    }
  };

  if (user === undefined) return <SplashScreen />;

  return <AppNavigator user={user} />;
}