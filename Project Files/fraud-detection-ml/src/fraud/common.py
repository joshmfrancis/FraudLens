"""Shared data loading, model factory, and hyperparameter grids for the eight models.
Loss: wherever a model has a loss, it is cross-entropy. Logistic regression minimizes binary cross-entropy (log loss); XGBoost and LightGBM use the
binary logistic objective (log loss); the tree, forest and extra trees split on entropy (criterion="log_loss"). The linear SVM trains on hinge loss
(a margin loss, not cross-entropy) and is then probability-calibrated by minimizing log loss (Platt scaling). Naive Bayes has no loss: it is fit by maximum likelihood."""
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

try:
    from xgboost import XGBClassifier
except ModuleNotFoundError as exc:
    raise ModuleNotFoundError(
        "xgboost is required to run FraudLens. Activate the project virtual environment "
        "and run `python -m pip install -r requirements.txt` from the project root."
    ) from exc

try:
    from lightgbm import LGBMClassifier
except ModuleNotFoundError as exc:
    raise ModuleNotFoundError(
        "lightgbm is required to run FraudLens. Activate the project virtual environment "
        "and run `python -m pip install -r requirements.txt` from the project root."
    ) from exc

from fraud.features import GROUPS, CATS

SEED = 42  # fixed seed so every run is reproducible
# ---- Feature lists: ALL is the exact column order of the 31 model inputs (3 base + 4 time + 1 distance + 9 history + 14 category one-hots) ----
ALL = GROUPS["base"] + GROUPS["time"] + GROUPS["distance"] + GROUPS["history"] + ["cat_" + c for c in CATS]
# Short keys used everywhere (cv.py, train.py, app) -> display name, who owns the model, and which loss it uses
KEYS = ["logreg", "tree", "rf", "et", "gb", "lgbm", "svm", "nb"]
NAMES = {"logreg": "Logistic regression", "tree": "Decision tree", "rf": "Random forest", "et": "Extra trees", "gb": "XGBoost (gradient boosting)",
         "lgbm": "LightGBM", "svm": "Linear SVM (calibrated)", "nb": "Naive Bayes"}
OWNER = {"logreg": "Josh", "tree": "Josh", "rf": "Josh", "et": "Josh", "gb": "Logan", "lgbm": "Logan", "svm": "Logan", "nb": "Logan"}
LOSS = {"logreg": "binary cross-entropy (log loss)", "tree": "entropy split criterion (cross-entropy)", "rf": "entropy split criterion (cross-entropy)",
        "et": "entropy split criterion (cross-entropy)", "gb": "binary cross-entropy (binary:logistic)", "lgbm": "binary cross-entropy (objective=binary)",
        "svm": "hinge loss, then log-loss (Platt) probability calibration", "nb": "maximum likelihood (no loss function)"}

# Load the feature table, sort by time (oldest first), one-hot encode category, and mark the 85% split point:
# rows before n85 = development (Jan-Nov, used for CV + final training); rows after = test month (Dec, scored once)
def load_xy(path="data/processed/features.parquet"):
    # stable sort by time so the split and the CV folds are strictly chronological
    df = pd.read_parquet(path).sort_values("unix_time", kind="mergesort").reset_index(drop=True)
    for c in CATS: df["cat_" + c] = (df.category == c).astype(float)
    n85 = int(len(df) * 0.85)
    return df, df[ALL].values.astype(np.float32), df.is_fraud.values, n85

# scale_pos_weight = sqrt(#normal / #fraud) ~ 9: up-weights the rare fraud class (a softened version of the full ~85x ratio)
def spw_from(y_dev): return float(np.sqrt((y_dev == 0).sum() / (y_dev == 1).sum()))

# Model factory: returns an untrained model for a key. **p are the tuned hyperparameters from GRIDS / the CV winner.
# class_weight / scale_pos_weight handle the class imbalance (1% fraud).
def make_model(key, spw=8.9, **p):
    # kw(): start from the fixed defaults below, then let any value in p (from GRIDS or the CV winner) override them
    def kw(**d): d.update(p); return d
    # Josh: logistic regression (log loss) - scaled inputs, balanced class weights
    if key == "logreg": return make_pipeline(StandardScaler(), LogisticRegression(**kw(class_weight="balanced", max_iter=2000)))
    # Josh: decision tree / random forest / extra trees - all split on entropy (criterion="log_loss")
    if key == "tree": return DecisionTreeClassifier(**kw(criterion="log_loss", class_weight="balanced", random_state=SEED))
    if key == "rf": return RandomForestClassifier(**kw(n_estimators=100, criterion="log_loss", class_weight="balanced_subsample", max_samples=0.3, n_jobs=-1, random_state=SEED))
    if key == "et": return ExtraTreesClassifier(**kw(n_estimators=100, criterion="log_loss", bootstrap=True, class_weight="balanced_subsample", max_samples=0.3, n_jobs=-1, random_state=SEED))
    # Logan: XGBoost (binary:logistic = cross-entropy) and LightGBM; scale_pos_weight defaults to spw but is also a tuned setting
    if key == "gb": return XGBClassifier(**kw(objective="binary:logistic", tree_method="hist", n_estimators=50, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8,
                                              eval_metric="logloss", n_jobs=-1, random_state=SEED, scale_pos_weight=spw))
    if key == "lgbm": return LGBMClassifier(**kw(objective="binary", n_estimators=60, learning_rate=0.1, subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
                                                 scale_pos_weight=spw, n_jobs=-1, random_state=SEED, verbose=-1))
    # Logan: linear SVM trained with hinge loss (SGD), then Platt-scaled (sigmoid) so it outputs probabilities
    if key == "svm": return CalibratedClassifierCV(make_pipeline(StandardScaler(), SGDClassifier(**kw(loss="hinge", class_weight="balanced", max_iter=30, tol=None, random_state=SEED))),
                                                  method="sigmoid", cv=3)
    # Logan: Gaussian Naive Bayes - maximum likelihood, no loss function
    if key == "nb": return GaussianNB(**p)

# Hyperparameter grids searched in cross-validation (cv.py tries every combination; the one with the best mean PR-AUC across the 5 time-aware folds wins).
# Any value listed here overrides the default set in make_model(). The test month is never used to choose settings.
# scale_pos_weight 1 = no extra fraud weight, 9 = about sqrt(normal/fraud), 3 = in between.
GRIDS = {"logreg": {"C": [0.01, 0.1, 1.0, 10.0]},
         "tree": {"max_depth": [8, 12, 16], "min_samples_leaf": [20, 50, 200]},
         "rf": {"max_depth": [12, 16, 20], "min_samples_leaf": [5, 10, 20]},
         "et": {"max_depth": [16, 20, 24], "min_samples_leaf": [5, 10, 20]},
         # boosted models: a coarse grid first, then two finer grids, each around the previous winner (its best values sat at the edge of the previous grid)
         "gb": [{"scale_pos_weight": [1.0, 3.0, 9.0], "max_depth": [4, 6], "min_child_weight": [5, 20], "colsample_bytree": [0.5, 0.8], "subsample": [0.5, 0.8], "n_estimators": [50, 100]},
                {"scale_pos_weight": [9.0, 20.0], "max_depth": [6, 8], "min_child_weight": [2, 5], "colsample_bytree": [0.3, 0.5], "subsample": [0.5], "n_estimators": [30, 50]},
                {"scale_pos_weight": [20.0, 40.0], "max_depth": [8, 10], "min_child_weight": [5, 10], "colsample_bytree": [0.5], "subsample": [0.5], "n_estimators": [20, 30, 40]}],
         "lgbm": [{"scale_pos_weight": [1.0, 3.0, 9.0], "num_leaves": [7, 15, 31], "min_child_samples": [100, 300], "colsample_bytree": [0.5, 0.8], "n_estimators": [60, 120]},
                  {"scale_pos_weight": [3.0], "num_leaves": [31, 63], "min_child_samples": [300, 600], "colsample_bytree": [0.3, 0.5], "n_estimators": [30, 60]},
                  {"scale_pos_weight": [3.0, 9.0], "num_leaves": [63, 127], "min_child_samples": [600, 1000], "colsample_bytree": [0.5], "n_estimators": [20, 30, 45]}],
         "svm": {"alpha": [1e-6, 1e-5, 1e-4, 1e-3]},
         "nb": {"var_smoothing": [1e-9, 1e-7, 1e-5, 1e-3]}}
# A grid is a dict {setting: [values]} or a list of such dicts. combos() returns every combination (duplicates removed), in a fixed order.
def combos(grid):
    import itertools
    seen, out = set(), []
    for g in ([grid] if isinstance(grid, dict) else grid):
        for vals in itertools.product(*g.values()):
            p = dict(zip(g.keys(), vals)); k = tuple(sorted(p.items()))
            if k not in seen: seen.add(k); out.append(p)
    return out
N_FOLDS = 5  # expanding-window time-series CV over the development period (first 85% of rows)
