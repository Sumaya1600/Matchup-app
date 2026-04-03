import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { getProfile, updateProfile } from '../../services/api';
import { COLORS, SKILL_LEVELS, AVAILABILITY_SLOTS } from '../../constants';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [skill, setSkill] = useState('');
  const [availability, setAvailability] = useState([]);
  const [radius, setRadius] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const res = await getProfile(uid);
        const p = res.data;
        setProfile(p);
        setName(p.name || '');
        setSkill(p.skill_level || SKILL_LEVELS[0]);
        setAvailability(p.availability || []);
        setRadius(String(p.radius_km || 10));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleSlot = (slot) => {
    setAvailability(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const save = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      await updateProfile(uid, {
        name, skill_level: skill,
        availability, radius_km: parseInt(radius),
      });
      Alert.alert('Saved ✅', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>My Profile</Text>

        {profile && (
          <View style={styles.scoreCard}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreIcon}>⚡</Text>
              <View>
                <Text style={styles.scoreLabel}>Reliability score</Text>
                <Text style={styles.scoreValue}>
                  {Number(profile.reliability_score).toFixed(1)} / 5.0
                </Text>
              </View>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>
                {profile.total_matches} matches
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor={COLORS.muted}
          placeholder="Your name"
        />

        <Text style={styles.label}>Skill level</Text>
        <View style={styles.chipRow}>
          {SKILL_LEVELS.map(s => (
            <TouchableOpacity key={s}
              style={[styles.chip, skill === s && styles.chipActive]}
              onPress={() => setSkill(s)}>
              <Text style={[styles.chipText, skill === s && styles.chipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Search radius: {radius}km</Text>
        <View style={styles.radiusRow}>
          {['5', '10', '15', '20', '30'].map(r => (
            <TouchableOpacity key={r}
              style={[styles.radiusChip, radius === r && styles.chipActive]}
              onPress={() => setRadius(r)}>
              <Text style={[styles.chipText, radius === r && styles.chipTextActive]}>
                {r}km
              </Text>
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

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color={COLORS.dark} />
            : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => signOut(auth)}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary },
  scrollContent: { padding: 24, paddingTop: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textLight, marginBottom: 20 },
  scoreCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: 16, padding: 16, marginBottom: 24,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreIcon: { fontSize: 32 },
  scoreLabel: { fontSize: 12, color: COLORS.muted },
  scoreValue: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  scoreBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  scoreBadgeText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.darkCard, borderWidth: 1,
    borderColor: COLORS.primary + '40', borderRadius: 12,
    padding: 14, fontSize: 16, color: COLORS.textLight,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radiusRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    backgroundColor: 'transparent',
  },
  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  chipTextActive: { color: COLORS.dark, fontWeight: '800' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: COLORS.dark, fontSize: 16, fontWeight: '800' },
  logoutBtn: {
    borderWidth: 1.5, borderColor: COLORS.danger,
    borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 12, marginBottom: 40,
  },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: '700' },
});