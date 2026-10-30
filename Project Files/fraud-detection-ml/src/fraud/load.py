"""Read and concatenate Sparkov generator output (pipe-separated, chunked)."""
import glob, os
import pandas as pd

EXPECTED = ["ssn","cc_num","first","last","gender","street","city","state","zip","lat","long",
            "city_pop","job","dob","acct_num","profile","trans_num","trans_date","trans_time",
            "unix_time","category","amt","is_fraud","merchant","merch_lat","merch_long"]

def load_raw(folder="data/raw"):
    frames = []
    for f in sorted(glob.glob(os.path.join(folder, "*.csv"))):
        if os.path.basename(f) == "customers.csv":
            continue
        df = pd.read_csv(f, sep="|", encoding="utf-8", encoding_errors="replace")
        if len(df):
            frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    assert list(df.columns) == EXPECTED, "unexpected columns"
    return df

if __name__ == "__main__":
    import os
    from pathlib import Path
    os.chdir(Path(__file__).resolve().parents[2])  # run from any folder, on any OS
    os.makedirs("data/processed", exist_ok=True)
    df = load_raw()
    df.to_parquet("data/processed/transactions.parquet", index=False)
    print("rows", len(df), "customers", df.cc_num.nunique())
    print("dates", df.trans_date.min(), df.trans_date.max())
    print("fraud rows", int(df.is_fraud.sum()), "rate", df.is_fraud.mean())
    print("dup trans_num", df.trans_num.duplicated().sum(), "nulls", int(df.isna().sum().sum()))
    print("amt<=0", int((df.amt<=0).sum()))
