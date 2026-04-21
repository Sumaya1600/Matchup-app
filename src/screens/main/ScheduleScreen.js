import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../config/firebase';
import { scheduleMatch, rateMatch, getProfile } from '../../services/api';
import { COLORS, API_URL } from '../../constants';
import axios from 'axios';

const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

// Parse availability slots like "Monday AM" or "Saturday PM"
// Returns array of day strings the person is available
function getAvailableDays(availability) {
  if (!Array.isArray(availability)) return [];
  const days = new Set();
  availability.forEach(slot => {
    const parts = slot.split(' ');
    const day = parts.slice(0, -1).join(' ');
    if (day) days.add(day);
  });
  return Array.from(days);
}

// Get AM/PM slots for a specific day
function getTimesForDay(availability, day) {
  if (!Array.isArray(availability)) return { AM: false, PM: false };
  const slots = availability.filter(s => s.startsWith(day));
  return {
    AM: slots.some(s => s.endsWith('AM')),
    PM: slots.some(s => s.endsWith('PM')),
  };
}

// Filter times based on AM/PM availability
function getAvailableTimes(availability, day) {
  const { AM, PM } = getTimesForDay(availability, day);
  return TIMES.filter(t => {
    const hour = parseInt(t.split(':')[0]);
    if (AM && hour >= 6  && hour < 13) return true;
    if (PM && hour >= 13 && hour < 22) return true;
    return false;
  });
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [matches, setMatches]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [scheduling, setScheduling]     = useState(null);
  const [ratingMatch, setRatingMatch]   = useState(null);
  const [selectedDay, setSelectedDay]   = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [otherAvailability, setOtherAvailability] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const load = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const api = axios.create({
        baseURL: API_URL,
        timeout: 10000,
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const token = await auth.currentUser.getIdToken();
      const res = await api.get(`/matches/accepted/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // When opening schedule modal, load the other person's availability
  const openSchedule = async (item) => {
    setSelectedDay(null);
    setSelectedTime(null);
    setOtherAvailability([]);
    setScheduling(item);
    setLoadingAvail(true);
    try {
      // other_user_id is the postgres integer id of the other person
      const res = await getProfile(String(item.other_user_id));
      setOtherAvailability(res.data?.availability || []);
    } catch (e) {
      console.warn('Could not load other availability:', e.message);
      setOtherAvailability([]);
    } finally {
      setLoadingAvail(false);
    }
  };

  const confirmSchedule = async () => {
    if (!selectedDay || !selectedTime || !scheduling) return;
    const scheduledTime = `${selectedDay} at ${selectedTime}`;
    try {
      await scheduleMatch(scheduling.id, { scheduled_time: scheduledTime, court_name: '' });
      setMatches(prev => prev.map(m =>
        m.id === scheduling.id ? { ...m, scheduled_time: scheduledTime } : m
      ));
      Alert.alert('Scheduled!', `Match set for ${scheduledTime}`);
      setScheduling(null);
      setSelectedDay(null);
      setSelectedTime(null);
    } catch (e) {
      Alert.alert('Error', 'Could not schedule. Try again.');
    }
  };

  const submitRating = async () => {
    if (!selectedRating || !ratingMatch) return;
    const uid = auth.currentUser?.uid;
    const ratedId = ratingMatch.requester_id === uid
      ? ratingMatch.receiver_id
      : ratingMatch.requester_id;
    try {
      await rateMatch(ratingMatch.id, ratedId, selectedRating);
      Alert.alert(
        'Rating submitted',
        `You gave ${selectedRating} stars. This updates their reliability score.`
      );
      setRatingMatch(null);
      setSelectedRating(0);
      // Remove from list — match is now completed
      setMatches(prev => prev.filter(m => m.id !== ratingMatch.id));
    } catch (e) {
      Alert.alert('Error', 'Could not submit rating. Try again.');
    }
  };

  const availableDays = getAvailableDays(otherAvailability);
  const availableTimes = selectedDay
    ? getAvailableTimes(otherAvailability, selectedDay)
    : [];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>

      {/* Schedule Modal */}
      <Modal
        visible={!!scheduling}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduling(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schedule Match</Text>
            <Text style={styles.modalSubtitle}>
              Pick a day and time that works for {scheduling?.other_name}
            </Text>

            {loadingAvail ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <>
                {availableDays.length === 0 ? (
                  <Text style={styles.noAvailText}>
                    {scheduling?.other_name} hasn't set their availability yet.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.pickLabel}>
                      Available days for {scheduling?.other_name}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 16 }}
                    >
                      <View style={styles.chipRow}>
                        {availableDays.map(day => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.chip, selectedDay === day && styles.chipActive]}
                            onPress={() => {
                              setSelectedDay(day);
                              setSelectedTime(null);
                            }}
                          >
                            <Text style={[styles.chipText, selectedDay === day && styles.chipTextActive]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {selectedDay && (
                      <>
                        <Text style={styles.pickLabel}>Available times</Text>
                        {availableTimes.length === 0 ? (
                          <Text style={styles.noAvailText}>No specific times available for this day.</Text>
                        ) : (
                          <View style={styles.chipRow}>
                            {availableTimes.map(time => (
                              <TouchableOpacity
                                key={time}
                                style={[styles.chip, selectedTime === time && styles.chipActive]}
                                onPress={() => setSelectedTime(time)}
                              >
                                <Text style={[styles.chipText, selectedTime === time && styles.chipTextActive]}>
                                  {time}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setScheduling(null);
                  setSelectedDay(null);
                  setSelectedTime(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmit,
                  (!selectedDay || !selectedTime) && styles.modalSubmitDisabled,
                ]}
                onPress={confirmSchedule}
                disabled={!selectedDay || !selectedTime}
              >
                <Text style={styles.modalSubmitText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={!!ratingMatch}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate your match</Text>
            <Text style={styles.modalSubtitle}>
              How was your game with {ratingMatch?.other_name}?
              This updates their reliability score.
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Text style={[styles.star, selectedRating >= star && styles.starActive]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {selectedRating === 0 && 'Tap a star to rate'}
              {selectedRating === 1 && '1 — Poor'}
              {selectedRating === 2 && '2 — Below average'}
              {selectedRating === 3 && '3 — Average'}
              {selectedRating === 4 && '4 — Good'}
              {selectedRating === 5 && '5 — Excellent'}
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setRatingMatch(null); setSelectedRating(0); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, !selectedRating && styles.modalSubmitDisabled]}
                onPress={submitRating}
                disabled={!selectedRating}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Matches</Text>
        <Text style={styles.subtitle}>{matches.length} accepted</Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.other_name || 'P')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.other_name}</Text>
                <Text style={styles.meta}>
                  Tennis  •  {item.skill_level}
                </Text>
                {item.scheduled_time ? (
                  <Text style={styles.scheduled}>Scheduled: {item.scheduled_time}</Text>
                ) : (
                  <Text style={styles.notScheduled}>Not yet scheduled</Text>
                )}
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.scheduleBtn}
                onPress={() => openSchedule(item)}
              >
                <Text style={styles.scheduleBtnText}>
                  {item.scheduled_time ? 'Reschedule' : 'Schedule'}
                </Text>
              </TouchableOpacity>

              {item.scheduled_time && (
                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={() => { setRatingMatch(item); setSelectedRating(0); }}
                >
                  <Text style={styles.rateBtnText}>Rate match</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎾</Text>
            <Text style={styles.emptyText}>No accepted matches yet</Text>
            <Text style={styles.emptySubtext}>
              Accept a match request to schedule a game
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.secondary },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary },
  header:       { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.darkCard, borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30' },
  title:        { fontSize: 24, fontWeight: '900', color: COLORS.textLight },
  subtitle:     { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  list:         { padding: 16, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.darkCard, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.primary + '25' },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar:       { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 18, fontWeight: '900', color: COLORS.dark },
  info:         { flex: 1 },
  name:         { fontSize: 15, fontWeight: '800', color: COLORS.textLight, marginBottom: 2 },
  meta:         { fontSize: 12, color: COLORS.muted },
  scheduled:    { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 3 },
  notScheduled: { fontSize: 12, color: COLORS.warning, marginTop: 3 },
  cardActions:  { flexDirection: 'row', gap: 10 },
  scheduleBtn:  { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, padding: 10, alignItems: 'center' },
  scheduleBtnText: { color: COLORS.dark, fontWeight: '800', fontSize: 13 },
  rateBtn:      { flex: 1, borderWidth: 1.5, borderColor: COLORS.warning, borderRadius: 10, padding: 10, alignItems: 'center' },
  rateBtnText:  { color: COLORS.warning, fontWeight: '700', fontSize: 13 },
  empty:        { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyIcon:    { fontSize: 48, marginBottom: 16 },
  emptyText:    { fontSize: 20, fontWeight: '800', color: COLORS.textLight, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard:         { backgroundColor: COLORS.darkCard, borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: COLORS.primary + '40', maxHeight: '80%' },
  modalTitle:        { fontSize: 20, fontWeight: '900', color: COLORS.textLight, marginBottom: 6 },
  modalSubtitle:     { fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 18 },
  pickLabel:         { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  noAvailText:       { fontSize: 13, color: COLORS.muted, marginBottom: 16, fontStyle: 'italic' },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:              { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.primary + '40', backgroundColor: COLORS.secondary },
  chipActive:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:          { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  chipTextActive:    { color: COLORS.dark, fontWeight: '800' },
  starsRow:          { flexDirection: 'row', gap: 8, marginBottom: 12, justifyContent: 'center' },
  star:              { fontSize: 40, color: COLORS.muted },
  starActive:        { color: COLORS.warning },
  ratingLabel:       { fontSize: 14, color: COLORS.muted, marginBottom: 24, fontWeight: '600', textAlign: 'center' },
  modalBtns:         { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel:       { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.muted, alignItems: 'center' },
  modalCancelText:   { color: COLORS.muted, fontWeight: '700' },
  modalSubmit:       { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSubmitDisabled: { opacity: 0.4 },
  modalSubmitText:   { color: COLORS.dark, fontWeight: '900' },
});