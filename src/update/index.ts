export { decideUpdate, shouldInterrupt, isUsableDownloadUrl } from './decide';
export type { UpdateDecision } from './decide';
export { fetchManifest, manifestUrl, isUpdateCheckConfigured, parseManifest } from './manifest';
export type { UpdateManifest } from './manifest';
export { useUpdateCheck, currentAppVersion } from './useUpdateCheck';
export type { UpdateCheck } from './useUpdateCheck';
export { parseVersion, compareVersions, isOlderThan, formatVersion } from './version';
