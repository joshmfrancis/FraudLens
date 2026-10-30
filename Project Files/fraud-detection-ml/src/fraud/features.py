"""Preprocessing + feature engineering. History features use PAST transactions only."""
import numpy as np, pandas as pd

def haversine_mi(lat1, lon1, lat2, lon2):
    R = 3958.8
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2-p1)/2)**2 + np.cos(p1)*np.cos(p2)*np.sin((np.radians(lon2)-np.radians(lon1))/2)**2
    return 2*R*np.arcsin(np.sqrt(a))

def build_features(df):
    df = df.copy()
    df["dt"] = pd.to_datetime(df.trans_date + " " + df.trans_time)
    df["age"] = (df.dt - pd.to_datetime(df.dob)).dt.days / 365.25
    df["hour"] = df.dt.dt.hour
    df["dow"] = df.dt.dt.dayofweek
    df["is_weekend"] = (df.dow >= 5).astype(int)
    df["is_night"] = ((df.hour >= 22) | (df.hour <= 5)).astype(int)
    df["dist_home_mi"] = haversine_mi(df.lat, df.long, df.merch_lat, df.merch_long)
    df = df.sort_values(["cc_num", "unix_time"], kind="mergesort").reset_index(drop=True)
    g = df.groupby("cc_num", sort=False)
    # time gap and movement since the previous transaction
    prev_t = g.unix_time.shift(1)
    df["first_txn"] = prev_t.isna().astype(int)
    df["secs_since_prev"] = (df.unix_time - prev_t)
    df["dist_from_prev_mi"] = haversine_mi(g.merch_lat.shift(1), g.merch_long.shift(1), df.merch_lat, df.merch_long)
    hrs = (df.secs_since_prev / 3600).clip(lower=1/60)
    df["speed_mph"] = (df.dist_from_prev_mi / hrs).clip(upper=1000)
    # past-only amount statistics (current row excluded)
    n = g.cumcount()
    cs = g.amt.cumsum() - df.amt
    cs2 = (df.amt**2).groupby(df.cc_num, sort=False).cumsum() - df.amt**2
    mean = cs / n.replace(0, np.nan)
    var = (cs2 / n.replace(0, np.nan) - mean**2).clip(lower=0)
    df["amt_mean_past"] = mean
    df["amt_ratio"] = (df.amt / mean).clip(upper=100)
    df["amt_z"] = ((df.amt - mean) / np.sqrt(var).clip(lower=1.0)).clip(-10, 10)
    # counts of earlier transactions in the last 1h / 24h (strictly earlier)
    c1 = np.zeros(len(df)); c24 = np.zeros(len(df))
    start = 0
    for _, size in g.size().items():
        t = df.unix_time.values[start:start+size]
        i = np.arange(size)
        c1[start:start+size] = i - np.searchsorted(t, t - 3600, side="left")
        c24[start:start+size] = i - np.searchsorted(t, t - 86400, side="left")
        start += size
    # ties at the same second would count each other; fix by searching left of t itself
    df["txn_1h"] = c1; df["txn_24h"] = c24
    for c in ["secs_since_prev", "dist_from_prev_mi", "speed_mph", "amt_mean_past", "amt_ratio", "amt_z"]:
        df[c] = df[c].fillna(0)
    df = df.sort_values("unix_time", kind="mergesort").reset_index(drop=True)
    return df

GROUPS = {
    "base": ["amt", "city_pop", "age"],
    "time": ["hour", "dow", "is_weekend", "is_night"],
    "distance": ["dist_home_mi"],
    "history": ["secs_since_prev", "dist_from_prev_mi", "speed_mph", "amt_mean_past", "amt_ratio", "amt_z",
                "txn_1h", "txn_24h", "first_txn"],
}
CATS = ["entertainment","food_dining","gas_transport","grocery_net","grocery_pos","health_fitness",
        "home","kids_pets","misc_net","misc_pos","personal_care","shopping_net","shopping_pos","travel"]
