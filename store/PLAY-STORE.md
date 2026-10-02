# Kit — Google Play listing

> **ASO note for Play:** unlike Apple, Google indexes the **title, short
> description AND full description**. There is no separate keywords field, so the
> keywords have to live naturally inside the prose. Target roughly 2–3 mentions of
> each important term across the full description — enough to rank, not so many
> that it reads like spam (which Play demotes).

---

## Title — 23/30 characters

```
Kit: Calculator & Tools
```

## Short description — 78/80 characters

```
20 offline tools: calculator, unit & currency converter, timers, EMI, GST, QR.
```

Appears above the fold and is weighted heavily. Every word here is a search term.

---

## Full description — 3,945/4,000 characters

```
Twenty tools you actually reach for, in one app that opens instantly and works
offline.

Kit replaces the dozen single-purpose utilities cluttering your phone — a
calculator, a unit converter, a currency converter, a stopwatch, a QR scanner, a
password generator — with one app that does all of it, properly.

━━━━━━━━━━━━━━━━━━━━
CALCULATORS
━━━━━━━━━━━━━━━━━━━━
A calculator with full expression history and a live preview as you type. Correct
operator precedence, so 2 + 3 × 4 gives 14, not 20. When something is wrong it
tells you why instead of showing a blank error.

The scientific calculator adds trigonometry, logarithms, powers, roots,
factorials, memory registers, and a radians or degrees toggle.

The age calculator gives exact years, months and days between two dates, plus
total days, weeks and hours, and days to your next birthday.

━━━━━━━━━━━━━━━━━━━━
UNIT AND CURRENCY CONVERTER
━━━━━━━━━━━━━━━━━━━━
The unit converter handles length, weight, temperature, area, volume, speed and
data. Every unit in the category is shown at once, so you can read all conversions
at a glance instead of switching back and forth.

The currency converter fetches live exchange rates for 16 currencies and falls
back to bundled offline rates when you have no connection — clearly labelled, so
you always know which you are looking at.

━━━━━━━━━━━━━━━━━━━━
FINANCE
━━━━━━━━━━━━━━━━━━━━
• EMI calculator — monthly instalment, total interest payable, and a visual
  principal-versus-interest split for any loan
• GST calculator — inclusive or exclusive, with CGST, SGST and IGST broken out and
  a one-tap copy of the whole breakdown
• SIP and lumpsum calculator — projected returns with a year-by-year growth chart
  and effective CAGR
• Discount calculator — stacked discounts with the true effective rate, plus a
  reverse calculator to recover the original price
• Tip and split — per-person totals, with optional rounding up
• Expense tracker — categorised spending with income and running balance

Pick your currency once in settings and every finance tool follows it.

━━━━━━━━━━━━━━━━━━━━
TIMERS AND CLOCKS
━━━━━━━━━━━━━━━━━━━━
• Stopwatch with laps, fastest and slowest marked automatically. It keeps correct
  time even when the app is backgrounded.
• Pomodoro focus timer with work and break cycles and optional auto-advance
• World clock that handles daylight saving correctly — the time difference it
  shows is right all year, not just in winter

━━━━━━━━━━━━━━━━━━━━
EVERYDAY TOOLS
━━━━━━━━━━━━━━━━━━━━
• QR code and barcode scanner, with safe link previews before anything opens
• Password generator that guarantees one character of every type you select, with
  a real entropy readout and a crack-time estimate
• Colour picker with HEX, RGB and HSL, WCAG contrast checking, colour harmonies,
  and saved palettes
• Compass with true or magnetic north, coordinates and altitude
• Counter — as many labelled counters as you need, with custom step sizes
• Noise meter showing ambient sound level with minimum, average and maximum

━━━━━━━━━━━━━━━━━━━━
SIX THEMES
━━━━━━━━━━━━━━━━━━━━
Bone, Graphite, Oxide, Olive, Blueprint and Terminal — warm paper, dark enamel,
drafting linen and phosphor glass. Choose the one you want and it stays chosen.

━━━━━━━━━━━━━━━━━━━━
PRIVATE BY DEFAULT
━━━━━━━━━━━━━━━━━━━━
No account. No sign-up. No analytics. No advertising. No tracking.

Everything runs on your device and stays there. The only network request Kit makes
is fetching exchange rates, and only when you open the currency converter.

Camera access is used solely for the QR scanner, the microphone solely for the
noise meter, and location solely for the compass. Each is requested only when you
open that tool, nothing is recorded or uploaded, and every one of them degrades
gracefully if you decline.

Star the tools you use most to pin them to the top. Search finds any tool in two
keystrokes. Kit is free, with no in-app purchases.
```

---

## Store settings

| Field | Value |
|---|---|
| App category | Tools |
| Tags | Calculator, Unit converter, Productivity, Utilities |
| Content rating | Everyone |
| Contains ads | No |
| In-app purchases | No |
| Target audience | 13+ |
| Email | wemodetechnologies@gmail.com |
| Website | https://www.wemodetechnologies.com |
| Privacy policy | https://www.wemodetechnologies.com/en/privacy |

### Data safety form

Answer **"No"** to *"Does your app collect or share any required user data types?"*

| Question | Answer |
|---|---|
| Data collected | None |
| Data shared | None |
| Data encrypted in transit | N/A — no user data transmitted |
| Users can request deletion | N/A — no data leaves the device |

Permissions declared in the manifest, and the justification for each:

| Permission | Used by | Justification |
|---|---|---|
| `CAMERA` | QR scanner | Reads codes on-device; no image stored or sent |
| `RECORD_AUDIO` | Noise meter | Meters amplitude only; no audio recorded or sent |
| `ACCESS_FINE_LOCATION` / `COARSE` | Compass | True-north correction and coordinates; stays on device |
| `INTERNET` | Currency converter | Fetches public exchange rates; sends no user data |
| `VIBRATE` | Haptics | Button feedback; user-toggleable in settings |

---

## Release notes (version 1.0.0)

```
First release.

Twenty tools in one offline app, with six themes to choose from. No account, no
ads, no tracking — everything runs on your device.
```
