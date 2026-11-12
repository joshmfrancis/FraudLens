"""SVD on the 13 continuous features only (binary flags and category columns stay as they are), keeping 95% of their energy; all eight models."""
import json, os, sys
import numpy as np
from sklearn.metrics import average_precision_score
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))  # works from any folder, on any OS
from fraud.common import *
from fraud.svd import svd_fit, svd_transform, energy, k_for
df, X, y, n85 = load_xy(); cv = json.load(open("reports/cv_results.json")); R = json.load(open("reports/results.json"))
Xd, yd, Xt, yt = X[:n85], y[:n85], X[n85:], y[n85:]; spw = spw_from(yd)
# the 13 continuous inputs; the binary flags and category one-hots are left untouched
CONT = ["amt", "city_pop", "age", "hour", "dist_home_mi", "secs_since_prev", "dist_from_prev_mi", "speed_mph", "amt_mean_past", "amt_ratio", "amt_z", "txn_1h", "txn_24h"]
ci = [ALL.index(c) for c in CONT]; oi = [i for i in range(len(ALL)) if i not in ci]
# SVD on only the continuous columns, keep enough components for 95% energy, then re-attach the untouched columns
f = svd_fit(Xd[:, ci]); cum = np.cumsum(energy(f)); k = k_for(cum, .95)
Fd = np.hstack([svd_transform(f, Xd[:, ci], k), Xd[:, oi]]); Ft = np.hstack([svd_transform(f, Xt[:, ci], k), Xt[:, oi]]); rows = []
# retrain all 8 models on the reduced inputs and compare test PR-AUC with the full-feature version
for key in KEYS:
    cf = f"reports/parts/svdcont_{key}.json"
    if os.path.exists(cf): rows.append(json.load(open(cf))); continue
    m = make_model(key, spw=spw, **cv["models"][key]["best_params"]); m.fit(Fd, yd); ap = float(average_precision_score(yt, m.predict_proba(Ft)[:, 1]))
    full = next(r for r in R["models"] if r["key"] == key)["test"]["pr_auc"]; rows.append({"key": key, "name": NAMES[key], "pr_auc_full": full, "pr_auc_svd": ap}); json.dump(rows[-1], open(cf, "w")); print(key, round(full, 3), "->", round(ap, 3), flush=True)
R["dimred"]["svd_continuous"] = {"n_continuous": len(CONT), "k": k, "energy_kept": float(cum[k - 1]), "n_inputs": int(Fd.shape[1]), "models": rows}
json.dump(R, open("reports/results.json", "w"), indent=1); print("k", k, "inputs", Fd.shape[1])
