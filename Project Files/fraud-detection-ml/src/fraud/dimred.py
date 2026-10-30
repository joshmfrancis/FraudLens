"""Dimensionality reduction: PCA (variance, loadings, 2D view), t-SNE (2D view), and models trained on PCA components."""
import json, sys, time
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import average_precision_score
import os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))  # works from any folder, on any OS
from fraud.common import *
os.makedirs('reports/figures', exist_ok=True); os.makedirs('app/web/assets', exist_ok=True)
df, X, y, n85 = load_xy(); cv = json.load(open("reports/cv_results.json")); R = json.load(open("reports/results.json"))
Xd, yd, Xt, yt = X[:n85], y[:n85], X[n85:], y[n85:]; rng = np.random.RandomState(SEED)
sc = StandardScaler().fit(Xd); Zd, Zt = sc.transform(Xd), sc.transform(Xt)  # unsupervised: fit on the development period only
pca = PCA(random_state=SEED).fit(Zd); evr = pca.explained_variance_ratio_; cum = np.cumsum(evr)
k90, k95 = int(np.searchsorted(cum, 0.90) + 1), int(np.searchsorted(cum, 0.95) + 1)
load = lambda i: [[ALL[j], round(float(pca.components_[i][j]), 3)] for j in np.argsort(-np.abs(pca.components_[i]))[:4]]
F = {"font.size": 14, "axes.edgecolor": "#5C6B73", "axes.labelcolor": "#17252A", "xtick.color": "#17252A", "ytick.color": "#17252A", "axes.spines.top": False, "axes.spines.right": False}
plt.rcParams.update(F)
# 2D PCA view (random sample of the development period; fraud drawn on top)
ix = rng.choice(n85, min(60000, n85), replace=False); P = pca.transform(Zd[ix])[:, :2]; f = yd[ix] == 1
fig, ax = plt.subplots(figsize=(6.2, 4.4), dpi=200)
ax.scatter(P[~f, 0], P[~f, 1], s=3, c="#9BC1BC", alpha=.35, linewidths=0, label="Normal"); ax.scatter(P[f, 0], P[f, 1], s=9, c="#E4572E", alpha=.9, linewidths=0, label="Fraud")
ax.set_xlabel(f"PC1 ({evr[0]*100:.0f}% of variance)"); ax.set_ylabel(f"PC2 ({evr[1]*100:.0f}% of variance)"); ax.legend(markerscale=3, frameon=False, loc="upper right")
lo = np.percentile(P, [0.5, 99.5], axis=0); ax.set_xlim(lo[0][0] - 1, lo[1][0] + 1); ax.set_ylim(lo[0][1] - 1, lo[1][1] + 1)
fig.tight_layout(); fig.savefig("reports/figures/pca_2d.png"); plt.close(fig)
# t-SNE on a balanced sample (3,000 fraud + 3,000 normal), after PCA to 15 components for speed
fi, ni = np.where(yd == 1)[0], np.where(yd == 0)[0]; ns = min(3000, len(fi)); s = np.concatenate([rng.choice(fi, ns, replace=False), rng.choice(ni, ns, replace=False)]); ys = yd[s]
t = time.time(); E = TSNE(n_components=2, perplexity=40, init="pca", random_state=SEED).fit_transform(PCA(15, random_state=SEED).fit(Zd).transform(Zd[s])); print("tsne", round(time.time() - t), "s")
nb = NearestNeighbors(n_neighbors=11).fit(E).kneighbors(E, return_distance=False)[:, 1:]; purity = float((ys[nb][ys == 1] == 1).mean())
fig, ax = plt.subplots(figsize=(6.2, 4.4), dpi=200); m0 = ys == 0
ax.scatter(E[m0, 0], E[m0, 1], s=4, c="#9BC1BC", alpha=.55, linewidths=0, label="Normal"); ax.scatter(E[~m0, 0], E[~m0, 1], s=4, c="#E4572E", alpha=.7, linewidths=0, label="Fraud")
ax.set_xlabel("t-SNE dimension 1"); ax.set_ylabel("t-SNE dimension 2"); ax.set_xticks([]); ax.set_yticks([]); ax.legend(markerscale=4, frameon=False, loc="upper right")
fig.tight_layout(); fig.savefig("reports/figures/tsne.png"); plt.close(fig)
# models trained on the first k95 principal components vs the full features (test-month PR-AUC, threshold-free)
pc = PCA(n_components=k95, random_state=SEED).fit(Zd); Pd, Pt = pc.transform(Zd), pc.transform(Zt); spw = spw_from(yd); rows = []
for key in ["logreg", "tree", "rf", "gb"]:
    m = make_model(key, spw=spw, **cv["models"][key]["best_params"]); m.fit(Pd, yd); ap = float(average_precision_score(yt, m.predict_proba(Pt)[:, 1]))
    full = next(r for r in R["models"] if r["key"] == key)["test"]["pr_auc"]; rows.append({"key": key, "name": NAMES[key], "pr_auc_full": full, "pr_auc_pca": ap}); print(key, round(full, 3), "->", round(ap, 3), flush=True)
R["dimred"] = {"n_features": len(ALL), "explained": [round(float(v), 4) for v in evr], "cumulative": [round(float(v), 4) for v in cum], "k90": k90, "k95": k95,
               "pc1_loadings": load(0), "pc2_loadings": load(1), "pc12_variance": float(cum[1]),
               "tsne": {"fraud": int(ns), "normal": int(ns), "perplexity": 40, "neighbor_purity": purity, "input_components": 15}, "pca_models": {"k": k95, "models": rows}}
json.dump(R, open("reports/results.json", "w"), indent=1)
import shutil; [shutil.copy(f"reports/figures/{n}.png", f"app/web/assets/{n}.png") for n in ["pca_2d", "tsne"]]
print("k90", k90, "k95", k95, "PC1-2 var", round(float(cum[1]), 3), "tsne purity", round(purity, 3), load(0), load(1))
