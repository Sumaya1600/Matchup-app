import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { auth } from '../config/firebase';
import { sendMatchRequest } from '../services/api';
import { COLORS } from '../constants';

export default function PlayerCard({ player, onMatch }) {
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]).toUpperCase();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return COLORS.primary;
    if (score >= 55) return COLORS.warning;
    return COLORS.danger;
  };

  const groupAvailability = (slots) => {
    if (!Array.isArray(slots) || slots.length === 0) return [];
    const days = {};
    slots.forEach(slot => {
      const parts = slot.split(' ');
      const day   = parts.slice(0, -1).join(' ');
      const time  = parts[parts.length - 1];
      if (!days[day]) days[day] = [];
      days[day].push(time);
    });
    return Object.entries(days).map(([day, times]) => ({
      day,
      times: times.join(' & '),
    }));
  };

  const handleMatch = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { Alert.alert('Not logged in'); return; }
    setLoading(true);
    try {
      await sendMatchRequest({
        requester_id: uid,
        receiver_id:  player.id,
        sport:        player.sport || 'Tennis',
      });
      Alert.alert('Request sent!', `Match request sent to ${player.name}.`, [{ text: 'Great!' }]);
      onMatch?.();
    } catch (e) {
      if (e.response?.status === 409) {
        Alert.alert('Already sent', 'You already sent a request to this player.');
        onMatch?.();
      } else if (e.response?.status === 404) {
        Alert.alert('Player not found');
        onMatch?.();
      } else {
        Alert.alert('Could not send request', e.response?.data?.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const score      = player.compatibility_score ?? 0;
  const scoreColor = getScoreColor(score);
  const grouped    = groupAvailability(player.availability);
  const visible    = expanded || grouped.length <= 3 ? grouped : grouped.slice(0, 3);

  const distanceMiles  = player.distance_miles;
  const distanceLabel  = distanceMiles !== undefined
    ? distanceMiles < 0.1 ? 'Nearby' : `${distanceMiles} mi`
    : null;

  const isCoach = player.user_type === 'coach';

  return (
    <View style={[styles.card, isCoach && styles.coachCard]}>

      {/* Coach badge */}
      {isCoach && (
        <View style={styles.coachBadge}>
          <Text style={styles.coachBadgeText}>Coach</Text>
        </View>
      )}

      {/* Top row */}
      <View style={styles.topRow}>

        {/* Score badge */}
        <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
          <Text style={[styles.scorePct, { color: scoreColor }]}>%</Text>
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: scoreColor + '50' }]}>
          <Text style={styles.avatarText}>{getInitials(player.name)}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{player.name}</Text>

          {/* Age, gender, distance row — no emojis, no dots */}
          <View style={styles.metaRow}>
            {player.age ? (
              <Text style={styles.metaText}>{player.age} yrs</Text>
            ) : null}
            {player.gender ? (
              <Text style={styles.metaText}>{player.gender}</Text>
            ) : null}
            {distanceLabel ? (
              <Text style={styles.metaText}>{distanceLabel}</Text>
            ) : null}
          </View>

          {/* Skill + sport tags — no emojis */}
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{player.skill_level}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Tennis</Text>
            </View>
          </View>

          <Text style={styles.reliability}>
            {Number(player.reliability_score ?? 5).toFixed(1)} reliability
          </Text>
        </View>

        {/* Match / Enquire button */}
        <TouchableOpacity
          style={[
            styles.matchBtn,
            isCoach && styles.coachBtn,
            loading && styles.matchBtnDisabled,
          ]}
          onPress={handleMatch}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={COLORS.dark} />
            : (
              <>
                <Text style={styles.matchBtnText}>{isCoach ? 'Enquire' : 'Match'}</Text>
                <Text style={styles.matchBtnIcon}>→</Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>

      {/* Coach bio */}
      {isCoach && player.coach_info ? (
        <View style={styles.coachInfoBox}>
          <Text style={styles.coachInfoLabel}>About</Text>
          <Text style={styles.coachInfoText}>{player.coach_info}</Text>
        </View>
      ) : null}

      {/* Availability */}
      {grouped.length > 0 && (
        <View style={styles.availSection}>
          <Text style={styles.availTitle}>Available</Text>
          <View style={styles.availGrid}>
            {visible.map(({ day, times }) => (
              <View key={day} style={styles.availChip}>
                <Text style={styles.availDay}>{day}</Text>
                <Text style={styles.availTime}>{times}</Text>
              </View>
            ))}
          </View>
          {grouped.length > 3 && (
            <TouchableOpacity
              style={styles.showMoreBtn}
              onPress={() => setExpanded(v => !v)}
            >
              <Text style={styles.showMoreText}>
                {expanded ? 'Show less' : `Show all ${grouped.length} days`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  card:         { backgroundColor: COLORS.darkCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.primary + '20', elevation: 3 },
  coachCard:    { borderColor: '#7C3AED' + '40' },
  coachBadge:   { alignSelf: 'flex-start', backgroundColor: '#7C3AED' + '25', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8, borderWidth: 1, borderColor: '#7C3AED' + '50' },
  coachBadgeText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBadge:   { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreNum:     { fontSize: 14, fontWeight: '900', lineHeight: 16 },
  scorePct:     { fontSize: 9, fontWeight: '700' },
  avatar:       { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText:   { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  info:         { flex: 1, gap: 2 },
  name:         { fontSize: 14, fontWeight: '800', color: COLORS.textLight },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  metaText:     { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  tagRow:       { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  tag:          { backgroundColor: COLORS.secondary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary + '25' },
  tagText:      { fontSize: 10, color: COLORS.muted, fontWeight: '600' },
  reliability:  { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  matchBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', gap: 3, minWidth: 70, justifyContent: 'center' },
  coachBtn:     { backgroundColor: '#7C3AED' },
  matchBtnDisabled: { opacity: 0.6 },
  matchBtnText: { color: COLORS.dark, fontWeight: '800', fontSize: 12 },
  matchBtnIcon: { color: COLORS.dark, fontWeight: '900', fontSize: 12 },
  coachInfoBox: { marginTop: 10, padding: 10, backgroundColor: '#7C3AED' + '15', borderRadius: 10, borderWidth: 1, borderColor: '#7C3AED' + '30' },
  coachInfoLabel: { fontSize: 10, color: '#A78BFA', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  coachInfoText:  { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  availSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.primary + '15' },
  availTitle:   { fontSize: 11, color: COLORS.muted, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  availGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  availChip:    { backgroundColor: COLORS.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.primary + '30', alignItems: 'center' },
  availDay:     { fontSize: 11, color: COLORS.textLight, fontWeight: '700' },
  availTime:    { fontSize: 10, color: COLORS.primary, fontWeight: '600', marginTop: 1 },
  showMoreBtn:  { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  showMoreText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
});