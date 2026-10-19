# modern-khmer-keyboard-tutor

Browser typing tutor for an **experimental** Khmer keyboard layout whose key assignment is driven by the frequency of letters and coeng clusters (e.g. ្រ, ្ត, ្ម get their own keys).

- Live page: serve the `docs/` folder (GitHub Pages: Settings → Pages → Deploy from branch → `main` / `/docs`).
- Open `docs/index.html` locally to run it; no build step or server needed.
- Pages: `docs/index.html` is the home page, which teaches the standard NiDA keyboard. `docs/lab.html` is the experimental layout tutor, with its research data in an ⓘ About sheet. `docs/nida.html` only redirects old links to the home page. `docs/ui.css` holds the shared design system: tokens, krama top bar, buttons, sheets and arcade styles. `docs/visuals.js` draws the live pictures: a 3D keyboard that types Khmer words by itself (on both pages, following the Windows/Mac or layout choice), small looping previews of each game on the game cards, and mini key maps on the lesson tiles. They animate only while on screen, and `prefers-reduced-motion` shows still frames.
- Works with physical key positions (QWERTY `event.code`), so it is independent of the OS layout. On-screen keys are clickable for touch devices.

## Important caveats

- This is **not** an existing standard. I found no published layout built on coeng-cluster frequency. The closest known one, Khmerism (Ly Heang, 2016), is based on letter frequency, and I could not obtain its key map. This layout is my own derivation.
- Unit frequencies come from the author's Khmer text corpus (212,000,389 units; counts in `data/corpus-unit-counts.json`). Practice words still come from a word-usage list ([type-kor](https://github.com/Manethpak/type-kor), 9,428 search terms, which over-represents formal vocabulary and is not redistributed; download it to `data/source-freq.csv` to regenerate `docs/words.js`).
- Stability (split-half on that corpus): rank correlation of the top-150 units is 0.9996 at 10M units and 0.9999 at 100M; base/Shift/AltGr tier agreement is 0.97–1.00 from 1M units up. The residual swaps are between units with near-equal frequency. Genre/source drift was not measured.
- The effort model is a simple per-key cost plus Shift/AltGr penalties. It ignores hand alternation and bigram effort, and no typing-speed benefit has been measured.

- Fonts: Noto Serif Khmer (all Khmer text) and Kantumruy Pro (Latin interface text), both SIL OFL 1.1 (`docs/fonts/OFL*.txt`), are bundled, so Khmer renders without network access or a system Khmer font.

## Layout design (v2)

`tools/optimize_layout.py` (needs numpy) searches slot assignments by simulated annealing. Per Khmer unit typed, the cost has:

1. **Position + modifier effort**: key cost (home row cheapest) plus a layer penalty (Shift +1.0, AltGr +2.0, both assumptions; override with `SHIFT_PEN`/`ALT_PEN`).
2. **Bigram effort**: same-finger repeats, row jumps, inward/outward rolls, hand alternation, layer switches.
3. **Finger load caps**: pinky 6%, ring 9%, middle 15%, index 20% per hand.
4. **Learnability**: a-series/o-series counterpart letters (ក/គ, ខ/ឃ, ច/ជ, ឆ/ឈ, ដ/ឌ, ឋ/ឍ, ត/ទ, ថ/ធ, ប/ព, ផ/ភ) share a key (other layer) or sit side by side. This costs about 1% modelled effort and raises counterpart closeness from 0.15 to 0.65.
5. **Pair keys**: the number of dedicated coeng-pair keys K is chosen by the model.

**Finding on cluster keys.** With only 33 base-layer slots, dedicated pair keys did *not* lower modelled effort at any tested setting. A single coeng key carries ~8.5% of keystrokes and is hard to beat; splitting it into 12 pair keys saves ~7% of keystrokes but pushes more units to Shift/AltGr. Exact position-only costs (noise-free) at Shift +1.0 / AltGr +2.0: K=0 2.050, K=1 2.064, K=4 2.085, K=12 2.086; only at near-zero modifier penalties (Shift ≤0.2) does K=1 edge ahead. Hence the model-optimal "refined" layout has no pair keys, which also makes it installable as a normal OS layout (see below). The "clusters" layout (12 pair keys, same optimiser) and the old frequency-only "unigram" layout are kept in the tutor for comparison. Whether fewer keystrokes beats fewer modifiers for real typists is an empirical question.

Modelled comparison (interim bigrams, see caveats): same-finger bigrams 9.4% (v1 frequency-only) → 1.4% (v2); hand alternation 49% → 77%.

## Caveats on v2

- Bigram statistics are currently **interim**, estimated from the 9,428-word list. For the real thing, re-run `tools/corpus_convergence.py` on your corpus (it now also writes bigram counts into `data/corpus-unit-counts.json`) and then `python3 tools/optimize_layout.py`.
- The effort model is an assumption-laden proxy. Nobody has timed typists on these layouts.
- Layer penalties, bigram weights and finger caps are my choices, not measured values.

## Measuring with people

The tutor has a layout selector and an **Export log (CSV)** button (every keystroke: expected unit, typed unit, physical key, layer, correct, ms since previous key). Compare layouts on speed, error rate and learning curve with the same participants and lessons. Counterbalance the order, since a second layout benefits from practice on the first.

## Firebase Hosting

Every push to `main` deploys `docs/` to Firebase Hosting via `.github/workflows/firebase-hosting.yml`. It needs the repository secret `FIREBASE_SERVICE_ACCOUNT` (the JSON key of a Firebase service account); the project ID is read from that key. GitHub Pages keeps serving the same files.

## Accounts (optional sign-in)

`docs/auth.js` adds an account button: Google or email/password sign-in through Firebase Authentication. Signed-in learners' stars and best scores (`nida_*`, `rain_*`, `archer_*`, `best*` keys) are merged with `users/{uid}` in Firestore (the higher score wins) and later saves are written back. Settings stay on the device. Guests are unaffected.

Sign-in works on the Firebase site only: it reads the web-app config from `/__/firebase/init.json`. GitHub Pages and the preview show a link to the main site instead. One-time setup in the Firebase console (project `modernkhmertyping`):

1. Project settings → Your apps: register a **Web app**, if none exists.
2. Authentication → Sign-in method: enable **Google** and **Email/Password**.
3. Firestore Database: create a database, then paste `firestore.rules` into Rules and publish. The deploy workflow pushes Hosting only.

## Installing on Linux (no pair keys only)

`python3 tools/export_xkb.py refined` writes `exports/khmer-cluster-refined.xkb`. It compiles with `xkbcomp`, but I have not tested it on a live desktop. Copy it to `~/.xkb/symbols/khcluster` and load it with `setxkbmap -I ~/.xkb khcluster` on X11 (Wayland setups differ). AltGr = Right Alt. Windows and macOS layouts are not generated. Pair-key layouts need an IME or software keyboard because OS key layouts emit one character per key level.

## Rebuild the layout

```
python3 tools/corpus_convergence.py khmer_corpus_v5.txt.gz   # -> data/corpus-unit-counts.json (unit + bigram counts)
pip install numpy
python3 tools/optimize_layout.py                              # -> docs/layout.js (refined, clusters, unigram)
```

`tools/build_layout.py` is the v1 greedy generator (single-layout `window.LAYOUT` format). It is superseded: running it overwrites `docs/layout.js` in a format the tutor no longer reads. Its helpers are still imported by the optimiser.

## On phones (iOS and Android)

On narrow screens the on-screen keyboard docks to the bottom (respecting the iPhone home-indicator area), keys respond on touch-down, Shift (⇧), AltGr (⌥) and Backspace (⌫) are keys inside the keyboard like on a phone, latching Shift/AltGr shows that layer on the keycaps, Android vibrates briefly on a wrong key, and Word Rain gets Pause and ⌫ buttons. The site can be added to the home screen (`docs/manifest.webmanifest`, icons in `docs/icons/`).

## Standard NiDA keyboard (Windows and Mac)

`docs/index.html` (the home page) teaches the keyboard most Khmer typists already use: the NiDA "Khmer Unicode" layout, with a Windows/Mac switch. It has 10 lessons (home, top and bottom rows; the same rows with Shift; subscripts; digits and punctuation; common words; long words) and three games (Key Hunt, a 60-second Sprint and Word Rain). The on-screen keyboard follows the real Windows or Mac key shapes, with AltGr or ⌥ Option for the third layer.

### Topic lessons (units 2–6)
After the 10 keyboard lessons (Unit 1), the home page has 39 typing passages in five units:
- **Daily life:** greetings, family, market, food, weather, time, travel.
- **School subjects:** Khmer language, maths, the water cycle, plants, history, geography, civics, environment.
- **Cambodia & the world:** Angkor Wat, Mekong, Tonle Sap, provinces, Khmer New Year, Water Festival, Pchum Ben, wildlife, the solar system, oceans.
- **Work & professions:** health, agriculture, office, IT, law and administration, tourism, banking, teaching, road safety, construction.
- **Advice & short stories.**

The passages live in `docs/texts-km.js`. They are **original drafts written for this tutor, not taken from textbooks**, and should be reviewed by a native Khmer speaker for spelling, wording and facts. `node tools/check_texts.js` checks that every passage can be typed on both NiDA maps, is well-formed Khmer, has a sensible length, and is not duplicated. Lessons are grouped into collapsible units with progress rings; stars for text lessons are stored as `nida_<platform>_t<id>`.

- Key maps are in `docs/nida-layouts.js`. Windows comes from XKB `symbols/kh` (the same layout as Windows "Khmer (NIDA)", KBDKNI). Mac comes from the "Khmer Unicode" keylayout in [socheatsok78/khmer-unicode-keyboard-for-macos](https://github.com/socheatsok78/khmer-unicode-keyboard-for-macos).
- Every letter key is the same in both maps. They differ in 10 rarely used AltGr/Option symbols.
- Not verified: Windows' plain "Khmer" keyboard (KBDKHMR) and Apple's built-in "Khmer" layout may differ from NiDA. The setup guide on the page says so.

## Arcade games

`docs/arcade.js` is a small shared engine used by both pages. It provides particle bursts, explosions, screen shake, floating score text, a combo meter, synthesised sound effects (🔊 toggle, remembered), and the **Archer** game.

- **Archer** (on both pages): Khmer letters fall toward an archer. Type a letter to shoot an arrow at the lowest copy of it. A letter that reaches the ground explodes and costs 15–25 HP; it costs more the closer it lands to the archer.
  - Combo multiplier: ×2 at 5 hits, ×3 at 15, ×4 at 30, ×5 at 50.
  - Healing: every 10-hit combo heals 10 HP, a green ✚ letter heals 20 HP when shot, and clearing a wave heals 5 HP.
  - Waves have 15 letters each and get faster.
  - On the main page the letter set follows the "Keys" level; on the NiDA page it is home row / no Shift / Shift / everything.
- **Look:** the archer is a Khmer foot soldier modelled on the Bayon bas-reliefs. He wears a krama headcloth, a short sampot, a leather baldric and a quiver, and holds a recurve bow with gold naga-curl tips. He stands on a carved sandstone terrace with a *kbach* frieze, in front of a moonlit Angkor Wat and sugar palms, under a temple-lintel border. Letters fall inside lotus rosettes, and healing letters are pink lotus flowers. Word Rain and Key Hunt use the same skyline.
- **Living sky:** every game background (Archer, Word Rain, Key Hunt) runs through the day as you progress: dawn, morning, noon, afternoon, sunset, dusk, night. Archer moves on each wave, Word Rain on each speed-up, and Key Hunt over its 60 seconds. The sun crosses the sky, the moon rises at dusk, stars sparkle with occasional glints and shooting stars, clouds drift, and the sugar palms sway in gusting wind. The sky is drawn on a canvas that pauses when off-screen. `prefers-reduced-motion` stops the sway and makes time changes jump instead of easing.
- **Sound:** lessons play a soft key click, a lower click for Space, an error tone and a finishing chime. One 🔊/🔇 setting (`localStorage` `sfx`) covers lessons and games on both pages.
- **Word Rain** (both pages): score is multiplied by the combo, landed words explode, and every 5-word combo gives back a life (up to 5).
- **Key Hunt**: combo multiplier on points; every 10-hit combo adds 3 seconds.
- **Sprint**: a combo counts words typed with no mistakes; every 5 clean words add 2 seconds.

## Word Rain game

The **Word Rain game** is a tab in `docs/lab.html` next to the lessons: Khmer words fall; type each before it hits the red line. Choose the layout and how many keys (top 8/16/…/all) are in play, so it doubles as practice for the lessons. Three lives, speed rises every 8 words, Backspace drops the current word lock, Esc pauses, best score is stored per layout and key set in `localStorage`.

## Tutor

Lessons introduce 8 keys at a time in frequency order, with drills and words made only of learned keys, then a final all-keys lesson. WPM is keystrokes ÷ 5 per minute. Best scores are stored in `localStorage`.
