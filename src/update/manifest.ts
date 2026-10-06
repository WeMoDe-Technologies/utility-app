/**
 * The update manifest.
 *
 * Fetched from a public Supabase Storage object at launch. Everything on this
 * path is built to fail quietly: a timeout, an outage, a truncated body or a
 * hand-edited file with a typo in it all end as "no update" — never as an
 * error anyone sees, and never as a delay to opening a tool.
 *
 * Published shape (unknown keys are ignored, so the file can grow):
 *
 *   {
 *     "latestVersion":  "1.1.0",
 *     "minimumVersion": "1.0.0",
 *     "releaseNotes":   "What changed",
 *     "downloadUrl":    "https://…",            // shared fallback
 *     "android": { "downloadUrl": "https://play.google.com/…" },
 *     "ios":     { "downloadUrl": "https://apps.apple.com/…" }
 *   }
 *
 * Kit ships to both stores, so unlike a sideloaded build the per-platform
 * blocks are the ones that matter: each platform must be sent to its own
 * store listing, never to the other's.
 */

import { Platform } from 'react-native';

import { parseVersion } from './version';

export interface UpdateManifest {
  latestVersion: string;
  minimumVersion: string;
  releaseNotes: string | null;
  downloadUrl: string | null;
}

/** Long enough for a cold radio, short enough never to hold up the grid. */
const FETCH_TIMEOUT_MS = 6000;

/**
 * Where the manifest lives, derived from the public env vars.
 *
 * `null` means the app was built without update checking configured, which is
 * a supported state: nothing downstream runs and no network call is made.
 */
export function manifestUrl(): string | null {
  const override = process.env.EXPO_PUBLIC_UPDATE_MANIFEST_URL;
  if (override && override.trim().length > 0) return override.trim();

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const folder = process.env.EXPO_PUBLIC_SUPABASE_FOLDER_NAME?.trim().replace(/^\/+|\/+$/g, '');
  if (!base || !folder) return null;

  return `${base}/storage/v1/object/public/${folder}/version.json`;
}

/** True when the app has been given somewhere to look. */
export function isUpdateCheckConfigured(): boolean {
  return manifestUrl() !== null;
}

/**
 * Narrow an arbitrary parsed JSON value into a manifest.
 *
 * Both version fields must parse, because they are the two numbers the gate
 * reasons about; everything else is optional and degrades to null.
 */
export function parseManifest(input: unknown, os: string = Platform.OS): UpdateManifest | null {
  if (typeof input !== 'object' || input === null) return null;
  const raw = input as Record<string, unknown>;

  const latestVersion = typeof raw.latestVersion === 'string' ? raw.latestVersion.trim() : '';
  const minimumVersion = typeof raw.minimumVersion === 'string' ? raw.minimumVersion.trim() : '';
  if (!parseVersion(latestVersion) || !parseVersion(minimumVersion)) return null;

  // A per-platform block wins over the shared field when present — this is how
  // an iPhone is kept away from a Play Store link and vice versa.
  const platformBlock = raw[os] as Record<string, unknown> | undefined;
  const platformUrl =
    platformBlock && typeof platformBlock === 'object' && !Array.isArray(platformBlock)
      ? platformBlock.downloadUrl
      : undefined;
  const picked =
    typeof platformUrl === 'string'
      ? platformUrl.trim()
      : typeof raw.downloadUrl === 'string'
        ? raw.downloadUrl.trim()
        : '';

  return {
    latestVersion,
    minimumVersion,
    releaseNotes: typeof raw.releaseNotes === 'string' ? raw.releaseNotes : null,
    downloadUrl: picked.length > 0 ? picked : null,
  };
}

/**
 * Fetch and parse the manifest. Resolves to `null` for every failure mode —
 * unreachable, slow, non-200, malformed — and never rejects.
 */
export async function fetchManifest(): Promise<UpdateManifest | null> {
  const url = manifestUrl();
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // The manifest changes on release; a stale cached copy would hide it.
      headers: { 'cache-control': 'no-cache' },
    });
    if (!response.ok) return null;
    return parseManifest(await response.json());
  } catch {
    // Offline, timed out, or served something that is not JSON. All the same
    // to the person holding the phone: they keep using the app.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
