"""Time-aware (expanding-window) 5-fold cross-validation over the development period (Jan-Nov).
Fold k trains on chunks 1..k and validates on chunk k+1 (6 equal chunks of the first 85% of rows). Never trains on the future."""
import json, os, sys, time, itertools
import numpy as np
from sklearn.metrics import average_precision_score, precision_recall_curve, f1_score
import os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))  # works from any folder, on any OS
from fraud.common import *

df, X, y, n85 = load_xy(); c = n85 // 6; spw = spw_from(y[:n85])
bounds = [(0, k * c, k * c, (k + 1) * c if k < 5 else n85) for k in range(1, N_FOLDS + 1)]  # (train_start, train_end, val_start, val_end)
os.makedirs("reports/cv_cache", exist_ok=True); t0 = time.time(); done = True; BUDGET = float(os.environ.get('FRAUD_TIME_BUDGET', '1e9'))
def pid(p): return "_".join(f"{k}{v}" for k, v in p.items())
for key, grid in GRIDS.items():
    for vals in itertools.product(*grid.values()):
        p = dict(zip(grid.keys(), vals))
        for f, (a, b, va, vb) in enumerate(bounds, 1):
            fn = f"reports/cv_cache/{key}_{pid(p)}_f{f}.npz"
            if os.path.exists(fn): continue
            if time.time() - t0 > BUDGET: done = False; continue
            m = make_model(key, spw=spw, **p); m.fit(X[a:b], y[a:b]); pr = m.predict_proba(X[va:vb])[:, 1]
            np.savez(fn, pred=pr.astype(np.float32), ap=average_precision_score(y[va:vb], pr))
            print(key, p, "fold", f, f"AP={float(np.load(fn)['ap']):.4f}", f"{time.time()-t0:.0f}s", flush=True)
if not done: print("PARTIAL - rerun"); sys.exit(0)
out = {"n_folds": N_FOLDS, "chunks": [], "models": {}}
for i in range(6):
    s, e = i * c, ((i + 1) * c if i < 5 else n85)
    out["chunks"].append({"start": str(df.dt.iloc[s].date()), "end": str(df.dt.iloc[e - 1].date()), "rows": e - s, "fraud_rate": float(y[s:e].mean())})
for key, grid in GRIDS.items():
    rows = []
    for vals in itertools.product(*grid.values()):
        p = dict(zip(grid.keys(), vals)); aps = [float(np.load(f"reports/cv_cache/{key}_{pid(p)}_f{f}.npz")["ap"]) for f in range(1, N_FOLDS + 1)]
        rows.append({"params": p, "mean_pr_auc": float(np.mean(aps)), "std_pr_auc": float(np.std(aps)), "folds": aps})
    best = max(rows, key=lambda r: r["mean_pr_auc"]); p = best["params"]
    preds = [np.load(f"reports/cv_cache/{key}_{pid(p)}_f{f}.npz")["pred"] for f in range(1, N_FOLDS + 1)]
    yo = np.concatenate([y[va:vb] for (_, _, va, vb) in bounds]); po = np.concatenate(preds)
    pr, rc, th = precision_recall_curve(yo, po); f1 = 2 * pr[:-1] * rc[:-1] / np.clip(pr[:-1] + rc[:-1], 1e-12, None); thr = float(th[int(np.argmax(f1))])
    f1s = [float(f1_score(y[va:vb], (pr_ >= thr).astype(int))) for (_, _, va, vb), pr_ in zip(bounds, preds)]
    out["models"][key] = {"best_params": p, "grid": rows, "folds_pr_auc": best["folds"], "mean_pr_auc": best["mean_pr_auc"], "std_pr_auc": best["std_pr_auc"],
                          "folds_f1": f1s, "mean_f1": float(np.mean(f1s)), "std_f1": float(np.std(f1s)), "threshold": thr, "spw": spw}
    print(key, "best", p, f"CV PR-AUC {best['mean_pr_auc']:.3f} +/- {best['std_pr_auc']:.3f}  F1 {np.mean(f1s):.3f} thr {thr:.3f}")
json.dump(out, open("reports/cv_results.json", "w"), indent=1); print("CV COMPLETE")
