import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getPendingMatches, respondToMatch } from '../services/api';
import { COLORS } from '../constants';

export default function PendingMatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const res = await getPendingMatches(uid);
      setMatches(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const respond = async (match, response) => {
    try {
      await respondToMatch(match.id, response);
      setMatches(prev => prev.filter(m => m.id !== match.id));

      if (response === 'accepted') {
        const uid = auth.currentUser?.uid;
        const chatRef = await addDoc(collection(db, 'chats'), {
          participants: [uid, match.requester_id],
          other_name: match.requester_name,
          last_message: 'Match accepted! 🎾',
          last_message_time: new Date(),
        });

        Alert.alert(
          'Match accepted! 🎾',
          `You are now matched with ${match.requester_name}. Start chatting!`,
          [
            {
              text: 'Message them',
              onPress: () => navigation.navigate('ChatRoom', {
                chatId: chatRef.id,
                otherName: match.requester_name,
              }),
            },
            { text: 'Later', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Match declined', '');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not respond. Try again.');
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
      <View style={styles.header}>
        <Text style={styles.title}>Match Requests</Text>
        <Text style={styles.subtitle}>{matches.length} pending</Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.requester_name || 'P')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.requester_name}</Text>
              <Text style={styles.meta}>🎾 {item.sport}</Text>
              <Text style={styles.meta}>{item.skill_level}</Text>
              <Text style={styles.score}>
                ⚡ {Number(item.reliability_score).toFixed(1)} reliability
              </Text>
            </View>
            <View style={styles.btns}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => respond(item, 'accepted')}>
                <Text style={styles.acceptText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => respond(item, 'declined')}>
                <Text style={styles.declineText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubtext}>
              When someone sends you a match request it will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary },
  header: {
    padding: 20, paddingTop: 16,
    backgroundColor: COLORS.darkCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30',
  },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.textLight },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  card: {
    backgroundColor: COLORS.darkCard, borderRadius: 14,
    padding: 16, marginBottom: 12, flexDirection: 'row',
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: COLORS.dark },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.textLight },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  score: { fontSize: 13, color: COLORS.primary, marginTop: 2, fontWeight: '700' },
  btns: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { color: COLORS.dark, fontSize: 20, fontWeight: '900' },
  declineBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3D1515',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.danger,
  },
  declineText: { color: COLORS.danger, fontSize: 20, fontWeight: '900' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '800', color: COLORS.textLight, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
});