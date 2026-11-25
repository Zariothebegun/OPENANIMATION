#!/usr/bin/env python3
"""Numeric look metrics. Usage: measure.py ref <glob...>  -> prints ref stats;  measure.py cmp <mine.jpg|glob> [--ref-glob G]"""
import sys, glob, json, numpy as np, cv2

def metrics(path, H=960):
    im = cv2.imread(path); h, w = im.shape[:2]
    im = cv2.resize(im, (int(round(w * H / h)), H), interpolation=cv2.INTER_AREA); h, w = im.shape[:2]
    f = im.astype(np.float32) / 255; b, g, r = f[..., 0], f[..., 1], f[..., 2]
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.float32); sat = hsv[..., 1] / 255; hue = hsv[..., 0] * 2
    m = {}
    m['luma_mean'] = float(luma.mean()); m['luma_std'] = float(luma.std())
    m['luma_p5'] = float(np.percentile(luma, 5)); m['luma_p95'] = float(np.percentile(luma, 95))
    m['sat_mean'] = float(sat.mean()); m['sat_p90'] = float(np.percentile(sat, 90))
    # warmth
    m['warm_ratio'] = float((r.mean() + 1e-3) / (b.mean() + 1e-3))
    # ink: dark thin lines
    dark = (luma < 0.16).astype(np.uint8)
    m['ink_frac'] = float(dark.mean())
    dt = cv2.distanceTransform(dark, cv2.DIST_L2, 3)
    ridge = (dt > 0.9) & (dt >= cv2.dilate(dt, np.ones((3, 3), np.uint8)) - 1e-6)
    m['ink_width'] = float(2 * dt[ridge].mean() * 1920 / h) if ridge.sum() > 20 else 0.0   # px at 1080x1920
    # edge density (gradient magnitude above thresh) and softness
    gx = cv2.Sobel(luma, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(luma, cv2.CV_32F, 0, 1, ksize=3); gm = np.hypot(gx, gy)
    m['edge_dens'] = float((gm > 0.35).mean()); m['grad_mean'] = float(gm.mean())
    # sharpness by vertical thirds (laplacian var) -> depth of field / softness
    lap = cv2.Laplacian(luma, cv2.CV_32F, ksize=3)
    for i, nm in enumerate(['top', 'mid', 'bot']):
        m['lapvar_' + nm] = float(lap[i * h // 3:(i + 1) * h // 3].var())
    m['lapvar_all'] = float(lap.var())
    # vignette: centre vs corners
    cy, cx = h // 2, w // 2; c = luma[cy - h // 8:cy + h // 8, cx - w // 6:cx + w // 6].mean()
    cs = np.mean([luma[:h // 8, :w // 6].mean(), luma[:h // 8, -w // 6:].mean(), luma[-h // 8:, :w // 6].mean(), luma[-h // 8:, -w // 6:].mean()])
    m['vignette'] = float(cs / (c + 1e-3))
    # vertical luma profile
    for i in range(4): m[f'vprof{i}'] = float(luma[i * h // 4:(i + 1) * h // 4].mean())
    # hue histogram of saturated pixels
    sel = sat > 0.2; hh = np.histogram(hue[sel], bins=6, range=(0, 360))[0] / max(1, sel.sum())
    for i, v in enumerate(hh): m[f'hue{i}'] = float(v)
    m['sat_cover'] = float(sel.mean())
    # shadow coverage (mid-dark but not ink)
    m['shadow_frac'] = float(((luma > 0.16) & (luma < 0.32)).mean())
    m['clip_hi'] = float((luma > 0.97).mean())
    # flatness: fraction of pixels in near-uniform 8x8 blocks (painted flat areas)
    blk = cv2.resize(luma, (w // 8, h // 8), interpolation=cv2.INTER_AREA); up = cv2.resize(blk, (w, h), interpolation=cv2.INTER_NEAREST)
    m['texture_energy'] = float(np.abs(luma - up).mean())
    return m

def palette(path, k=8, H=240):
    im = cv2.imread(path); h, w = im.shape[:2]; im = cv2.resize(im, (int(w * H / h), H)); lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0); _, lab_l, cen = cv2.kmeans(lab, k, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    return cen, np.bincount(lab_l.ravel(), minlength=k) / lab_l.size

def stats(paths):
    ms = [metrics(p) for p in paths]; keys = ms[0].keys(); out = {}
    for k in keys:
        a = np.array([m[k] for m in ms]); out[k] = dict(mean=float(a.mean()), std=float(a.std()), p10=float(np.percentile(a, 10)), p90=float(np.percentile(a, 90)))
    return out

def compare(mine_paths, ref_paths, verbose=True):
    S = stats(ref_paths); M = stats(mine_paths); rows = []; inr = 0
    for k, s in S.items():
        v = M[k]['mean']; lo, hi = s['p10'], s['p90']; span = max(hi - lo, 1e-4); z = (v - s['mean']) / max(s['std'], span / 3, 1e-4)
        ok = lo - 0.15 * span <= v <= hi + 0.15 * span; inr += ok; rows.append((k, v, s['mean'], lo, hi, z, ok))
    score = inr / len(rows)
    if verbose:
        print(f"{'metric':16s} {'mine':>8s} {'ref.mean':>9s} {'ref.p10':>8s} {'ref.p90':>8s} {'z':>6s}")
        for k, v, mu, lo, hi, z, ok in rows: print(f"{k:16s} {v:8.3f} {mu:9.3f} {lo:8.3f} {hi:8.3f} {z:6.1f} {'ok' if ok else '<<' if v < lo else '>>'}")
        # palette distance
        pr = [palette(p) for p in ref_paths[::max(1, len(ref_paths) // 12)]]; rc = np.concatenate([c for c, _ in pr])
        d = []
        for p in mine_paths:
            c, wgt = palette(p); dd = np.min(np.linalg.norm(c[:, None] - rc[None], axis=2), axis=1); d.append(float((dd * wgt).sum()))
        print(f"palette dist (Lab, weighted mean to nearest ref colour): {np.mean(d):.1f}   (lower is better; <8 close)")
        print(f"IN-RANGE: {inr}/{len(rows)} = {score:.0%}")
    return score, rows

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'ref':
        ps = sorted(sum([glob.glob(g) for g in sys.argv[2:]], [])); print(json.dumps(stats(ps), indent=1))
    else:
        mine = sorted(glob.glob(sys.argv[2])); rg = sys.argv[3] if len(sys.argv) > 3 else 'ref/frames/bell_*.png'
        compare(mine, sorted(glob.glob(rg)))
