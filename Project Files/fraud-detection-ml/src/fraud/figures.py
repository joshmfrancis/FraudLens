"""Precision-recall curves for all eight models on the test month -> reports/figures/pr_curves.png (and app/web/assets).
Reads the curves that train.py saved in reports/results.json. The dashed line is a model that guesses at random: precision equals the test fraud rate."""
import json, os, shutil
from pathlib import Path
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT)  # works from any folder, on any OS

R = json.load(open("reports/results.json")); rate = R["dataset"]["split"]["test"]["fraud_rate"]
COL = {"rf": "#2B7A78", "tree": "#F2B134", "gb": "#E4572E", "lgbm": "#7B5EA7", "et": "#3C7DD9", "nb": "#5BAA4B", "logreg": "#8C6D46", "svm": "#17252A"}
plt.rcParams.update({"font.size": 12, "axes.edgecolor": "#5C6B73", "axes.spines.top": False, "axes.spines.right": False})
fig, ax = plt.subplots(figsize=(7.2, 4.8), dpi=200)
for m in sorted(R["models"], key=lambda m: -m["test"]["pr_auc"]):   # best model first in the legend
    ax.plot(m["pr_curve"]["recall"], m["pr_curve"]["precision"], color=COL[m["key"]], lw=2.2, label=f"{m['name'].split(' (')[0]} (PR-AUC {m['test']['pr_auc']:.2f})")
ax.axhline(rate, color="#9AA5AB", ls="--", lw=1.5, label=f"Random guess ({rate*100:.1f}%)")
ax.set_xlim(0, 1); ax.set_ylim(0, 1.02); ax.set_xlabel("Recall (share of fraud caught)"); ax.set_ylabel("Precision (share of flags that are fraud)")
ax.legend(frameon=False, fontsize=9.5, loc="upper right")
fig.tight_layout(); fig.savefig("reports/figures/pr_curves.png"); plt.close(fig)
shutil.copy("reports/figures/pr_curves.png", "app/web/assets/pr_curves.png"); print("pr_curves.png written")
