# Version gating

Kit checks a small JSON file on Supabase Storage at launch and asks people to
update when a newer build is out. The file is the only moving part: no release
pipeline, no server. You publish a build, then edit one object.

**Manifest URL**

```
https://fvivbzwihirjeafaisgd.supabase.co/storage/v1/object/public/kit/version.json
```

Composed at runtime from `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_FOLDER_NAME` (`kit`), so moving projects or buckets is an
env change, not a code change.

---

## The file

```json
{
  "latestVersion": "1.1.0",
  "minimumVersion": "1.0.0",
  "releaseNotes": "What changed in this release.",
  "downloadUrl": "",
  "android": { "downloadUrl": "https://play.google.com/store/apps/details?id=com.utilitykit.app" },
  "ios":     { "downloadUrl": "https://apps.apple.com/app/id0000000000" }
}
```

| Field | Meaning |
|---|---|
| `latestVersion` | Newest build out there. Older installs get a **dismissible** prompt. |
| `minimumVersion` | The floor. Anything older is **blocked** until it updates. |
| `releaseNotes` | Shown in the prompt. Optional. |
| `downloadUrl` | Shared fallback. The per-platform block wins when present. |
| `android.downloadUrl` / `ios.downloadUrl` | Where each platform is sent. |

Unknown keys are ignored, so the file can grow without shipping a new build.

### The two versions do different jobs

Set `minimumVersion` **equal to or below** the oldest build you are willing to
support. Raising it to the newest version blocks everyone who has not updated
yet — correct after a breaking change, hostile otherwise.

```
minimumVersion = 1.0.0, latestVersion = 1.1.0   → 1.0.0 users get an offer
minimumVersion = 1.1.0, latestVersion = 1.1.0   → 1.0.0 users get a wall
```

---

## Releasing

1. Bump `version` in `app.config.ts` (`1.0.0` → `1.1.0`).
   Nothing else holds a version number — `APP_VERSION` reads it from the Expo
   config at runtime.
2. Build and ship to the stores:
   ```bash
   eas build --platform all --profile production
   ```
3. **Wait until the release is actually live on both stores.** Publishing the
   manifest first points people at a listing that still offers the old build.
4. Edit `version.json`, set `latestVersion` to the new version, and upload it to
   the `kit` bucket in Supabase Storage, replacing the existing object.

The app re-checks on launch and whenever it returns to the foreground, throttled
to once every 30 minutes. "Check for updates" in Settings ignores the throttle.

### First-time Supabase setup

The `kit` bucket does not exist yet. In the Supabase dashboard → Storage:

1. **New bucket** → name it `kit` → tick **Public bucket**.
   It must be public: the app fetches with no credentials and no key.
2. Upload `version.json` from the repo root.
3. Confirm it is reachable, unauthenticated:
   ```bash
   curl -s https://fvivbzwihirjeafaisgd.supabase.co/storage/v1/object/public/kit/version.json
   ```
   `{"statusCode":"404", ... "NoSuchBucket"}` means the bucket is missing or private.

Supabase serves storage objects with a long cache header. If an update does not
appear, re-upload with **Overwrite** rather than deleting and re-adding, and
allow for CDN propagation — the app sends `cache-control: no-cache`, but the
edge may still hold a copy briefly.

### The iOS link

`ios.downloadUrl` is deliberately empty until App Store Connect assigns Kit an
app id. Fill it in as `https://apps.apple.com/app/id<the real id>`.

Until then iOS simply gets no download link, which is a handled state: the
prompt explains there is nothing to download and a *mandatory* update degrades
to a dismissible one rather than trapping anyone.

Do not put an `.apk` URL in the `ios` block. It is refused in code
(`isUsableDownloadUrl`), because a link that downloads an Android package on an
iPhone is both useless and a direct App Review 2.5.2 problem.

---

## How it behaves

| Situation | Result |
|---|---|
| Up to date | Nothing |
| Below `latestVersion` | Dismissible prompt, remembered until a newer release |
| Below `minimumVersion` | Non-dismissible gate |
| Below minimum, no usable link | Downgraded to dismissible, and says why |
| Manifest unreachable / malformed / not JSON | Nothing — app works normally |
| Bucket missing or private | Nothing — app works normally |
| Env vars absent from the build | Feature off; Settings says "not configured" |

Nothing on this path can block the app on a network failure. Every error ends as
"no update", and the check never delays the first screen.

---

## Build-time configuration

`EXPO_PUBLIC_*` values are **inlined into the bundle** at build time and are
readable by anyone who downloads the app. Only public values belong there.

`.env` is gitignored, and **EAS does not upload gitignored files** — a cloud
build would therefore see no env vars and silently ship with update checking
off. That is why the two public values are also set in `eas.json` under each
build profile's `env`. Change them in both places or neither.

The service-role key slot in `.env` stays empty and is deliberately *not*
`EXPO_PUBLIC_`-prefixed, so it can never reach a binary. Verified: the exported
production bundle contains the Supabase URL and zero occurrences of
`SUPABASE_SERVICE_KEY`.

### Testing against a local manifest

`EXPO_PUBLIC_UPDATE_MANIFEST_URL` overrides the composed URL entirely:

```bash
python3 -m http.server 8000      # serve a version.json from the repo root
EXPO_PUBLIC_UPDATE_MANIFEST_URL=http://192.168.1.10:8000/version.json npx expo start -c
```

Set `latestVersion` above `app.config.ts`'s `version` to see the optional
prompt, and raise `minimumVersion` to see the wall. `-c` matters: the inlined
value is baked at bundle time and a warm cache will keep the old one.

---

## Code map

| File | Role |
|---|---|
| `src/update/version.ts` | Version parsing and comparison. Total — never throws. |
| `src/update/manifest.ts` | URL composition, fetch, parse. Never rejects. |
| `src/update/decide.ts` | Pure decision + the URL safety rules. |
| `src/update/useUpdateCheck.ts` | Launch/foreground check, throttle, cache. |
| `src/stores/updatesStore.ts` | What was dismissed, when we last looked. |
| `src/components/common/UpdateGate.tsx` | The prompt. |

`decide.ts` is pure and has no React or React Native imports beyond `Platform`,
which is why its whole decision table can be exercised outside the app.
