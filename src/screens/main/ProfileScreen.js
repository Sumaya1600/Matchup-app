import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { getProfile, updateProfile } from '../../services/api';
import { COLORS, SKILL_LEVELS, AVAILABILITY_SLOTS } from '../../constants';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile]           = useState(null);
  const [name, setName]                 = useState('');
  const [age, setAge]                   = useState('');
  const [gender, setGender]             = useState('');
  const [skill, setSkill]               = useState(SKILL_LEVELS[0]);
  const [availability, setAvailability] = useState([]);
  const [radius, setRadius]             = useState('10');
  const [coachInfo, setCoachInfo]       = useState('');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    try {
      setError(null);
      const res = await getProfile(uid);
      const p   = res.data;
      setProfile(p);
      setName(p.name || '');
      setAge(p.age ? String(p.age) : '');
      setGender(p.gender || '');
      setSkill(p.skill_level || SKILL_LEVELS[0]);
      setAvailability(p.availability || []);
      setRadius(String(p.radius_km || 10));
      setCoachInfo(p.coach_info || '');
    } catch (e) {
      setError('Could not load profile. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSlot = (slot) =>
    setAvailability(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );

  const save = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (age && (isNaN(Number(age)) || Number(age) < 13 || Number(age) > 100)) {
      Alert.alert('Invalid age', 'Please enter a valid age (13-100).');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(uid, {
        name,
        skill_level:  skill,
        availability,
        radius_km:    parseInt(radius),
        age:          age ? parseInt(age) : null,
        gender:       gender || null,
        coach_info:   profile?.user_type === 'coach' ? coachInfo : null,
      });
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCoach = profile?.user_type === 'coach';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>{auth.currentUser?.email}</Text>
        </View>
        {isCoach && (
          <View style={styles.coachBadge}>
            <Text style={styles.coachBadgeText}>Coach</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Stats card */}
        {profile && (
          <View style={styles.scoreCard}>
            <View style={styles.scoreLeft}>
              <View style={styles.scoreIconBox}>
                <Text style={styles.scoreStar}>★</Text>
              </View>
              <View>
                <Text style={styles.scoreLabel}>Reliability score</Text>
                <Text style={styles.scoreValue}>
                  {Number(profile.reliability_score).toFixed(1)}
                  <Text style={styles.scoreMax}> / 5.0</Text>
                </Text>
                <Text style={styles.scoreHint}>Updated after each rated match</Text>
              </View>
            </View>
            <View style={styles.matchesBadge}>
              <Text style={styles.matchesNum}>{profile.total_matches}</Text>
              <Text style={styles.matchesLabel}>matches</Text>
            </View>
          </View>
        )}

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* Age */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="Your age"
            placeholderTextColor={COLORS.muted}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gender</Text>
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
        </View>

        {/* Skill level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Skill level</Text>
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
        </View>

        {/* Search radius */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Search radius</Text>
          <View style={styles.chipRow}>
            {['5', '10', '15', '20', '30'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, radius === r && styles.chipActive]}
                onPress={() => setRadius(r)}
              >
                <Text style={[styles.chipText, radius === r && styles.chipTextActive]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Availability
            <Text style={styles.sectionSub}>  ({availability.length} selected)</Text>
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
        </View>

        {/* Coach bio */}
        {isCoach && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Bio / qualifications</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={coachInfo}
              onChangeText={setCoachInfo}
              placeholder="e.g. LTA Level 3, 10 years experience, SW London"
              placeholderTextColor={COLORS.muted}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={COLORS.dark} />
            : <Text style={styles.saveBtnText}>Save changes</Text>
          }
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.secondary },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary, gap: 8 },
  loadingText:    { color: COLORS.muted, fontSize: 14, fontWeight: '600', marginTop: 12 },
  errorText:      { color: COLORS.danger, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText:      { color: COLORS.dark, fontWeight: '800' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.darkCard, borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30' },
  title:          { fontSize: 24, fontWeight: '900', color: COLORS.textLight },
  subtitle:       { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  coachBadge:     { backgroundColor: '#7C3AED' + '25', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#7C3AED' + '50' },
  coachBadgeText: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
  scrollContent:  { padding: 20, paddingBottom: 60 },
  scoreCard:      { backgroundColor: COLORS.darkCard, borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.primary + '40' },
  scoreLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  scoreIconBox:   { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary + '40' },
  scoreStar:      { fontSize: 22, color: COLORS.primary, fontWeight: '900' },
  scoreLabel:     { fontSize: 12, color: COLORS.muted, marginBottom: 2 },
  scoreValue:     { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  scoreMax:       { fontSize: 13, color: COLORS.muted, fontWeight: '400' },
  scoreHint:      { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  matchesBadge:   { backgroundColor: COLORS.secondary, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '30' },
  matchesNum:     { fontSize: 20, fontWeight: '900', color: COLORS.textLight },
  matchesLabel:   { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  section:        { marginBottom: 20 },
  sectionLabel:   { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionSub:     { fontSize: 11, color: COLORS.muted, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input:          { backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.primary + '40', borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.textLight },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary + '40', backgroundColor: COLORS.secondary },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  chipTextActive: { color: COLORS.dark, fontWeight: '800' },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  saveBtnText:    { color: COLORS.dark, fontSize: 16, fontWeight: '900' },
  logoutBtn:      { borderWidth: 1.5, borderColor: COLORS.danger, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 40 },
  logoutText:     { color: COLORS.danger, fontSize: 16, fontWeight: '700' },
});