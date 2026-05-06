import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../config/firebase';
import { getSuggestions, getPendingMatches } from '../../services/api';
import PlayerCard from '../../components/PlayerCard';
import { COLORS, SKILL_LEVELS } from '../../constants';

const FILTERS = ['All', ...SKILL_LEVELS];

export default function MatchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [allPlayers, setAllPlayers]     = useState([]);
  const [displayed, setDisplayed]       = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    try {
      const [sRes, pRes] = await Promise.all([
        getSuggestions(uid),
        getPendingMatches(uid),
      ]);

      const players = sRes.data ?? [];
      setAllPlayers(players);
      applyFilter(activeFilter, players);
      setPendingCount(pRes.data?.length ?? 0);
    } catch (e) {
      setError('Could not load players. Is your backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const applyFilter = (filter, source) => {
    const list = source ?? allPlayers;
    setActiveFilter(filter);
    if (filter === 'All') {
      setDisplayed(list);
    } else {
      setDisplayed(list.filter(p => p.skill_level === filter));
    }
  };

  const removePlayer = (playerId) => {
    const updated = allPlayers.filter(p => p.id !== playerId);
    setAllPlayers(updated);
    applyFilter(activeFilter, updated);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding players near you...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Ready to play? 🎾</Text>
            <Text style={styles.title}>Find a partner</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Pending Matches')}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <Text style={styles.filterLabel}>Filter by skill level</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => applyFilter(filter, allPlayers)}
            >
              <Text style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Player list */}
      <FlatList
        data={displayed}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <PlayerCard
            player={item}
            onMatch={() => removePlayer(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          displayed.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          !error && (
            <View style={styles.empty}>
              <View style={styles.emptyBall}>
                <Text style={styles.emptyIcon}>🎾</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {allPlayers.length === 0
                  ? 'No players registered yet'
                  : `No ${activeFilter !== 'All' ? activeFilter : ''} players found`}
              </Text>
              <Text style={styles.emptySubtext}>
                {allPlayers.length === 0
                  ? 'Register a few test accounts to see players appear here'
                  : 'Try a different skill level filter or pull down to refresh'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    gap: 12,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: COLORS.darkCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary + '30',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greeting: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },
  notifBtn: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
  filterLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.dark,
    fontWeight: '800',
  },
  errorBanner: {
    backgroundColor: COLORS.danger + '20',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.danger + '40',
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  retryText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginLeft: 12 },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyBall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});



































































































































































