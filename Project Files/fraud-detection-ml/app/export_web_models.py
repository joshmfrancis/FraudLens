"""Export the 8 trained models to plain arrays the browser can score (no Python server needed).
Run after train.py: python app/export_web_models.py  (writes website/models; rerun whenever the models are retrained)"""
import sys, json, struct
from pathlib import Path
import numpy as np, joblib
ROOT = Path(__file__).resolve().parent.parent; OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parents[1] / "website" / "models"; OUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(ROOT / "src"))
from fraud.common import KEYS  # registers xgboost/lightgbm
import warnings; warnings.filterwarnings("ignore")

def pack(name, trees, meta):
    """trees: list of (feat, thr, left, right) numpy arrays with local indices; writes name.bin and returns the manifest entry"""
    feat, thr, left, right, roots, off = [], [], [], [], [], 0
    for f, t, l, r in trees:
        roots.append(off); feat.append(f); thr.append(t); left.append(np.where(l >= 0, l + off, -1)); right.append(np.where(r >= 0, r + off, -1)); off += len(f)
    feat = np.concatenate(feat).astype(np.int8); thr = np.concatenate(thr).astype(np.float32)
    left = np.concatenate(left).astype(np.int32); right = np.concatenate(right).astype(np.int32)
    n = len(feat); blob = thr.tobytes() + left.tobytes() + right.tobytes() + feat.tobytes()
    (OUT / f"{name}.bin").write_bytes(blob)
    return dict(meta, file=f"{name}.bin", n=n, roots=roots)

def skl_tree(t):
    v = t.value[:, 0, :]; p1 = v[:, 1] / v.sum(axis=1)
    leaf = t.children_left < 0
    thr = np.where(leaf, p1, t.threshold); feat = np.where(leaf, -1, t.feature)
    return feat, thr, t.children_left, t.children_right

man = {}
for k in KEYS:
    m = joblib.load(ROOT / f"models/{k}.joblib")
    if k == "tree": man[k] = pack(k, [skl_tree(m.tree_)], dict(kind="forest", cmp="le"))
    elif k in ("rf", "et"): man[k] = pack(k, [skl_tree(e.tree_) for e in m.estimators_], dict(kind="forest", cmp="le"))
    elif k == "gb":
        df = m.get_booster().trees_to_dataframe(); trees = []
        for _, g in df.groupby("Tree", sort=True):
            g = g.reset_index(drop=True); idx = {nid: i for i, nid in enumerate(g["ID"])}; n = len(g)
            feat = np.full(n, -1); thr = np.zeros(n); left = np.full(n, -1); right = np.full(n, -1)
            for i, r in g.iterrows():
                if r["Feature"] == "Leaf": thr[i] = r["Gain"]
                else:
                    feat[i] = int(str(r["Feature"]).lstrip("f")) if str(r["Feature"]).startswith("f") and str(r["Feature"])[1:].isdigit() else list(m.get_booster().feature_names).index(r["Feature"])
                    thr[i] = r["Split"]; left[i] = idx[r["Yes"]]; right[i] = idx[r["No"]]
            trees.append((feat, thr, left, right))
        base = float(json.loads(m.get_booster().save_config())["learner"]["learner_model_param"]["base_score"].strip("[]"))
        man[k] = pack(k, trees, dict(kind="boost", cmp="lt", init=float(np.log(base / (1 - base)))))
    elif k == "lgbm":
        trees = []
        for ti in m.booster_.dump_model()["tree_info"]:
            feat, thr, left, right = [], [], [], []
            def walk(nd):
                i = len(feat); feat.append(-1); thr.append(0.0); left.append(-1); right.append(-1)
                if "leaf_value" in nd: thr[i] = nd["leaf_value"]; return i
                assert nd["decision_type"] == "<="; feat[i] = nd["split_feature"]; thr[i] = nd["threshold"]
                left[i] = walk(nd["left_child"]); right[i] = walk(nd["right_child"]); return i
            walk(ti["tree_structure"]); trees.append((np.array(feat), np.array(thr), np.array(left), np.array(right)))
        man[k] = pack(k, trees, dict(kind="boost", cmp="le", init=0.0))
    elif k == "logreg":
        sc, lr = m.steps[0][1], m.steps[1][1]
        man[k] = dict(kind="linear", mean=sc.mean_.tolist(), scale=sc.scale_.tolist(), w=lr.coef_[0].tolist(), b=float(lr.intercept_[0]))
    elif k == "svm":
        parts = []
        for cc in m.calibrated_classifiers_:
            sc, sg = cc.estimator.steps[0][1], cc.estimator.steps[1][1]; cal = cc.calibrators[0]
            parts.append(dict(mean=sc.mean_.tolist(), scale=sc.scale_.tolist(), w=sg.coef_[0].tolist(), b=float(sg.intercept_[0]), a=float(cal.a_), c=float(cal.b_)))
        man[k] = dict(kind="svm", parts=parts)
    elif k == "nb":
        man[k] = dict(kind="nb", theta=m.theta_.tolist(), var=m.var_.tolist(), prior=m.class_prior_.tolist())
    print(k, "ok")
(OUT / "manifest.json").write_text(json.dumps(man, separators=(",", ":")))
import shutil; WEB = OUT.parent   # the static site also needs the results and the city list
shutil.copy(ROOT / "reports/results.json", WEB / "results.json"); shutil.copy(ROOT / "app/cities.json", WEB / "cities.json")
print("manifest", (OUT / "manifest.json").stat().st_size)
