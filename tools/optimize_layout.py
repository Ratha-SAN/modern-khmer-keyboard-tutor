#!/usr/bin/env python3
"""Optimise the Khmer layout beyond single-key frequency.

Needs numpy.  Input : data/corpus-unit-counts.json (unit counts; "bigrams" optional, see below)
Output: docs/layout.js  with window.LAYOUTS = {refined, unigram} and window.LAYOUT_DEFAULT

Model (all costs per Khmer unit typed; lower is better)
  position : key cost + layer penalty (Shift +1.0, AltGr +2.0 by default; env SHIFT_PEN / ALT_PEN)                         [point 1, 2]
  bigram   : cost of each key->key transition: same finger, row jumps, rolls,
             hand alternation, modifier switching                                       [point 3]
  load     : penalty when a finger carries more than its share (pinky 6%, ring 9%,
             middle 15%, index 20% per hand)                                            [point 1]
  learn    : a-series/o-series counterpart letters (ក/គ, ខ/ឃ, ...) should share a key
             (other layer) or sit side by side                                          [point 6]
  pairs    : K coeng+consonant pairs get their own key; K is chosen by trying several  [point 4]
The search is simulated annealing over slot assignments. "unigram" is the earlier greedy
frequency-only layout, scored with the same model for comparison.

Bigram data: uses "bigrams" from corpus_convergence.py (re-run it to get them). If absent, a
word-list bigram estimate from data/source-freq.csv is used and flagged as interim.
"""
import sys, os, json, csv, math, random, collections
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_layout import COST, ROWS, DIGIT_CODES, KHMER_DIGITS, universe, COENG  # noqa: E402

ROOT = os.path.dirname(HERE)
COUNTS = os.path.join(ROOT, "data", "corpus-unit-counts.json")
WORDCSV = os.path.join(ROOT, "data", "source-freq.csv")
OUT = os.path.join(ROOT, "docs", "layout.js")

LAYER_PENALTY = [0.0, float(os.environ.get("SHIFT_PEN", 1.0)), float(os.environ.get("ALT_PEN", 2.0))]  # assumption, see README
K_OPTIONS = [int(x) for x in os.environ.get("KS", "0,4,8,12,14").split(",")]   # 14 = free slots left after the 85 required units
ITERS = int(os.environ.get("ITERS", 150000))
RESTARTS = int(os.environ.get("RESTARTS", 2))
LEARN_W = 0.005      # effort per unit when all 10 counterpart pairs are maximally apart
LOAD_W = 40.0
MU = 1.0             # weight of the bigram term
CAPS = [0.06, 0.09, 0.15, 0.20, 0.20, 0.15, 0.09, 0.06]
FINGER = {"KeyQ": 0, "KeyA": 0, "KeyZ": 0, "KeyW": 1, "KeyS": 1, "KeyX": 1, "KeyE": 2, "KeyD": 2, "KeyC": 2,
          "KeyR": 3, "KeyF": 3, "KeyV": 3, "KeyT": 3, "KeyG": 3, "KeyB": 3,
          "KeyY": 4, "KeyH": 4, "KeyN": 4, "KeyU": 4, "KeyJ": 4, "KeyM": 4, "KeyI": 5, "KeyK": 5, "Comma": 5,
          "KeyO": 6, "KeyL": 6, "Period": 6, "KeyP": 7, "Semicolon": 7, "Slash": 7,
          "BracketLeft": 7, "BracketRight": 7, "Quote": 7}
ROWOF = {c: r for r, row in enumerate(ROWS) for c in row}
COLOF = {c: i for row in ROWS for i, c in enumerate(row)}
LEARN_PAIRS = [("ក", "គ"), ("ខ", "ឃ"), ("ច", "ជ"), ("ឆ", "ឈ"), ("ដ", "ឌ"),
               ("ឋ", "ឍ"), ("ត", "ទ"), ("ថ", "ធ"), ("ប", "ព"), ("ផ", "ភ")]

SLOTS = [(c, l) for l in range(3) for c in COST]           # 99 slots
NS = len(SLOTS)
P = np.array([COST[c] + LAYER_PENALTY[l] for c, l in SLOTS])
FING = np.array([FINGER[c] for c, _ in SLOTS])


def trans(a, b):
    (c1, l1), (c2, l2) = a, b
    f1, f2 = FINGER[c1], FINGER[c2]
    h1, h2 = f1 >= 4, f2 >= 4
    dr = abs(ROWOF[c1] - ROWOF[c2])
    if c1 == c2:
        t = 0.5
    elif h1 != h2:
        t = -0.3
    elif f1 == f2:
        t = 3.0 + 0.5 * dr
    else:
        inward = (f2 > f1) if not h1 else (f2 < f1)
        t = 0.5 + (-0.3 if inward else 0.2) + (1.0 if dr == 2 else 0.3 * dr)
    return t + (0.6 if l1 != l2 else 0.0)


S = np.array([[trans(a, b) for b in SLOTS] for a in SLOTS])


def learn_d(a, b):
    (c1, _), (c2, _) = a, b
    if c1 == c2:
        return 0.0
    if ROWOF[c1] == ROWOF[c2] and abs(COLOF[c1] - COLOF[c2]) == 1:
        return 0.5
    return 1.0


D = np.array([[learn_d(a, b) for b in SLOTS] for a in SLOTS])


def load_data():
    cj = json.load(open(COUNTS, encoding="utf-8"))
    raw = collections.Counter({u: n for u, n in cj["counts"]})
    big, src = collections.Counter(), None
    if cj.get("bigrams"):
        for a, b, n in cj["bigrams"]:
            big[(a, b)] += n
        src = "corpus"
    elif os.path.exists(WORDCSV):
        for r in csv.DictReader(open(WORDCSV, encoding="utf-8")):
            w, n = r["word"].strip(), int(r["sessions"])
            us, i = [], 0
            while i < len(w):
                if w[i] == COENG and i + 1 < len(w):
                    us.append(w[i:i + 2]); i += 2
                else:
                    us.append(w[i]); i += 1
            for a, b in zip(us, us[1:]):
                big[(a, b)] += n
        src = "word-list (interim)"
    else:
        raise SystemExit("no bigram source: rerun corpus_convergence.py or provide data/source-freq.csv")
    return cj, raw, big, src


class Model:
    def __init__(self, raw, big, bigsrc, k):
        pair_freq = {u: n for u, n in raw.items() if len(u) == 2 and u[0] == COENG}
        self.pairs = [p for p, _ in sorted(pair_freq.items(), key=lambda x: -x[1])[:k]]
        pset = set(self.pairs)
        self.units = universe() + self.pairs
        idx = {u: i for i, u in enumerate(self.units)}
        self.idx = idx
        self.n_atomic = sum(n for u, n in raw.items() if u in idx or (len(u) == 2 and u[0] == COENG))
        f = collections.Counter({u: n for u, n in raw.items() if len(u) == 1 and u in idx})
        for p, n in pair_freq.items():
            if p in pset:
                f[p] = n
            else:
                f[COENG] += n
                f[p[1]] += n
        self.f = np.array([f[u] for u in self.units], dtype=float) / self.n_atomic
        self.keystrokes = self.f.sum()          # keystrokes per atomic unit
        n = len(self.units)
        W = np.zeros((n, n))

        def expand(a):
            if a in idx:
                return [a]
            if len(a) == 2 and a[0] == COENG and a[1] in idx:
                return [COENG, a[1]]
            return None
        tot = sum(big.values())
        scale = 1.0
        if bigsrc != "corpus":                  # interim: bigram total ~0.85 x unigram total
            scale = 0.85 * self.n_atomic / tot
        for (a, b), c in big.items():
            ea, eb = expand(a), expand(b)
            if ea and eb:
                W[idx[ea[-1]], idx[eb[0]]] += c * scale
        for p, c in pair_freq.items():
            if p not in pset:
                W[idx[COENG], idx[p[1]]] += c
        self.W = W / self.n_atomic
        self.lx = np.array([idx[a] for a, b in LEARN_PAIRS])
        self.ly = np.array([idx[b] for a, b in LEARN_PAIRS])
        self.caps = np.array(CAPS)

    def parts(self, s, learn_w=LEARN_W):
        pos = float(self.f @ P[s])
        big = float((self.W * S[s[:, None], s[None, :]]).sum())
        loads = np.bincount(FING[s], weights=self.f, minlength=8) / self.keystrokes
        load = float((np.maximum(0, loads - self.caps) ** 2).sum())
        learn = float(D[s[self.lx], s[self.ly]].sum())
        return pos, big, LOAD_W * load, learn_w * learn

    def cost(self, s, learn_w=LEARN_W):
        return sum(self.parts(s, learn_w))

    def greedy(self):
        order = np.argsort(-self.f, kind="stable")
        slot_order = np.argsort(P, kind="stable")
        s = np.zeros(len(self.units), dtype=int)
        for rank, u in enumerate(order):
            s[u] = slot_order[rank]
        return s

    def anneal(self, start, seed, learn_w=LEARN_W):
        rng = random.Random(seed)
        s = start.copy()
        occ = {int(t): i for i, t in enumerate(s)}
        cur = self.cost(s, learn_w); best, best_s = cur, s.copy()
        T0, T1 = 0.01, 1e-5
        n = len(s)
        for it in range(ITERS):
            T = T0 * (T1 / T0) ** (it / ITERS)
            i = rng.randrange(n); t = rng.randrange(NS)
            old = int(s[i])
            if t == old:
                continue
            j = occ.get(t)
            s[i] = t
            if j is not None:
                s[j] = old
            new = self.cost(s, learn_w)
            if new <= cur or rng.random() < math.exp((cur - new) / T):
                cur = new
                occ[t] = i
                if j is not None:
                    occ[old] = j
                else:
                    del occ[old]
                if cur < best:
                    best, best_s = cur, s.copy()
            else:
                s[i] = old
                if j is not None:
                    s[j] = t
        return best_s

    def metrics(self, s):
        pos, big, load, learn = self.parts(s, 1.0)
        W = self.W
        slots = [SLOTS[x] for x in s]
        n = len(s)
        same = alt = tot = 0.0
        for i in range(n):
            for j in range(n):
                w = W[i, j]
                if not w:
                    continue
                (c1, _), (c2, _) = slots[i], slots[j]
                tot += w
                if c1 != c2 and FINGER[c1] == FINGER[c2]:
                    same += w
                if (FINGER[c1] >= 4) != (FINGER[c2] >= 4):
                    alt += w
        layers = [sum(self.f[i] for i in range(n) if slots[i][1] == l) / self.keystrokes for l in range(3)]
        loads = np.bincount(FING[s], weights=self.f, minlength=8) / self.keystrokes
        adj = float(np.mean([1 - D[s[x], s[y]] for x, y in zip(self.lx, self.ly)]))
        return {
            "keystrokesPerUnit": round(self.keystrokes, 4),
            "positionEffort": round(pos / self.keystrokes, 3),
            "sameFingerPct": round(100 * same / tot, 2),
            "handAlternationPct": round(100 * alt / tot, 1),
            "layerPct": [round(100 * float(x), 1) for x in layers],
            "pinkyLoadPct": [round(100 * float(loads[0]), 1), round(100 * float(loads[7]), 1)],
            "counterpartCloseness": round(float(adj), 2),
            "totalCostPerUnit": round(float(pos + big + LOAD_W * float((np.maximum(0, loads - self.caps) ** 2).sum())), 4),
        }


def to_layout(model, s, name, source, bigsrc, note):
    keys = {c: ["", "", ""] for c in COST}
    for u, t in zip(model.units, s):
        c, l = SLOTS[t]
        keys[c][l] = u
    for code, kd, d in zip(DIGIT_CODES, KHMER_DIGITS, "1234567890"):
        keys[code] = [kd, d, ""]
    rank = sorted(zip(model.units, model.f * model.n_atomic), key=lambda x: -x[1])
    m = model.metrics(s)
    return {"info": {"penalties": LAYER_PENALTY[1:], "name": name, "source": source, "bigramSource": bigsrc, "pairs": model.pairs, "note": note,
                     "layerShare": [x / 100 for x in m["layerPct"]], "metrics": m},
            "rows": ROWS, "digits": DIGIT_CODES, "keys": keys,
            "ranking": [[u, int(n)] for u, n in rank]}


def main():
    cj, raw, big, bigsrc = load_data()
    source = "%d Khmer units from a text corpus" % cj["total"]
    results = {}
    for k in K_OPTIONS:
        m = Model(raw, big, bigsrc, k)
        best = None
        for r in range(RESTARTS):
            s = m.anneal(m.greedy(), seed=100 * k + r)
            c = m.cost(s)
            if best is None or c < best[0]:
                best = (c, s)
        results[k] = (m, best[1], best[0])
        mt = m.metrics(best[1])
        print("K=%2d cost/unit=%.4f keystrokes/unit=%.4f same-finger=%.2f%% alternation=%.1f%% layers=%s"
              % (k, best[0], m.keystrokes, mt["sameFingerPct"], mt["handAlternationPct"], mt["layerPct"]), flush=True)
    kbest = min(results, key=lambda k: results[k][2])
    m, s, _ = results[kbest]
    refined = to_layout(m, s, "Cluster-Frequency Khmer v2 (model-optimal)", source, bigsrc,
                        "annealed with position, bigram, finger-load and counterpart terms; "
                        "%d dedicated cluster keys (model-optimal under the stated penalties)" % kbest)
    layouts = {"refined": refined}
    if 12 in results and kbest != 12:
        m12, s12, _ = results[12]
        layouts["clusters"] = to_layout(m12, s12, "Cluster keys v2 (12 pair keys)", source, bigsrc,
                                        "same optimiser, forced to 12 dedicated cluster keys: fewer keystrokes, more Shift/AltGr")
    mb = Model(raw, big, bigsrc, 12)
    layouts["unigram"] = to_layout(mb, mb.greedy(), "Frequency-only baseline (v1)", source, bigsrc,
                                   "greedy by unigram frequency, 12 pair keys")
    uni = layouts["unigram"]
    s_nolearn = m.anneal(m.greedy(), seed=7, learn_w=0.0)
    refined["info"]["withoutLearnTerm"] = m.metrics(s_nolearn)
    out = "window.LAYOUTS=" + json.dumps(layouts, ensure_ascii=False, separators=(",", ":")) \
          + ";\nwindow.LAYOUT_DEFAULT=\"refined\";\n"
    open(OUT, "w", encoding="utf-8").write(out)
    print("chosen K:", kbest, "bigram source:", bigsrc)
    for name, lay in layouts.items():
        print("%-9s" % name, json.dumps(lay["info"]["metrics"], ensure_ascii=False))
    print("no-learn :", json.dumps(refined["info"]["withoutLearnTerm"], ensure_ascii=False))
    for r in ROWS:
        print("  ".join("%s|%s|%s" % tuple((x or "-") for x in refined["keys"][c]) for c in r))


if __name__ == "__main__":
    main()
