/**
 * format.ts — deterministic number / currency formatting.
 *
 * We deliberately avoid `Intl.NumberFormat` for anything rendered in the UI:
 * ICU availability differs between iOS, Android and Hermes builds, so the same
 * value can render differently (or throw) depending on the device. These
 * helpers produce identical output everywhere.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'JPY';

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** Indian grouping (1,00,000) vs western grouping (100,000). */
  grouping: 'indian' | 'western';
  /** Default fraction digits — JPY has none. */
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  INR: { code: 'INR', symbol: '₹',  name: 'Indian Rupee',   grouping: 'indian',  decimals: 2 },
  USD: { code: 'USD', symbol: '$',  name: 'US Dollar',      grouping: 'western', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€',  name: 'Euro',           grouping: 'western', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£',  name: 'British Pound',  grouping: 'western', decimals: 2 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham',    grouping: 'western', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',   grouping: 'western', decimals: 0 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

/** Group the integer part of a number string, western style: 1,234,567 */
function groupWestern(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Group the integer part, Indian style: 12,34,567 */
function groupIndian(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

interface NumberOptions {
  decimals?: number;
  /** Drop trailing zeros after the decimal point (1.50 → 1.5, 1.00 → 1). */
  trim?: boolean;
  grouping?: 'indian' | 'western' | 'none';
}

export function formatNumber(value: number, options: NumberOptions = {}): string {
  const { decimals = 2, trim = false, grouping = 'western' } = options;
  if (!isFinite(value)) return '—';

  const negative = value < 0 || Object.is(value, -0);
  let fixed = Math.abs(value).toFixed(Math.max(0, Math.min(20, decimals)));

  if (trim && fixed.includes('.')) {
    fixed = fixed.replace(/\.?0+$/, '');
  }

  const [intPart, fracPart] = fixed.split('.');
  const grouped =
    grouping === 'none' ? intPart
    : grouping === 'indian' ? groupIndian(intPart)
    : groupWestern(intPart);

  return `${negative ? '-' : ''}${grouped}${fracPart ? '.' + fracPart : ''}`;
}

interface CurrencyOptions {
  decimals?: number;
  /** Render the symbol (default true). */
  symbol?: boolean;
  /** Drop `.00` when the value is a whole number. */
  trimWholeNumbers?: boolean;
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode = 'INR',
  options: CurrencyOptions = {},
): string {
  const meta = CURRENCIES[currency] ?? CURRENCIES.INR;
  const { decimals = meta.decimals, symbol = true, trimWholeNumbers = false } = options;

  if (!isFinite(value)) return '—';

  const useDecimals = trimWholeNumbers && Number.isInteger(value) ? 0 : decimals;
  const body = formatNumber(value, { decimals: useDecimals, grouping: meta.grouping });

  if (!symbol) return body;
  // Keep the minus sign in front of the symbol: -₹500, not ₹-500
  return body.startsWith('-')
    ? `-${meta.symbol}${body.slice(1)}`
    : `${meta.symbol}${body}`;
}

/**
 * Compact currency for tight spaces. Indian currencies use L / Cr,
 * everything else uses K / M / B.
 */
export function formatCurrencyCompact(value: number, currency: CurrencyCode = 'INR'): string {
  const meta = CURRENCIES[currency] ?? CURRENCIES.INR;
  const sign = value < 0 ? '-' : '';
  const n = Math.abs(value);

  if (meta.grouping === 'indian') {
    if (n >= 1e7) return `${sign}${meta.symbol}${formatNumber(n / 1e7, { decimals: 2, trim: true, grouping: 'none' })}Cr`;
    if (n >= 1e5) return `${sign}${meta.symbol}${formatNumber(n / 1e5, { decimals: 2, trim: true, grouping: 'none' })}L`;
  } else {
    if (n >= 1e9) return `${sign}${meta.symbol}${formatNumber(n / 1e9, { decimals: 2, trim: true, grouping: 'none' })}B`;
    if (n >= 1e6) return `${sign}${meta.symbol}${formatNumber(n / 1e6, { decimals: 2, trim: true, grouping: 'none' })}M`;
    if (n >= 1e4) return `${sign}${meta.symbol}${formatNumber(n / 1e3, { decimals: 1, trim: true, grouping: 'none' })}K`;
  }
  return formatCurrency(value, currency, { trimWholeNumbers: true });
}

export function currencySymbol(currency: CurrencyCode = 'INR'): string {
  return (CURRENCIES[currency] ?? CURRENCIES.INR).symbol;
}

/** Parse user input that may contain grouping separators or a currency symbol. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}

/**
 * Keep a free-text numeric field sane: at most one decimal point, digits only,
 * optional leading minus. Returns the sanitised string (never throws).
 */
export function sanitiseDecimalInput(input: string, allowNegative = false): string {
  let out = input.replace(allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g, '');
  // Only one leading minus
  if (allowNegative) {
    const neg = out.startsWith('-');
    out = (neg ? '-' : '') + out.replace(/-/g, '');
  }
  // Only the first decimal point survives
  const firstDot = out.indexOf('.');
  if (firstDot !== -1) {
    out = out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, '');
  }
  return out;
}
