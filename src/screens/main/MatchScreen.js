import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { auth } from '../../config/firebase';
import { getSuggestions, getPendingMatches } from '../../services/api';
import PlayerCard from '../../components/PlayerCard';
import { COLORS, SKILL_LEVELS } from '../../constants';

const DEMO_PLAYERS = [
  {
    id: '1', name: 'James Wilson', sport: 'Tennis',
    skill_level: 'Advanced (4.0-4.5)', reliability_score: 4.8,
    availability: ['Monday PM', 'Wednesday PM', 'Saturday AM'],
    compatibility_score: 92,
  },
  {
    id: '2', name: 'Sarah Ahmed', sport: 'Tennis',
    skill_level: 'Intermediate (3.0-3.5)', reliability_score: 4.5,
    availability: ['Tuesday AM', 'Thursday PM', 'Sunday AM'],
    compatibility_score: 78,
  },
  {
    id: '3', name: 'Marcus Chen', sport: 'Tennis',
    skill_level: 'Advanced (4.0-4.5)', reliability_score: 5.0,
    availability: ['Wednesday AM', 'Friday PM', 'Saturday PM'],
    compatibility_score: 85,
  },
  {
    id: '4', name: 'Priya Patel', sport: 'Tennis',
    skill_level: 'Beginner (1.0-2.5)', reliability_score: 4.2,
    availability: ['Monday AM', 'Saturday AM', 'Sunday PM'],
    compatibility_score: 61,
  },
  {
    id: '5', name: 'Tom Brooks', sport: 'Tennis',
    skill_level: 'Intermediate (3.0-3.5)', reliability_score: 4.7,
    availability: ['Tuesday PM', 'Thursday AM', 'Sunday PM'],
    compatibility_score: 74,
  },
];

const FILTERS = ['All', ...SKILL_LEVELS];

export default function MatchScreen({ navigation }) {
  const [allPlayers, setAllPlayers] = useState(DEMO_PLAYERS);
  const [suggestions, setSuggestions] = useState(DEMO_PLAYERS);
  const [activeFilter, setActiveFilter] = useState('All');
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [sRes, pRes] = await Promise.all([
        getSuggestions(uid),
        getPendingMatches(uid),
      ]);
      if (sRes.data && sRes.data.length > 0) {
        setAllPlayers(sRes.data);
        setSuggestions(sRes.data);
      }
      setPendingCount(pRes.data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const applyFilter = (filter) => {
    setActiveFilter(filter);
    if (filter === 'All') {
      setSuggestions(allPlayers);
    } else {
      setSuggestions(allPlayers.filter(p => p.skill_level === filter));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Ready to play? 🎾</Text>
            <Text style={styles.title}>Find a partner</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('PendingMatches')}>
            <Text style={styles.notifIcon}>🔔</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.filterLabel}>Filter by skill level</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive
              ]}
              onPress={() => applyFilter(filter)}>
              <Text style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading
        ? <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 60 }} />
        : (
          <FlatList
            data={suggestions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PlayerCard
                player={item}
                navigation={navigation}
                onMatch={() => {
                  const updated = allPlayers.filter(p => p.id !== item.id);
                  setAllPlayers(updated);
                  setSuggestions(
                    activeFilter === 'All'
                      ? updated
                      : updated.filter(p => p.skill_level === activeFilter)
                  );
                }}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={COLORS.primary}
              />
            }
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyBall}>
                  <Text style={styles.emptyIcon}>🎾</Text>
                </View>
                <Text style={styles.emptyText}>No players found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different filter or expand your radius in Profile
                </Text>
              </View>
            }
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    backgroundColor: COLORS.darkCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary + '30',
    paddingTop: 100,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },
  notifBtn: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    width: 44, height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: { fontSize: 20 },
  badge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: COLORS.danger, borderRadius: 10,
    width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
  filterLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.5,
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
  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyBall: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  emptyIcon: { fontSize: 40 },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});