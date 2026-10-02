import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet, View, Text, Pressable, FlatList, Modal, TextInput, Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeOutRight, Layout } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { UtilityHeader, HeaderKey } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { useHaptic, toast, onColour } from '@/components/ui';
import { spacing, radius, typography, border } from '@/theme';
import type { WorldClockState, WorldClockCity } from '@/types';

const ACCENT = '#3C5A7D';

/**
 * `offset` is kept only for backwards compatibility with saved data — every
 * displayed value is derived from the IANA `timezone` instead, so daylight
 * saving is handled correctly. The old build compared hardcoded offsets and
 * reported the wrong difference for half the year in every DST region.
 */
const PRESET_CITIES: WorldClockCity[] = [
  { id: '1',  city: 'New York',    country: 'United States', timezone: 'America/New_York',    offset: -5 },
  { id: '2',  city: 'London',      country: 'United Kingdom', timezone: 'Europe/London',      offset: 0 },
  { id: '3',  city: 'Dubai',       country: 'UAE',           timezone: 'Asia/Dubai',          offset: 4 },
  { id: '4',  city: 'Mumbai',      country: 'India',         timezone: 'Asia/Kolkata',        offset: 5.5 },
  { id: '5',  city: 'Singapore',   country: 'Singapore',     timezone: 'Asia/Singapore',      offset: 8 },
  { id: '6',  city: 'Tokyo',       country: 'Japan',         timezone: 'Asia/Tokyo',          offset: 9 },
  { id: '7',  city: 'Sydney',      country: 'Australia',     timezone: 'Australia/Sydney',    offset: 11 },
  { id: '8',  city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', offset: -8 },
  { id: '9',  city: 'Paris',       country: 'France',        timezone: 'Europe/Paris',        offset: 1 },
  { id: '10', city: 'Beijing',     country: 'China',         timezone: 'Asia/Shanghai',       offset: 8 },
  { id: '11', city: 'São Paulo',   country: 'Brazil',        timezone: 'America/Sao_Paulo',   offset: -3 },
  { id: '12', city: 'Toronto',     country: 'Canada',        timezone: 'America/Toronto',     offset: -5 },
  { id: '13', city: 'Berlin',      country: 'Germany',       timezone: 'Europe/Berlin',       offset: 1 },
  { id: '14', city: 'Moscow',      country: 'Russia',        timezone: 'Europe/Moscow',       offset: 3 },
  { id: '15', city: 'Hong Kong',   country: 'Hong Kong',     timezone: 'Asia/Hong_Kong',      offset: 8 },
  { id: '16', city: 'Seoul',       country: 'South Korea',   timezone: 'Asia/Seoul',          offset: 9 },
  { id: '17', city: 'Istanbul',    country: 'Türkiye',       timezone: 'Europe/Istanbul',     offset: 3 },
  { id: '18', city: 'Cairo',       country: 'Egypt',         timezone: 'Africa/Cairo',        offset: 2 },
  { id: '19', city: 'Lagos',       country: 'Nigeria',       timezone: 'Africa/Lagos',        offset: 1 },
  { id: '20', city: 'Auckland',    country: 'New Zealand',   timezone: 'Pacific/Auckland',    offset: 13 },
  { id: '21', city: 'Mexico City', country: 'Mexico',        timezone: 'America/Mexico_City', offset: -6 },
  { id: '22', city: 'Chicago',     country: 'United States', timezone: 'America/Chicago',     offset: -6 },
];

const DEFAULT_STATE: WorldClockState = {
  cities: [PRESET_CITIES[3], PRESET_CITIES[1], PRESET_CITIES[0]],
};

/**
 * Read the wall-clock fields for an instant in a given IANA zone.
 * Returns null when the device's ICU data doesn't know the zone.
 */
function zoneParts(date: Date, timeZone: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      weekday: 'short',
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
    ) as Record<string, string>;

    // Intl reports midnight as "24" in some ICU builds
    const hour = Number(parts.hour) % 24;
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour,
      minute: Number(parts.minute),
      second: Number(parts.second),
      weekday: parts.weekday,
    };
  } catch {
    return null;
  }
}

/**
 * The zone's UTC offset in minutes *at this instant* — so it reflects whatever
 * DST rule is currently in force rather than a stored constant.
 */
function zoneOffsetMinutes(date: Date, timeZone: string): number | null {
  const p = zoneParts(date, timeZone);
  if (!p) return null;
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "+5:30" / "-4" / "Same time" relative to the device's own zone. */
function formatDifference(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes === 0) return 'Same time';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const dayLabel = Math.abs(minutes) >= 24 * 60 ? '' : '';
  return `${sign}${h}${m ? `:${pad(m)}` : ''}h${dayLabel}`;
}

/** "Today" / "Tomorrow" / "Yesterday" against the device's calendar date. */
function relativeDay(cityY: number, cityM: number, cityD: number): string {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const city = new Date(cityY, cityM - 1, cityD);
  const diff = Math.round((city.getTime() - local.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return '';
}

export default function WorldClockScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<WorldClockState>('worldClock', DEFAULT_STATE);
  const haptic = useHaptic();

  const [now, setNow] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState('');

  // Tick on the second boundary so the seconds never visibly stutter
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const localOffset = -now.getTimezoneOffset();
  const localTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const localZone = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; }
  })();

  const addCity = (city: WorldClockCity) => {
    if (state.cities.some((c) => c.id === city.id)) {
      toast(`${city.city} is already on your list`, 'info');
      return;
    }
    haptic('success');
    setState((p) => ({ cities: [...p.cities, city] }));
    setShowPicker(false);
    setQuery('');
  };

  const removeCity = (city: WorldClockCity) => {
    haptic('warning');
    Alert.alert(`Remove ${city.city}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setState((p) => ({ cities: p.cities.filter((c) => c.id !== city.id) })),
      },
    ]);
  };

  const q = query.trim().toLowerCase();
  const pickerData = useMemo(
    () =>
      q
        ? PRESET_CITIES.filter(
            (c) => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
          )
        : PRESET_CITIES,
    [q],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="World Clock"
        utilityId="worldClock"
        accentColor={ACCENT}
        subtitle={localZone || undefined}
        onClearData={clearState}
        rightAction={
          <HeaderKey
            icon="add"
            label="Add a city"
            fg={onColour(ACCENT)}
            onPress={() => { haptic('light'); setShowPicker(true); }}
          />
        }
      />

      <FlatList
        data={state.cities}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View
            entering={FadeInDown.duration(280)}
            style={[styles.heroCard, { backgroundColor: ACCENT + '15', borderColor: ACCENT + '35' }]}
          >
            <Text style={[styles.heroLabel, { color: ACCENT }]}>LOCAL TIME</Text>
            <Text style={[styles.heroTime, { color: colors.text }]}>{localTime}</Text>
            <Text style={[styles.heroDate, { color: colors.textSecondary }]}>
              {now.toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </Animated.View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No cities yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Add a city to compare its time against yours.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <CityCard
            city={item}
            now={now}
            localOffset={localOffset}
            index={index}
            colors={colors}
            onRemove={() => removeCity(item)}
          />
        )}
        ListFooterComponent={
          <Pressable
            onPress={() => { haptic('light'); setShowPicker(true); }}
            accessibilityRole="button"
            style={[styles.addBtn, { borderColor: ACCENT + '55' }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
            <Text style={[styles.addBtnTxt, { color: ACCENT }]}>Add city</Text>
          </Pressable>
        }
      />

      <CityPicker
        visible={showPicker}
        cities={pickerData}
        selectedIds={state.cities.map((c) => c.id)}
        now={now}
        query={query}
        onQueryChange={setQuery}
        onSelect={addCity}
        onClose={() => { setShowPicker(false); setQuery(''); }}
      />
    </SafeAreaView>
  );
}

// ─── City card ─────────────────────────────────────────────────────────────
function CityCard({
  city, now, localOffset, index, colors, onRemove,
}: {
  city: WorldClockCity;
  now: Date;
  localOffset: number;
  index: number;
  colors: any;
  onRemove: () => void;
}) {
  const parts = zoneParts(now, city.timezone);
  const offset = zoneOffsetMinutes(now, city.timezone);
  const diff = offset === null ? null : offset - localOffset;

  const isDay = parts ? parts.hour >= 6 && parts.hour < 19 : true;
  const dayLabel = parts ? relativeDay(parts.year, parts.month, parts.day) : '';

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 45, 250)).duration(280)}
      exiting={FadeOutRight.duration(200)}
      layout={Layout.springify()}
    >
      <Pressable
        onLongPress={onRemove}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`${city.city}. Long press to remove.`}
        style={[styles.clockCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.clockLeft}>
          <View style={styles.cityNameRow}>
            <Text style={[styles.cityName, { color: colors.text }]} numberOfLines={1}>
              {city.city}
            </Text>
            <View style={[styles.dayNightBadge, { backgroundColor: isDay ? '#C2902B20' : '#3C5A7D20' }]}>
              <Ionicons name={isDay ? 'sunny' : 'moon'} size={11} color={isDay ? '#C2902B' : '#3C5A7D'} />
            </View>
          </View>
          <Text style={[styles.cityCountry, { color: colors.textSecondary }]} numberOfLines={1}>
            {city.country}
          </Text>
          <Text style={[styles.cityDate, { color: colors.textTertiary }]}>
            {parts ? `${parts.weekday} ${parts.day}/${pad(parts.month)}` : 'Timezone unavailable'}
            {dayLabel ? ` · ${dayLabel}` : ''}
          </Text>
        </View>

        <View style={styles.clockRight}>
          <Text style={[styles.clockTime, { color: colors.text }]}>
            {parts ? `${pad(parts.hour)}:${pad(parts.minute)}` : '--:--'}
          </Text>
          <Text style={[styles.clockSeconds, { color: colors.textSecondary }]}>
            {parts ? pad(parts.second) : '--'}
          </Text>
          <Text style={[styles.diffLabel, { color: ACCENT }]}>{formatDifference(diff)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Picker sheet ──────────────────────────────────────────────────────────
function CityPicker({
  visible, cities, selectedIds, now, query, onQueryChange, onSelect, onClose,
}: {
  visible: boolean;
  cities: WorldClockCity[];
  selectedIds: string[];
  now: Date;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (c: WorldClockCity) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: bottom + spacing.base },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Add a city</Text>

        <View style={[styles.search, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search city or country"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={cities}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          style={styles.sheetList}
          ListEmptyComponent={
            <Text style={[styles.emptyTxt, { color: colors.textTertiary }]}>
              No city matches “{query}”
            </Text>
          }
          renderItem={({ item }) => {
            const already = selectedIds.includes(item.id);
            const parts = zoneParts(now, item.timezone);
            return (
              <Pressable
                onPress={() => onSelect(item)}
                disabled={already}
                style={({ pressed }) => [
                  styles.cityPickRow,
                  { borderBottomColor: colors.border, opacity: already ? 0.4 : 1 },
                  pressed && { backgroundColor: colors.muted },
                ]}
              >
                <View style={styles.cityPickInfo}>
                  <Text style={[styles.cityPickName, { color: colors.text }]}>{item.city}</Text>
                  <Text style={[styles.cityPickCountry, { color: colors.textSecondary }]}>
                    {item.country}
                  </Text>
                </View>
                <Text style={[styles.cityPickTime, { color: colors.textSecondary }]}>
                  {parts ? `${pad(parts.hour)}:${pad(parts.minute)}` : '--:--'}
                </Text>
                {already && <Ionicons name="checkmark" size={16} color="#4C6B3C" />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 12,
    borderWidth: border.base,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: 48, paddingTop: spacing.base },

  heroCard: {
    borderRadius: radius.xl,
    borderWidth: border.base,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroTime: { fontSize: 50, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  heroDate: { fontSize: 13 },

  clockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.xl,
    borderWidth: border.base,
    padding: spacing.base,
    gap: spacing.md,
  },
  clockLeft: { gap: 2, flex: 1 },
  cityNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cityName: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  dayNightBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cityCountry: { fontSize: 13 },
  cityDate: { fontSize: 12 },
  clockRight: { alignItems: 'flex-end', gap: 2 },
  clockTime: { fontSize: 34, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  clockSeconds: { fontSize: 14, fontVariant: ['tabular-nums'] },
  diffLabel: { fontSize: 12, fontWeight: '800' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: border.base,
    borderStyle: 'dashed',
  },
  addBtnTxt: { fontSize: 15, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: typography.sizes.md, fontWeight: '700' },
  emptySub: { fontSize: typography.sizes.sm, textAlign: 'center', paddingHorizontal: spacing.xl },

  // Sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: border.base,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetTitle: { fontSize: typography.sizes.md, fontWeight: '700', textAlign: 'center', marginTop: spacing.xs },
  sheetList: { marginTop: spacing.xs },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    height: 42, paddingHorizontal: spacing.md,
    borderRadius: radius.lg, borderWidth: border.base,
  },
  searchInput: { flex: 1, fontSize: typography.sizes.base, padding: 0 },
  cityPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  cityPickInfo: { flex: 1 },
  cityPickName: { fontSize: 16, fontWeight: '600' },
  cityPickCountry: { fontSize: 13 },
  cityPickTime: { fontSize: 15, fontVariant: ['tabular-nums'] },
  emptyTxt: { textAlign: 'center', paddingVertical: spacing.xl, fontSize: typography.sizes.sm },
});
