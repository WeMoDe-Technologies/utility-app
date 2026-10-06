/**
 * The update prompt.
 *
 * Two states that look deliberately different, because they mean different
 * things. An optional update is an offer: it sits over the app, it can be
 * waved away, and waving it away is remembered until a newer release. A
 * mandatory one is a wall — no dismiss control, no way past it but to go and
 * get the build.
 *
 * Drawn in the app's own language: a plate with a hard offset shadow over a
 * flat scrim, no blur anywhere.
 */

import React, { useCallback } from 'react';
// React Native's own Linking, not expo-linking: opening an https URL needs no
// extra native module, and reaching for one would mean another prebuild for
// nothing.
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing, radius, typography, border, plate } from '@/theme';
import { Plate, Button, FieldLabel, Rule, onColour } from '@/components/ui';
import type { UpdateDecision } from '@/update';

interface Props {
  decision: UpdateDecision;
  currentVersion: string;
  onDismiss: () => void;
}

export function UpdateGate({ decision, currentVersion, onDismiss }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const open = useCallback(() => {
    if (decision.kind === 'none' || !decision.downloadUrl) return;
    // Failure here is silent on purpose: there is nothing useful to say to
    // someone whose device has no handler for the link, and the gate stays up.
    Linking.openURL(decision.downloadUrl).catch(() => {});
  }, [decision]);

  if (decision.kind === 'none') return null;
  const required = decision.kind === 'mandatory';

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      // A required update swallows touches to everything behind it.
      pointerEvents="auto"
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: required ? colors.bg : `${colors.bg}F2` },
        ]}
      />

      <View style={[styles.centre, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
        <Plate
          offset={plate.high}
          radius={radius.lg}
          borderWidth={border.base}
          fill={colors.card}
          borderColor={colors.border}
          style={styles.plate}
          contentStyle={styles.body}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.accent, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name={required ? 'lock-closed' : 'arrow-down'}
                size={16}
                color={onColour(colors.accent)}
              />
            </View>
            <FieldLabel style={styles.legend} color={colors.textTertiary}>
              {required ? 'Update required' : 'Update available'}
            </FieldLabel>
          </View>

          <Rule color={colors.border} />

          <Text style={[styles.version, { color: colors.text }]}>
            Version {decision.version}
          </Text>
          <Text style={[styles.current, { color: colors.textTertiary }]}>
            You have {currentVersion}
          </Text>

          {decision.releaseNotes ? (
            <Text style={[styles.notes, { color: colors.textSecondary }]}>
              {decision.releaseNotes}
            </Text>
          ) : null}

          <Text style={[styles.reason, { color: colors.textSecondary }]}>
            {required
              ? 'This version is no longer supported. Update to carry on.'
              : 'A newer version is ready.'}
          </Text>

          <View style={styles.actions}>
            {decision.downloadUrl ? (
              <Button label="Update" icon="open-outline" onPress={open} />
            ) : (
              // Downgraded from mandatory: the manifest asked for an update it
              // gave no way to get. Say so rather than showing a dead button.
              <Text style={[styles.stranded, { color: colors.textTertiary }]}>
                No download link was published for this release.
              </Text>
            )}
            {!required ? (
              <Button label="Not now" variant="ghost" onPress={onDismiss} />
            ) : null}
          </View>
        </Plate>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  plate: { alignSelf: 'stretch' },
  body: {
    padding: spacing.base,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    width: 30,
    height: 30,
    borderWidth: border.base,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { marginBottom: 0 },
  version: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.tracking.tight,
  },
  current: {
    fontSize: typography.sizes.sm,
    marginTop: -spacing.xs,
  },
  notes: {
    fontSize: typography.sizes.base,
    lineHeight: 21,
  },
  reason: {
    fontSize: typography.sizes.sm,
    lineHeight: 19,
  },
  actions: { gap: spacing.sm },
  stranded: {
    fontSize: typography.sizes.sm,
    lineHeight: 19,
  },
});
