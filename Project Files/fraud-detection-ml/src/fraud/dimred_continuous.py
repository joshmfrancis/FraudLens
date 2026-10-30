"""PCA on the 13 continuous features only (binary flags and category columns stay as they are), keeping 95% of their variance."""
import json, sys
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import average_precision_score
import os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))  # works from any folder, on any OS
from fraud.common import *
df, X, y, n85 = load_xy(); cv = json.load(open("reports/cv_results.json")); R = json.load(open("reports/results.json"))
Xd, yd, Xt, yt = X[:n85], y[:n85], X[n85:], y[n85:]; spw = spw_from(yd)
CONT = ["amt", "city_pop", "age", "hour", "dist_home_mi", "secs_since_prev", "dist_from_prev_mi", "speed_mph", "amt_mean_past", "amt_ratio", "amt_z", "txn_1h", "txn_24h"]
ci = [ALL.index(c) for c in CONT]; oi = [i for i in range(len(ALL)) if i not in ci]
sc = StandardScaler().fit(Xd[:, ci]); Zd, Zt = sc.transform(Xd[:, ci]), sc.transform(Xt[:, ci])
cum = np.cumsum(PCA(random_state=SEED).fit(Zd).explained_variance_ratio_); k = int(np.searchsorted(cum, 0.95) + 1)
pc = PCA(n_components=k, random_state=SEED).fit(Zd); Fd = np.hstack([pc.transform(Zd), Xd[:, oi]]); Ft = np.hstack([pc.transform(Zt), Xt[:, oi]]); rows = []
for key in ["logreg", "tree", "rf", "gb"]:
    m = make_model(key, spw=spw, **cv["models"][key]["best_params"]); m.fit(Fd, yd); ap = float(average_precision_score(yt, m.predict_proba(Ft)[:, 1]))
    full = next(r for r in R["models"] if r["key"] == key)["test"]["pr_auc"]; rows.append({"key": key, "name": NAMES[key], "pr_auc_full": full, "pr_auc_pca": ap}); print(key, round(full, 3), "->", round(ap, 3), flush=True)
R["dimred"]["pca_continuous"] = {"n_continuous": len(CONT), "k": k, "variance_kept": float(cum[k - 1]), "n_inputs": int(Fd.shape[1]), "models": rows}
R["dimred"]["pca_all_models"] = R["dimred"].pop("pca_models", R["dimred"].get("pca_all_models"))
json.dump(R, open("reports/results.json", "w"), indent=1); print("k", k, "inputs", Fd.shape[1])
