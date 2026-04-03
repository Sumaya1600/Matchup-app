import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants';

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale }], opacity }]}>
        <View style={styles.logoOuter}>
          <View style={styles.logoInner}>
            <Text style={styles.logoEmoji}>🎾</Text>
          </View>
        </View>
        <Text style={styles.title}>Match<Text style={styles.titleAccent}>UP</Text></Text>
        <Text style={styles.subtitle}>Find · Play · Win</Text>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: { alignItems: 'center' },
  logoOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2, borderColor: COLORS.primary + '50',
  },
  logoInner: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 20, elevation: 10,
  },
  logoEmoji: { fontSize: 44 },
  title: {
    fontSize: 42, fontWeight: '900',
    color: COLORS.textLight, letterSpacing: 2,
  },
  titleAccent: { color: COLORS.primary },
  subtitle: {
    fontSize: 16, color: COLORS.primary,
    letterSpacing: 6, marginTop: 8, fontWeight: '600',
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 48 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary + '40',
  },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
});