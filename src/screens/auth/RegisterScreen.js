import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, SafeAreaView
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { auth } from '../../config/firebase';
import { registerUser } from '../../services/api';
import { COLORS, SPORTS, SKILL_LEVELS, AVAILABILITY_SLOTS } from '../../constants';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sport, setSport] = useState(SPORTS[0]);
  const [skill, setSkill] = useState(SKILL_LEVELS[0]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleSlot = (slot) => {
    setAvailability(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const register = async () => {
    if (!name || !email || !password) {
      return Alert.alert('Please fill in all fields');
    }
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 51.5074, lng = -0.1278;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();
      await AsyncStorage.setItem('token', token);

      await registerUser({
        firebase_uid: cred.user.uid,
        name: name.trim(),
        email: email.trim(),
        sport,
        skill_level: skill,
        latitude: lat,
        longitude: lng,
        radius_km: 10,
        availability,
      });
    } catch (e) {
      Alert.alert('Registration failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Create account</Text>

          <TextInput style={styles.input} placeholder="Full name"
            value={name} onChangeText={setName}
            placeholderTextColor={COLORS.muted} />
          <TextInput style={styles.input} placeholder="Email"
            value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none"
            placeholderTextColor={COLORS.muted} />
          <TextInput style={styles.input} placeholder="Password"
            value={password} onChangeText={setPassword}
            secureTextEntry placeholderTextColor={COLORS.muted} />

          <Text style={styles.label}>Sport</Text>
          <View style={styles.chipRow}>
            {SPORTS.map(s => (
              <TouchableOpacity key={s}
                style={[styles.chip, sport === s && styles.chipActive]}
                onPress={() => setSport(s)}>
                <Text style={[styles.chipText, sport === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Skill level</Text>
          <View style={styles.chipRow}>
            {SKILL_LEVELS.map(s => (
              <TouchableOpacity key={s}
                style={[styles.chip, skill === s && styles.chipActive]}
                onPress={() => setSkill(s)}>
                <Text style={[styles.chipText, skill === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Availability</Text>
          <View style={styles.chipRow}>
            {AVAILABILITY_SLOTS.map(slot => (
              <TouchableOpacity key={slot}
                style={[styles.chip, availability.includes(slot) && styles.chipActive]}
                onPress={() => toggleSlot(slot)}>
                <Text style={[styles.chipText, availability.includes(slot) && styles.chipTextActive]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={register} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.buttonText}>Create account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 40 }}>
            <Text style={styles.link}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 24, paddingTop: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 14,
    color: COLORS.text, backgroundColor: '#FAFAFA',
  },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.muted },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  link: { color: COLORS.primary, fontSize: 15, textAlign: 'center' },
});