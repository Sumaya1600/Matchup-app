import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { COLORS } from '../../constants';

export default function ChatListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', uid),
      orderBy('last_message_time', 'desc')
    );
    return onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const filtered = chats.filter(c =>
    (c.other_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    return parts.length > 1
      ? parts[0][0] + parts[1][0]
      : name[0];
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const AVATAR_COLORS = [
    '#C8F000', '#7C3AED', '#EF4444', '#F59E0B', '#10B981'
  ];

  const getAvatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    const index = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Messages</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{chats.length}</Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
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
          const avatarColor = getAvatarColor(item.other_name);
          const isLight = avatarColor === '#C8F000';
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ChatRoom', {
                chatId: item.id,
                otherName: item.other_name || 'Player',
              })}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={[styles.avatarText, { color: isLight ? COLORS.dark : COLORS.white }]}>
                  {getInitials(item.other_name).toUpperCase()}
                </Text>
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.info}>
                <View style={styles.infoTop}>
                  <Text style={styles.name}>{item.other_name || 'Player'}</Text>
                  <Text style={styles.time}>
                    {getTimeAgo(item.last_message_time)}
                  </Text>
                </View>
                <View style={styles.infoBottom}>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.last_message || 'Tap to start chatting 🎾'}
                  </Text>
                  <Text style={styles.sport}>🎾</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIcon}>💬</Text>
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Match with a player on the 🎾 tab and start coordinating your game
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Match')}>
              <Text style={styles.emptyBtnText}>Find a partner</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    backgroundColor: COLORS.darkCard,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary + '30',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  title: {
    fontSize: 28, fontWeight: '900',
    color: COLORS.textLight,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    color: COLORS.dark,
    fontWeight: '900',
    fontSize: 13,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1, fontSize: 14,
    color: COLORS.textLight,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.primary + '10',
    marginLeft: 82,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.darkCard,
  },
  avatar: {
    width: 54, height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  avatarText: {
    fontSize: 18, fontWeight: '900',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1, right: 1,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.darkCard,
  },
  info: { flex: 1 },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.textLight,
  },
  time: {
    fontSize: 12, color: COLORS.muted,
  },
  infoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 13, color: COLORS.muted,
    flex: 1, marginRight: 8,
  },
  sport: { fontSize: 14 },
  emptyContainer: { flex: 1 },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 90, height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: {
    fontSize: 22, fontWeight: '900',
    color: COLORS.textLight, marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14, color: COLORS.muted,
    textAlign: 'center', lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: COLORS.dark,
    fontWeight: '800',
    fontSize: 15,
  },
});