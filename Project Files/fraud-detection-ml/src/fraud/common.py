"""Shared data loading, model factory, and hyperparameter grids.
Loss: every model optimizes cross-entropy. Logistic regression minimizes binary cross-entropy (log loss); XGBoost uses objective binary:logistic
(log loss); the tree and forest split on entropy (criterion="log_loss", i.e. information gain from cross-entropy)."""
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from xgboost import XGBClassifier
from fraud.features import GROUPS, CATS

SEED = 42
ALL = GROUPS["base"] + GROUPS["time"] + GROUPS["distance"] + GROUPS["history"] + ["cat_" + c for c in CATS]
NAMES = {"logreg": "Logistic regression", "tree": "Decision tree", "rf": "Random forest", "gb": "Gradient boosting"}

def load_xy(path="data/processed/features.parquet"):
    df = pd.read_parquet(path).sort_values("unix_time", kind="mergesort").reset_index(drop=True)
    for c in CATS: df["cat_" + c] = (df.category == c).astype(float)
    n85 = int(len(df) * 0.85)
    return df, df[ALL].values.astype(np.float32), df.is_fraud.values, n85

def spw_from(y_dev): return float(np.sqrt((y_dev == 0).sum() / (y_dev == 1).sum()))

def make_model(key, spw=8.9, **p):
    if key == "logreg": return make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=2000, **p))
    if key == "tree": return DecisionTreeClassifier(criterion="log_loss", class_weight="balanced", random_state=SEED, **p)
    if key == "rf": return RandomForestClassifier(n_estimators=60, criterion="log_loss", class_weight="balanced_subsample", max_samples=0.3, n_jobs=-1, random_state=SEED, **p)
    if key == "gb": return XGBClassifier(objective="binary:logistic", tree_method="hist", n_estimators=50, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8,
                                         eval_metric="logloss", n_jobs=1, random_state=SEED, scale_pos_weight=spw, **p)

GRIDS = {"logreg": {"C": [1.0]},
         "tree": {"max_depth": [8, 12], "min_samples_leaf": [50, 200]},
         "rf": {"max_depth": [10, 14], "min_samples_leaf": [10, 40]},
         "gb": {"max_depth": [6, 8], "min_child_weight": [1, 5]}}
N_FOLDS = 5  # expanding-window time-series CV over the development period (first 85% of rows)
