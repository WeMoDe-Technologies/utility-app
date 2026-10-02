# Kit — App Store (iOS) listing

> **ASO note for iOS:** Apple indexes only the **app name, subtitle, and keywords
> field** (plus in-app purchase names and the developer name). The description is
> **not** indexed — it exists purely to convert a visitor into a download. So the
> keywords live in the three fields at the top, and the description below is
> written for persuasion, not for search.

---

## App Name — 23/30 characters

```
Kit: Calculator & Tools
```

"Calculator" is the single highest-volume term this app can legitimately claim,
and "Tools" captures the category. "Kit" alone would be unrankable.

## Subtitle — 28/30 characters

```
Converters, timers & finance
```

Deliberately carries three more indexed head terms that the name cannot fit.
No word is repeated from the name — repetition is wasted index space.

## Keywords field — 99/100 characters

```
scientific,unit,currency,gst,emi,sip,tip,qr,password,compass,stopwatch,pomodoro,color,expense,clock
```

Rules applied:
- Comma-separated, **no spaces** (a space costs an indexable character).
- No word repeated from the name or subtitle.
- Singular forms only — Apple matches plurals automatically.
- No "app", "free", or the category name; those are implicit and waste space.

## Promotional Text — 156/170 characters

*(Editable any time without resubmitting a build — use it for seasonal pushes.)*

```
Twenty everyday tools in one offline app. Calculators, converters, EMI and GST,
timers, QR scanner, colour picker and more. No account, no ads, no tracking.
```

---

## Description — 2,534/4,000 characters

```
Twenty tools you actually reach for, in one app that opens instantly and works
without a connection.

Kit replaces the dozen single-purpose utilities cluttering your home screen. Every
tool is built to the same standard: fast, precise, and designed so the number you
need is the biggest thing on screen.

MATH
• Calculator — full expression history, live preview as you type, correct operator
  precedence, and clear errors instead of a silent "Error"
• Scientific — trigonometry, logs, powers, roots, factorials, memory registers, and
  radians or degrees
• Age calculator — exact years, months and days, plus totals and your next birthday

CONVERTERS
• Unit converter — length, weight, temperature, area, volume, speed and data, with
  every unit shown at once so you can compare at a glance
• Currency — live exchange rates with offline fallback, for 16 currencies

MONEY
• EMI calculator — monthly instalment, total interest, and a principal-versus-
  interest breakdown
• GST calculator — inclusive or exclusive, with CGST, SGST and IGST split out
• SIP and lumpsum — projected returns with a year-by-year growth chart
• Discount — stacked discounts, effective rate, and a reverse calculator
• Tip and split — per-person totals with optional rounding
• Expenses — categorised spending with income and balance

TIME
• Stopwatch — laps with fastest and slowest marked, accurate across backgrounding
• Pomodoro — focus and break cycles with optional auto-advance
• World clock — daylight saving handled correctly, so the offset is never wrong

TOOLS
• QR and barcode scanner
• Password generator — guarantees every character type you ask for, with a real
  entropy readout
• Colour picker — HEX, RGB and HSL with WCAG contrast checking and saved palettes
• Compass — true or magnetic north, with coordinates and altitude
• Counter — multiple labelled counters with custom steps
• Noise meter — ambient sound level with min, average and max

SIX THEMES
Bone, Graphite, Oxide, Olive, Blueprint and Terminal — paper, enamel, drafting
linen and phosphor glass. Pick the one you want; there is no automatic switching
you did not ask for.

PRIVATE BY DEFAULT
Everything runs on your device. There is no account, no analytics, no advertising,
and nothing is uploaded. The only network request Kit ever makes is fetching
exchange rates, and only when you open the currency converter.

Choose your currency once and every finance tool follows it. Star the tools you use
most and they move to the top. Search finds any tool in two keystrokes.
```

---

## App Review / Setup

| Field | Value |
|---|---|
| Primary category | Utilities |
| Secondary category | Productivity |
| Age rating | 4+ |
| Price | Free |
| In-app purchases | None |
| Privacy policy URL | https://www.wemodetechnologies.com/en/privacy |
| Support URL | https://www.wemodetechnologies.com |
| Copyright | © 2026 WeMoDe Technologies |

### Privacy nutrition label

Select **"Data Not Collected"**. Kit has no analytics SDK, no account system, and
no advertising identifier. The currency converter calls a public exchange-rate API
that receives no user data.

### App Review notes

```
Kit requires no account and no login — every feature is available immediately.

Three features request permission, each only when you open that specific tool, and
each degrades gracefully if denied:
• Camera — QR/barcode scanner only. No images are stored or transmitted.
• Microphone — noise meter only. Audio is metered for a level reading and never
  recorded, saved, or transmitted.
• Location — compass only, for true-north correction and coordinates. Never leaves
  the device.

The only outbound request in the app is to open.er-api.com for exchange rates,
made when the currency converter is opened. It sends no user data. If it fails,
the app falls back to bundled offline rates and labels them as such.
```

---

## What's New (version 1.0.0)

```
First release.

Twenty tools in one offline app, with six themes to choose from. No account, no
ads, no tracking — everything runs on your device.
```
