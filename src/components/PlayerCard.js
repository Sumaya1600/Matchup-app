import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { sendMatchRequest } from '../services/api';
import { COLORS } from '../constants';

const SKILL_COLORS = {
  'Beginner (1.0-2.5)': '#10B981',
  'Intermediate (3.0-3.5)': '#F59E0B',
  'Advanced (4.0-4.5)': '#7C3AED',
  'Professional (5.0+)': '#EF4444',
  'Beginner': '#10B981',
  'Intermediate': '#F59E0B',
  'Advanced': '#7C3AED',
  'Professional': '#EF4444',
};

export default function PlayerCard({ player, onMatch, navigation }) {
  const handleMatch = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await sendMatchRequest({
        requester_id: uid,
        receiver_id: player.id,
        sport: player.sport,
      });
      Alert.alert(
        'Request sent! 🎾',
        `Match request sent to ${player.name}. Wait for them to accept.`
      );
      onMatch?.();
    } catch (e) {
      Alert.alert('Error', 'Could not send request. Try again.');
    }
  };

  const handleMessage = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', uid));
      const snapshot = await getDocs(q);
      let existingChat = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(player.id)) {
          existingChat = { id: doc.id, ...data };
        }
      });

      if (existingChat) {
        navigation?.navigate('ChatRoom', {
          chatId: existingChat.id,
          otherName: player.name,
        });
      } else {
        const newChat = await addDoc(chatsRef, {
          participants: [uid, player.id],
          other_name: player.name,
          last_message: '',
          last_message_time: new Date(),
          created_at: new Date(),
        });
        navigation?.navigate('ChatRoom', {
          chatId: newChat.id,
          otherName: player.name,
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open chat. Try again.');
    }
  };

  const scoreWidth = `${Math.min(player.compatibility_score || 0, 100)}%`;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{player.name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.sport}>🎾 {player.sport}</Text>
        </View>
        <View style={styles.reliabilityBadge}>
          <Text style={styles.reliabilityIcon}>⚡</Text>
          <Text style={styles.reliabilityText}>
            {Number(player.reliability_score || 5).toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        <View style={[styles.skillChip, {
          borderColor: SKILL_COLORS[player.skill_level] || COLORS.primary
        }]}>
          <Text style={[styles.skillText, {
            color: SKILL_COLORS[player.skill_level] || COLORS.primary
          }]}>
            {player.skill_level}
          </Text>
        </View>
        {(player.availability || []).slice(0, 2).map(slot => (
          <View key={slot} style={styles.chip}>
            <Text style={styles.chipText}>{slot}</Text>
          </View>
        ))}
        {(player.availability || []).length > 2 && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              +{player.availability.length - 2} more
            </Text>
          </View>
        )}
      </View>

      {player.compatibility_score !== undefined && (
        <View style={styles.matchBar}>
          <Text style={styles.matchLabel}>Match</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: scoreWidth }]} />
          </View>
          <Text style={styles.matchPct}>
            {Math.round(player.compatibility_score)}%
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
          <Text style={styles.msgBtnText}>💬 Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.matchBtn} onPress={handleMatch}>
          <Text style={styles.matchBtnText}>⚡ Match up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.darkCard,
    borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.primary + '25',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 4,
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: COLORS.dark },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', color: COLORS.textLight },
  sport: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  reliabilityBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 10, padding: 8,
    alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  reliabilityIcon: { fontSize: 14 },
  reliabilityText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  skillChip: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1.5,
  },
  skillText: { fontSize: 12, fontWeight: '700' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, backgroundColor: COLORS.secondary,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  chipText: { fontSize: 12, color: COLORS.muted },
  matchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14, gap: 8,
  },
  matchLabel: { fontSize: 12, color: COLORS.muted, width: 44 },
  barBg: {
    flex: 1, height: 6,
    backgroundColor: COLORS.secondary, borderRadius: 3,
  },
  barFill: {
    height: 6, backgroundColor: COLORS.primary,
    borderRadius: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  matchPct: { fontSize: 13, fontWeight: '800', color: COLORS.primary, width: 36 },
  actions: { flexDirection: 'row', gap: 10 },
  msgBtn: {
    flex: 1, borderWidth: 1.5,
    borderColor: COLORS.primary + '60',
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  msgBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  matchBtn: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 12, padding: 12, alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  matchBtnText: { color: COLORS.dark, fontWeight: '800', fontSize: 14 },
});