"""FastAPI backend: scores a transaction with the four trained models. Run: uvicorn app.server:app"""
import json, sys, datetime as dt
from pathlib import Path
import numpy as np, joblib
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from fraud.features import GROUPS, CATS, haversine_mi

ALL = GROUPS["base"] + GROUPS["time"] + GROUPS["distance"] + GROUPS["history"] + ["cat_" + c for c in CATS]
IDX = {c: i for i, c in enumerate(ALL)}
RESULTS = json.loads((ROOT / "reports/results.json").read_text())
CITIES = json.loads((ROOT / "app/cities.json").read_text()); BY_NAME = {c["name"].lower(): c for c in CITIES}
MODELS = {k: joblib.load(ROOT / f"models/{k}.joblib") for k in ["logreg", "tree", "rf", "gb"]}
INFO = {m["key"]: m for m in RESULTS["models"]}
app = FastAPI(title="FraudLens")

class Tx(BaseModel):
    home_city: str; merchant_city: str
    amount: float = Field(gt=0, le=25000); category: str; datetime: str
    age: float = Field(default=40, ge=16, le=100)
    avg_amount: float = Field(default=70, gt=0, le=25000)
    txn_1h: int = Field(default=0, ge=0, le=50); txn_24h: int = Field(default=1, ge=0, le=200)
    minutes_since_prev: float = Field(default=240, ge=0, le=43200)
    prev_city: str | None = None
    model: str = "rf"

def city(name):
    c = BY_NAME.get(name.strip().lower())
    if not c: raise HTTPException(422, f"Unknown city: {name}. Pick one from the list.")
    return c

def row(t: Tx):
    h, m = city(t.home_city), city(t.merchant_city)
    prev = city(t.prev_city) if t.prev_city else h
    when = dt.datetime.fromisoformat(t.datetime)
    d_home = float(haversine_mi(h["lat"], h["long"], m["lat"], m["long"]))
    d_prev = float(haversine_mi(prev["lat"], prev["long"], m["lat"], m["long"]))
    mins = max(t.minutes_since_prev, 1.0)
    v = dict(amt=t.amount, city_pop=h["pop"], age=t.age, hour=when.hour, dow=when.weekday(),
             is_weekend=int(when.weekday() >= 5), is_night=int(when.hour >= 22 or when.hour <= 5), dist_home_mi=d_home,
             secs_since_prev=t.minutes_since_prev * 60, dist_from_prev_mi=d_prev, speed_mph=min(d_prev / (mins / 60), 1000),
             amt_mean_past=t.avg_amount, amt_ratio=min(t.amount / t.avg_amount, 100),
             amt_z=float(np.clip((t.amount - t.avg_amount) / max(1.0, 0.8 * t.avg_amount), -10, 10)),  # std approximated as 0.8 x typical amount
             txn_1h=t.txn_1h, txn_24h=t.txn_24h, first_txn=0)
    x = np.zeros(len(ALL))
    for k, val in v.items(): x[IDX[k]] = val
    if t.category not in CATS: raise HTTPException(422, "Unknown category")
    x[IDX["cat_" + t.category]] = 1
    return x, d_home

NEUTRAL = {"Amount": {"amt": None, "amt_ratio": 1.0, "amt_z": 0.0}, "Time of day": {"hour": 14, "is_night": 0},
           "Distance from home": {"dist_home_mi": 0.0},
           "Recent activity": {"txn_1h": 0, "txn_24h": 0, "secs_since_prev": 9774.0, "speed_mph": 0.0, "dist_from_prev_mi": 0.0}}

@app.post("/api/predict")
def predict(t: Tx):
    x, d_home = row(t)
    out = {}
    for k, mdl in MODELS.items():
        p = float(mdl.predict_proba(x.reshape(1, -1))[0, 1]); thr = INFO[k]["threshold"]
        out[k] = {"score": p, "threshold": thr, "verdict": "Likely fraud" if p >= thr else "Worth a look" if p >= thr / 2 else "Looks normal"}
    sel = t.model if t.model in MODELS else RESULTS["best_model"]
    drivers = []
    for label, patch in NEUTRAL.items():
        y = x.copy()
        for f, val in patch.items(): y[IDX[f]] = t.avg_amount if val is None else val
        drivers.append({"label": label, "delta": out[sel]["score"] - float(MODELS[sel].predict_proba(y.reshape(1, -1))[0, 1])})
    drivers.sort(key=lambda d: -abs(d["delta"]))
    return {"models": out, "selected": sel, "distance_mi": round(d_home, 1), "drivers": drivers[:3]}

@app.get("/api/results")
def results(): return RESULTS
@app.get("/api/cities")
def cities(q: str = ""):
    q = q.lower().strip(); return [c["name"] for c in CITIES if q and c["name"].lower().startswith(q)][:8]
@app.get("/api/health")
def health(): return {"ok": True}
app.mount("/", StaticFiles(directory=ROOT / "app/web", html=True), name="web")
