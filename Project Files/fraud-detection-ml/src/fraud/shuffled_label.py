"""Shuffled-label sanity check: train the random forest on development data with the fraud labels randomly shuffled, then score the test month.
If the pipeline leaks nothing, a model that learned from meaningless labels should do no better than guessing: PR-AUC close to the test fraud rate.
Writes reports/shuffled_label_check.json. Run from anywhere: python src/fraud/shuffled_label.py"""
import json, os, sys
from pathlib import Path
import numpy as np
from sklearn.metrics import average_precision_score
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))
from fraud.common import load_xy, make_model

df, X, y, n85 = load_xy()
R = json.load(open("reports/results.json")); p = next(m for m in R["models"] if m["key"] == "rf")["params"]
rng = np.random.default_rng(42); y_dev = rng.permutation(y[:n85])          # same number of fraud labels, but assigned to random rows
real = make_model("rf", **p).fit(X[:n85], y[:n85]); shuf = make_model("rf", **p).fit(X[:n85], y_dev)
out = {"test_fraud_rate": float(y[n85:].mean()), "pr_auc_real_labels": float(average_precision_score(y[n85:], real.predict_proba(X[n85:])[:, 1])),
       "pr_auc_shuffled_labels": float(average_precision_score(y[n85:], shuf.predict_proba(X[n85:])[:, 1]))}
json.dump(out, open("reports/shuffled_label_check.json", "w"), indent=1); print(out)
