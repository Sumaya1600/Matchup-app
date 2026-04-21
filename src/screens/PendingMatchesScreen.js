import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { auth, db } from '../config/firebase';
import {
  collection, addDoc, query, where, getDocs,
} from 'firebase/firestore';
import { getPendingMatches, respondToMatch, getProfile } from '../services/api';
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
        const myUid = auth.currentUser?.uid;

        // Get the requester's Firebase UID
        const requesterProfileRes = await getProfile(String(match.requester_id));
        const requesterFirebaseUid = requesterProfileRes.data?.firebase_uid;

        if (!requesterFirebaseUid) {
          Alert.alert('Error', 'Could not set up chat. Please try again.');
          return;
        }

        // Get both names
        const myProfileRes = await getProfile(myUid);
        const myName = myProfileRes.data?.name || 'Player';

        // Check if a shared chat already exists between both UIDs
        const existingQ = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', myUid)
        );
        const existingSnap = await getDocs(existingQ);
        const existingDoc = existingSnap.docs.find(doc =>
          doc.data().participants?.includes(requesterFirebaseUid)
        );

        let sharedChatId;

        if (existingDoc) {
          
          
          sharedChatId = existingDoc.id;
        } else {
          // Create ONE shared chat document
          // Store both names so each user can look up what to display
          const chatRef = await addDoc(collection(db, 'chats'), {
            participants:      [myUid, requesterFirebaseUid],
            // Map of uid -> display name for the OTHER person
            names: {
              [myUid]:              match.requester_name, // I see requester's name
              [requesterFirebaseUid]: myName,             // requester sees my name
            },
            // Keep other_name for backward compat — will be overridden per-user in ChatListScreen
            other_name:        match.requester_name,
            last_message:      'Match accepted! 🎾',
            last_message_time: new Date(),
          });
          sharedChatId = chatRef.id;
        }

        Alert.alert(
          'Match accepted! 🎾',
          `You are now matched with ${match.requester_name}. Start chatting!`,
          [
            {
              text: 'Message them',
              onPress: () => navigation.navigate('ChatRoom', {
                chatId:    sharedChatId,
                otherName: match.requester_name,
              }),
            },
            { text: 'Later', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Declined', 'Match request declined.');
      }
    } catch (e) {
      console.error('Respond error:', e);
      Alert.alert('Error', 'Could not respond. Try again.');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return COLORS.primary;
    if (score >= 55) return COLORS.warning;
    return COLORS.danger;
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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Match Requests</Text>
          <Text style={styles.subtitle}>{matches.length} pending</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={matches}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const score = Number(item.compatibility_score ?? 0);
          const scoreColor = getScoreColor(score);
          return (
            <View style={styles.card}>
              <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
                <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
                <Text style={[styles.scorePct, { color: scoreColor }]}>%</Text>
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.requester_name || 'P')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.requester_name}</Text>
                <Text style={styles.meta}>🎾 {item.sport}</Text>
                <Text style={styles.meta}> {item.skill_level}</Text>
              </View>
              <View style={styles.btns}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => respond(item, 'accepted')}
                >
                  <Text style={styles.acceptText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => respond(item, 'declined')}
                >
                  <Text style={styles.declineText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}></Text>
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
  safe:   { flex: 1, backgroundColor: COLORS.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.darkCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  backArrow: { fontSize: 20, color: COLORS.primary, fontWeight: '700' },
  title:    { fontSize: 20, fontWeight: '900', color: COLORS.textLight },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.darkCard, borderRadius: 14, padding: 14,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    gap: 10, borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  scoreBadge: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 14, fontWeight: '900', lineHeight: 16 },
  scorePct: { fontSize: 9, fontWeight: '700' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 18, fontWeight: '900', color: COLORS.dark },
  info:        { flex: 1 },
  name:        { fontSize: 15, fontWeight: '800', color: COLORS.textLight, marginBottom: 2 },
  meta:        { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  btns:        { flexDirection: 'column', gap: 6 },
  acceptBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptText:  { color: COLORS.dark, fontSize: 18, fontWeight: '900' },
  declineBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#3D1515',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.danger,
  },
  declineText:  { color: COLORS.danger, fontSize: 18, fontWeight: '900' },
  empty:        { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyIcon:    { fontSize: 48, marginBottom: 16 },
  emptyText:    { fontSize: 20, fontWeight: '800', color: COLORS.textLight, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
});