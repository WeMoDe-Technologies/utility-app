import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Card, FieldLabel, NumericField, Notice, StatTile } from '@/components/ui';
import { formatNumber } from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';
import type { AgeCalculatorState } from '@/types';

const ACCENT = '#2E6A66';

/** Today as YYYY-MM-DD in the *device's* timezone (not UTC). */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DEFAULT_STATE: AgeCalculatorState = {
  birthDate: '',
  targetDate: todayISO(),
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
  nextBirthdayAge: number;
  zodiac: string;
  dayOfWeek: string;
}

const ZODIAC: Array<{ sign: string; end: [number, number] }> = [
  { sign: '♑ Capricorn',  end: [1, 19] },
  { sign: '♒ Aquarius',   end: [2, 18] },
  { sign: '♓ Pisces',     end: [3, 20] },
  { sign: '♈ Aries',      end: [4, 19] },
  { sign: '♉ Taurus',     end: [5, 20] },
  { sign: '♊ Gemini',     end: [6, 20] },
  { sign: '♋ Cancer',     end: [7, 22] },
  { sign: '♌ Leo',        end: [8, 22] },
  { sign: '♍ Virgo',      end: [9, 22] },
  { sign: '♎ Libra',      end: [10, 22] },
  { sign: '♏ Scorpio',    end: [11, 21] },
  { sign: '♐ Sagittarius', end: [12, 21] },
  { sign: '♑ Capricorn',  end: [12, 31] },
];

function getZodiac(month: number, day: number): string {
  for (const z of ZODIAC) {
    if (month < z.end[0] || (month === z.end[0] && day <= z.end[1])) return z.sign;
  }
  return '♑ Capricorn';
}

/** Insert dashes as the user types: 19900115 → 1990-01-15 */
function formatDateInput(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 8);
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6)}`;
}

/**
 * Parse YYYY-MM-DD as a LOCAL date.
 *
 * `new Date('1990-01-15')` is parsed as UTC midnight, while the comparison
 * dates were built with the local-time constructor. West of Greenwich that
 * mismatch shifted every result by a day.
 *
 * Also rejects impossible dates: '2023-02-31' would otherwise roll over to
 * 3 March and silently report the wrong age.
 */
function parseLocalDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1 || year > 9999) return null;

  const d = new Date(year, month - 1, day);
  // Rolled over (e.g. 31 Feb) → not a real calendar date
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

type AgeOutcome =
  | { kind: 'ok'; result: AgeResult }
  | { kind: 'error'; message: string }
  | null;

function calculateAge(birthStr: string, targetStr: string): AgeOutcome {
  if (!birthStr && !targetStr) return null;
  if (birthStr.length < 10) return null;

  const birth = parseLocalDate(birthStr);
  if (!birth) return { kind: 'error', message: 'Enter the date of birth as YYYY-MM-DD.' };

  const target = parseLocalDate(targetStr);
  if (!target) return { kind: 'error', message: 'Enter the target date as YYYY-MM-DD.' };

  if (birth > target) {
    return { kind: 'error', message: 'The date of birth must come before the target date.' };
  }

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    // Day count of the month *before* the target month
    const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const diffMs = target.getTime() - birth.getTime();
  const totalDays = Math.round(diffMs / 86400000);

  // Next birthday, handling 29 February gracefully
  const nextBD = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBD.getMonth() !== birth.getMonth()) nextBD.setDate(0); // 29 Feb in a common year → 28 Feb
  if (nextBD <= target) {
    nextBD.setFullYear(nextBD.getFullYear() + 1);
    if (nextBD.getMonth() !== birth.getMonth()) nextBD.setDate(0);
  }
  const daysToNextBD = Math.round((nextBD.getTime() - target.getTime()) / 86400000);

  return {
    kind: 'ok',
    result: {
      years, months, days,
      totalDays,
      totalMonths: years * 12 + months,
      totalWeeks: Math.floor(totalDays / 7),
      totalHours: totalDays * 24,
      nextBirthday: daysToNextBD,
      nextBirthdayAge: years + 1,
      zodiac: getZodiac(birth.getMonth() + 1, birth.getDate()),
      dayOfWeek: birth.toLocaleDateString(undefined, { weekday: 'long' }),
    },
  };
}

export default function AgeCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<AgeCalculatorState>(
    'ageCalculator',
    DEFAULT_STATE,
  );

  const outcome = useMemo(
    () => calculateAge(state.birthDate, state.targetDate),
    [state.birthDate, state.targetDate],
  );

  const result = outcome?.kind === 'ok' ? outcome.result : null;
  const isToday = state.targetDate === todayISO();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Age Calculator"
        utilityId="ageCalculator"
        accentColor={ACCENT}
        subtitle={result ? `${result.years} years, ${result.months} months, ${result.days} days` : undefined}
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Inputs */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <Card>
            <View>
              <FieldLabel>Date of birth</FieldLabel>
              <NumericField
                value={state.birthDate}
                onChangeText={(v) => setState((p) => ({ ...p, birthDate: formatDateInput(v) }))}
                placeholder="YYYY-MM-DD"
                accent={ACCENT}
                keyboardType="number-pad"
                sanitise={false}
                maxLength={10}
                inputStyle={styles.dateInput}
              />
            </View>

            <View>
              <FieldLabel>Age on</FieldLabel>
              <NumericField
                value={state.targetDate}
                onChangeText={(v) => setState((p) => ({ ...p, targetDate: formatDateInput(v) }))}
                placeholder="YYYY-MM-DD"
                accent={ACCENT}
                keyboardType="number-pad"
                sanitise={false}
                maxLength={10}
                inputStyle={styles.dateInput}
              />
            </View>

            {!isToday && (
              <Pressable
                onPress={() => setState((p) => ({ ...p, targetDate: todayISO() }))}
                style={[styles.todayBtn, { backgroundColor: ACCENT + '18', borderColor: ACCENT + '38' }]}
              >
                <Text style={[styles.todayBtnTxt, { color: ACCENT }]}>Reset to today</Text>
              </Pressable>
            )}

            {outcome?.kind === 'error' && <Notice text={outcome.message} tone="warn" />}
          </Card>
        </Animated.View>

        {result && (
          <>
            {/* Headline age */}
            <Animated.View entering={FadeInDown.delay(70).duration(340)}>
              <Card tone="accent" accent={ACCENT} style={styles.mainResult}>
                <Text style={[styles.mainResultLabel, { color: ACCENT }]}>AGE</Text>
                <View style={styles.ageRow}>
                  <AgeUnit value={result.years} label="Years" color={ACCENT} colors={colors} />
                  <Text style={[styles.ageSep, { color: colors.textTertiary }]}>·</Text>
                  <AgeUnit value={result.months} label="Months" color="#6B4A6E" colors={colors} />
                  <Text style={[styles.ageSep, { color: colors.textTertiary }]}>·</Text>
                  <AgeUnit value={result.days} label="Days" color="#7A3246" colors={colors} />
                </View>
              </Card>
            </Animated.View>

            {/* Totals */}
            <Animated.View entering={FadeInDown.delay(110).duration(340)} style={styles.statsGrid}>
              <StatTile label="Total days" value={formatNumber(result.totalDays, { decimals: 0 })} color="#3C5A7D" />
              <StatTile label="Total weeks" value={formatNumber(result.totalWeeks, { decimals: 0 })} color="#4C6B3C" />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(140).duration(340)} style={styles.statsGrid}>
              <StatTile label="Total months" value={formatNumber(result.totalMonths, { decimals: 0 })} color="#C2902B" />
              <StatTile label="Total hours" value={formatNumber(result.totalHours, { decimals: 0 })} color="#A6392B" />
            </Animated.View>

            {/* Extras */}
            <Animated.View entering={FadeInDown.delay(170).duration(340)}>
              <Card padded={false}>
                {[
                  {
                    icon: '🎂',
                    label: 'Next birthday',
                    value: result.nextBirthday === 0
                      ? 'Today! 🎉'
                      : `In ${result.nextBirthday} day${result.nextBirthday === 1 ? '' : 's'} (turns ${result.nextBirthdayAge})`,
                  },
                  { icon: '⭐', label: 'Zodiac sign', value: result.zodiac },
                  { icon: '📅', label: 'Born on a', value: result.dayOfWeek },
                ].map(({ icon, label, value }, i) => (
                  <View
                    key={label}
                    style={[
                      styles.extraRow,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}
                  >
                    <Text style={styles.extraIcon}>{icon}</Text>
                    <Text style={[styles.extraLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.extraValue, { color: colors.text }]} numberOfLines={1}>
                      {value}
                    </Text>
                  </View>
                ))}
              </Card>
            </Animated.View>
          </>
        )}

        {!outcome && (
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Type a date of birth to see the exact age, totals and the next birthday.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AgeUnit({ value, label, color, colors }: { value: number; label: string; color: string; colors: any }) {
  return (
    <View style={styles.ageUnit}>
      <Text style={[styles.ageValue, { color }]}>{value}</Text>
      <Text style={[styles.ageUnitLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 48 },

  dateInput: { fontSize: 20, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  todayBtn: {
    borderRadius: radius.sm,
    borderWidth: border.base,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  todayBtnTxt: { fontWeight: '700', fontSize: typography.sizes.sm },

  mainResult: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  mainResultLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ageSep: { fontSize: 24, fontWeight: '300' },
  ageUnit: { alignItems: 'center', gap: 2 },
  ageValue: { fontSize: 42, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ageUnitLabel: { fontSize: 12 },

  statsGrid: { flexDirection: 'row', gap: spacing.sm },

  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  extraIcon: { fontSize: 18 },
  extraLabel: { flex: 1, fontSize: typography.sizes.sm },
  extraValue: { fontSize: typography.sizes.sm, fontWeight: '700', flexShrink: 1 },

  hint: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
});
