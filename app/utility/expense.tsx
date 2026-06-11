import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { ExpenseState, Expense } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = '#6366F1';

const CATEGORIES = [
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#F97316' },
  { id: 'food',      label: 'Food',      icon: '☕', color: '#EC4899' },
  { id: 'shopping',  label: 'Shopping',  icon: '🛍️', color: '#3B82F6' },
  { id: 'bills',     label: 'Bills',     icon: '📄', color: '#8B5CF6' },
  { id: 'health',    label: 'Health',    icon: '💊', color: '#10B981' },
  { id: 'other',     label: 'Other',     icon: '📦', color: '#64748B' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];
type Period = 'today' | 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week:  'This Week',
  month: 'This Month',
  year:  'This Year',
};

const DEFAULT_STATE: ExpenseState = {
  expenses: [],
  income: 0,
  includeBills: true,
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const DONUT_SIZE  = 240;
const CX          = DONUT_SIZE / 2;
const CY          = DONUT_SIZE / 2;
const OUTER_R     = 100;
const INNER_R     = 68;
const STROKE_W    = OUTER_R - INNER_R;
const ICON_R      = OUTER_R + 16; // radius for category icons at arc ends

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number
): string {
  // Clamp arc to slightly less than 360 to avoid SVG full-circle collapse
  const sweep = Math.min(endAngle - startAngle, 359.99);
  const start = polarToXY(cx, cy, r, startAngle);
  const end   = polarToXY(cx, cy, r, startAngle + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

interface DonutProps {
  slices: { id: string; value: number; color: string; icon: string }[];
  total: number;
  colors: any;
}

function DonutChart({ slices, total, colors }: DonutProps) {
  const GAP_DEG = 4;
  let cursor = 0;

  const arcs = slices.map((s) => {
    const pct   = total > 0 ? s.value / total : 0;
    const sweep = pct * 360;
    const start = cursor;
    const end   = cursor + sweep;
    cursor      = end;
    return { ...s, start, end, sweep };
  });

  return (
    <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
      {/* Background ring */}
      <Circle
        cx={CX} cy={CY}
        r={(OUTER_R + INNER_R) / 2}
        fill="none"
        stroke={colors.surface}
        strokeWidth={STROKE_W + 4}
      />

      {/* Tick marks */}
      {Array.from({ length: 60 }).map((_, i) => {
        const deg  = i * 6;
        const o    = polarToXY(CX, CY, OUTER_R - 2, deg);
        const inn  = polarToXY(CX, CY, INNER_R + 2, deg);
        return (
          <Path
            key={i}
            d={`M ${o.x} ${o.y} L ${inn.x} ${inn.y}`}
            stroke={colors.border}
            strokeWidth={i % 5 === 0 ? 1.5 : 0.6}
            opacity={i % 5 === 0 ? 0.5 : 0.25}
          />
        );
      })}

      {/* Colored arcs */}
      {arcs.map((a) => {
        if (a.sweep < 1) return null;
        return (
          <Path
            key={a.id}
            d={describeArc(CX, CY, (OUTER_R + INNER_R) / 2, a.start + GAP_DEG / 2, a.end - GAP_DEG / 2)}
            fill="none"
            stroke={a.color}
            strokeWidth={STROKE_W - 2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Category icons at arc midpoints */}
      {arcs.map((a) => {
        if (a.sweep < 15) return null;
        const mid = a.start + a.sweep / 2;
        const pos = polarToXY(CX, CY, ICON_R, mid);
        return (
          <SvgText
            key={`icon-${a.id}`}
            x={pos.x} y={pos.y}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize={14}
          >
            {a.icon}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ─── Mini arc stat card ───────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, colors,
}: {
  label: string; value: string; icon: string;
  color: string; colors: any;
}) {
  const R = 26; const SW = 5; const GAP = 8;
  const arcPath = describeArc(32, 32, R, GAP, 180 - GAP);
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statIconWrap}>
        <Svg width={64} height={42}>
          {/* Track */}
          <Path d={arcPath} fill="none" stroke={colors.border} strokeWidth={SW} strokeLinecap="round" />
          {/* Filled */}
          <Path d={arcPath} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" opacity={0.9} />
          <SvgText x={32} y={30} textAnchor="middle" alignmentBaseline="middle" fontSize={16}>{icon}</SvgText>
        </Svg>
      </View>
      <Text style={[styles.statLabel,  { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue,  { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────
interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (e: Omit<Expense, 'id' | 'date'>) => void;
  colors: any;
}

function AddExpenseModal({ visible, onClose, onSave, colors }: AddModalProps) {
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [category, setCategory] = useState<CategoryId>('food');
  const [isIncome, setIsIncome] = useState(false);

  const reset = () => { setAmount(''); setNote(''); setCategory('food'); setIsIncome(false); };

  const handleSave = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ amount: n, note: note.trim(), category, isIncome });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Fade backdrop */}
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
        <View style={styles.modalAnimWrapper}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </View>
      </Animated.View>

      {/* Slide-up sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalKAV}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(200)}
          exiting={SlideOutDown.duration(220)}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Handle */}
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Transaction</Text>

            {/* Income / Expense toggle */}
            <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {(['Expense', 'Income'] as const).map((t) => {
                const active = isIncome === (t === 'Income');
                return (
                  <Pressable
                    key={t}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsIncome(t === 'Income'); }}
                    style={[styles.typeTab, active && { backgroundColor: isIncome ? '#10B981' : ACCENT }]}
                  >
                    <Text style={[styles.typeTabTxt, { color: active ? '#fff' : colors.textSecondary }]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Amount */}
            <View style={[styles.amountRow, { borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            {/* Note */}
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Add a note…"
              placeholderTextColor={colors.textTertiary}
              value={note}
              onChangeText={setNote}
            />

            {/* Categories */}
            {!isIncome && (
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((c) => {
                  const active = category === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(c.id); }}
                      style={[
                        styles.catChip,
                        { backgroundColor: colors.surface, borderColor: active ? c.color : colors.border },
                        active && { backgroundColor: c.color + '20' },
                      ]}
                    >
                      <Text style={styles.catChipIcon}>{c.icon}</Text>
                      <Text style={[styles.catChipLabel, { color: active ? c.color : colors.textSecondary }]}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Save */}
            <Pressable
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: isIncome ? '#10B981' : ACCENT }]}
            >
              <Text style={styles.saveBtnTxt}>Save</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExpenseScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<ExpenseState>('expense', DEFAULT_STATE);
  const [period,     setPeriod]     = useState<Period>('month');
  const [showModal,  setShowModal]  = useState(false);
  const [activeTab,  setActiveTab]  = useState<'spending' | 'income'>('spending');

  // ── Filter expenses by period ─────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    const now  = Date.now();
    const cutoffs: Record<Period, number> = {
      today: now - 86400000,
      week:  now - 7 * 86400000,
      month: now - 30 * 86400000,
      year:  now - 365 * 86400000,
    };
    return state.expenses.filter(
      (e) => e.date >= cutoffs[period] && (state.includeBills || e.category !== 'bills')
    );
  }, [state.expenses, period, state.includeBills]);

  // ── Aggregations ──────────────────────────────────────────────────────────
  const { totalSpend, totalIncome, slices } = useMemo(() => {
    const spend  = filteredExpenses.filter((e) => !e.isIncome);
    const income = filteredExpenses.filter((e) => e.isIncome);

    const totalSpend  = spend.reduce((s, e) => s + e.amount, 0);
    const totalIncome = income.reduce((s, e) => s + e.amount, 0) + state.income;

    const byCategory: Record<string, number> = {};
    spend.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    });

    const slices = CATEGORIES
      .filter((c) => byCategory[c.id])
      .map((c) => ({ id: c.id, value: byCategory[c.id], color: c.color, icon: c.icon }))
      .sort((a, b) => b.value - a.value);

    return { totalSpend, totalIncome, slices };
  }, [filteredExpenses, state.income]);

  const netBalance = totalIncome - totalSpend;

  // ── Add transaction ───────────────────────────────────────────────────────
  const handleAdd = (entry: Omit<Expense, 'id' | 'date'>) => {
    setState((p) => ({
      ...p,
      expenses: [
        { ...entry, id: Date.now().toString(), date: Date.now() },
        ...p.expenses,
      ],
    }));
  };

  // ── Delete transaction ────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== id) }));
  };

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  const displayExpenses = filteredExpenses
    .filter((e) => activeTab === 'income' ? e.isIncome : !e.isIncome)
    .slice(0, 30);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Expenses"
        utilityId="expense"
        accentColor={ACCENT}
        onClearData={clearState}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Period tabs ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <View style={[styles.periodTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPeriod(p); }}
                style={[styles.periodTab, period === p && { backgroundColor: colors.card }]}
              >
                <Text style={[
                  styles.periodTabTxt,
                  { color: period === p ? colors.text : colors.textSecondary },
                  period === p && { fontWeight: typography.weights.bold },
                ]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── Include bills toggle ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <View style={[styles.billsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.billsLabel, { color: colors.text }]}>Include bills</Text>
            <Switch
              value={state.includeBills}
              onValueChange={(v) => setState((p) => ({ ...p, includeBills: v }))}
              trackColor={{ false: colors.border, true: ACCENT }}
              thumbColor="#fff"
            />
          </View>
        </Animated.View>

        {/* ── Donut chart ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <View style={styles.donutWrap}>
            <DonutChart slices={slices} total={totalSpend} colors={colors} />
            {/* Center label */}
            <View style={styles.donutCenter} pointerEvents="none">
              <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>Total spend</Text>
              <Text style={[styles.donutAmount, { color: colors.text }]}>{fmt(totalSpend)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <View style={styles.statsRow}>
            <StatCard label="Income"        value={fmt(totalIncome)} icon="💰" color="#6366F1" colors={colors} />
            <StatCard label="Total Spending" value={fmt(totalSpend)}  icon="💳" color="#EC4899" colors={colors} />
            <StatCard label="Net Balance"   value={fmt(netBalance)}  icon="👛" color={netBalance >= 0 ? '#10B981' : '#EF4444'} colors={colors} />
          </View>
        </Animated.View>

        {/* ── Transactions ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(280)}>
          <View style={[styles.txSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Section header */}
            <View style={styles.txHeader}>
              <Text style={[styles.txTitle, { color: colors.text }]}>Transactions</Text>
              <View style={[styles.txTabs, { backgroundColor: colors.card }]}>
                {(['spending', 'income'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setActiveTab(t)}
                    style={[styles.txTab, activeTab === t && { backgroundColor: ACCENT }]}
                  >
                    <Text style={[styles.txTabTxt, { color: activeTab === t ? '#fff' : colors.textSecondary }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* List */}
            {displayExpenses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={[styles.emptyTxt, { color: colors.textSecondary }]}>
                  No {activeTab} yet for this period
                </Text>
              </View>
            ) : (
              displayExpenses.map((e) => {
                const cat = CATEGORIES.find((c) => c.id === e.category);
                const dateStr = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <Pressable
                    key={e.id}
                    onLongPress={() => handleDelete(e.id)}
                    style={[styles.txRow, { borderColor: colors.border }]}
                  >
                    <View style={[styles.txIconBubble, { backgroundColor: (cat?.color ?? '#64748B') + '20' }]}>
                      <Text style={styles.txIcon}>{e.isIncome ? '💰' : (cat?.icon ?? '📦')}</Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txNote, { color: colors.text }]} numberOfLines={1}>
                        {e.note || (e.isIncome ? 'Income' : cat?.label ?? 'Other')}
                      </Text>
                      <Text style={[styles.txMeta, { color: colors.textTertiary }]}>
                        {dateStr}{!e.isIncome && cat ? ` · ${cat.label}` : ''}
                      </Text>
                    </View>
                    <Text style={[
                      styles.txAmount,
                      { color: e.isIncome ? '#10B981' : colors.text },
                    ]}>
                      {e.isIncome ? '+' : '-'}{fmt(e.amount)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(300).duration(300)}
      >
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowModal(true); }}
          style={[styles.fab, { backgroundColor: ACCENT }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>
      </Animated.View>

      {/* ── Add Expense Modal ─────────────────────────────────────────────────── */}
      <AddExpenseModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAdd}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md },

  // Period tabs
  periodTabs: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 3,
  },
  periodTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  periodTabTxt: { fontSize: typography.sizes.xs },

  // Bills toggle
  billsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  billsLabel: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.medium },

  // Donut
  donutWrap: { alignItems: 'center', justifyContent: 'center' },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  donutLabel:  { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  donutAmount: { fontSize: 36, fontWeight: typography.weights.extrabold, letterSpacing: -1 },

  // Stat cards
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statIconWrap: { marginBottom: -4 },
  statLabel:   { fontSize: 10, fontWeight: typography.weights.medium, textAlign: 'center' },
  statValue:   { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },

  // Transactions
  txSection: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  txTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  txTabs:  { flexDirection: 'row', borderRadius: radius.lg, padding: 2 },
  txTab:   { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.md },
  txTabTxt: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  txIconBubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txIcon:  { fontSize: 18 },
  txInfo:  { flex: 1 },
  txNote:  { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  txMeta:  { fontSize: typography.sizes.xs, marginTop: 1 },
  txAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyIcon: { fontSize: 32 },
  emptyTxt:  { fontSize: typography.sizes.sm },

  // FAB
  fabWrapper: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },

  // Modal
  modalAnimWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalKAV: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, textAlign: 'center' },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 3,
  },
  typeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  typeTabTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: spacing.sm,
  },
  currencySymbol: { fontSize: 28, fontWeight: typography.weights.bold, marginRight: spacing.xs },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -1,
  },
  noteInput: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: typography.sizes.base,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  catChipIcon:  { fontSize: 14 },
  catChipLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  saveBtn: {
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveBtnTxt: { color: '#fff', fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
});