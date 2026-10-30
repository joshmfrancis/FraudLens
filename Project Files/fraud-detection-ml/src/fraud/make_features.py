"""Build data/processed/features.parquet from transactions.parquet."""
import os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT); sys.path.insert(0, str(ROOT / "src"))
import pandas as pd
from fraud.features import build_features
build_features(pd.read_parquet("data/processed/transactions.parquet")).to_parquet("data/processed/features.parquet", index=False)
print("features.parquet written")
