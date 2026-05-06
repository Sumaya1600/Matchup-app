import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, getDocs,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { getProfile } from '../../services/api';
import { COLORS } from '../../constants';

export default function ChatListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [chats, setChats]             = useState([]);
  const [search, setSearch]           = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading]   = useState(false);
  const uid = auth.currentUser?.uid;

useEffect(() => {
  if (!uid || !auth.currentUser) {
    setChats([]);
    return;
  }
  
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('last_message_time', 'desc')
  );
  
  const unsubscribe = onSnapshot(q, snap => {
    setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  
  return () => unsubscribe();
}, [uid]);

  const getOtherName = (chat) => {
    if (chat.names && uid && chat.names[uid]) return chat.names[uid];
    return chat.other_name || 'Player';
  };

  // Get unread count — messages from other person not yet read
  const getUnreadCount = (chat) => {
    if (!chat.unread_counts) return 0;
    return chat.unread_counts[uid] || 0;
  };

  const totalUnread = chats.reduce((sum, c) => sum + getUnreadCount(c), 0);

  const filtered = chats.filter(c =>
    getOtherName(c).toLowerCase().includes(search.toLowerCase())
  );

  // Mark chat as read — clears unread count for current user
  const markAsRead = async (chatId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`unread_counts.${uid}`]: 0,
      });
    } catch (e) {
      console.warn('Could not mark as read:', e.message);
    }
  };

  // Load the other person's profile to show in modal
  const openProfile = async (chat) => {
    setProfileLoading(true);
    setSelectedProfile({ loading: true, name: getOtherName(chat) });
    try {
      // Get the other participant's firebase uid
      const otherUid = chat.participants?.find(p => p !== uid);
      if (!otherUid) return;
      const res = await getProfile(otherUid);
      setSelectedProfile(res.data);
    } catch (e) {
      setSelectedProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff  = Date.now() - date.getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'now';
    if (mins < 60)  return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const AVATAR_COLORS = ['#C8F000', '#7C3AED', '#EF4444', '#F59E0B', '#10B981'];
  const getAvatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  };

  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[1][0] : name[0];
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Profile modal */}
      <Modal
        visible={!!selectedProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProfile(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {profileLoading || selectedProfile?.loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : selectedProfile ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar */}
                <View style={styles.modalAvatarRow}>
                  <View style={[styles.modalAvatar, { backgroundColor: getAvatarColor(selectedProfile.name) }]}>
                    <Text style={styles.modalAvatarText}>
                      {getInitials(selectedProfile.name).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.modalNameCol}>
                    <Text style={styles.modalName}>{selectedProfile.name}</Text>
                    {selectedProfile.user_type === 'coach' && (
                      <View style={styles.coachBadge}>
                        <Text style={styles.coachBadgeText}>Coach</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Details */}
                <View style={styles.modalDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Skill level</Text>
                    <Text style={styles.detailValue}>
                      {selectedProfile.skill_level}
                    </Text>
                  </View>
                  {selectedProfile.age && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Age</Text>
                      <Text style={styles.detailValue}>{selectedProfile.age}</Text>
                    </View>
                  )}
                  {selectedProfile.gender && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gender</Text>
                      <Text style={styles.detailValue}>{selectedProfile.gender}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reliability</Text>
                    <Text style={styles.detailValue}>
                      {Number(selectedProfile.reliability_score ?? 5).toFixed(1)} / 5.0
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Matches played</Text>
                    <Text style={styles.detailValue}>{selectedProfile.total_matches ?? 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sport</Text>
                    <Text style={styles.detailValue}>{selectedProfile.sport || 'Tennis'}</Text>
                  </View>
                </View>

                {/* Availability */}
                {selectedProfile.availability?.length > 0 && (
                  <View style={styles.availSection}>
                    <Text style={styles.availTitle}>Availability</Text>
                    <View style={styles.availGrid}>
                      {selectedProfile.availability.map(slot => (
                        <View key={slot} style={styles.availChip}>
                          <Text style={styles.availChipText}>{slot}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Coach bio */}
                {selectedProfile.coach_info && (
                  <View style={styles.coachInfoBox}>
                    <Text style={styles.coachInfoLabel}>About</Text>
                    <Text style={styles.coachInfoText}>{selectedProfile.coach_info}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelectedProfile(null)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{totalUnread} new</Text>
            </View>
          )}
        </View>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const otherName   = getOtherName(item);
          const avatarColor = getAvatarColor(otherName);
          const isLight     = avatarColor === '#C8F000';
          const unread      = getUnreadCount(item);

          return (
            <View style={styles.row}>
              {/* Tapping avatar/name opens profile */}
              <TouchableOpacity
                style={styles.avatarTouchable}
                onPress={() => openProfile(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                  <Text style={[styles.avatarText, { color: isLight ? COLORS.dark : COLORS.white }]}>
                    {getInitials(otherName).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Tapping the rest opens chat */}
              <TouchableOpacity
                style={styles.rowContent}
                activeOpacity={0.7}
                onPress={() => {
                  markAsRead(item.id);
                  navigation.navigate('ChatRoom', {
                    chatId:    item.id,
                    otherName: otherName,
                  });
                }}
              >
                <View style={styles.infoTop}>
                  <TouchableOpacity onPress={() => openProfile(item)}>
                    <Text style={[styles.name, unread > 0 && styles.nameUnread]}>
                      {otherName}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.time}>{getTimeAgo(item.last_message_time)}</Text>
                </View>
                <View style={styles.infoBottom}>
                  <Text
                    style={[styles.preview, unread > 0 && styles.previewUnread]}
                    numberOfLines={1}
                  >
                    {item.last_message || 'Tap to start chatting'}
                  </Text>
                  {unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unread}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Match with a player on the Match tab and start coordinating your game
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Match')}
            >
              <Text style={styles.emptyBtnText}>Find a partner</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.secondary },
  header:          { backgroundColor: COLORS.darkCard, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30' },
  headerTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  title:           { fontSize: 28, fontWeight: '900', color: COLORS.textLight },
  unreadPill:      { backgroundColor: COLORS.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  unreadPillText:  { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  searchBox:       { backgroundColor: COLORS.secondary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.primary + '30' },
  searchInput:     { fontSize: 14, color: COLORS.textLight },
  separator:       { height: 1, backgroundColor: COLORS.primary + '10', marginLeft: 82 },
  row:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.darkCard },
  avatarTouchable: { marginRight: 14 },
  avatar:          { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { fontSize: 18, fontWeight: '900' },
  rowContent:      { flex: 1 },
  infoTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name:            { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
  nameUnread:      { fontWeight: '900', color: COLORS.white },
  time:            { fontSize: 12, color: COLORS.muted },
  infoBottom:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview:         { fontSize: 13, color: COLORS.muted, flex: 1, marginRight: 8 },
  previewUnread:   { color: COLORS.textLight, fontWeight: '600' },
  unreadBadge:     { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadBadgeText: { color: COLORS.dark, fontSize: 11, fontWeight: '900' },
  emptyContainer:  { flex: 1 },
  empty:           { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle:      { fontSize: 22, fontWeight: '900', color: COLORS.textLight, marginBottom: 8 },
  emptySubtext:    { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn:        { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText:    { color: COLORS.dark, fontWeight: '800', fontSize: 15 },

  // Profile modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', borderWidth: 1, borderColor: COLORS.primary + '30' },
  modalAvatarRow:  { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  modalAvatar:     { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  modalAvatarText: { fontSize: 24, fontWeight: '900', color: COLORS.dark },
  modalNameCol:    { flex: 1, gap: 6 },
  modalName:       { fontSize: 22, fontWeight: '900', color: COLORS.textLight },
  coachBadge:      { alignSelf: 'flex-start', backgroundColor: '#7C3AED' + '25', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#7C3AED' + '50' },
  coachBadgeText:  { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  modalDetails:    { gap: 12, marginBottom: 20 },
  detailRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.primary + '15' },
  detailLabel:     { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  detailValue:     { fontSize: 14, color: COLORS.textLight, fontWeight: '700' },
  availSection:    { marginBottom: 16 },
  availTitle:      { fontSize: 12, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  availGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  availChip:       { backgroundColor: COLORS.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.primary + '30' },
  availChipText:   { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  coachInfoBox:    { backgroundColor: '#7C3AED' + '15', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#7C3AED' + '30' },
  coachInfoLabel:  { fontSize: 10, color: '#A78BFA', fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  coachInfoText:   { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  closeBtn:        { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  closeBtnText:    { color: COLORS.dark, fontWeight: '900', fontSize: 15 },
});