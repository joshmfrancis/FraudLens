"""Why isn't XGBoost the best model here? A small check on the time-aware validation folds (the test month is never touched).
(1) Does a bigger boosted model (more and deeper trees) help? (2) Do city size and age, which identify individual customers, let boosting memorize customers?
Scores are the mean PR-AUC over validation folds 2 to 5 (fold 1 trains on too little data). Writes reports/boosting_probe.json."""
import json, os, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))  # works from any folder, on any OS
from sklearn.metrics import average_precision_score
from fraud.common import *

df, X, y, n85 = load_xy(); c = n85 // 6; spw = spw_from(y[:n85]); cv = json.load(open("reports/cv_results.json"))
drop = [ALL.index("city_pop"), ALL.index("age")]; cols = {"all 31 inputs": list(range(len(ALL))), "without city size and age": [i for i in range(len(ALL)) if i not in drop]}
cfgs = [("XGBoost, bigger (400 trees, depth 10)", "gb", {"n_estimators": 400, "max_depth": 10}), ("XGBoost, tuned", "gb", cv["models"]["gb"]["best_params"]), ("Random forest, tuned", "rf", cv["models"]["rf"]["best_params"])]
out = []
for name, key, p in cfgs:
    row = {"name": name, "key": key, "params": p}
    for cn, ci in cols.items():
        aps = []
        for k in (2, 3, 4, 5):   # same expanding windows as cv.py: train on chunks 1..k, validate on chunk k+1
            a, b, va, vb = 0, k * c, k * c, ((k + 1) * c if k < 5 else n85)
            m = make_model(key, spw=spw, **p); m.fit(X[a:b][:, ci], y[a:b]); aps.append(float(average_precision_score(y[va:vb], m.predict_proba(X[va:vb][:, ci])[:, 1])))
        row[cn] = float(np.mean(aps))
    print(name, {k: round(v, 3) for k, v in row.items() if k in cols}, flush=True); out.append(row)
json.dump(out, open("reports/boosting_probe.json", "w"), indent=1)
