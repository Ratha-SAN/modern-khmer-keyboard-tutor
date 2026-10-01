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

- Font: Noto Sans Khmer (SIL OFL 1.1, see `docs/fonts/OFL.txt`) is bundled, so Khmer renders without network access or a system Khmer font.

## Rebuild the layout

```
curl -o data/source-freq.csv https://raw.githubusercontent.com/Manethpak/type-kor/main/src/data/khmer-search-frequency.csv
python3 tools/build_layout.py   # writes docs/layout.js (and docs/words.js if the word CSV is present)
```

Method: split words into units (single code points, including ៖, plus the 12 most frequent coeng+consonant pairs), rank by weighted frequency, assign greedily to the lowest-cost (key, layer) slots. Layers: base, Shift, AltGr/Option. Number row: Khmer digits, Shift for ASCII digits.

## Tutor

Lessons introduce 8 keys at a time in frequency order, with drills and words made only of learned keys, then a final all-keys lesson. WPM is keystrokes ÷ 5 per minute. Best scores are stored in `localStorage`.
