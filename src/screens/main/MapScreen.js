import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Linking,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { COLORS, GOOGLE_API_KEY } from '../../constants';

const CATEGORIES = [
  { id: 'courts', label: '🎾 Courts', query: 'tennis court london' },
  { id: 'clubs', label: '🏛️ Clubs', query: 'tennis club london' },
  { id: 'coaches', label: '👨‍🏫 Coaches', query: 'tennis coach london' },
];

const FALLBACK = {
  courts: [
    { place_id: '1', name: "Regent's Park Tennis", vicinity: "Regent's Park, NW1 4NR", rating: 4.5, open: true, bookUrl: 'https://www.better.org.uk/leisure-centre/london/the-hub-at-st-james-s-park/tennis' },
    { place_id: '2', name: 'Hyde Park Tennis', vicinity: 'Hyde Park, W2 2UH', rating: 4.3, open: true, bookUrl: 'https://www.royalparks.org.uk/parks/hyde-park/things-to-do-in-hyde-park/sports-and-activities/tennis' },
    { place_id: '3', name: 'Victoria Park Tennis', vicinity: 'Victoria Park, E9 7DE', rating: 4.6, open: false, bookUrl: 'https://www.better.org.uk' },
    { place_id: '4', name: 'Battersea Park Courts', vicinity: 'Battersea Park, SW11 4NJ', rating: 4.4, open: true, bookUrl: 'https://www.wandsworth.gov.uk/tennis' },
    { place_id: '5', name: 'Finsbury Park Tennis', vicinity: 'Finsbury Park, N4 2NQ', rating: 4.2, open: true, bookUrl: 'https://www.better.org.uk' },
  ],
  clubs: [
    { place_id: '6', name: 'Queens Club', vicinity: 'West Kensington, W14 9EG', rating: 4.8, open: true, bookUrl: 'https://www.queensclub.co.uk' },
    { place_id: '7', name: 'Roehampton Club', vicinity: 'Roehampton, SW15 5LR', rating: 4.7, open: true, bookUrl: 'https://www.roehamptonclub.co.uk' },
    { place_id: '8', name: 'Wimbledon Club', vicinity: 'Wimbledon, SW19 5AE', rating: 4.9, open: true, bookUrl: 'https://www.wimbledon.com' },
    { place_id: '9', name: 'David Lloyd Chiswick', vicinity: 'Chiswick, W4 5YE', rating: 4.5, open: true, bookUrl: 'https://www.davidlloyd.co.uk' },
  ],
  coaches: [
    { place_id: '10', name: 'LTA Licensed Coaches', vicinity: 'London Wide', rating: 4.8, open: true, bookUrl: 'https://www.lta.org.uk/play/find-a-coach' },
    { place_id: '11', name: 'Tennis For Free Coaches', vicinity: 'London Parks', rating: 4.6, open: true, bookUrl: 'https://www.tennisforfree.com' },
    { place_id: '12', name: 'Urban Tennis Coaches', vicinity: 'Central London', rating: 4.7, open: true, bookUrl: 'https://www.urbantennis.co.uk' },
  ],
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState(FALLBACK.courts);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('courts');
  const [searchText, setSearchText] = useState('');
  const [postcode, setPostcode] = useState('');

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPlaces(FALLBACK.courts);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    await fetchNearbyPlaces('tennis court', loc.coords);
  };

  const fetchNearbyPlaces = async (keyword, coords) => {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
      setPlaces(FALLBACK[activeCategory] || FALLBACK.courts);
      return;
    }
    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.latitude},${coords.longitude}&radius=5000&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setPlaces(data.results.slice(0, 10));
      } else {
        setPlaces(FALLBACK[activeCategory] || FALLBACK.courts);
      }
    } catch (e) {
      setPlaces(FALLBACK[activeCategory] || FALLBACK.courts);
    } finally {
      setLoading(false);
    }
  };

  const searchByPostcode = async () => {
    if (!postcode.trim()) return;
    setLoading(true);
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode + ' UK')}&key=${GOOGLE_API_KEY}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results[0]) {
        const loc = geoData.results[0].geometry.location;
        await fetchNearbyPlaces(
          CATEGORIES.find(c => c.id === activeCategory)?.query || 'tennis court',
          { latitude: loc.lat, longitude: loc.lng }
        );
      }
    } catch (e) {
      setPlaces(FALLBACK[activeCategory] || FALLBACK.courts);
    } finally {
      setLoading(false);
    }
  };

  const handleCategory = async (cat) => {
    setActiveCategory(cat.id);
    setPlaces(FALLBACK[cat.id] || FALLBACK.courts);
    if (location) {
      await fetchNearbyPlaces(cat.query, location);
    }
  };

  const openDirections = (place) => {
    const name = encodeURIComponent(place.name);
    const vicinity = encodeURIComponent(place.vicinity || '');
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${name}+${vicinity}`);
  };

  const openBooking = (place) => {
    if (place.bookUrl) {
      Linking.openURL(place.bookUrl);
    } else {
      const query = encodeURIComponent(`book ${place.name} tennis`);
      Linking.openURL(`https://www.google.com/search?q=${query}`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Nearby</Text>
        <Text style={styles.subtitle}>
          {location ? '📍 Using your location' : '📍 Getting location...'}
        </Text>
      </View>

      <View style={styles.postcodeRow}>
        <TextInput
          style={styles.postcodeInput}
          placeholder="Enter postcode (e.g. SW1A 1AA)"
          placeholderTextColor={COLORS.muted}
          value={postcode}
          onChangeText={setPostcode}
          onSubmitEditing={searchByPostcode}
          returnKeyType="search"
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchByPostcode}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
            onPress={() => handleCategory(cat)}>
            <Text style={[styles.catText, activeCategory === cat.id && styles.catTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={styles.list}>
            {places.map((place, index) => (
              <View key={place.place_id || index} style={styles.card}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress}>
                  📍 {place.vicinity || place.formatted_address || 'London'}
                </Text>
                <View style={styles.metaRow}>
                  {place.rating && (
                    <Text style={styles.rating}>⭐ {place.rating}</Text>
                  )}
                  {(place.open !== undefined || place.opening_hours) && (
                    <Text style={[styles.openStatus, {
                      color: (place.open || place.opening_hours?.open_now)
                        ? COLORS.primary : COLORS.danger
                    }]}>
                      {(place.open || place.opening_hours?.open_now) ? '● Open' : '● Closed'}
                    </Text>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.dirBtn}
                    onPress={() => openDirections(place)}>
                    <Text style={styles.dirBtnText}>🗺️ Directions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => openBooking(place)}>
                    <Text style={styles.bookBtnText}>📅 Book</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    backgroundColor: COLORS.darkCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30',
  },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.textLight },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  postcodeRow: {
    flexDirection: 'row', padding: 12,
    backgroundColor: COLORS.darkCard, gap: 10,
  },
  postcodeInput: {
    flex: 1, backgroundColor: COLORS.secondary,
    borderWidth: 1, borderColor: COLORS.primary + '40',
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: COLORS.textLight,
  },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { fontSize: 18 },
  categoryRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingBottom: 12, paddingTop: 8,
    backgroundColor: COLORS.darkCard, gap: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30',
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  catTextActive: { color: COLORS.dark, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.darkCard, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  placeName: { fontSize: 16, fontWeight: '800', color: COLORS.textLight, marginBottom: 4 },
  placeAddress: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  rating: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  openStatus: { fontSize: 12, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 10 },
  dirBtn: {
    flex: 1, borderWidth: 1.5,
    borderColor: COLORS.primary + '60',
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  dirBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  bookBtn: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  bookBtnText: { color: COLORS.dark, fontWeight: '800', fontSize: 13 },
});