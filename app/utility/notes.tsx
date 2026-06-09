import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { NotesState, NoteItem } from '@/types';

const NOTE_COLORS = [
  '#6366F120', '#F43F5E20', '#10B98120', '#F59E0B20',
  '#06B6D420', '#8B5CF620', '#F97316 20', '#EC489920',
];

const DEFAULT_STATE: NotesState = {
  notes: [],
  activeNoteId: null,
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function NotesScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<NotesState>(
    'notes',
    DEFAULT_STATE
  );
  const [editingId, setEditingId] = useState<string | null>(
    state.activeNoteId
  );

  const activeNote = state.notes.find((n) => n.id === editingId);

  const createNote = () => {
    const newNote: NoteItem = {
      id: generateId(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      color: NOTE_COLORS[state.notes.length % NOTE_COLORS.length],
    };
    setState((p) => ({
      notes: [newNote, ...p.notes],
      activeNoteId: newNote.id,
    }));
    setEditingId(newNote.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateNote = (id: string, changes: Partial<NoteItem>) => {
    setState((p) => ({
      ...p,
      notes: p.notes.map((n) =>
        n.id === id ? { ...n, ...changes, updatedAt: Date.now() } : n
      ),
    }));
  };

  const deleteNote = (id: string) => {
    Alert.alert('Delete Note', 'Delete this note permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setState((p) => ({
            notes: p.notes.filter((n) => n.id !== id),
            activeNoteId: p.activeNoteId === id ? null : p.activeNoteId,
          }));
          if (editingId === id) setEditingId(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const sortedNotes = [...state.notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  if (editingId && activeNote) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg }]}
        edges={['bottom']}
      >
        <View
          style={[styles.editorHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        >
          <Pressable onPress={() => setEditingId(null)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={[styles.backLabel, { color: colors.text }]}>Notes</Text>
          </Pressable>
          <View style={styles.editorActions}>
            <Pressable
              onPress={() => updateNote(activeNote.id, { isPinned: !activeNote.isPinned })}
              style={styles.iconBtn}
            >
              <Ionicons
                name={activeNote.isPinned ? 'pin' : 'pin-outline'}
                size={20}
                color={activeNote.isPinned ? '#6366F1' : colors.textSecondary}
              />
            </Pressable>
            <Pressable onPress={() => deleteNote(activeNote.id)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <TextInput
          style={[styles.noteTitle, { color: colors.text }]}
          value={activeNote.title}
          onChangeText={(t) => updateNote(activeNote.id, { title: t })}
          placeholder="Title"
          placeholderTextColor={colors.textTertiary}
          multiline={false}
        />
        <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
          {new Date(activeNote.updatedAt).toLocaleDateString('en-IN', {
            dateStyle: 'medium',
          })}
        </Text>
        <TextInput
          style={[styles.noteBody, { color: colors.text }]}
          value={activeNote.content}
          onChangeText={(t) => updateNote(activeNote.id, { content: t })}
          placeholder="Start writing..."
          placeholderTextColor={colors.textTertiary}
          multiline
          autoFocus={!activeNote.content}
          textAlignVertical="top"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <UtilityHeader
        title="Notes"
        utilityId="notes"
        accentColor="#F43F5E"
        onClearData={clearState}
      />

      <FlatList
        data={sortedNotes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No notes yet
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 40).duration(300)}
            exiting={FadeOutUp.duration(200)}
            layout={Layout.springify()}
          >
            <Pressable
              onPress={() => {
                setEditingId(item.id);
                setState((p) => ({ ...p, activeNoteId: item.id }));
              }}
              style={[
                styles.noteCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderLeftColor: item.color.replace('20', ''),
                },
              ]}
            >
              <View style={styles.noteCardTop}>
                <Text style={[styles.noteCardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title || 'Untitled'}
                </Text>
                {item.isPinned && (
                  <Ionicons name="pin" size={12} color="#6366F1" />
                )}
              </View>
              <Text style={[styles.noteCardPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.content || 'Empty note'}
              </Text>
              <Text style={[styles.noteCardDate, { color: colors.textTertiary }]}>
                {new Date(item.updatedAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      />

      <Pressable
        onPress={createNote}
        style={[styles.fab, { backgroundColor: '#F43F5E' }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: 100 },
  noteCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noteCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteCardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  noteCardPreview: { fontSize: typography.sizes.sm, lineHeight: 18 },
  noteCardDate: { fontSize: typography.sizes.xs },
  fab: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing['2xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyText: { fontSize: typography.sizes.base },
  // Editor styles
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  editorActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  noteTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    letterSpacing: -0.5,
  },
  noteDate: {
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  noteBody: {
    flex: 1,
    fontSize: typography.sizes.base,
    paddingHorizontal: spacing.lg,
    lineHeight: 24,
  },
});
