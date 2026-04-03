import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, SafeAreaView
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { COLORS } from '../../constants';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) return Alert.alert('Please fill in all fields');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <View style={styles.topSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🎾</Text>
          </View>
          <Text style={styles.brand}>Match<Text style={styles.brandAccent}>UP</Text></Text>
          <Text style={styles.tagline}>Find · Play · Win</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Your tennis partner is waiting</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder=''
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={login} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.dark} />
              : <Text style={styles.buttonText}>Sign in →</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>
              New here? <Text style={styles.registerLink}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  topSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 8,
  },
  logoEmoji: { fontSize: 36 },
  brand: {
    fontSize: 36, fontWeight: '900',
    color: COLORS.textLight, letterSpacing: 2,
  },
  brandAccent: { color: COLORS.primary },
  tagline: { fontSize: 13, color: COLORS.primary, letterSpacing: 5, marginTop: 4 },
  card: {
    backgroundColor: COLORS.darkCard,
    borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textLight, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.muted, marginBottom: 24 },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.secondary, borderWidth: 1,
    borderColor: COLORS.primary + '40', borderRadius: 12,
    padding: 14, fontSize: 16, color: COLORS.textLight,
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  buttonText: { color: COLORS.dark, fontSize: 16, fontWeight: '800' },
  registerBtn: { marginTop: 20, alignItems: 'center' },
  registerText: { fontSize: 14, color: COLORS.muted },
  registerLink: { color: COLORS.primary, fontWeight: '700' },
});