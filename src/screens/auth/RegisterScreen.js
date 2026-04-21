import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import * as Location from 'expo-location';
import { auth } from '../../config/firebase';
import { registerUser } from '../../services/api';
import { COLORS, SKILL_LEVELS, AVAILABILITY_SLOTS } from '../../constants';

const GENDERS    = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const USER_TYPES = ['player', 'coach'];

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [age, setAge]                   = useState('');
  const [gender, setGender]             = useState('');
  const [userType, setUserType]         = useState('player');
  const [coachInfo, setCoachInfo]       = useState('');
  const [skill, setSkill]               = useState(SKILL_LEVELS[0]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const toggleSlot = (slot) =>
    setAvailability(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );

  const validate = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.'); return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email.'); return false;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.'); return false;
    }
    if (!age || isNaN(Number(age)) || Number(age) < 13 || Number(age) > 100) {
      Alert.alert('Invalid age', 'Please enter a valid age between 13 and 100.'); return false;
    }
    if (!gender) {
      Alert.alert('Select gender', 'Please select your gender.'); return false;
    }
    if (availability.length === 0) {
      Alert.alert('No availability', 'Please select at least one time slot.'); return false;
    }
    return true;
  };

  const register = async () => {
    if (!validate()) return;
    setLoading(true);

    let firebaseCred = null;

    try {
      let lat = 51.5074, lng = -0.1278;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {
        // Location failed — use London fallback
      }

      firebaseCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await registerUser({
        firebase_uid: firebaseCred.user.uid,
        name:         name.trim(),
        email:        email.trim().toLowerCase(),
        sport:        'Tennis',
        skill_level:  skill,
        latitude:     lat,
        longitude:    lng,
        radius_km:    10,
        availability,
        age:          parseInt(age),
        gender,
        user_type:    userType,
        coach_info:   userType === 'coach' ? coachInfo.trim() || null : null,
      });

      console.log(`Registration complete: ${name.trim()} (${email.trim()})`);

    } catch (e) {
      if (firebaseCred?.user) {
        try {
          await deleteUser(firebaseCred.user);
          console.log('Rolled back Firebase account');
        } catch (rollbackError) {
          console.warn('Could not rollback Firebase account:', rollbackError.message);
        }
      }

      let msg = 'Something went wrong. Please try again.';
      if (e.code === 'auth/email-already-in-use') msg = 'This email is already registered. Try signing in instead.';
      else if (e.code === 'auth/invalid-email')   msg = 'Please enter a valid email address.';
      else if (e.code === 'auth/weak-password')   msg = 'Please choose a stronger password.';
      else if (e.response?.status === 404)        msg = 'Cannot reach the server. Make sure ngrok and the backend are running.';
      else if (e.response?.status === 500)        msg = 'Server error. Check your backend terminal for details.';
      else if (!e.response && e.message?.includes('Network')) msg = 'Network error. Check ngrok is running.';

      Alert.alert('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create account</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <View>
              <Text style={styles.brand}>
                Match<Text style={styles.brandAccent}>UP</Text>
              </Text>
              <Text style={styles.tagline}>Join the community</Text>
            </View>
          </View>

          <View style={styles.card}>

            {/* Account type */}
            <Text style={styles.label}>I am a</Text>
            <View style={styles.chipRow}>
              {USER_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, userType === t && styles.chipActive]}
                  onPress={() => setUserType(t)}
                >
                  <Text style={[styles.chipText, userType === t && styles.chipTextActive]}>
                    {t === 'coach' ? 'Coach' : 'Player'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
            />

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Age */}
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Your age"
              placeholderTextColor={COLORS.muted}
              keyboardType="numeric"
              maxLength={3}
            />

            {/* Gender */}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, gender === g && styles.chipActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Coach bio */}
            {userType === 'coach' && (
              <>
                <Text style={styles.label}>Bio / qualifications</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={coachInfo}
                  onChangeText={setCoachInfo}
                  placeholder="e.g. LTA Level 3, 10 years experience, SW London"
                  placeholderTextColor={COLORS.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}

            {/* Skill level — no emojis */}
            <Text style={styles.label}>Skill level</Text>
            <View style={styles.chipRow}>
              {SKILL_LEVELS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, skill === s && styles.chipActive]}
                  onPress={() => setSkill(s)}
                >
                  <Text style={[styles.chipText, skill === s && styles.chipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Availability */}
            <Text style={styles.label}>
              Availability{'  '}
              <Text style={styles.labelSub}>({availability.length} selected)</Text>
            </Text>
            <View style={styles.chipRow}>
              {AVAILABILITY_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.chip, availability.includes(slot) && styles.chipActive]}
                  onPress={() => toggleSlot(slot)}
                >
                  <Text style={[styles.chipText, availability.includes(slot) && styles.chipTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={register}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.dark} />
                : <Text style={styles.submitText}>Create account</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signinRow}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.signinText}>
                Already have an account?{'  '}
                <Text style={styles.signinLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.secondary },
  headerBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.darkCard, borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30' },
  backBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary + '40' },
  backArrow:         { fontSize: 20, color: COLORS.primary, fontWeight: '700' },
  headerTitle:       { fontSize: 17, fontWeight: '800', color: COLORS.textLight },
  scroll:            { padding: 20, paddingBottom: 50 },
  brandRow:          { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  logoBox:           { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoText:          { fontSize: 24, fontWeight: '900', color: COLORS.dark },
  brand:             { fontSize: 24, fontWeight: '900', color: COLORS.textLight, letterSpacing: 1 },
  brandAccent:       { color: COLORS.primary },
  tagline:           { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  card:              { backgroundColor: COLORS.darkCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.primary + '30' },
  label:             { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 8, marginTop: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  labelSub:          { fontSize: 11, color: COLORS.muted, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input:             { backgroundColor: COLORS.secondary, borderWidth: 1, borderColor: COLORS.primary + '35', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textLight },
  textArea:          { minHeight: 80, textAlignVertical: 'top' },
  passwordWrapper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, borderWidth: 1, borderColor: COLORS.primary + '35', borderRadius: 12, paddingHorizontal: 14 },
  passwordInput:     { flex: 1, fontSize: 15, color: COLORS.textLight, paddingVertical: 12 },
  eyeBtn:            { paddingLeft: 10, paddingVertical: 12 },
  eyeText:           { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:              { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary + '35', backgroundColor: COLORS.secondary },
  chipActive:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:          { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  chipTextActive:    { color: COLORS.dark, fontWeight: '800' },
  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText:        { color: COLORS.dark, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  signinRow:         { marginTop: 18, alignItems: 'center' },
  signinText:        { fontSize: 14, color: COLORS.muted },
  signinLink:        { color: COLORS.primary, fontWeight: '700' },
});