"""Dimensionality reduction: SVD (energy, loadings, 2D view, comparison with PCA), t-SNE (2D view), and all eight models trained on SVD components."""
import json, time, os, sys
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import average_precision_score
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))  # works from any folder, on any OS
from fraud.common import *
from fraud.svd import svd_fit, svd_transform, energy, k_for, pca_cum
os.makedirs('reports/figures', exist_ok=True); os.makedirs('app/web/assets', exist_ok=True); os.makedirs('reports/parts', exist_ok=True)
df, X, y, n85 = load_xy(); cv = json.load(open("reports/cv_results.json")); R = json.load(open("reports/results.json"))
Xd, yd, Xt, yt = X[:n85], y[:n85], X[n85:], y[n85:]; rng = np.random.RandomState(SEED)
f = svd_fit(Xd); en = energy(f); cum = np.cumsum(en); k90, k95 = k_for(cum, .90), k_for(cum, .95); pcum = pca_cum(Xd); pk95 = k_for(pcum, .95)
load = lambda i: [[ALL[j], round(float(f["V"][j, i]), 3)] for j in np.argsort(-np.abs(f["V"][:, i]))[:4]]
plt.rcParams.update({"font.size": 14, "axes.edgecolor": "#5C6B73", "axes.labelcolor": "#17252A", "xtick.color": "#17252A", "ytick.color": "#17252A", "axes.spines.top": False, "axes.spines.right": False})
ix = rng.choice(n85, min(60000, n85), replace=False); P = svd_transform(f, Xd[ix], 2); fr = yd[ix] == 1
fig, ax = plt.subplots(figsize=(6.2, 4.4), dpi=200)
ax.scatter(P[~fr, 0], P[~fr, 1], s=3, c="#9BC1BC", alpha=.35, linewidths=0, label="Normal"); ax.scatter(P[fr, 0], P[fr, 1], s=9, c="#E4572E", alpha=.9, linewidths=0, label="Fraud")
ax.set_xlabel(f"SVD 1 ({en[0]*100:.0f}% of energy)"); ax.set_ylabel(f"SVD 2 ({en[1]*100:.0f}% of energy)"); ax.legend(markerscale=3, frameon=False, loc="lower left")
lo = np.percentile(P, [0.5, 99.5], axis=0); ax.set_xlim(lo[0][0] - 1, lo[1][0] + 1); ax.set_ylim(lo[0][1] - 1, lo[1][1] + 1)
fig.tight_layout(); fig.savefig("reports/figures/svd_2d.png"); plt.close(fig)
# t-SNE on a balanced sample, after SVD to 15 components for speed
pf = "reports/parts/tsne.json"
fi, ni = np.where(yd == 1)[0], np.where(yd == 0)[0]; ns = min(3000, len(fi)); s = np.concatenate([rng.choice(fi, ns, replace=False), rng.choice(ni, ns, replace=False)]); ys = yd[s]
t = time.time(); E = TSNE(n_components=2, perplexity=40, init="pca", random_state=SEED).fit_transform(svd_transform(f, Xd[s], 15)); print("tsne", round(time.time() - t), "s", flush=True)
nb = NearestNeighbors(n_neighbors=11).fit(E).kneighbors(E, return_distance=False)[:, 1:]; purity = float((ys[nb][ys == 1] == 1).mean())
fig, ax = plt.subplots(figsize=(6.2, 4.4), dpi=200); m0 = ys == 0
ax.scatter(E[m0, 0], E[m0, 1], s=4, c="#9BC1BC", alpha=.55, linewidths=0, label="Normal"); ax.scatter(E[~m0, 0], E[~m0, 1], s=4, c="#E4572E", alpha=.7, linewidths=0, label="Fraud")
ax.set_xlabel("t-SNE dimension 1"); ax.set_ylabel("t-SNE dimension 2"); ax.set_xticks([]); ax.set_yticks([]); ax.legend(markerscale=4, frameon=False, loc="upper right")
fig.tight_layout(); fig.savefig("reports/figures/tsne.png"); plt.close(fig)
# all eight models on the first k95 SVD components vs the full features (test-month PR-AUC, threshold-free)
Dd, Dt = svd_transform(f, Xd, k95), svd_transform(f, Xt, k95); spw = spw_from(yd); rows = []
for key in KEYS:
    cf = f"reports/parts/svdall_{key}.json"
    if os.path.exists(cf): rows.append(json.load(open(cf))); continue
    m = make_model(key, spw=spw, **cv["models"][key]["best_params"]); m.fit(Dd, yd); ap = float(average_precision_score(yt, m.predict_proba(Dt)[:, 1]))
    full = next(r for r in R["models"] if r["key"] == key)["test"]["pr_auc"]; rows.append({"key": key, "name": NAMES[key], "pr_auc_full": full, "pr_auc_svd": ap}); json.dump(rows[-1], open(cf, "w")); print(key, round(full, 3), "->", round(ap, 3), flush=True)
R["dimred"] = {"method": "SVD (scaled, not centered)", "n_features": len(ALL), "energy": [round(float(v), 4) for v in en], "cumulative": [round(float(v), 4) for v in cum], "k90": k90, "k95": k95,
               "pca_k95": pk95, "pc1_loadings": load(0), "pc2_loadings": load(1), "c12_energy": float(cum[1]),
               "tsne": {"fraud": int(ns), "normal": int(ns), "perplexity": 40, "neighbor_purity": purity, "input_components": 15}, "svd_all_models": {"k": k95, "models": rows}}
json.dump(R, open("reports/results.json", "w"), indent=1)
import shutil; [shutil.copy(f"reports/figures/{n}.png", f"app/web/assets/{n}.png") for n in ["svd_2d", "tsne"]]
print("k90", k90, "k95", k95, "(PCA k95", pk95, ") C1-2 energy", round(float(cum[1]), 3), "tsne purity", round(purity, 3), load(0), load(1))
