import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { radius, shadows } from '@/theme';
import { useTheme } from '@/theme/ThemeProvider';

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  elevation?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function PressableCard({
  children,
  onPress,
  onLongPress,
  style,
  elevation = 'sm',
  disabled,
}: PressableCardProps) {
  const { colors } = useTheme();
  const { hapticFeedback } = usePreferencesStore();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleLongPress = () => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  };

  return (
    <Animated.View style={[animStyle, shadows[elevation]]}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
