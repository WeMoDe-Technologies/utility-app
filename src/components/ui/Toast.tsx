import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing, radius, typography, border, plate } from '@/theme';
import { Plate } from './Plate';

type ToastTone = 'success' | 'error' | 'info';
interface ToastPayload { id: number; message: string; tone: ToastTone }

type Listener = (t: ToastPayload) => void;
const listeners = new Set<Listener>();
let nextId = 1;

/** Fire a transient toast from anywhere — no context wiring needed. */
export function toast(message: string, tone: ToastTone = 'success') {
  const payload = { id: nextId++, message, tone };
  listeners.forEach((l) => l(payload));
}

const TONE_ICON: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: '#4C6B3C',
  error: '#A6392B',
  info: '#27566B',
};

/** Mount once, near the root. Renders whatever `toast()` sends. */
export function ToastHost() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (payload) => {
      setCurrent(payload);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCurrent(null), 1900);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!current) return null;
  const tint = TONE_COLOR[current.tone];

  return (
    <View pointerEvents="none" style={[styles.host, { bottom: bottom + spacing.xl }]}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(180)}
        exiting={FadeOutDown.duration(150)}
      >
        <Plate
          offset={plate.base}
          radius={radius.sm}
          borderWidth={border.base}
          fill={colors.card}
          contentStyle={styles.toast}
        >
          <View style={[styles.bar, { backgroundColor: tint }]} />
          <Ionicons name={TONE_ICON[current.tone]} size={16} color={tint} />
          <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
            {current.message}
          </Text>
        </Plate>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 340,
    paddingRight: spacing.base,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
  bar: { width: 5, alignSelf: 'stretch', marginRight: spacing.xs },
  text: {
    flexShrink: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
