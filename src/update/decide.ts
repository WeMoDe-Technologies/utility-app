/**
 * The update decision.
 *
 * Pure, and the only place that decides whether someone is allowed to keep
 * using the app. Two rules shape everything here:
 *
 *  1. **A broken manifest never blocks the app.** Unparseable versions, a
 *     missing download link, a placeholder URL nobody filled in — each of
 *     those degrades to "no update" or to a dismissible prompt. A hard block
 *     that cannot be satisfied is worse than being out of date.
 *  2. **Mandatory means mandatory, but only when it is actionable.** If the
 *     manifest demands an upgrade *and* gives somewhere real to get it, the
 *     gate is not dismissible. If it demands one and points nowhere, the app
 *     stays usable and the misconfiguration is surfaced, not enforced.
 */

import { Platform } from 'react-native';

import type { UpdateManifest } from './manifest';
import { isOlderThan } from './version';

export type UpdateDecision =
  | { kind: 'none' }
  | {
      kind: 'optional' | 'mandatory';
      /** The version being offered. */
      version: string;
      releaseNotes: string | null;
      /** Always a usable https URL when present. */
      downloadUrl: string | null;
      /**
       * Set when the manifest asked for a mandatory update we could not make
       * actionable, so it was downgraded. Surfaced for diagnostics.
       */
      downgraded?: boolean;
    };

/**
 * Markers that mean "nobody filled this in".
 *
 * Manifests get published with the template still in place. Territory's
 * shipped with `xxxx.supabase.co` in it, which is why the host check exists —
 * but Kit's iOS link is an `apps.apple.com/app/idXXXXXXXXXX` template whose
 * *host is real*, so a host-only rule would wave it through and send people
 * to a dead App Store page. These are matched against the whole URL.
 */
const PLACEHOLDER_MARKERS = [
  'xxx',
  'example.com',
  'example.org',
  'your-project',
  'yourproject',
  'your-app',
  'changeme',
  'placeholder',
  'todo',
  '<',
  '>',
  '{',
  '}',
];

/**
 * A download link we are willing to send someone to.
 *
 * The platform matters. Kit ships through both stores, so an update prompt is
 * legitimate on iOS in a way it is not for a sideloaded build — but only when
 * it leads somewhere Apple allows. A link to an `.apk` on an iPhone downloads
 * a file the device cannot open, and putting one in front of a reviewer reads
 * straight onto App Review guideline 2.5.2. So it is refused outright rather
 * than left to whoever edits the manifest to get right.
 */
export function isUsableDownloadUrl(url: unknown, os: string = Platform.OS): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return false;

  let host: string;
  try {
    host = new URL(trimmed).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host.length === 0) return false;

  const lowered = trimmed.toLowerCase();
  if (PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker))) return false;

  // An Android package has no meaning on iOS, and offering one is a rejection.
  if (os === 'ios' && /\.apk(\?|#|$)/i.test(lowered)) return false;

  return true;
}

/**
 * Whether a decision is worth interrupting someone for.
 *
 * `decideUpdate` reports the truth; this is the policy on top of it. An
 * optional update with no working download link is real — Settings should say
 * so — but there is nothing to *do* about it, and a prompt whose only button
 * is "dismiss" is noise. A required update always interrupts, with or without
 * a link, because being below the minimum is something worth knowing.
 */
export function shouldInterrupt(decision: UpdateDecision): boolean {
  if (decision.kind === 'none') return false;
  if (decision.kind === 'mandatory') return true;
  return decision.downloadUrl !== null || decision.downgraded === true;
}

export interface DecideInput {
  /** The version this build reports. */
  currentVersion: string;
  manifest: UpdateManifest | null;
  /**
   * The latest version already waved away. Optional prompts for that version
   * stay quiet; mandatory ones ignore it entirely.
   */
  dismissedVersion?: string | null;
  /** Overridable so the rule can be exercised for both platforms. */
  os?: string;
}

export function decideUpdate({
  currentVersion,
  manifest,
  dismissedVersion = null,
  os = Platform.OS,
}: DecideInput): UpdateDecision {
  if (!manifest) return { kind: 'none' };

  const downloadUrl = isUsableDownloadUrl(manifest.downloadUrl, os) ? manifest.downloadUrl : null;
  const releaseNotes =
    typeof manifest.releaseNotes === 'string' && manifest.releaseNotes.trim().length > 0
      ? manifest.releaseNotes.trim()
      : null;

  // Below the floor the publisher set: the strongest signal in the manifest.
  if (isOlderThan(currentVersion, manifest.minimumVersion)) {
    const target = manifest.latestVersion ?? manifest.minimumVersion;
    if (downloadUrl) {
      return { kind: 'mandatory', version: target, releaseNotes, downloadUrl };
    }
    // Required, but we have nowhere to send them. Never trap anyone.
    return { kind: 'optional', version: target, releaseNotes, downloadUrl: null, downgraded: true };
  }

  if (isOlderThan(currentVersion, manifest.latestVersion)) {
    if (dismissedVersion && !isOlderThan(dismissedVersion, manifest.latestVersion)) {
      return { kind: 'none' };
    }
    return { kind: 'optional', version: manifest.latestVersion, releaseNotes, downloadUrl };
  }

  return { kind: 'none' };
}
