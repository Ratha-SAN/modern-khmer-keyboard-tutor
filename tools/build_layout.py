#!/usr/bin/env python3
"""Derive a cluster-frequency Khmer keyboard layout and the tutor's data files.

Input : data/corpus-unit-counts.json (from corpus_convergence.py) for unit frequencies, if present;
        otherwise a CSV with columns `word,sessions` (data/source-freq.csv).
        The word CSV (if present) is also used for the tutor's practice words.
Output: docs/layout.js (layout + unit ranking) and docs/words.js (practice words)

Method
1. Split every word into typing units: a coeng+consonant pair (U+17D2 + C) or a single code point.
2. Pick the PAIR_COUNT most frequent coeng pairs to get a key of their own; remaining
   pairs are typed as coeng key + consonant key.
3. Rank all units by weighted frequency.
4. Assign units, most frequent first, to the cheapest (key position, layer) slot.
   Slot cost = finger/position cost + layer penalty (Shift, AltGr).
Greedy by frequency is optimal for sum(freq * cost) when slot costs are independent.
It does NOT model hand alternation or bigram effort.
"""
import csv, json, sys, collections, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "source-freq.csv")
COUNTS = os.path.join(ROOT, "data", "corpus-unit-counts.json")
OUT = os.path.join(ROOT, "docs")
PAIR_COUNT = 12
WORDS_KEPT = 3000
COENG = "្"

# physical key -> position cost (lower = easier). QWERTY geometry, 3 rows.
COST = {
    "KeyQ": 3.0, "KeyW": 2.4, "KeyE": 2.0, "KeyR": 2.2, "KeyT": 2.8, "KeyY": 3.4,
    "KeyU": 2.4, "KeyI": 2.0, "KeyO": 2.4, "KeyP": 3.0, "BracketLeft": 3.8, "BracketRight": 4.0,
    "KeyA": 1.6, "KeyS": 1.2, "KeyD": 1.0, "KeyF": 1.0, "KeyG": 2.2, "KeyH": 2.2,
    "KeyJ": 1.0, "KeyK": 1.0, "KeyL": 1.2, "Semicolon": 1.6, "Quote": 2.6,
    "KeyZ": 3.2, "KeyX": 3.2, "KeyC": 2.6, "KeyV": 2.6, "KeyB": 3.4,
    "KeyN": 3.0, "KeyM": 2.4, "Comma": 2.8, "Period": 3.2, "Slash": 3.4,
}
ROWS = [
    ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight"],
    ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
    ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
]
LAYER_PENALTY = [0.0, 2.0, 3.5]  # base, Shift, AltGr
DIGIT_CODES = ["Digit%d" % d for d in (1, 2, 3, 4, 5, 6, 7, 8, 9, 0)]
KHMER_DIGITS = [chr(0x17E0 + d) for d in (1, 2, 3, 4, 5, 6, 7, 8, 9, 0)]


def universe():
    """Every code point a typist may need, so rare ones still get a slot."""
    u = [chr(c) for c in range(0x1780, 0x17A3)]                    # consonants
    u += [chr(c) for c in range(0x17B6, 0x17C6)]                   # dependent vowels
    u += [chr(c) for c in range(0x17C6, 0x17D2)]                   # signs
    u += [COENG, "៓", "៝"]
    u += [chr(c) for c in range(0x17A5, 0x17B4)]                   # independent vowels
    u += ["។", "៕", "ៗ", "៛"]                  # ។ ៕ ៗ ៛
    return u


def split_units(word, pairs):
    out, i = [], 0
    while i < len(word):
        if word[i] == COENG and i + 1 < len(word) and word[i:i + 2] in pairs:
            out.append(word[i:i + 2]); i += 2
        else:
            out.append(word[i]); i += 1
    return out


def main():
    rows = []
    if os.path.exists(SRC):
        with open(SRC, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                w = r["word"].strip()
                if w and all(0x1780 <= ord(c) <= 0x17FF for c in w):
                    rows.append((w, int(r["sessions"])))

    if os.path.exists(COUNTS):
        with open(COUNTS, encoding="utf-8") as f:
            cj = json.load(f)
        raw = collections.Counter({u: n for u, n in cj["counts"]})
        pair_freq = collections.Counter({u: n for u, n in raw.items() if len(u) == 2 and u[0] == COENG})
        pairs = [p for p, _ in pair_freq.most_common(PAIR_COUNT)]
        pairset = set(pairs)
        freq = collections.Counter({u: n for u, n in raw.items() if len(u) == 1})
        for p, n in pair_freq.items():
            if p in pairset:
                freq[p] = n
            else:                      # typed as coeng key + consonant key
                freq[COENG] += n
                freq[p[1]] += n
        source = "%d Khmer units from a text corpus" % cj["total"]
    else:
        pair_freq = collections.Counter()
        for w, n in rows:
            for i in range(len(w) - 1):
                if w[i] == COENG:
                    pair_freq[w[i:i + 2]] += n
        pairs = [p for p, _ in pair_freq.most_common(PAIR_COUNT)]
        pairset = set(pairs)
        freq = collections.Counter()
        for w, n in rows:
            for u in split_units(w, pairset):
                freq[u] += n
        source = "word-usage counts from %d Khmer words" % len(rows)
    total_pairs = sum(pair_freq.values())
    uni = universe() + pairs
    ranked = sorted(uni, key=lambda u: (-freq[u], uni.index(u)))

    slots = []
    for layer, pen in enumerate(LAYER_PENALTY):
        for code, c in COST.items():
            slots.append((c + pen, layer, code))
    slots.sort()
    assert len(ranked) <= len(slots), (len(ranked), len(slots))

    keymap = {code: ["", "", ""] for code in COST}
    where = {}
    for unit, (cost, layer, code) in zip(ranked, slots):
        keymap[code][layer] = unit
        where[unit] = (layer, code, cost)
    # number row: Khmer digits base, ASCII digits on Shift
    for code, kd, d in zip(DIGIT_CODES, KHMER_DIGITS, "1234567890"):
        keymap[code] = [kd, d, ""]

    total = sum(freq.values())
    by_layer = [sum(freq[u] for u in uni if where[u][0] == l) / total for l in range(3)]
    mean_cost = sum(freq[u] * where[u][2] for u in uni) / total
    info = {
        "name": "Cluster-Frequency Khmer (experimental)",
        "source": source,
        "pairs": pairs,
        "layerShare": [round(x, 4) for x in by_layer],
        "meanCost": round(mean_cost, 3),
        "pairShareOfCoeng": round(sum(pair_freq[p] for p in pairs) / total_pairs, 3),
    }
    ranking = [[u, freq[u]] for u in ranked]

    # practice words: only those fully typable, most frequent first
    typable = set(uni)
    words = None if not rows else []
    for w, n in sorted(rows, key=lambda x: -x[1]):
        if all(u in typable for u in split_units(w, pairset)):
            words.append(w)
        if len(words) >= WORDS_KEPT:
            break

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "layout.js"), "w", encoding="utf-8") as f:
        f.write("window.LAYOUT=" + json.dumps(
            {"info": info, "rows": ROWS, "digits": DIGIT_CODES, "keys": keymap, "ranking": ranking},
            ensure_ascii=False, separators=(",", ":")) + ";\n")
    if words is not None:   # keep the committed words.js when the word CSV is absent
        with open(os.path.join(OUT, "words.js"), "w", encoding="utf-8") as f:
            f.write("window.WORDS=" + json.dumps(words, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps(info, ensure_ascii=False, indent=1))
    print("units:", len(uni), "words kept:", None if words is None else len(words))


if __name__ == "__main__":
    main()
