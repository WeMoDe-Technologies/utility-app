import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { PasswordGeneratorState } from '@/types';

const DEFAULT_STATE: PasswordGeneratorState = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: false,
  lastGenerated: '',
  history: [],
};

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

function generatePassword(state: PasswordGeneratorState): string {
  let charset = '';
  if (state.includeUppercase) charset += CHARSETS.uppercase;
  if (state.includeLowercase) charset += CHARSETS.lowercase;
  if (state.includeNumbers) charset += CHARSETS.numbers;
  if (state.includeSymbols) charset += CHARSETS.symbols;
  if (!charset) charset = CHARSETS.lowercase;

  let password = '';
  for (let i = 0; i < state.length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  return password;
}

function getStrengthInfo(password: string): { label: string; color: string; score: number } {
  if (!password) return { label: '', color: 'transparent', score: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: '#F43F5E', score };
  if (score <= 4) return { label: 'Fair', color: '#F59E0B', score };
  if (score <= 5) return { label: 'Good', color: '#06B6D4', score };
  return { label: 'Strong', color: '#10B981', score };
}

export default function PasswordGeneratorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<PasswordGeneratorState>(
    'passwordGenerator',
    DEFAULT_STATE
  );
  const shakeAnim = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  const handleGenerate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pwd = generatePassword(state);
    shakeAnim.value = withSequence(
      withTiming(-3, { duration: 50 }),
      withTiming(3, { duration: 50 }),
      withTiming(-3, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    setState((p) => ({
      ...p,
      lastGenerated: pwd,
      history: [pwd, ...p.history].slice(0, 20),
    }));
  }, [state]);

  const handleCopy = async () => {
    if (!state.lastGenerated) return;
    await Clipboard.setStringAsync(state.lastGenerated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Password copied to clipboard.');
  };

  const strength = getStrengthInfo(state.lastGenerated);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <UtilityHeader
        title="Password Generator"
        utilityId="passwordGenerator"
        accentColor="#84CC16"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Password Display */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[
            styles.passwordCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            shakeStyle,
          ]}
        >
          {state.lastGenerated ? (
            <>
              <Text style={[styles.password, { color: colors.text }]} selectable>
                {state.lastGenerated}
              </Text>
              <View style={styles.passwordMeta}>
                <View style={[styles.strengthBar, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        backgroundColor: strength.color,
                        width: `${(strength.score / 7) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.passwordPlaceholder, { color: colors.textTertiary }]}>
              Tap Generate to create a password
            </Text>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(300)}
          style={styles.actions}
        >
          <Pressable
            onPress={handleGenerate}
            style={[styles.generateBtn, { backgroundColor: '#84CC16' }]}
          >
            <Ionicons name="refresh" size={20} color="#000" />
            <Text style={styles.generateBtnText}>Generate</Text>
          </Pressable>
          {state.lastGenerated ? (
            <Pressable
              onPress={handleCopy}
              style={[styles.copyBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[styles.copyBtnText, { color: colors.text }]}>Copy</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* Settings */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(300)}
          style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Length slider */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Length: <Text style={{ color: '#84CC16', fontWeight: '700' }}>{state.length}</Text>
            </Text>
            <View style={styles.lengthControls}>
              {[8, 12, 16, 20, 24, 32].map((len) => (
                <Pressable
                  key={len}
                  onPress={() => setState((p) => ({ ...p, length: len }))}
                  style={[
                    styles.lenChip,
                    {
                      backgroundColor:
                        state.length === len ? '#84CC16' : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.lenChipText,
                      { color: state.length === len ? '#000' : colors.textSecondary },
                    ]}
                  >
                    {len}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {[
            { key: 'includeUppercase', label: 'Uppercase (A–Z)' },
            { key: 'includeLowercase', label: 'Lowercase (a–z)' },
            { key: 'includeNumbers', label: 'Numbers (0–9)' },
            { key: 'includeSymbols', label: 'Symbols (!@#$...)' },
          ].map(({ key, label }) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
              <Switch
                value={state[key as keyof PasswordGeneratorState] as boolean}
                onValueChange={(val) =>
                  setState((p) => ({ ...p, [key]: val }))
                }
                trackColor={{ false: colors.muted, true: '#84CC16' + '60' }}
                thumbColor={
                  (state[key as keyof PasswordGeneratorState] as boolean)
                    ? '#84CC16'
                    : colors.subtle
                }
              />
            </View>
          ))}
        </Animated.View>

        {/* History */}
        {state.history.length > 1 && (
          <Animated.View entering={FadeInDown.delay(160).duration(300)}>
            <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>
              HISTORY
            </Text>
            {state.history.slice(1, 6).map((pwd, i) => (
              <Pressable
                key={i}
                onPress={async () => {
                  await Clipboard.setStringAsync(pwd);
                  Alert.alert('Copied!', 'Password copied to clipboard.');
                }}
                style={[styles.historyItem, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.historyPwd, { color: colors.textSecondary }]} numberOfLines={1}>
                  {pwd}
                </Text>
                <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  passwordCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 100,
    justifyContent: 'center',
  },
  password: {
    fontSize: typography.sizes.lg,
    fontFamily: 'monospace',
    letterSpacing: 1,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  passwordPlaceholder: {
    textAlign: 'center',
    fontSize: typography.sizes.base,
  },
  passwordMeta: { gap: spacing.xs },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  generateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  generateBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#000',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  copyBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  settingsCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.md,
  },
  settingRow: { gap: spacing.sm },
  settingLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  lengthControls: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  lenChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  lenChipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  divider: { height: StyleSheet.hairlineWidth },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: typography.sizes.base },
  historyTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyPwd: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: 'monospace',
    marginRight: spacing.sm,
  },
});
