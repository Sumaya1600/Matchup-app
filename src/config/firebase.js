import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBkgfXX-zDF_zGnKga0sfb-jsojYAdhgCg",
  authDomain: "matchup-app-204ff.firebaseapp.com",
  projectId: "matchup-app-204ff",
  storageBucket: "matchup-app-204ff.firebasestorage.app",
  messagingSenderId: "409182189852",
  appId: "1:409182189852:web:d59c95cf5a790a0fc022d9"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);