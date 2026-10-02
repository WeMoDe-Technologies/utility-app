import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, Pressable, Switch, ScrollView, Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Card, FieldLabel, Slider, Notice, useHaptic, toast, onColour } from '@/components/ui';
import { spacing, radius, typography, border } from '@/theme';

const ACCENT = '#6E7A33';

/** iOS has no font called "monospace" — it silently falls back to the system
 *  face, which made generated passwords hard to read character by character. */
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

interface GeneratorState {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  avoidLookalikes: boolean;
  lastGenerated: string;
  history: string[];
}

const DEFAULT_STATE: GeneratorState = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  avoidLookalikes: false,
  lastGenerated: '',
  history: [],
};

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/** Ambiguous glyphs, excluded when "avoid look-alikes" is on. */
const LOOKALIKES = /[Il1O0]/g;

function pick(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Fisher–Yates, so the guaranteed characters aren't stuck at the front. */
function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

function buildPools(state: GeneratorState): string[] {
  const strip = (s: string) => (state.avoidLookalikes ? s.replace(LOOKALIKES, '') : s);
  const pools: string[] = [];
  if (state.includeUppercase) pools.push(strip(CHARSETS.uppercase));
  if (state.includeLowercase) pools.push(strip(CHARSETS.lowercase));
  if (state.includeNumbers) pools.push(strip(CHARSETS.numbers));
  if (state.includeSymbols) pools.push(CHARSETS.symbols);
  return pools.filter((p) => p.length > 0);
}

/**
 * Generates a password that actually contains one of every character class the
 * user asked for — the previous version drew each character from the combined
 * pool, so "include numbers" often produced a password with no digits at all.
 */
function generatePassword(state: GeneratorState): string {
  const pools = buildPools(state);
  if (pools.length === 0) return '';

  const combined = pools.join('');
  const length = Math.max(pools.length, state.length);

  // One guaranteed character per selected class…
  const chars = pools.map(pick);
  // …then fill the rest from everything
  for (let i = chars.length; i < length; i++) chars.push(pick(combined));

  return shuffle(chars).join('');
}

/** Shannon entropy in bits: log2(poolSize^length). */
function entropyBits(state: GeneratorState): number {
  const pools = buildPools(state);
  const poolSize = pools.join('').length;
  if (poolSize === 0) return 0;
  return state.length * Math.log2(poolSize);
}

function plural(n: number, unit: string): string {
  const rounded = Math.round(n);
  return `${rounded} ${unit}${rounded === 1 ? '' : 's'}`;
}

/** Rough offline-cracking estimate at 10^11 guesses/second. */
function crackTime(bits: number): string {
  if (bits === 0) return '—';
  const seconds = Math.pow(2, bits - 1) / 1e11;
  if (seconds < 1) return 'less than a second';
  if (seconds < 60) return plural(seconds, 'second');
  if (seconds < 3600) return plural(seconds / 60, 'minute');
  if (seconds < 86400) return plural(seconds / 3600, 'hour');
  if (seconds < 31536000) return plural(seconds / 86400, 'day');
  const years = seconds / 31536000;
  if (years < 1000) return plural(years, 'year');
  if (years < 1e6) return `${Math.round(years / 1000)} thousand years`;
  if (years < 1e9) return `${Math.round(years / 1e6)} million years`;
  return 'longer than the universe has existed';
}

interface Strength { label: string; color: string; ratio: number }

/** Strength read off real entropy rather than a checklist of character types. */
function strengthFor(bits: number): Strength {
  const ratio = Math.min(1, bits / 120);
  if (bits < 40)  return { label: 'Weak',       color: '#A6392B', ratio };
  if (bits < 60)  return { label: 'Fair',       color: '#C2902B', ratio };
  if (bits < 80)  return { label: 'Strong',     color: '#2E6A66', ratio };
  return { label: 'Very strong', color: '#4C6B3C', ratio };
}

const TOGGLES = [
  { key: 'includeUppercase', label: 'Uppercase', hint: 'A–Z' },
  { key: 'includeLowercase', label: 'Lowercase', hint: 'a–z' },
  { key: 'includeNumbers',   label: 'Numbers',   hint: '0–9' },
  { key: 'includeSymbols',   label: 'Symbols',   hint: '!@#$…' },
] as const;

export default function PasswordGeneratorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<GeneratorState>(
    'passwordGenerator',
    DEFAULT_STATE,
  );
  const haptic = useHaptic();

  const shakeAnim = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeAnim.value }] }));

  const activeClasses = TOGGLES.filter((t) => state[t.key]).length;
  const bits = useMemo(() => entropyBits(state), [state]);
  const strength = strengthFor(bits);

  const handleGenerate = useCallback(() => {
    haptic('medium');
    const pwd = generatePassword(state);
    if (!pwd) {
      toast('Pick at least one character type', 'error');
      return;
    }
    shakeAnim.value = withSequence(
      withTiming(-3, { duration: 45 }),
      withTiming(3, { duration: 45 }),
      withTiming(-2, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
    setState((p) => ({
      ...p,
      lastGenerated: pwd,
      history: [pwd, ...p.history.filter((h) => h !== pwd)].slice(0, 20),
    }));
  }, [state, setState, haptic, shakeAnim]);

  const copy = useCallback(
    async (value: string, message = 'Password copied') => {
      if (!value) return;
      await Clipboard.setStringAsync(value);
      haptic('success');
      toast(message);
    },
    [haptic],
  );

  /** Never let the user switch off every character class. */
  const toggle = useCallback(
    (key: typeof TOGGLES[number]['key'], value: boolean) => {
      if (!value && activeClasses <= 1) {
        haptic('warning');
        toast('At least one character type is required', 'error');
        return;
      }
      haptic('select');
      setState((p) => ({ ...p, [key]: value }));
    },
    [activeClasses, setState, haptic],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Password Generator"
        utilityId="passwordGenerator"
        accentColor={ACCENT}
        subtitle={state.lastGenerated ? `${Math.round(bits)} bits of entropy` : undefined}
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Password ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)} style={shakeStyle}>
          <Card style={styles.passwordCard}>
            {state.lastGenerated ? (
              <>
                <Text style={[styles.password, { color: colors.text, fontFamily: MONO }]} selectable>
                  {state.lastGenerated}
                </Text>

                <View style={styles.meta}>
                  <View style={[styles.strengthBar, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.strengthFill,
                        { backgroundColor: strength.color, width: `${Math.max(4, strength.ratio * 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                    <Text style={[styles.entropy, { color: colors.textTertiary }]}>
                      {Math.round(bits)} bits · {state.length} chars
                    </Text>
                  </View>
                  <Text style={[styles.crack, { color: colors.textTertiary }]}>
                    An offline attacker would need about {crackTime(bits)}.
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.placeholderWrap}>
                <Ionicons name="key-outline" size={30} color={colors.textTertiary} />
                <Text style={[styles.placeholder, { color: colors.textTertiary }]}>
                  Tap Generate to create a password
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(70).duration(280)} style={styles.actions}>
          <Pressable
            onPress={handleGenerate}
            accessibilityRole="button"
            style={[styles.generateBtn, { backgroundColor: ACCENT }]}
          >
            <Ionicons name="refresh" size={19} color={onColour(ACCENT)} />
            <Text style={[styles.generateBtnText, { color: onColour(ACCENT) }]}>Generate</Text>
          </Pressable>
          {state.lastGenerated ? (
            <Pressable
              onPress={() => copy(state.lastGenerated)}
              accessibilityRole="button"
              style={[styles.copyBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="copy-outline" size={19} color={colors.text} />
              <Text style={[styles.copyBtnText, { color: colors.text }]}>Copy</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* ── Settings ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(110).duration(280)}>
          <Card>
            <View>
              <View style={styles.lengthHeader}>
                <FieldLabel style={styles.noMargin}>Length</FieldLabel>
                <Text style={[styles.lengthValue, { color: ACCENT }]}>{state.length}</Text>
              </View>
              <Slider
                value={state.length}
                min={6}
                max={64}
                step={1}
                accent={ACCENT}
                onChange={(v) => setState((p) => ({ ...p, length: v }))}
              />
              <View style={styles.lengthScale}>
                <Text style={[styles.scaleTxt, { color: colors.textTertiary }]}>6</Text>
                <Text style={[styles.scaleTxt, { color: colors.textTertiary }]}>64</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {TOGGLES.map(({ key, label, hint }) => {
              const value = state[key];
              const isLastActive = value && activeClasses <= 1;
              return (
                <View key={key} style={styles.toggleRow}>
                  <View style={styles.toggleText}>
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
                    <Text style={[styles.toggleHint, { color: colors.textTertiary }]}>
                      {isLastActive ? 'Required — the last type in use' : hint}
                    </Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={(v) => toggle(key, v)}
                    trackColor={{ false: colors.muted, true: ACCENT + '70' }}
                    thumbColor={value ? ACCENT : colors.subtle}
                  />
                </View>
              );
            })}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Avoid look-alikes</Text>
                <Text style={[styles.toggleHint, { color: colors.textTertiary }]}>
                  Skip I, l, 1, O and 0
                </Text>
              </View>
              <Switch
                value={state.avoidLookalikes}
                onValueChange={(v) => { haptic('select'); setState((p) => ({ ...p, avoidLookalikes: v })); }}
                trackColor={{ false: colors.muted, true: ACCENT + '70' }}
                thumbColor={state.avoidLookalikes ? ACCENT : colors.subtle}
              />
            </View>
          </Card>
        </Animated.View>

        {bits > 0 && bits < 60 && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Notice
              tone="warn"
              text="Under 60 bits is guessable by a determined attacker. Lengthen the password or add more character types."
            />
          </Animated.View>
        )}

        {/* ── History ──────────────────────────────────────────────────── */}
        {state.history.length > 1 && (
          <Animated.View entering={FadeInDown.delay(150).duration(280)}>
            <Card padded={false}>
              <View style={styles.historyHeader}>
                <FieldLabel style={styles.noMargin}>Previously generated</FieldLabel>
                <Pressable
                  onPress={() => { haptic('light'); setState((p) => ({ ...p, history: p.lastGenerated ? [p.lastGenerated] : [] })); }}
                  hitSlop={8}
                >
                  <Text style={[styles.clearHistory, { color: colors.textTertiary }]}>Clear</Text>
                </Pressable>
              </View>
              {state.history.slice(1, 8).map((pwd, i) => (
                <Pressable
                  key={`${pwd}-${i}`}
                  onPress={() => copy(pwd, 'Copied that password')}
                  accessibilityRole="button"
                  accessibilityLabel="Copy this password"
                  style={({ pressed }) => [
                    styles.historyItem,
                    { borderTopColor: colors.border },
                    pressed && { backgroundColor: colors.muted },
                  ]}
                >
                  <Text
                    style={[styles.historyPwd, { color: colors.textSecondary, fontFamily: MONO }]}
                    numberOfLines={1}
                  >
                    {pwd}
                  </Text>
                  <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
                </Pressable>
              ))}
            </Card>
          </Animated.View>
        )}

        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          Passwords are generated on this device and never leave it. They are not saved anywhere
          except the short history above, which you can clear at any time.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 48 },
  noMargin: { marginBottom: 0 },
  divider: { height: StyleSheet.hairlineWidth },

  passwordCard: { minHeight: 132, justifyContent: 'center' },
  password: {
    fontSize: 19,
    letterSpacing: 1,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 27,
  },
  placeholderWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  placeholder: { textAlign: 'center', fontSize: typography.sizes.base },

  meta: { gap: spacing.xs },
  strengthBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 3 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strengthLabel: { fontSize: typography.sizes.sm, fontWeight: '800' },
  entropy: { fontSize: typography.sizes.xs, fontVariant: ['tabular-nums'] },
  crack: { fontSize: typography.sizes.xs, lineHeight: 16 },

  actions: { flexDirection: 'row', gap: spacing.sm },
  generateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 1,
    borderRadius: radius.xl,
  },
  generateBtnText: { fontSize: typography.sizes.base, fontWeight: '800' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 1,
    borderRadius: radius.xl,
    borderWidth: border.base,
  },
  copyBtnText: { fontSize: typography.sizes.base, fontWeight: '700' },

  lengthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lengthValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  lengthScale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleTxt: { fontSize: 10 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: typography.sizes.base, fontWeight: '600' },
  toggleHint: { fontSize: typography.sizes.xs, marginTop: 1 },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    paddingBottom: spacing.sm,
  },
  clearHistory: { fontSize: typography.sizes.xs, fontWeight: '700' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  historyPwd: { flex: 1, fontSize: typography.sizes.sm },

  footnote: { fontSize: typography.sizes.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
});
