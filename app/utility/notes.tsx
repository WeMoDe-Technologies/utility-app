import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  FadeInUp,
  FadeOutUp,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { NotesState, NoteItem } from '@/types';

// ─── Constants ─────────────────────────────────────────────────────────────
const ACCENT = '#F43F5E';
const { width: SW } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_W   = (SW - spacing.base * 2 - CARD_GAP) / 2;

// Sticky-note pastel fills — light/dark aware via opacity
const STICKY_COLORS = [
  { key: 'mint',    light: '#A8E6CF', dark: '#1A4D3A' },
  { key: 'peach',   light: '#FFCCB3', dark: '#4D2A1A' },
  { key: 'lavender',light: '#C8B8E8', dark: '#2E1F4D' },
  { key: 'sky',     light: '#AEDFF7', dark: '#1A3B4D' },
  { key: 'lemon',   light: '#FFF3A3', dark: '#4D4A1A' },
  { key: 'blush',   light: '#FFBDCC', dark: '#4D1A28' },
  { key: 'sage',    light: '#C8E6C9', dark: '#1A3D1E' },
  { key: 'lilac',   light: '#E1BEE7', dark: '#3A1A4D' },
];

// Categories
const CATEGORIES = ['Personal', 'Work', 'Ideas', 'Tasks', 'Journal', 'Other'];

// ─── Types ─────────────────────────────────────────────────────────────────
interface RichNote extends NoteItem {
  isFavorite?: boolean;
  category?:   string;
  colorKey?:   string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getStickyColor(key?: string, dark = false) {
  const c = STICKY_COLORS.find(s => s.key === key) ?? STICKY_COLORS[0];
  return dark ? c.dark : c.light;
}

// Text color that contrasts the sticky bg
function stickyTextColor(key?: string, dark = false): string {
  return dark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.72)';
}

function stickySubColor(key?: string, dark = false): string {
  return dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { dateStyle: 'short' });
}

function fmtFull(ts: number): string {
  return new Date(ts).toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit',
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

const DEFAULT_STATE: NotesState = { notes: [], activeNoteId: null };

// ─── Sticky Note Card ───────────────────────────────────────────────────────
function StickyCard({
  note,
  isDark,
  onPress,
  onDelete,
  onPin,
}: {
  note: RichNote;
  isDark: boolean;
  onPress: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const bg      = getStickyColor(note.colorKey, isDark);
  const textClr = stickyTextColor(note.colorKey, isDark);
  const subClr  = stickySubColor(note.colorKey, isDark);
  const scale   = useSharedValue(1);
  const anim    = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={{ width: CARD_W }}>
      <Animated.View style={anim}>
        <Pressable
          onPressIn ={() => { scale.value = withSpring(0.96, { damping: 14 }); }}
          onPressOut={() => { scale.value = withSpring(1,    { damping: 14 }); }}
          onPress={onPress}
          style={[styles.stickyCard, { backgroundColor: bg }]}
        >
          {/* Top row: pin badge + action buttons */}
          <View style={styles.stickyTop}>
            {note.isPinned ? (
              <View style={styles.pinDot}>
                <Ionicons name="pin" size={11} color={isDark ? '#fff' : '#333'} />
              </View>
            ) : <View style={styles.pinDotPlaceholder} />}

            <View style={styles.stickyActions}>
              {note.isFavorite && (
                <Ionicons name="star" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
              )}
              <Pressable onPress={onPin} hitSlop={10} style={styles.stickyActionBtn}>
                <Ionicons
                  name={note.isPinned ? 'pin' : 'pin-outline'}
                  size={13}
                  color={subClr}
                />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={10} style={styles.stickyActionBtn}>
                <Ionicons name="trash-outline" size={13} color={subClr} />
              </Pressable>
            </View>
          </View>

          {/* Title */}
          {note.title ? (
            <Text style={[styles.stickyTitle, { color: textClr }]} numberOfLines={2}>
              {note.title}
            </Text>
          ) : null}

          {/* Body preview */}
          <Text
            style={[styles.stickyBody, { color: subClr }]}
            numberOfLines={note.title ? 3 : 5}
          >
            {note.content || 'Empty note'}
          </Text>

          {/* Footer */}
          <View style={styles.stickyFooter}>
            {note.category ? (
              <Text style={[styles.stickyCat, { color: subClr }]}>{note.category}</Text>
            ) : <View />}
            <Text style={[styles.stickyDate, { color: subClr }]}>
              {relativeDate(note.updatedAt)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Color Picker (inside editor) ──────────────────────────────────────────
function ColorRow({
  selected,
  onSelect,
  isDark,
}: { selected?: string; onSelect: (k: string) => void; isDark: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
      {STICKY_COLORS.map((c) => {
        const bg  = isDark ? c.dark : c.light;
        const sel = selected === c.key;
        return (
          <Pressable
            key={c.key}
            onPress={() => onSelect(c.key)}
            style={[
              styles.colorSwatch,
              { backgroundColor: bg },
              sel && styles.colorSwatchSel,
            ]}
          >
            {sel && <Ionicons name="checkmark" size={13} color={isDark ? '#fff' : '#333'} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Category Row ──────────────────────────────────────────────────────────
function CategoryRow({
  selected,
  onSelect,
  accentColor,
  colors,
}: { selected?: string; onSelect: (c?: string) => void; accentColor: string; colors: any }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
      <Pressable
        onPress={() => onSelect(undefined)}
        style={[
          styles.catChip,
          {
            backgroundColor: !selected ? accentColor + '22' : colors.muted,
            borderColor: !selected ? accentColor + '55' : colors.border,
          },
        ]}
      >
        <Text style={[styles.catChipTxt, { color: !selected ? accentColor : colors.textSecondary }]}>
          None
        </Text>
      </Pressable>
      {CATEGORIES.map((cat) => (
        <Pressable
          key={cat}
          onPress={() => onSelect(cat)}
          style={[
            styles.catChip,
            {
              backgroundColor: selected === cat ? accentColor + '22' : colors.muted,
              borderColor: selected === cat ? accentColor + '55' : colors.border,
            },
          ]}
        >
          <Text style={[styles.catChipTxt, { color: selected === cat ? accentColor : colors.textSecondary }]}>
            {cat}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Note Editor Modal ─────────────────────────────────────────────────────
function NoteEditorModal({
  note,
  visible,
  isDark,
  onSave,
  onDiscard,
  onDelete,
  colors,
}: {
  note: RichNote | null;
  visible: boolean;
  isDark: boolean;
  onSave: (draft: RichNote) => void;
  onDiscard: () => void;
  onDelete: (id: string) => void;
  colors: any;
}) {
  const [draft, setDraft]       = useState<RichNote | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [savedFlash, setSavedFlash]   = useState(false);

  // Sync draft whenever a new note is opened
  useEffect(() => {
    if (note) { setDraft({ ...note }); setShowOptions(false); }
  }, [note?.id]);

  if (!draft) return null;

  const bg       = getStickyColor(draft.colorKey, isDark);
  const textClr  = stickyTextColor(draft.colorKey, isDark);
  const subClr   = stickySubColor(draft.colorKey, isDark);
  const charCount = (draft.content ?? '').length;

  const isDirty = note
    ? draft.title     !== note.title     ||
      draft.content   !== note.content   ||
      draft.colorKey  !== note.colorKey  ||
      draft.category  !== note.category  ||
      draft.isPinned  !== note.isPinned  ||
      draft.isFavorite !== note.isFavorite
    : false;

  const up = (changes: Partial<RichNote>) =>
    setDraft(d => d ? { ...d, ...changes } : d);

  const handleSave = () => {
    onSave(draft);
    setSavedFlash(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  const handleClose = () => {
    if (isDirty) {
      Alert.alert('Unsaved changes', 'What would you like to do?', [
        { text: 'Discard', style: 'destructive', onPress: onDiscard },
        { text: 'Save & Close', onPress: () => { onSave(draft); onDiscard(); } },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      onDiscard();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: bg }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Modal header bar ── */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            {/* Close */}
            <Pressable onPress={handleClose} style={styles.modalHeaderBtn} hitSlop={10}>
              <Ionicons name="chevron-down" size={22} color={textClr} />
            </Pressable>

            {/* Right actions */}
            <View style={styles.modalHeaderRight}>
              {charCount > 0 && (
                <Text style={[styles.modalCharCount, { color: subClr }]}>
                  {charCount.toLocaleString()}
                </Text>
              )}

              {/* Options toggle */}
              <Pressable
                onPress={() => setShowOptions(v => !v)}
                style={[styles.modalHeaderBtn, showOptions && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
                hitSlop={10}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={textClr} />
              </Pressable>

              {/* Pin */}
              <Pressable
                onPress={() => { up({ isPinned: !draft.isPinned }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={styles.modalHeaderBtn}
                hitSlop={10}
              >
                <Ionicons
                  name={draft.isPinned ? 'pin' : 'pin-outline'}
                  size={18}
                  color={draft.isPinned ? (isDark ? '#fff' : '#333') : subClr}
                />
              </Pressable>

              {/* Favorite */}
              <Pressable
                onPress={() => { up({ isFavorite: !draft.isFavorite }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={styles.modalHeaderBtn}
                hitSlop={10}
              >
                <Ionicons
                  name={draft.isFavorite ? 'star' : 'star-outline'}
                  size={18}
                  color={draft.isFavorite ? '#F59E0B' : subClr}
                />
              </Pressable>

              {/* Delete */}
              <Pressable
                onPress={() => { onDelete(draft.id); onDiscard(); }}
                style={styles.modalHeaderBtn}
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={18} color={subClr} />
              </Pressable>

              {/* Save */}
              <Pressable
                onPress={handleSave}
                style={[
                  styles.modalSaveBtn,
                  { backgroundColor: isDirty ? ACCENT : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)') },
                ]}
              >
                {savedFlash
                  ? <Ionicons name="checkmark" size={14} color="#fff" />
                  : <Text style={[styles.modalSaveTxt, { color: isDirty ? '#fff' : subClr }]}>Save</Text>
                }
              </Pressable>
            </View>
          </View>

          {/* ── Options panel: color + category ── */}
          {showOptions && (
            <Animated.View
              entering={FadeInDown.duration(180)}
              exiting={FadeOutUp.duration(140)}
              style={[styles.optionsPanel, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
            >
              <Text style={[styles.optionLabel, { color: subClr }]}>NOTE COLOR</Text>
              <ColorRow selected={draft.colorKey} onSelect={k => up({ colorKey: k })} isDark={isDark} />
              <Text style={[styles.optionLabel, { color: subClr, marginTop: 10 }]}>CATEGORY</Text>
              <CategoryRow
                selected={draft.category}
                onSelect={cat => up({ category: cat })}
                accentColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                colors={colors}
              />
            </Animated.View>
          )}

          {/* ── Note content area — same bg as sticky ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Date line (top-left, like reference image 2) */}
            <Text style={[styles.modalDateLine, { color: subClr }]}>
              {new Date(draft.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')}
            </Text>

            {/* Title — large bold */}
            <View style={styles.modalTitleRow}>
              <TextInput
                style={[styles.modalTitle, { color: textClr, flex: 1 }]}
                value={draft.title}
                onChangeText={t => up({ title: t })}
                placeholder="Title"
                placeholderTextColor={subClr}
                multiline={false}
                returnKeyType="next"
              />
              {/* Edit icon (decorative, like reference) */}
              <View style={[styles.editIconBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                <Ionicons name="pencil" size={14} color={textClr} />
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.modalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)' }]} />

            {/* Body */}
            <TextInput
              style={[styles.modalBody, { color: textClr }]}
              value={draft.content}
              onChangeText={t => up({ content: t })}
              placeholder="Start writing…"
              placeholderTextColor={subClr}
              multiline
              autoFocus={!draft.content && !draft.title}
              textAlignVertical="top"
              scrollEnabled={false}
            />

            {/* Bottom timestamp (like reference image 2) */}
            <View style={styles.modalTimestamp}>
              <Ionicons name="time-outline" size={13} color={subClr} />
              <Text style={[styles.modalTimestampTxt, { color: subClr }]}>
                {fmtFull(draft.updatedAt)}
              </Text>
            </View>

            {/* Unsaved indicator */}
            {isDirty && (
              <View style={[styles.unsavedBanner, { backgroundColor: ACCENT + '22', borderColor: ACCENT + '44' }]}>
                <View style={[styles.unsavedDot, { backgroundColor: ACCENT }]} />
                <Text style={[styles.unsavedTxt, { color: ACCENT }]}>Unsaved changes</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function NotesScreen() {
  const { colors, isDark } = useTheme();
  const { state, setState, clearState } = useUtilityState<NotesState>('notes', DEFAULT_STATE);

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch,  setShowSearch]  = useState(false);

  const activeNote = state.notes.find(n => n.id === editingId) as RichNote | undefined;

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const createNote = useCallback(() => {
    const colorKey = STICKY_COLORS[state.notes.length % STICKY_COLORS.length].key;
    const newNote: RichNote = {
      id:         generateId(),
      title:      '',
      content:    '',
      createdAt:  Date.now(),
      updatedAt:  Date.now(),
      isPinned:   false,
      isFavorite: false,
      colorKey,
      color:      colorKey,
    };
    // Single atomic setState — avoids persistence race
    setState(p => ({ notes: [newNote, ...p.notes], activeNoteId: newNote.id }));
    setEditingId(newNote.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [state.notes.length, setState]);

  // ── Save: single setState, merges all draft fields atomically ─────────────
  const handleSave = useCallback((draft: RichNote) => {
    setState(p => ({
      ...p,
      notes: p.notes.map(n =>
        n.id === draft.id ? { ...draft, updatedAt: Date.now() } : n
      ),
    }));
  }, [setState]);

  // ── Discard: single setState, cleans up empty notes atomically ────────────
  const handleDiscard = useCallback(() => {
    const id = editingId;
    setEditingId(null);
    // One atomic setState: clear activeNoteId AND prune empty note together
    setState(p => ({
      activeNoteId: null,
      notes: p.notes.filter(n =>
        n.id !== id || (n.title?.trim() || n.content?.trim())
      ),
    }));
  }, [editingId, setState]);

  const deleteNote = useCallback((id: string) => {
    Alert.alert('Delete Note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          // Single atomic setState
          setState(p => ({
            activeNoteId: p.activeNoteId === id ? null : p.activeNoteId,
            notes: p.notes.filter(n => n.id !== id),
          }));
          if (editingId === id) setEditingId(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, [editingId, setState]);

  const togglePin = useCallback((id: string) => {
    setState(p => ({
      ...p,
      notes: p.notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: Date.now() } : n),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setState]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const notes = useMemo(() => {
    let list = [...state.notes] as RichNote[];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.category ?? '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
    return list;
  }, [state.notes, searchQuery]);

  // ── FAB spring ─────────────────────────────────────────────────────────────
  const fabScale = useSharedValue(1);
  const fabAnim  = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  // ─── 2-column masonry render ───────────────────────────────────────────────
  // Split into left/right columns for staggered heights
  const leftCol  = notes.filter((_, i) => i % 2 === 0);
  const rightCol = notes.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Notes"
        utilityId="notes"
        accentColor={ACCENT}
        onClearData={clearState}
      />

      {/* ── Search toolbar ── */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        {showSearch ? (
          <Animated.View entering={FadeInDown.duration(180)} style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={15} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search notes…"
                placeholderTextColor={colors.textTertiary}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={15} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => { setShowSearch(false); setSearchQuery(''); }} style={styles.cancelBtn}>
              <Text style={[styles.cancelTxt, { color: ACCENT }]}>Cancel</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.toolbarRow}>
            <Text style={[styles.noteCount, { color: colors.textTertiary }]}>
              {notes.length === 0 ? 'No notes' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
            </Text>
            <Pressable onPress={() => setShowSearch(true)} hitSlop={8} style={styles.toolbarBtn}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Notes grid ── */}
      {notes.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-text-outline" size={36} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notes yet</Text>
          <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
            Tap + to create your first sticky note
          </Text>
        </Animated.View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {/* Left column */}
            <View style={styles.col}>
              {leftCol.map((note, i) => (
                <Animated.View
                  key={note.id}
                  entering={FadeInDown.delay(i * 40).duration(260)}
                  exiting={FadeOutDown.duration(180)}
                  layout={Layout.springify().damping(14)}
                >
                  <StickyCard
                    note={note}
                    isDark={isDark ?? false}
                    onPress={() => {
                      setEditingId(note.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onDelete={() => deleteNote(note.id)}
                    onPin={() => togglePin(note.id)}
                  />
                </Animated.View>
              ))}
            </View>

            {/* Right column — offset for masonry feel */}
            <View style={[styles.col, styles.colRight]}>
              {rightCol.map((note, i) => (
                <Animated.View
                  key={note.id}
                  entering={FadeInDown.delay(i * 40 + 60).duration(260)}
                  exiting={FadeOutDown.duration(180)}
                  layout={Layout.springify().damping(14)}
                >
                  <StickyCard
                    note={note}
                    isDark={isDark ?? false}
                    onPress={() => {
                      setEditingId(note.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onDelete={() => deleteNote(note.id)}
                    onPin={() => togglePin(note.id)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <Animated.View style={[styles.fab, fabAnim]}>
        <Pressable
          onPress={() => {
            fabScale.value = withSpring(0.88, { damping: 10 }, () => {
              fabScale.value = withSpring(1, { damping: 10 });
            });
            createNote();
          }}
          style={[styles.fabInner, { backgroundColor: ACCENT }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </Animated.View>

      {/* ── Editor Modal ── */}
      <NoteEditorModal
        note={activeNote ?? null}
        visible={!!(editingId && activeNote)}
        isDark={isDark ?? false}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onDelete={deleteNote}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Toolbar
  toolbar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  noteCount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: typography.sizes.base, paddingVertical: 0 },
  cancelBtn: { paddingVertical: spacing.xs },
  cancelTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },

  // Grid
  gridContent: { padding: spacing.base, paddingBottom: 100 },
  grid: { flexDirection: 'row', gap: CARD_GAP, alignItems: 'flex-start' },
  col: { flex: 1, gap: CARD_GAP },
  colRight: { marginTop: 24 }, // stagger right column for masonry effect

  // Sticky card
  stickyCard: {
    borderRadius: 14,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  stickyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pinDot: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotPlaceholder: { width: 20, height: 20 },
  stickyActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stickyActionBtn: {
    width: 24, height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  stickyBody: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  stickyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  stickyCat: { fontSize: 10, fontWeight: '600' },
  stickyDate: { fontSize: 10 },

  // Empty state
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: spacing.md,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  emptySub: {
    fontSize: typography.sizes.sm, textAlign: 'center',
    maxWidth: 220, lineHeight: 20,
  },

  // FAB
  fab: { position: 'absolute', bottom: spacing['2xl'], right: spacing['2xl'] },
  fabInner: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  // Modal
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  modalCharCount: { fontSize: 11, marginRight: 4 },
  modalSaveBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, minWidth: 50,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },
  modalSaveTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, letterSpacing: 0.3 },

  // Options panel
  optionsPanel: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  optionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },

  // Color swatch
  colorRow: { flexGrow: 0, marginBottom: 2 },
  colorSwatch: {
    width: 28, height: 28, borderRadius: 14,
    marginRight: 8, alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSel: {
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },

  // Category chips
  catRow: { flexGrow: 0 },
  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1, marginRight: spacing.xs,
  },
  catChipTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },

  // Modal content
  modalContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalDateLine: {
    fontSize: 12, letterSpacing: 0.5, marginBottom: spacing.xs,
  },
  modalTitleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.sm, marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 26, fontWeight: typography.weights.bold,
    letterSpacing: -0.5, lineHeight: 32,
  },
  editIconBadge: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  modalDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  modalBody: {
    fontSize: typography.sizes.base,
    lineHeight: 26, minHeight: 200,
  },
  modalTimestamp: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: spacing.lg,
  },
  modalTimestampTxt: { fontSize: 12 },
  unsavedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1,
  },
  unsavedDot: { width: 6, height: 6, borderRadius: 3 },
  unsavedTxt: { fontSize: 12, fontWeight: '600' },
});