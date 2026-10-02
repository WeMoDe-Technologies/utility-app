# Kit — store submission package

Everything needed to list Kit on the App Store and Google Play. Copy is in
[APP-STORE.md](APP-STORE.md) and [PLAY-STORE.md](PLAY-STORE.md); the assets below
are final and dimension-verified against each store's current spec.

Version **1.0.0**. App name **Kit** — note the bundle identifier stays
`com.utilitykit.app` and the Expo slug stays `tool-r`; that mismatch is
deliberate, so existing installs and the EAS project are not orphaned.

---

## Where each file goes

### App Store Connect

| Slot | File | Spec | Status |
|---|---|---|---|
| App icon | `graphics/appstore-icon-1024.png` | 1024×1024, no alpha | 1024×1024 ✓ |
| iPhone 6.9" screenshots | `screenshots/ios-6.9/01–07.png` | 1320×2868 | 7 frames ✓ |

`supportsTablet` is `false`, so **no iPad screenshots are required**. The 6.9"
set is the only mandatory size — Apple scales it down for 6.5" and 5.5" listings.

Apple shows the first **three** screenshots in search results. The order below is
deliberate: breadth first, then the two highest-volume search intents.

### Google Play Console

| Slot | File | Spec | Status |
|---|---|---|---|
| App icon | `graphics/play-icon-512.png` | 512×512, 32-bit PNG | 512×512 ✓ |
| Feature graphic | `graphics/feature-graphic-1024x500.png` | exactly 1024×500 | 1024×500 ✓ |
| Phone screenshots | `screenshots/play-phone/01–07.png` | 2:1 max ratio, ≥320px | 1080×1920 (1.78:1) ✓ |

> **Why Play gets its own screenshot set.** The raw captures are 1320×2868 — a
> 2.17:1 ratio, which exceeds Play's hard 2:1 cap and is rejected on upload. The
> `play-phone` frames are recomposed at 1080×1920, not merely resized.

Play's feature graphic is mandatory; without it the app cannot be featured and
the listing header falls back to a flat colour.

Kit is phone-only, so no tablet screenshots are supplied. Play will mark the
listing "not optimised for tablets" and rank it lower on tablet devices — that is
expected and accepted for this release.

---

## Screenshot set

Same seven moments in both stores, same order:

| # | Screen | Headline | Subhead |
|---|---|---|---|
| 01 | Home grid | EVERY TOOL, ONE TAP AWAY | 20 everyday utilities in one app |
| 02 | Calculator | CALCULATORS THAT ADD UP | Basic and scientific, with history |
| 03 | EMI | MONEY, FIGURED OUT | EMI · GST · SIP · Tips · Expenses |
| 04 | Unit converter | CONVERT ANYTHING | Length · Weight · Temp · Data · More |
| 05 | Colour picker | PICK AND SAVE COLOURS | HEX · RGB · HSL · Contrast check |
| 06 | Themes | SIX RETRO THEMES | Paper · Enamel · Blueprint · Phosphor |
| 07 | Stopwatch | TIMERS THAT KEEP TIME | Stopwatch · Pomodoro · World clock |

Each frame carries a coloured fascia band in that tool's own accent, closed by a
9px ink rule, with the device shot in a drawn plate that overlaps the band — the
same hard-shadow language as the app itself.

The captures show a lived-in app: four starred tools, eight recents, and real
values in every calculator. The status bar is pinned to 9:41, full signal,
charged.

`screenshots/raw/` holds the unframed captures. They are kept for re-composition
only and are **not** for upload.

---

## Regenerating

The assets are generated, not hand-drawn. `tools/` holds the CoreGraphics scripts
that produced them (Swift, run directly — no Pillow or ImageMagick needed):

```bash
swift store/tools/Compose.swift   # screenshot frames, both stores
swift store/tools/Feature.swift   # 1024×500 Play feature graphic
swift store/tools/MakeIcon.swift  # app icon at every size
swift store/tools/MakeSplash.swift
```

`Compose.swift` takes `bandFrac` / `devWFrac` / `devTopFrac` so one layout serves
both aspect ratios. To reshoot the underlying captures, boot an iPhone 16/17 Pro
Max simulator — it captures natively at 1320×2868, exactly the 6.9" requirement,
so no rescaling is ever involved.

---

## Before you submit

- [ ] **Build a release-signed binary.** The APK produced during development is
      **debug-signed** and Play will reject it. Use `eas build --platform android
      --profile production`.
- [ ] **Check the ABI filter survived.** `ndk { abiFilters 'arm64-v8a' }` in
      `android/app/build.gradle` is what takes the APK from 91 MB to 36 MB, and
      `expo prebuild` overwrites that file. The durable fix is to move it into
      `expo-build-properties` in `app.config.ts`.
- [ ] **Rebuild natively so the new icon and splash ship.** Changing them in
      `app.config.ts` alone does not update an already-built binary.
- [ ] Privacy policy is live at the URL given in both listings.
- [ ] App Store: select **Data Not Collected** on the privacy nutrition label.
- [ ] Play: answer **No** to "collects or shares user data" on the data safety form.
