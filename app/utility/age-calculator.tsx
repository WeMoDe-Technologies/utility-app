import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { AgeCalculatorState } from '@/types';

const DEFAULT_STATE: AgeCalculatorState = {
  birthDate: '',
  targetDate: new Date().toISOString().split('T')[0],
};

interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  totalWeeks: number;
  totalHours: number;
  nextBirthday: number;
  zodiac: string;
  dayOfWeek: string;
}

const ZODIAC = [
  { sign: '♑ Capricorn', end: [1, 19] },
  { sign: '♒ Aquarius', end: [2, 18] },
  { sign: '♓ Pisces', end: [3, 20] },
  { sign: '♈ Aries', end: [4, 19] },
  { sign: '♉ Taurus', end: [5, 20] },
  { sign: '♊ Gemini', end: [6, 20] },
  { sign: '♋ Cancer', end: [7, 22] },
  { sign: '♌ Leo', end: [8, 22] },
  { sign: '♍ Virgo', end: [9, 22] },
  { sign: '♎ Libra', end: [10, 22] },
  { sign: '♏ Scorpio', end: [11, 21] },
  { sign: '♐ Sagittarius', end: [12, 21] },
  { sign: '♑ Capricorn', end: [12, 31] },
];

function getZodiac(month: number, day: number): string {
  for (const z of ZODIAC) {
    if (month < z.end[0] || (month === z.end[0] && day <= z.end[1])) {
      return z.sign;
    }
  }
  return '♑ Capricorn';
}

function calculateAge(birthStr: string, targetStr: string): AgeResult | null {
  if (!birthStr || !targetStr) return null;
  const birth = new Date(birthStr);
  const target = new Date(targetStr);
  if (isNaN(birth.getTime()) || isNaN(target.getTime())) return null;
  if (birth > target) return null;

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const diffMs = target.getTime() - birth.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalMonths = years * 12 + months;
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));

  // Next birthday
  const nextBD = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBD <= target) nextBD.setFullYear(nextBD.getFullYear() + 1);
  const daysToNextBD = Math.ceil((nextBD.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  const zodiac = getZodiac(birth.getMonth() + 1, birth.getDate());
  const dayOfWeek = birth.toLocaleDateString('en-US', { weekday: 'long' });

  return {
    years, months, days,
    totalDays, totalMonths, totalWeeks, totalHours,
    nextBirthday: daysToNextBD,
    zodiac, dayOfWeek,
  };
}

export default function AgeCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<AgeCalculatorState>(
    'ageCalculator',
    DEFAULT_STATE
  );

  const result = useMemo(
    () => calculateAge(state.birthDate, state.targetDate),
    [state.birthDate, state.targetDate]
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Age Calculator"
        utilityId="ageCalculator"
        accentColor="#06B6D4"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Date Inputs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <DateInput
            label="Date of Birth"
            value={state.birthDate}
            onChange={(v) => setState((p) => ({ ...p, birthDate: v }))}
            colors={colors}
            accent="#06B6D4"
          />
          <DateInput
            label="Target Date"
            value={state.targetDate}
            onChange={(v) => setState((p) => ({ ...p, targetDate: v }))}
            colors={colors}
            accent="#06B6D4"
          />
          <Pressable
            onPress={() => setState((p) => ({ ...p, targetDate: new Date().toISOString().split('T')[0] }))}
            style={[styles.todayBtn, { backgroundColor: '#06B6D420' }]}
          >
            <Text style={{ color: '#06B6D4', fontWeight: '600', fontSize: 14 }}>Set target to Today</Text>
          </Pressable>
        </Animated.View>

        {/* Main Result */}
        {result ? (
          <>
            <Animated.View
              entering={FadeInDown.delay(80).duration(400)}
              style={[styles.mainResult, { backgroundColor: '#06B6D415', borderColor: '#06B6D430' }]}
            >
              <Text style={[styles.mainResultLabel, { color: '#06B6D4' }]}>AGE</Text>
              <View style={styles.ageRow}>
                <AgeUnit value={result.years} label="Years" color="#06B6D4" />
                <Text style={[styles.ageSep, { color: colors.textTertiary }]}>·</Text>
                <AgeUnit value={result.months} label="Months" color="#8B5CF6" />
                <Text style={[styles.ageSep, { color: colors.textTertiary }]}>·</Text>
                <AgeUnit value={result.days} label="Days" color="#EC4899" />
              </View>
            </Animated.View>

            {/* Stats Grid */}
            <Animated.View
              entering={FadeInDown.delay(120).duration(400)}
              style={styles.statsGrid}
            >
              {[
                { label: 'Total Days', value: result.totalDays.toLocaleString(), color: '#6366F1' },
                { label: 'Total Weeks', value: result.totalWeeks.toLocaleString(), color: '#10B981' },
                { label: 'Total Months', value: result.totalMonths.toLocaleString(), color: '#F59E0B' },
                { label: 'Total Hours', value: result.totalHours.toLocaleString(), color: '#F43F5E' },
              ].map(({ label, value, color }) => (
                <View key={label} style={[styles.statCard, { backgroundColor: color + '12', borderColor: color + '25' }]}>
                  <Text style={[styles.statCardValue, { color }]}>{value}</Text>
                  <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* Extra Info */}
            <Animated.View
              entering={FadeInDown.delay(160).duration(400)}
              style={[styles.extraCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {[
                { icon: '🎂', label: 'Next Birthday', value: `In ${result.nextBirthday} days` },
                { icon: '⭐', label: 'Zodiac Sign', value: result.zodiac },
                { icon: '📅', label: 'Born on', value: result.dayOfWeek },
              ].map(({ icon, label, value }) => (
                <View key={label} style={[styles.extraRow, { borderBottomColor: colors.border }]}>
                  <Text style={styles.extraIcon}>{icon}</Text>
                  <Text style={[styles.extraLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.extraValue, { color: colors.text }]}>{value}</Text>
                </View>
              ))}
            </Animated.View>
          </>
        ) : state.birthDate ? (
          <Text style={[styles.errorText, { color: colors.textTertiary }]}>
            Please enter a valid birth date before the target date.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AgeUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.ageUnit}>
      <Text style={[styles.ageValue, { color }]}>{value}</Text>
      <Text style={{ color: '#888', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function DateInput({ label, value, onChange, colors, accent }: any) {
  return (
    <View>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textTertiary}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: spacing.base },
  inputLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  dateInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  todayBtn: { borderRadius: radius.full, paddingVertical: spacing.sm, alignItems: 'center' },
  mainResult: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  mainResultLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ageSep: { fontSize: 24, fontWeight: '300' },
  ageUnit: { alignItems: 'center', gap: 4 },
  ageValue: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: 4,
  },
  statCardValue: { fontSize: 22, fontWeight: '800' },
  statCardLabel: { fontSize: 12 },
  extraCard: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  extraIcon: { fontSize: 18 },
  extraLabel: { flex: 1, fontSize: 14 },
  extraValue: { fontSize: 14, fontWeight: '600' },
  errorText: { textAlign: 'center', fontSize: 14, marginTop: spacing.lg },
});
