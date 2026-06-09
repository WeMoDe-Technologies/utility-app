import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { TextUtilityState } from '@/types';

const DEFAULT_STATE: TextUtilityState = {
  input: '',
  activeOperation: 'uppercase',
};

const OPERATIONS = [
  { id: 'uppercase', label: 'UPPER', fn: (s: string) => s.toUpperCase() },
  { id: 'lowercase', label: 'lower', fn: (s: string) => s.toLowerCase() },
  { id: 'titlecase', label: 'Title', fn: (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase()) },
  { id: 'sentencecase', label: 'Sentence', fn: (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() },
  { id: 'reverse', label: 'esreveR', fn: (s: string) => s.split('').reverse().join('') },
  { id: 'removeSpaces', label: 'NoSpaces', fn: (s: string) => s.replace(/\s+/g, '') },
  { id: 'trimSpaces', label: 'Trim', fn: (s: string) => s.replace(/\s+/g, ' ').trim() },
  { id: 'removeLines', label: 'No Lines', fn: (s: string) => s.replace(/\n+/g, ' ') },
  { id: 'countWords', label: '# Words', fn: (s: string) => s.trim() ? s.trim().split(/\s+/).length.toString() : '0' },
  { id: 'slug', label: 'slug-ify', fn: (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') },
  { id: 'camelCase', label: 'camelCase', fn: (s: string) => s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) },
  { id: 'snakeCase', label: 'snake_case', fn: (s: string) => s.toLowerCase().replace(/[^\w]+/g, '_') },
  { id: 'base64enc', label: 'Base64 Enc', fn: (s: string) => { try { return btoa(s); } catch { return 'Error'; } } },
  { id: 'base64dec', label: 'Base64 Dec', fn: (s: string) => { try { return atob(s); } catch { return 'Invalid Base64'; } } },
  { id: 'lineCount', label: '# Lines', fn: (s: string) => s.split('\n').length.toString() },
  { id: 'charCount', label: '# Chars', fn: (s: string) => s.length.toString() },
];

export default function TextUtilityScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<TextUtilityState>(
    'textUtility',
    DEFAULT_STATE
  );

  const activeOp = OPERATIONS.find((o) => o.id === state.activeOperation) ?? OPERATIONS[0];
  const output = useMemo(() => {
    if (!state.input) return '';
    return activeOp.fn(state.input);
  }, [state.input, state.activeOperation]);

  const stats = useMemo(() => ({
    chars: state.input.length,
    words: state.input.trim() ? state.input.trim().split(/\s+/).length : 0,
    lines: state.input.split('\n').length,
    sentences: state.input.split(/[.!?]+/).filter(Boolean).length,
  }), [state.input]);

  const handleCopy = async () => {
    if (!output) return;
    await Clipboard.setStringAsync(output);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Transformed text copied.');
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setState((p) => ({ ...p, input: text }));
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Text Tools"
        utilityId="textUtility"
        accentColor="#D946EF"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Input */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <View style={styles.inputHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>INPUT</Text>
            <Pressable onPress={handlePaste} style={[styles.pasteBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="clipboard-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.pasteBtnText, { color: colors.textSecondary }]}>Paste</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={state.input}
            onChangeText={(v) => setState((p) => ({ ...p, input: v }))}
            placeholder="Type or paste your text here..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
        </Animated.View>

        {/* Stats bar */}
        {state.input.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(80).duration(300)}
            style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {[
              { label: 'Chars', value: stats.chars },
              { label: 'Words', value: stats.words },
              { label: 'Lines', value: stats.lines },
              { label: 'Sentences', value: stats.sentences },
            ].map(({ label, value }) => (
              <View key={label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#D946EF' }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Operations */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TRANSFORM</Text>
          <View style={styles.opsGrid}>
            {OPERATIONS.map((op) => (
              <Pressable
                key={op.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setState((p) => ({ ...p, activeOperation: op.id }));
                }}
                style={[
                  styles.opChip,
                  {
                    backgroundColor:
                      state.activeOperation === op.id ? '#D946EF' : colors.card,
                    borderColor:
                      state.activeOperation === op.id ? '#D946EF' : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.opChipText,
                    {
                      color:
                        state.activeOperation === op.id ? '#fff' : colors.text,
                    },
                  ]}
                >
                  {op.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Output */}
        {output && (
          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
            <View style={styles.outputHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>OUTPUT</Text>
              <Pressable onPress={handleCopy} style={[styles.copyBtn, { backgroundColor: '#D946EF20' }]}>
                <Ionicons name="copy-outline" size={14} color="#D946EF" />
                <Text style={{ color: '#D946EF', fontSize: 13, fontWeight: '600' }}>Copy</Text>
              </Pressable>
            </View>
            <View style={[styles.outputBox, { backgroundColor: '#D946EF08', borderColor: '#D946EF30' }]}>
              <Text style={[styles.outputText, { color: colors.text }]} selectable>
                {output}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  inputHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pasteBtnText: { fontSize: 12, fontWeight: '600' },
  textArea: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    minHeight: 120,
    fontSize: 15,
    lineHeight: 22,
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  opsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  opChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  opChipText: { fontSize: 13, fontWeight: '600' },
  outputHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  outputBox: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    minHeight: 80,
  },
  outputText: { fontSize: 15, lineHeight: 22 },
});
