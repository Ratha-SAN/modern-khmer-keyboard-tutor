# modern-khmer-keyboard-tutor

Browser typing tutor for an **experimental** Khmer keyboard layout whose key assignment is driven by the frequency of letters and coeng clusters (e.g. ្រ, ្ត, ្ម get their own keys).

- Live page: serve the `docs/` folder (GitHub Pages: Settings → Pages → Deploy from branch → `main` / `/docs`).
- Open `docs/index.html` locally to run it; no build step or server needed.
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

## Installing on Linux (no pair keys only)

`python3 tools/export_xkb.py refined` writes `exports/khmer-cluster-refined.xkb`. It compiles with `xkbcomp`, but I have not tested it on a live desktop. Copy it to `~/.xkb/symbols/khcluster` and load it with `setxkbmap -I ~/.xkb khcluster` on X11 (Wayland setups differ). AltGr = Right Alt. Windows and macOS layouts are not generated. Pair-key layouts need an IME or software keyboard because OS key layouts emit one character per key level.

## Rebuild the layout

```
python3 tools/corpus_convergence.py khmer_corpus_v5.txt.gz   # -> data/corpus-unit-counts.json (unit + bigram counts)
pip install numpy
python3 tools/optimize_layout.py                              # -> docs/layout.js (refined, clusters, unigram)
```

`tools/build_layout.py` is the v1 greedy generator (single-layout `window.LAYOUT` format). It is superseded: running it overwrites `docs/layout.js` in a format the tutor no longer reads. Its helpers are still imported by the optimiser.

## Word Rain game

The **Word Rain game** is a tab in `docs/index.html` next to the lessons: Khmer words fall; type each before it hits the red line. Choose the layout and how many keys (top 8/16/…/all) are in play, so it doubles as practice for the lessons. Three lives, speed rises every 8 words, Backspace drops the current word lock, Esc pauses, best score is stored per layout and key set in `localStorage`.

## Tutor

Lessons introduce 8 keys at a time in frequency order, with drills and words made only of learned keys, then a final all-keys lesson. WPM is keystrokes ÷ 5 per minute. Best scores are stored in `localStorage`.
