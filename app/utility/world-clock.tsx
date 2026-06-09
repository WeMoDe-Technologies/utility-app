import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeOutRight, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { WorldClockState, WorldClockCity } from '@/types';

const PRESET_CITIES: WorldClockCity[] = [
  { id: '1', city: 'New York', country: 'US', timezone: 'America/New_York', offset: -5 },
  { id: '2', city: 'London', country: 'UK', timezone: 'Europe/London', offset: 0 },
  { id: '3', city: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai', offset: 4 },
  { id: '4', city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', offset: 5.5 },
  { id: '5', city: 'Singapore', country: 'SG', timezone: 'Asia/Singapore', offset: 8 },
  { id: '6', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', offset: 9 },
  { id: '7', city: 'Sydney', country: 'AU', timezone: 'Australia/Sydney', offset: 11 },
  { id: '8', city: 'Los Angeles', country: 'US', timezone: 'America/Los_Angeles', offset: -8 },
  { id: '9', city: 'Paris', country: 'France', timezone: 'Europe/Paris', offset: 1 },
  { id: '10', city: 'Beijing', country: 'China', timezone: 'Asia/Shanghai', offset: 8 },
  { id: '11', city: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', offset: -3 },
  { id: '12', city: 'Toronto', country: 'Canada', timezone: 'America/Toronto', offset: -5 },
];

const DEFAULT_STATE: WorldClockState = {
  cities: [PRESET_CITIES[3], PRESET_CITIES[1], PRESET_CITIES[0]],
};

function getCityTime(timezone: string, offset: number) {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    // Fallback using offset
    const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
    const city = new Date(utc + offset * 3600000);
    return city.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
}

function getCityDate(timezone: string) {
  try {
    return new Date().toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

export default function WorldClockScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<WorldClockState>(
    'worldClock',
    DEFAULT_STATE
  );
  const [tick, setTick] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const removeCity = (id: string) => {
    setState((p) => ({ cities: p.cities.filter((c) => c.id !== id) }));
  };

  const addCity = (city: WorldClockCity) => {
    if (state.cities.find((c) => c.id === city.id)) {
      Alert.alert('Already Added', `${city.city} is already in your list.`);
      return;
    }
    setState((p) => ({ cities: [...p.cities, city] }));
    setShowAddModal(false);
  };

  const localTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  if (showAddModal) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowAddModal(false)}>
            <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add City</Text>
          <View style={{ width: 60 }} />
        </View>
        <FlatList
          data={PRESET_CITIES}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => {
            const already = !!state.cities.find((c) => c.id === item.id);
            return (
              <Pressable
                onPress={() => addCity(item)}
                disabled={already}
                style={[styles.cityPickRow, { borderBottomColor: colors.border, opacity: already ? 0.4 : 1 }]}
              >
                <View>
                  <Text style={[styles.cityPickName, { color: colors.text }]}>{item.city}</Text>
                  <Text style={[styles.cityPickCountry, { color: colors.textSecondary }]}>{item.country}</Text>
                </View>
                <Text style={[styles.cityPickTime, { color: colors.textSecondary }]}>
                  {getCityTime(item.timezone, item.offset)}
                </Text>
                {already && <Ionicons name="checkmark" size={16} color="#10B981" />}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="World Clock"
        utilityId="worldClock"
        accentColor="#6366F1"
        onClearData={clearState}
      />

      {/* Local time hero */}
      <Animated.View
        entering={FadeInDown.delay(50).duration(300)}
        style={[styles.heroCard, { backgroundColor: '#6366F115', borderColor: '#6366F130' }]}
      >
        <Text style={[styles.heroLabel, { color: '#6366F1' }]}>LOCAL TIME</Text>
        <Text style={[styles.heroTime, { color: colors.text }]}>{localTime}</Text>
        <Text style={[styles.heroDate, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </Animated.View>

      <FlatList
        data={state.cities}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const time = getCityTime(item.timezone, item.offset);
          const date = getCityDate(item.timezone);
          const [h, m, s] = time.split(':').map(Number);
          const isDay = h >= 6 && h < 20;
          const timeDiff = item.offset - (-new Date().getTimezoneOffset() / 60);
          const diffLabel = timeDiff === 0 ? 'Same time' :
            `${timeDiff > 0 ? '+' : ''}${timeDiff}h`;

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 50).duration(300)}
              exiting={FadeOutRight.duration(200)}
              layout={Layout.springify()}
            >
              <Pressable
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(`Remove ${item.city}?`, '', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeCity(item.id) },
                  ]);
                }}
                style={[styles.clockCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.clockLeft}>
                  <View style={styles.cityNameRow}>
                    <Text style={[styles.cityName, { color: colors.text }]}>{item.city}</Text>
                    <View style={[styles.dayNightBadge, { backgroundColor: isDay ? '#F59E0B20' : '#6366F120' }]}>
                      <Ionicons
                        name={isDay ? 'sunny' : 'moon'}
                        size={11}
                        color={isDay ? '#F59E0B' : '#6366F1'}
                      />
                    </View>
                  </View>
                  <Text style={[styles.cityCountry, { color: colors.textSecondary }]}>{item.country}</Text>
                  <Text style={[styles.cityDate, { color: colors.textTertiary }]}>{date}</Text>
                </View>
                <View style={styles.clockRight}>
                  <Text style={[styles.clockTime, { color: colors.text }]}>{time.slice(0, 5)}</Text>
                  <Text style={[styles.clockSeconds, { color: colors.textSecondary }]}>{time.slice(6)}</Text>
                  <Text style={[styles.diffLabel, { color: '#6366F1' }]}>{diffLabel}</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
        ListFooterComponent={
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={[styles.addBtn, { borderColor: '#6366F140' }]}
          >
            <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
            <Text style={{ color: '#6366F1', fontSize: 15, fontWeight: '600' }}>Add City</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroCard: {
    margin: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  heroLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroTime: { fontSize: 52, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  heroDate: { fontSize: 13 },
  list: { paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: 40 },
  clockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
  },
  clockLeft: { gap: 2 },
  cityNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cityName: { fontSize: 18, fontWeight: '700' },
  dayNightBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityCountry: { fontSize: 13 },
  cityDate: { fontSize: 12 },
  clockRight: { alignItems: 'flex-end', gap: 2 },
  clockTime: { fontSize: 36, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  clockSeconds: { fontSize: 14, fontVariant: ['tabular-nums'] },
  diffLabel: { fontSize: 12, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  cityPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityPickName: { fontSize: 16, fontWeight: '600' },
  cityPickCountry: { fontSize: 13 },
  cityPickTime: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
