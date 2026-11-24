// Browser port of app/server.py: turns the form fields into the model's 31 inputs, scores all 8 models, and explains the result.
(function (root) {
  const CATS = ["entertainment", "food_dining", "gas_transport", "grocery_net", "grocery_pos", "health_fitness", "home", "kids_pets", "misc_net", "misc_pos", "personal_care", "shopping_net", "shopping_pos", "travel"];
  const ALL = ["amt", "city_pop", "age", "hour", "dow", "is_weekend", "is_night", "dist_home_mi", "secs_since_prev", "dist_from_prev_mi", "speed_mph", "amt_mean_past", "amt_ratio", "amt_z", "txn_1h", "txn_24h", "first_txn"].concat(CATS.map(c => "cat_" + c));
  const IDX = Object.fromEntries(ALL.map((c, i) => [c, i]));
  const hav = (a, b, c, d) => { const R = 3958.8, r = Math.PI / 180, p1 = a * r, p2 = c * r, x = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const NEUTRAL = { "Amount": { amt: null, amt_ratio: 1.0, amt_z: 0.0 }, "Time of day": { hour: 14, is_night: 0 }, "Distance from home": { dist_home_mi: 0.0 },
    "Recent activity": { txn_1h: 0, txn_24h: 0, secs_since_prev: 9774.0, speed_mph: 0.0, dist_from_prev_mi: 0.0 } };
  function create(models, cities, results) {
    const by = Object.fromEntries(cities.map(c => [c.name.toLowerCase(), c])), info = Object.fromEntries(results.models.map(m => [m.key, m]));
    const city = n => { const c = by[String(n).trim().toLowerCase()]; if (!c) throw new Error("Unknown city: " + n + ". Pick one from the list."); return c; };
    function row(t) {
      const h = city(t.home_city), m = city(t.merchant_city), prev = h;
      if (!(t.amount > 0 && t.amount <= 25000) || !(t.avg_amount > 0 && t.avg_amount <= 25000) || !(t.age >= 16 && t.age <= 100) || !(t.minutes_since_prev >= 0) || !(t.txn_1h >= 0) || !(t.txn_24h >= 0) || !t.datetime) throw new Error("Please check the inputs.");
      if (CATS.indexOf(t.category) < 0) throw new Error("Unknown category");
      const when = new Date(t.datetime), hour = when.getHours(), dow = (when.getDay() + 6) % 7;
      const dHome = hav(h.lat, h.long, m.lat, m.long), dPrev = hav(prev.lat, prev.long, m.lat, m.long), mins = Math.max(t.minutes_since_prev, 1.0);
      const v = { amt: t.amount, city_pop: h.pop, age: t.age, hour, dow, is_weekend: dow >= 5 ? 1 : 0, is_night: (hour >= 22 || hour <= 5) ? 1 : 0, dist_home_mi: dHome,
        secs_since_prev: t.minutes_since_prev * 60, dist_from_prev_mi: dPrev, speed_mph: Math.min(dPrev / (mins / 60), 1000), amt_mean_past: t.avg_amount,
        amt_ratio: Math.min(t.amount / t.avg_amount, 100), amt_z: clip((t.amount - t.avg_amount) / Math.max(1.0, 0.8 * t.avg_amount), -10, 10), txn_1h: t.txn_1h, txn_24h: t.txn_24h, first_txn: 0 };
      const x = new Float64Array(ALL.length); for (const k in v) x[IDX[k]] = v[k]; x[IDX["cat_" + t.category]] = 1;
      return [x, dHome];
    }
    function predict(t) {
      const [x, dHome] = row(t), out = {};
      for (const k of models.keys) { const p = models.score(k, x), thr = info[k].threshold; out[k] = { score: p, threshold: thr, verdict: p >= thr ? "Likely fraud" : p >= thr / 2 ? "Worth a look" : "Looks normal" }; }
      const sel = out[t.model] ? t.model : results.best_model, drivers = [];
      for (const label in NEUTRAL) { const y = Float64Array.from(x); for (const f in NEUTRAL[label]) { const val = NEUTRAL[label][f]; y[IDX[f]] = val === null ? t.avg_amount : val; } drivers.push({ label, delta: out[sel].score - models.score(sel, y) }); }
      drivers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      return { models: out, selected: sel, distance_mi: Math.round(dHome * 10) / 10, drivers: drivers.slice(0, 3) };
    }
    return { predict, row };
  }
  const api = { create, CATS, ALL };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.FraudEngine = api;
})(typeof self !== "undefined" ? self : this);
