/**
 * General-purpose utility helpers used across screens
 */

import { formatCurrency, formatCurrencyCompact } from './format';

// ── Number formatting ──────────────────────────────────────────────────────

/**
 * Number/currency formatting lives in `@/utils/format` — it is deterministic
 * across iOS, Android and Hermes, whereas `Intl` is not. These re-exports keep
 * one implementation so a future edit can't pick up a divergent copy.
 */
export { formatNumber, formatCurrency, formatCurrencyCompact, parseAmount } from './format';

/** @deprecated Use `formatCurrency(value, 'INR')` from '@/utils/format'. */
export function formatINR(amount: number, decimals = 2): string {
  return formatCurrency(amount, 'INR', { decimals });
}

/** @deprecated Use `formatCurrencyCompact` from '@/utils/format'. */
export function formatCompact(n: number): string {
  return formatCurrencyCompact(n, 'INR');
}

// ── Time formatting ────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatMs(ms: number): string {
  const totalMs = Math.floor(ms);
  const m = Math.floor(totalMs / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const cs = Math.floor((totalMs % 1000) / 10);
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// ── String helpers ─────────────────────────────────────────────────────────

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '…';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Clipboard ─────────────────────────────────────────────────────────────

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { toast } from '@/components/ui';

export async function copyToClipboard(text: string, label = 'Copied to clipboard'): Promise<void> {
  await Clipboard.setStringAsync(text);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  toast(label);
}

// ── Color helpers ─────────────────────────────────────────────────────────

export function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Validation ─────────────────────────────────────────────────────────────

export function isValidNumber(str: string): boolean {
  const n = parseFloat(str);
  return !isNaN(n) && isFinite(n);
}

export function isValidDate(str: string): boolean {
  if (!str.match(/^\d{4}-\d{2}-\d{2}$/)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

// ── Array helpers ──────────────────────────────────────────────────────────

export function uniqueBy<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set();
  return arr.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
