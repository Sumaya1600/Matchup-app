import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) return <SplashScreen />;
  return (
    <SafeAreaProvider>
      <AppNavigator user={user} />
    </SafeAreaProvider>
  );
}