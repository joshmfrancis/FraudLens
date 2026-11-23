"""Sparkov validity check: does the generated data behave the way the generator's fraud profiles say it should?
Sparkov gives every customer one short fraud burst (about a day) drawn from a separate 'fraud profile' (more purchases, different categories,
bigger amounts, night-time shopping, no travel). This script measures those properties on our generated data and writes reports/sparkov_validity.json.
It also shows why the fraud rate drifts: fraud per day is flat all year, but Sparkov raises normal volume in the holiday weeks."""
import json, os, sys
from pathlib import Path
import pandas as pd
ROOT = Path(__file__).resolve().parents[2]; os.chdir(ROOT)  # works from any folder, on any OS

df = pd.read_parquet("data/processed/features.parquet", columns=["cc_num", "category", "amt", "hour", "dist_home_mi", "is_fraud", "dt", "trans_date"])
f, n = df[df.is_fraud == 1], df[df.is_fraud == 0]   # fraud rows and normal rows
out = {}
# 1. Does every customer get a fraud burst, and how big is it?
per_cust = f.groupby("cc_num").size(); days = f.groupby("cc_num").trans_date.nunique()
out["customers"] = int(df.cc_num.nunique()); out["customers_with_fraud"] = int(per_cust.size)
out["fraud_rows_per_customer"] = {"mean": float(per_cust.mean()), "min": int(per_cust.min()), "max": int(per_cust.max())}
out["fraud_days_per_customer"] = {"mean": float(days.mean()), "max": int(days.max()), "share_exactly_1": float((days == 1).mean())}
out["normal_txn_per_active_day"] = float(n.groupby(["cc_num", "trans_date"]).size().mean()); out["fraud_txn_per_fraud_day"] = float(f.groupby(["cc_num", "trans_date"]).size().mean())
# 2. Fraud versus normal: category mix, amounts, time of day, distance from home
cs = pd.concat([f.category.value_counts(normalize=True).rename("fraud"), n.category.value_counts(normalize=True).rename("normal")], axis=1).fillna(0).round(4)
out["category_share"] = cs.to_dict("index")
am = pd.concat([f.groupby("category").amt.median().rename("fraud"), n.groupby("category").amt.median().rename("normal")], axis=1).round(2)
out["median_amt_by_category"] = am.to_dict("index"); out["median_amt"] = {"fraud": float(f.amt.median()), "normal": float(n.amt.median())}
out["small_amt_share_lt15"] = {"fraud": float((f.amt < 15).mean()), "normal": float((n.amt < 15).mean())}
out["hour_share"] = {"fraud": f.hour.value_counts(normalize=True).sort_index().round(4).tolist(), "normal": n.hour.value_counts(normalize=True).sort_index().round(4).tolist()}
out["night_share"] = {"fraud": float(((f.hour >= 22) | (f.hour <= 5)).mean()), "normal": float(((n.hour >= 22) | (n.hour <= 5)).mean())}
out["distance_mi"] = {"fraud_median": float(f.dist_home_mi.median()), "normal_median": float(n.dist_home_mi.median()), "fraud_mean": float(f.dist_home_mi.mean()), "normal_mean": float(n.dist_home_mi.mean()),
                      "share_over_200": {"fraud": float((f.dist_home_mi > 200).mean()), "normal": float((n.dist_home_mi > 200).mean())}}
# 3. Fraud rate by month: fraud per day stays flat while normal volume per day changes (the source of our fraud-rate drift)
df["month"] = df.dt.dt.to_period("M").astype(str); days_in = df.groupby("month").dt.agg(lambda s: s.dt.normalize().nunique())
mm = df.groupby("month").agg(rows=("is_fraud", "size"), fraud=("is_fraud", "sum")); mm["fraud_rate"] = mm.fraud / mm.rows
mm["normal_per_day"] = (mm.rows - mm.fraud) / days_in; mm["fraud_per_day"] = mm.fraud / days_in
out["monthly"] = mm.round(5).to_dict("index")
json.dump(out, open("reports/sparkov_validity.json", "w"), indent=1)
print("customers with fraud", out["customers_with_fraud"], "of", out["customers"], "| fraud rows per customer", round(out["fraud_rows_per_customer"]["mean"], 1))
print("median amount fraud", round(out["median_amt"]["fraud"]), "normal", round(out["median_amt"]["normal"]), "| night share fraud", round(out["night_share"]["fraud"], 2), "normal", round(out["night_share"]["normal"], 2))
print("median distance fraud", round(out["distance_mi"]["fraud_median"], 1), "normal", round(out["distance_mi"]["normal_median"], 1))
