// In-browser scorer for the eight models (ports of the saved scikit-learn / XGBoost / LightGBM models).
// load(baseUrl) -> Promise<{score(key, x:Float64Array|number[]) -> probability}>. Works in browsers and Node.
(function (root) {
  const sig = z => 1 / (1 + Math.exp(-z));
  async function fetchBuf(url) {
    if (typeof process !== "undefined" && process.versions && process.versions.node && !/^https?:/.test(url)) return require("fs").readFileSync(url).buffer.slice(0);
    const r = await fetch(url); if (!r.ok) throw new Error("Could not load " + url); return r.arrayBuffer();
  }
  async function load(base) {
    const man = JSON.parse(Buffer_toString(await fetchBuf(base + "manifest.json")));
    const M = {};
    for (const k of Object.keys(man)) {
      const m = man[k];
      if (m.file) {
        const buf = await fetchBuf(base + m.file), n = m.n;
        m.thr = new Float32Array(buf, 0, n); m.left = new Int32Array(buf, 4 * n, n); m.right = new Int32Array(buf, 8 * n, n); m.feat = new Int8Array(buf, 12 * n, n);
      }
      M[k] = m;
    }
    const walk = (m, root, x) => {
      let i = root; const thr = m.thr, left = m.left, right = m.right, feat = m.feat, lt = m.cmp === "lt";
      while (feat[i] >= 0) { const v = Math.fround(x[feat[i]]); i = (lt ? v < thr[i] : v <= thr[i]) ? left[i] : right[i]; }
      return thr[i];
    };
    const dot = (w, x, mean, scale) => { let s = 0; for (let j = 0; j < w.length; j++) s += w[j] * ((x[j] - mean[j]) / scale[j]); return s; };
    function score(key, x) {
      const m = M[key];
      if (m.kind === "forest") { let s = 0; for (const r of m.roots) s += walk(m, r, x); return s / m.roots.length; }
      if (m.kind === "boost") { let s = m.init; for (const r of m.roots) s += walk(m, r, x); return sig(s); }
      if (m.kind === "linear") return sig(dot(m.w, x, m.mean, m.scale) + m.b);
      if (m.kind === "svm") { let s = 0; for (const p of m.parts) s += sig(-(p.a * (dot(p.w, x, p.mean, p.scale) + p.b) + p.c)); return s / m.parts.length; }
      if (m.kind === "nb") { const lj = [0, 1].map(c => { let s = Math.log(m.prior[c]); for (let j = 0; j < x.length; j++) { const v = m.var[c][j]; s += -0.5 * Math.log(2 * Math.PI * v) - 0.5 * (x[j] - m.theta[c][j]) ** 2 / v; } return s; }); const mx = Math.max(lj[0], lj[1]); const e0 = Math.exp(lj[0] - mx), e1 = Math.exp(lj[1] - mx); return e1 / (e0 + e1); }
      throw new Error("unknown model " + key);
    }
    return { score, keys: Object.keys(M) };
  }
  function Buffer_toString(ab) { return new TextDecoder().decode(new Uint8Array(ab)); }
  const api = { load };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.FraudModels = api;
})(typeof self !== "undefined" ? self : this);
