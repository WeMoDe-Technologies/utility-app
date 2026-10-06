/**
 * Version comparison.
 *
 * Deliberately small and total: every input, however malformed, produces an
 * answer rather than an exception. This code decides whether to lock someone
 * out of the app, so "throws on a weird string" is not acceptable behaviour —
 * one stray character in a hand-edited manifest must not brick an install.
 */

export type Version = { major: number; minor: number; patch: number };

/**
 * Parse `1.2.3`, `1.2`, `1`, `v1.2.3` or `1.2.3-beta.1`.
 *
 * Pre-release and build suffixes are dropped rather than ordered: Kit ships
 * plain three-part versions, and pretending to implement semver precedence we
 * do not use would be a lie in the code.
 */
export function parseVersion(input: unknown): Version | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/^v/i, '').split(/[-+]/)[0];
  if (cleaned.length === 0) return null;

  const parts = cleaned.split('.');
  if (parts.length > 3) return null;

  const numbers: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const value = Number.parseInt(part, 10);
    if (!Number.isSafeInteger(value)) return null;
    numbers.push(value);
  }

  return { major: numbers[0], minor: numbers[1] ?? 0, patch: numbers[2] ?? 0 };
}

/**
 * −1 if `a` is older, 0 if equal, 1 if newer.
 *
 * Returns `null` when either side cannot be parsed, so callers have to decide
 * what an unknown comparison means instead of silently treating it as equal.
 */
export function compareVersions(a: unknown, b: unknown): -1 | 0 | 1 | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;

  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  return 0;
}

/** True when `current` is strictly older than `other`. Unknown → false. */
export function isOlderThan(current: unknown, other: unknown): boolean {
  return compareVersions(current, other) === -1;
}

export function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}
