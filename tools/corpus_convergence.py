#!/usr/bin/env python3
"""How much Khmer text is needed before key frequencies / layer assignments stabilise?

Usage: python3 tools/corpus_convergence.py [--max-units N] khmer_corpus_v5.txt.gz [more files...]
(--max-units stops after N units, e.g. 100000000 for a quick run; note this reads only the file head,
 so it cannot reveal drift that appears later in the file.)
Streams .txt or .txt.gz (one pass, low memory) and writes data/corpus-unit-counts.json.

Units = coeng+consonant pairs and single Khmer code points (same as build_layout.py,
but ALL pairs are counted, so you can pick the pair set from the full corpus).

Reports
 1. split-half: lines alternate into halves A/B; at growing sizes, compare A vs B
    - Spearman rank correlation of the top-150 units
    - tier agreement: share of top-99 units (by the other half's ranking) whose slot tier
      (base 1-33 / Shift 34-66 / AltGr 67-99) is identical in both halves
 2. block drift: counts per 5M-unit consecutive block vs the whole corpus (genre/ordering bias)
"""
import sys, gzip, json, os, collections, random

COENG = "្"
CHECK = [10**k * m for k in range(4, 9) for m in (1, 3)]
BLOCK = 5_000_000
TOP, TIERS = 150, 33


def units(line):
    out, i, n = [], 0, len(line)
    while i < n:
        c = line[i]
        if "ក" <= c <= "៿":
            if c == COENG and i + 1 < n and "ក" <= line[i + 1] <= "អ":
                out.append(line[i:i + 2]); i += 2; continue
            out.append(c)
        i += 1
    return out


def ranks(counter):
    return {u: r for r, (u, _) in enumerate(counter.most_common())}


def spearman(a, b, k=TOP):
    ra, rb = ranks(a), ranks(b)
    top = [u for u, _ in a.most_common(k)]
    n = len(top)
    miss = max(len(ra), len(rb))
    d2 = sum((ra[u] - rb.get(u, miss)) ** 2 for u in top)
    return 1 - 6 * d2 / (n * (n * n - 1))


def tier_agree(a, b, k=3 * TIERS):
    ra, rb = ranks(a), ranks(b)
    top = [u for u, _ in a.most_common(k)]
    same = sum(1 for u in top if ra[u] // TIERS == min(rb.get(u, 10**9) // TIERS, 3))
    return same / len(top)


def lines(paths):
    for p in paths:
        op = gzip.open if p.endswith(".gz") else open
        with op(p, "rt", encoding="utf-8", errors="ignore") as f:
            for ln in f:
                yield ln


def main(paths, max_units=0):
    A, B, ALL = collections.Counter(), collections.Counter(), collections.Counter()
    blocks, cur, nA, nB, tot = [], collections.Counter(), 0, 0, 0
    ci, report = 0, []
    for k, ln in enumerate(lines(paths)):
        us = units(ln)
        if not us:
            continue
        (A if k % 2 == 0 else B).update(us)
        ALL.update(us); cur.update(us); tot += len(us)
        if max_units and tot >= max_units:
            break
        if sum(cur.values()) >= BLOCK:
            blocks.append(cur); cur = collections.Counter()
        while ci < len(CHECK) and tot >= CHECK[ci]:
            if sum(A.values()) and sum(B.values()):
                report.append((tot, spearman(A, B), tier_agree(A, B)))
                print("%12d units  spearman(top%d)=%.3f  tier-agreement=%.3f" % (tot, TOP, report[-1][1], report[-1][2]), flush=True)
            ci += 1
    print("total units:", tot)
    if len(blocks) >= 2:
        ag = [tier_agree(b, ALL) for b in blocks]
        sp = [spearman(b, ALL) for b in blocks]
        print("block drift over %d blocks of %d units: tier-agreement min/mean = %.3f/%.3f, spearman min = %.3f"
              % (len(blocks), BLOCK, min(ag), sum(ag) / len(ag), min(sp)))
    os.makedirs("data", exist_ok=True)
    with open("data/corpus-unit-counts.json", "w", encoding="utf-8") as f:
        json.dump({"total": tot, "counts": ALL.most_common(), "splitHalf": report}, f, ensure_ascii=False)
    print("wrote data/corpus-unit-counts.json")


if __name__ == "__main__":
    args = sys.argv[1:]
    mu = 0
    if args and args[0] == "--max-units":
        mu, args = int(args[1]), args[2:]
    main(args, mu)
