"""Score the four demo scenarios (the preset buttons in app/web/index.html) with the saved models -> reports/demo_examples.json.
The final deck's demo slide reads this file. Run from anywhere: python app/make_demo_examples.py (after train.py)."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent; sys.path.insert(0, str(ROOT))
from fastapi.testclient import TestClient
from app.server import app

NAMES = {"Amount": "Amount", "Time of day": "Time of day", "Distance from home": "Distance from home", "Recent activity": "Recent activity"}
HOME, AGE = "Shreveport, LA", 34   # the form's defaults
PRE = [("Coffee near home", dict(merchant_city="Shreveport, LA", amount=6.5, category="food_dining", datetime="2025-12-10T09:00", avg_amount=60, minutes_since_prev=300, txn_1h=0, txn_24h=1)),
       ("Gas on a road trip", dict(merchant_city="Dallas, TX", amount=48, category="gas_transport", datetime="2025-12-10T17:00", avg_amount=60, minutes_since_prev=300, txn_1h=0, txn_24h=1)),
       ("Late-night electronics", dict(merchant_city="Houston, TX", amount=890, category="shopping_net", datetime="2025-12-11T02:30", avg_amount=55, minutes_since_prev=20, txn_1h=2, txn_24h=4)),
       ("Big evening purchase", dict(merchant_city="Shreveport, LA", amount=520, category="shopping_pos", datetime="2025-12-11T22:45", avg_amount=60, minutes_since_prev=90, txn_1h=1, txn_24h=2))]
client = TestClient(app); best = json.load(open(ROOT / "reports/results.json"))["best_model"]; out = []
for name, p in PRE:
    r = client.post("/api/predict", json=dict(home_city=HOME, age=AGE, model=best, **p)).json(); m = r["models"][best]
    out.append({"name": name, "score": m["score"], "verdict": m["verdict"], "driver": r["drivers"][0]["label"], "all": {k: round(v["score"], 3) for k, v in r["models"].items()}})
    print(name, round(m["score"], 3), m["verdict"], "| driver:", r["drivers"][0]["label"])
json.dump(out, open(ROOT / "reports/demo_examples.json", "w"), indent=1)
