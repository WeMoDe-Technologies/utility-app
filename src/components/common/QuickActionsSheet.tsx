import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { clearUtilityData } from '@/utils/storage';
import { spacing, radius, typography, shadows } from '@/theme';
import { UtilityIcon } from './UtilityIcon';
import type { UtilityDefinition } from '@/types';

interface QuickActionsSheetProps {
  utility: UtilityDefinition | null;
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_H } = Dimensions.get('window');

export function QuickActionsSheet({
  utility,
  visible,
  onClose,
}: QuickActionsSheetProps) {
  const { colors } = useTheme();
  const { isFavourite, toggleFavourite } = useFavouritesStore();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_H,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!utility) return null;

  const favourite = isFavourite(utility.id);

  const actions = [
    {
      id: 'open',
      icon: 'arrow-forward-circle',
      label: 'Open',
      color: utility.color,
      onPress: () => {
        onClose();
        setTimeout(() => router.push(utility.route as any), 250);
      },
    },
    {
      id: 'favourite',
      icon: favourite ? 'star' : 'star-outline',
      label: favourite ? 'Remove from Favourites' : 'Add to Favourites',
      color: '#F59E0B',
      onPress: () => {
        toggleFavourite(utility.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
      },
    },
    {
      id: 'clear',
      icon: 'trash-outline',
      label: 'Clear Data',
      color: '#F43F5E',
      onPress: () => {
        clearUtilityData(utility.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onClose();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            transform: [{ translateY: slideAnim }],
          },
          shadows.lg,
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.muted }]} />

        {/* Utility info header */}
        <View style={styles.utilityInfo}>
          <View style={[styles.iconWrapper, { backgroundColor: utility.color + '20' }]}>
            <UtilityIcon utility={utility} size={28} color={utility.color} />
          </View>
          <View>
            <Text style={[styles.utilityName, { color: colors.text }]}>{utility.title}</Text>
            <Text style={[styles.utilityDesc, { color: colors.textSecondary }]}>
              {utility.description}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Actions */}
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { backgroundColor: colors.muted },
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color:
                      action.id === 'clear' ? action.color : colors.text,
                  },
                ]}
              >
                {action.label}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Cancel */}
        <Pressable
          onPress={onClose}
          style={[styles.cancelBtn, { backgroundColor: colors.muted }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingBottom: 40,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  utilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  utilityDesc: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  actions: { paddingHorizontal: spacing.base },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  cancelBtn: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
