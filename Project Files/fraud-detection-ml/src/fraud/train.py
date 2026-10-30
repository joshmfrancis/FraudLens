"""Final fit on the development period (Jan-Nov) with CV-selected hyperparameters, one evaluation on the test month (Dec) -> reports/results.json."""
import json, os, sys, time
import numpy as np, pandas as pd, joblib
from sklearn.inspection import permutation_importance
from sklearn.metrics import (log_loss, average_precision_score, roc_auc_score, precision_recall_curve, precision_score, recall_score, f1_score, confusion_matrix)
import os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))  # works from any folder, on any OS
from fraud.common import *
from fraud.features import GROUPS, CATS
def log(*a): print(*a, flush=True)

df, X, y, n85 = load_xy(); cv = json.load(open("reports/cv_results.json")); spw = spw_from(y[:n85])
Xd, yd, Xt, yt = X[:n85], y[:n85], X[n85:], y[n85:]
def info(d, yy): return {"rows": int(len(d)), "fraud": int(yy.sum()), "fraud_rate": float(yy.mean()), "start": str(d.dt.min().date()), "end": str(d.dt.max().date())}
split = {"dev": info(df.iloc[:n85], yd), "test": info(df.iloc[n85:], yt), "cv_chunks": cv["chunks"]}
def evaluate(m, Xe, ye, thr, cols=None):
    p = m.predict_proba(Xe)[:, 1]; pred = (p >= thr).astype(int); tn, fp, fn, tp = confusion_matrix(ye, pred).ravel()
    pr, rc, _ = precision_recall_curve(ye, p); grid = np.linspace(0, 1, 101)
    pint = [float(pr[rc >= r].max()) if (rc >= r).any() else 0.0 for r in grid]
    return {"precision": float(precision_score(ye, pred, zero_division=0)), "recall": float(recall_score(ye, pred)), "f1": float(f1_score(ye, pred)),
            "pr_auc": float(average_precision_score(ye, p)), "log_loss": float(log_loss(ye, np.clip(p, 1e-6, 1 - 1e-6))), "roc_auc": float(roc_auc_score(ye, p)), "accuracy": float((pred == ye).mean()),
            "confusion": {"tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)}}, {"precision": [round(v, 4) for v in pint], "recall": [round(v, 2) for v in grid]}
os.makedirs("reports/parts", exist_ok=True); os.makedirs("models", exist_ok=True); results = []
for key in ["logreg", "tree", "rf", "gb"]:
    pf = f"reports/parts/{key}.json"
    if os.path.exists(pf): results.append(json.load(open(pf))); log("cached", key); continue
    c = cv["models"][key]; t = time.time(); m = make_model(key, spw=spw, **c["best_params"]); m.fit(Xd, yd); secs = time.time() - t
    tm, curve = evaluate(m, Xt, yt, c["threshold"]); tm5, _ = evaluate(m, Xt, yt, 0.5)
    train_ap = float(average_precision_score(yd[::4], m.predict_proba(Xd[::4])[:, 1]))
    r = {"key": key, "name": NAMES[key], "loss": {"logreg": "binary cross-entropy (log loss)", "gb": "binary cross-entropy (binary:logistic)", "tree": "entropy split criterion (cross-entropy)", "rf": "entropy split criterion (cross-entropy)"}[key], "params": c["best_params"], "threshold": c["threshold"], "test": tm,
         "test_at_0.5": {k: tm5[k] for k in ["precision", "recall", "f1"]}, "train_pr_auc": train_ap, "train_seconds": round(secs, 1), "pr_curve": curve,
         "cv": {"folds_pr_auc": c["folds_pr_auc"], "mean_pr_auc": c["mean_pr_auc"], "std_pr_auc": c["std_pr_auc"], "folds_f1": c["folds_f1"], "mean_f1": c["mean_f1"], "std_f1": c["std_f1"]}}
    log(f"{key}: CV PR-AUC {c['mean_pr_auc']:.3f}+/-{c['std_pr_auc']:.3f} | test P={tm['precision']:.3f} R={tm['recall']:.3f} F1={tm['f1']:.3f} PR-AUC={tm['pr_auc']:.3f} ({secs:.0f}s)")
    joblib.dump(m, f"models/{key}.joblib"); json.dump(r, open(pf, "w")); results.append(r)
best = max(results, key=lambda r: r["cv"]["mean_pr_auc"])["key"]; log("best by CV PR-AUC:", best)
bm = joblib.load(f"models/{best}.joblib"); rng = np.random.RandomState(SEED)
imp_f = "reports/parts/importance.json"
if os.path.exists(imp_f): imp = json.load(open(imp_f))
else:
    ix = rng.choice(len(Xt), min(60000, len(Xt)), replace=False)  # post-hoc analysis on the test month; not used for any selection
    pi = permutation_importance(bm, Xt[ix], yt[ix], scoring="average_precision", n_repeats=2, random_state=SEED, n_jobs=1)
    imp = sorted([{"feature": f, "value": float(v)} for f, v in zip(ALL, pi.importances_mean)], key=lambda d: -d["value"])[:12]; json.dump(imp, open(imp_f, "w"))
CAT = ["cat_" + c for c in CATS]
sets = {"A: base + time + category": GROUPS["base"] + GROUPS["time"] + CAT, "B: A + distance": GROUPS["base"] + GROUPS["time"] + GROUPS["distance"] + CAT,
        "C: A + history": GROUPS["base"] + GROUPS["time"] + GROUPS["history"] + CAT, "D: all features": ALL,
        "E: all minus distance and speed": [c for c in ALL if c not in ("dist_home_mi", "speed_mph", "dist_from_prev_mi")]}
abl = []; t0 = time.time()
for i, (nm, cols) in enumerate(sets.items()):
    af = f"reports/parts/abl{i}.json"
    if os.path.exists(af): abl.append(json.load(open(af))); continue
    if time.time() - t0 > float(os.environ.get('FRAUD_TIME_BUDGET', '1e9')): log("PARTIAL - rerun"); sys.exit(0)
    ci = [ALL.index(c) for c in cols]; m = make_model(best, spw=spw, **cv["models"][best]["best_params"]); m.fit(Xd[:, ci], yd)
    ap = float(average_precision_score(yt, m.predict_proba(Xt[:, ci])[:, 1])); abl.append({"name": nm, "features": len(cols), "pr_auc": ap}); json.dump(abl[-1], open(af, "w")); log("ablation", nm, round(ap, 4))
auc1 = {c: float(roc_auc_score(df.is_fraud, df[c])) for c in ["dist_home_mi", "amt", "amt_ratio", "speed_mph", "is_night", "txn_24h"]}
bins = np.linspace(0, 200, 21); h = lambda m: np.histogram(df.loc[df.is_fraud == m, "dist_home_mi"].clip(upper=199.9), bins=bins)[0].tolist()
fc = df.groupby("category").is_fraud.mean().round(5).sort_values(ascending=False)
out = {"dataset": {"customers": int(df.cc_num.nunique()), "rows": int(len(df)), "date_start": str(df.dt.min().date()), "date_end": str(df.dt.max().date()), "fraud_rows": int(df.is_fraud.sum()),
        "fraud_rate": float(df.is_fraud.mean()), "dummy_accuracy": float(1 - df.is_fraud.mean()), "split": split}, "features": GROUPS, "n_model_features": len(ALL),
       "validation": {"method": "time-aware expanding-window cross-validation", "folds": N_FOLDS, "chunks": cv["chunks"]},
       "models": results, "best_model": best, "importance": imp, "ablation": abl,
       "eda": {"single_feature_roc_auc": auc1, "fraud_by_hour": df.groupby("hour").is_fraud.mean().round(5).tolist(), "fraud_by_category": fc.to_dict(),
               "distance_hist": {"bins": bins.tolist(), "fraud": h(1), "normal": h(0)}, "median_dist_fraud": float(df.loc[df.is_fraud == 1, "dist_home_mi"].median()),
               "median_dist_normal": float(df.loc[df.is_fraud == 0, "dist_home_mi"].median()), "median_amt_fraud": float(df.loc[df.is_fraud == 1, "amt"].median()),
               "median_amt_normal": float(df.loc[df.is_fraud == 0, "amt"].median())}, "generated_at": pd.Timestamp.now().isoformat(timespec="seconds")}
json.dump(out, open("reports/results.json", "w"), indent=1); log("DONE")
