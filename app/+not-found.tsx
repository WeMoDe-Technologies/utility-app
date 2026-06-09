import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Text style={[styles.emoji]}>🔍</Text>
      <Text style={[styles.title, { color: colors.text }]}>Page not found</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        This route doesn't exist.
      </Text>
      <Pressable
        onPress={() => router.replace('/')}
        style={[styles.btn, { backgroundColor: colors.accent }]}
      >
        <Text style={styles.btnText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emoji: { fontSize: 48 },
  title: { fontSize: typography.sizes['2xl'], fontWeight: '700' },
  sub: { fontSize: typography.sizes.base },
  btn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: typography.sizes.base },
});
