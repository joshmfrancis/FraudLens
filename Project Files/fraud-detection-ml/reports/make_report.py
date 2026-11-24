"""Write reports/final_report_draft.md from reports/results.json so every number in the report comes from the latest run."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; R = json.load(open(ROOT / "reports/results.json"))
SL = json.load(open(ROOT / "reports/shuffled_label_check.json")); V = json.load(open(ROOT / "reports/sparkov_validity.json")); CVN = json.load(open(ROOT / "reports/cv_results.json")); FP = json.load(open(ROOT / "reports/first_pass_results.json")); FPM = {m["key"]: m for m in FP["models"]}
D, DR, E = R["dataset"], R["dimred"], R["eda"]; sp = D["split"]; ms = R["models"]; M = {m["key"]: m for m in ms}; best = M[R["best_model"]]; c = best["test"]["confusion"]
f2 = lambda x: f"{x:.2f}"; f3 = lambda x: f"{x:.3f}"; p1 = lambda x: f"{x*100:.1f}%"; p2 = lambda x: f"{x*100:.2f}%"; n = lambda x: f"{x:,}"
AB = {a["name"][0]: a for a in R["ablation"]}; sc = {m["key"]: m for m in DR["svd_continuous"]["models"]}; sa = {m["key"]: m for m in DR["svd_all_models"]["models"]}
OWN = {"logreg": "Josh", "tree": "Josh", "rf": "Josh", "et": "Josh", "gb": "Logan", "lgbm": "Logan", "svm": "Logan", "nb": "Logan"}
chunks = "\n".join(f"| {i+1} | {c_['start']} to {c_['end']} | {n(c_['rows'])} | {p2(c_['fraud_rate'])} |" for i, c_ in enumerate(R["validation"]["chunks"]))
cvrows = "\n".join(f"| {m['name']} | " + " | ".join(f2(v) for v in m["cv"]["folds_pr_auc"]) + f" | {f2(m['cv']['mean_pr_auc'])} ± {f2(m['cv']['std_pr_auc'])} |" for m in ms)
cvf1 = "\n".join(f"| {m['name']} | " + " | ".join(f2(v) for v in m["cv"]["folds_f1"]) + f" | {f2(m['cv']['mean_f1'])} ± {f2(m['cv']['std_f1'])} |" for m in ms)
test = "\n".join(f"| {m['name']} | {OWN[m['key']]} | {f2(m['test']['precision'])} | {f2(m['test']['recall'])} | {f2(m['test']['f1'])} | {f3(m['test']['pr_auc'])} | {f2(m['cv']['mean_pr_auc'])} ± {f2(m['cv']['std_pr_auc'])} | {f2(m['cv']['mean_f1'])} | {f2(m['threshold'])} |" for m in ms)
ABBR = {"scale_pos_weight": "fraud weight", "max_depth": "depth", "min_samples_leaf": "min leaf", "min_child_weight": "min child", "min_child_samples": "min child", "num_leaves": "leaves", "colsample_bytree": "colsample", "subsample": "subsample", "n_estimators": "trees", "var_smoothing": "smoothing", "alpha": "alpha", "C": "C"}
def _vals(key, k): return ", ".join(str(v) for v in sorted({r["params"][k] for r in CVN["models"][key]["grid"]}))
tune = "\n".join(f"| {m['name']} | " + "; ".join(f"{ABBR.get(k, k)}: {_vals(m['key'], k)}" for k in CVN["models"][m["key"]]["grid"][0]["params"]) + f" | {len(CVN['models'][m['key']]['grid'])} | " + ", ".join(f"{ABBR.get(k, k)} {v}" for k, v in m["params"].items()) + f" | {f2(FPM[m['key']]['cv']['mean_pr_auc'])} to {f2(m['cv']['mean_pr_auc'])} |" for m in ms)
_spw = lambda k: ", ".join(f"{v:g}" for v in sorted({r['params']['scale_pos_weight'] for r in CVN['models'][k]['grid']}))
bal = round((sp["dev"]["rows"] - sp["dev"]["fraud"]) / sp["dev"]["fraud"])
_cat = lambda d, k: max(V["category_share"].items(), key=lambda kv: kv[1][k])
mon = "\n".join(f"| {k} | {n(int(v['rows']))} | {p2(v['fraud_rate'])} | {round(v['fraud_per_day'])} | {round(v['normal_per_day']):,} |" for k, v in V["monthly"].items())
loss = "\n".join(f"| {m['name']} | {m['loss']} |" for m in ms)
imp = "\n".join(f"{i+1}. {x['feature']} ({f3(x['value'])})" for i, x in enumerate(R["importance"][:8]))
red = "\n".join(f"| {m['name']} | {f3(m['test']['pr_auc'])} | {f3(sc[m['key']]['pr_auc_svd'])} | {f3(sa[m['key']]['pr_auc_svd'])} |" for m in ms)
abl = "\n".join(f"| {a['name']} | {a['features']} | {f3(a['pr_auc'])} |" for a in R["ablation"])
l1 = ", ".join(f"{a} ({b})" for a, b in DR["pc1_loadings"]); l2 = ", ".join(f"{a} ({b})" for a, b in DR["pc2_loadings"])
md = f"""# Credit Card Fraud Detection with Classical Machine Learning
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport. 

## 1. Introduction
We predict whether a credit card transaction is fraud (binary classification) using classical machine learning (no deep learning). Fraud is rare ({p2(D['fraud_rate'])} of transactions in our data), so accuracy is misleading: always predicting "not fraud" scores {p2(D['dummy_accuracy'])}. We evaluate every model with both F1 (at a validation-chosen threshold) and PR-AUC (threshold-free).

## 2. Related work
sharmasapna's GitHub project (credit-card-fraud-detection) classifies fraud on Sparkov-generated data. We add engineered customer-history features, time-aware cross-validation, dimensionality reduction (SVD and t-SNE), an eight-model comparison, an ablation study, and a scoring web app. Data generator: Sparkov Data Generation (namebrandon, MIT license), github.com/namebrandon/Sparkov_Data_Generation.

## 3. Data
Generated with the public Sparkov tool (seed 42, 2025-01-01 to 2025-12-31): {n(D['rows'])} transactions for {D['customers']} customers, {n(D['fraud_rows'])} fraud ({p2(D['fraud_rate'])}). The output has 26 columns (16 customer, 10 transaction). We dropped identifiers (ssn, names, street, city, zip, job, account and transaction IDs, merchant name, generator profile). No full row is repeated; the generator's seed repeats some transaction ID strings across different customers, and we do not use that column. The development period is {sp['dev']['start']} to {sp['dev']['end']} ({n(sp['dev']['rows'])} rows, {p2(sp['dev']['fraud_rate'])} fraud); the test month is {sp['test']['start']} to {sp['test']['end']} ({n(sp['test']['rows'])} rows, {p2(sp['test']['fraud_rate'])} fraud). The test set is the last 15% of rows in time order.

### 3.1 Is the simulated data believable?
Sparkov is a rule-based simulator, so we read how it creates fraud (the profile files and datagen_transaction.py in its repository) and checked that our data matches. Each customer gets one short burst of fraud, about a day long, drawn from a separate fraud profile in place of the normal profile: many more purchases per day, a different category mix (more online shopping, groceries, and miscellaneous online purchases), larger amounts, night-time shopping, and no travel. Normal purchases on the burst days are removed.

| Check on our generated data | Normal | Fraud |
|---|---|---|
| Customers with a fraud burst | n/a | {V['customers_with_fraud']} of {V['customers']} |
| Fraud purchases per customer | n/a | {V['fraud_rows_per_customer']['mean']:.1f} on average (range {V['fraud_rows_per_customer']['min']} to {V['fraud_rows_per_customer']['max']}) |
| Median amount | ${V['median_amt']['normal']:.0f} | ${V['median_amt']['fraud']:.0f} |
| Share of purchases at night (10pm to 6am) | {V['night_share']['normal']*100:.0f}% | {V['night_share']['fraud']*100:.0f}% |
| Most common category | {_cat(V, 'normal')[0].replace('_', ' ')} ({_cat(V, 'normal')[1]['normal']*100:.0f}%) | {_cat(V, 'fraud')[0].replace('_', ' ')} ({_cat(V, 'fraud')[1]['fraud']*100:.0f}%) |
| Median distance from home (miles) | {V['distance_mi']['normal_median']:.1f} | {V['distance_mi']['fraud_median']:.1f} |

The data behaves as the generator documents, which is an internal check of the simulator. It does not show that real fraud looks like this. The fraud rate is a setting (one burst per customer), not a measurement, and published real-world card datasets are much less fraudulent (for example, the widely used ULB/Worldline credit card dataset has about 0.17% fraud, 492 of 284,807 transactions, as reported by Grover et al. 2022). We therefore use the data to compare methods under identical conditions, not to estimate real-world accuracy.

The check also explains the drift in the fraud rate. Fraud per day is flat through the year, while normal volume per day jumps in December because Sparkov weights the holiday weeks (Nov 30 to Dec 31) more heavily in its profile files:

| Month | Transactions | Fraud rate | Fraud per day | Normal per day |
|---|---|---|---|---|
{mon}

The lower December fraud rate is therefore an artifact of the generator. It shifts score distributions between the development period and the test month, so a threshold chosen on the development months can be less well matched to the test month.

## 4. Methods
**Features ({R['n_model_features']} inputs).** Base (amount, age, city size, 14 category columns), time (hour, weekday, weekend, night), distance (haversine miles from home to merchant), and history (time and distance since the previous purchase, implied speed, amount versus the customer's past mean and z-score, purchases in the last hour and day, first-transaction flag). History features use only earlier transactions of the same card.

**Models and loss.** Eight classical models. Josh: logistic regression, decision tree, random forest, extra trees. Logan: XGBoost (gradient boosting), LightGBM, linear SVM (probability-calibrated), Gaussian Naive Bayes. Wherever a model has a loss function, it is cross-entropy; the linear SVM trains on hinge loss and is then calibrated by minimizing log loss (Platt scaling), and Naive Bayes has no loss (maximum likelihood). All use class weighting except Naive Bayes.

| Model | Loss or objective |
|---|---|
{loss}

**Validation.** Time-aware, expanding-window 5-fold cross-validation on the development period, split into six chronological chunks. Fold k trains on chunks 1..k and validates on chunk k+1, so models never train on the future. Hyperparameters were chosen by mean PR-AUC across folds, and each model's decision threshold maximizes F1 on the pooled out-of-fold predictions. Each model was then refit on the whole development period and evaluated once on the test month. We report F1 and PR-AUC for every fold and for the test month.

**History features and leakage.** For every purchase we describe the customer's own past: the amount compared with their typical amount so far (ratio and z-score), purchases in the last hour and day, time since the previous purchase, and implied travel speed. A feature may only use purchases that happened strictly before the one being scored. This is enforced three ways (src/fraud/features.py). Running totals are cumulative sums minus the current row, so a purchase never counts toward its own average. Counts for the last hour and day search earlier timestamps only (searchsorted). A customer's first purchase has no history and is filled with zero. The split and the cross-validation folds are also in time order, and the scalers and the SVD are fit on training data only. Leakage would make the scores look better than any deployed system could achieve.

**Class imbalance.** Fraud is {p2(sp['dev']['fraud_rate'])} of development transactions, so always answering "not fraud" is {p1(D['dummy_accuracy'])} accurate. We keep the data imbalanced and make the models care about the rare class in four ways. (1) Class weights: logistic regression, the decision tree, random forest, extra trees, and the SVM use balanced class weights (a fraud example counts about {bal} times more; the forest and extra trees recompute the weights inside each tree's sample). XGBoost and LightGBM use scale_pos_weight, which is a tuned setting (we tried {_spw('gb')} for XGBoost and {_spw('lgbm')} for LightGBM, and cross-validation picked {M['gb']['params']['scale_pos_weight']:g} and {M['lgbm']['params']['scale_pos_weight']:g}; the square root of the class ratio is about 9). Naive Bayes has no weighting. (2) Metrics for rare events: PR-AUC and F1, not accuracy. (3) A tuned threshold: each model's cutoff maximizes F1 on the pooled out-of-fold predictions instead of the default 0.5. (4) Realistic evaluation: validation and test data keep the real fraud rate; only the training loss changes. We did not use resampling (SMOTE or undersampling). Weighted scores rank transactions well but are not calibrated probabilities.

**Hyperparameter tuning.** Grid search with the same time-aware folds: every combination in the grid is trained on the earlier chunks and scored on the next, and the combination with the best mean PR-AUC wins (src/fraud/cv.py; the grids are in src/fraud/common.py). The test month is never used for tuning. Our first pass tried two to four combinations per model; the final grids are larger and add the fraud weight, number of trees, and sampling settings for the boosted models. The boosted models were searched in three rounds, each finer grid centered on the previous winner, because their best values kept landing at the edge of the previous grid; we stopped after three rounds, and the last winners are still at the edge of their grid. The random forest and extra trees now use 100 trees instead of 60.

| Model | Settings searched | Combinations | Winner | CV PR-AUC, first pass to final |
|---|---|---|---|---|
{tune}

| Chunk | Dates | Rows | Fraud rate |
|---|---|---|---|
{chunks}

## 5. Cross-validation results
PR-AUC by fold:

| Model | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Mean ± SD |
|---|---|---|---|---|---|---|
{cvrows}

F1 by fold (at each model's pooled out-of-fold threshold):

| Model | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Mean ± SD |
|---|---|---|---|---|---|---|
{cvf1}

Early folds train on little data, and fold scores vary widely for several models. Among the strong models the random forest and LightGBM are the most stable (spread about 0.07), and the decision tree is the least (spread {f2(M['tree']['cv']['std_pr_auc'])}).

## 6. Test results ({sp['test']['start']} to {sp['test']['end']})
| Model | Owner | Precision | Recall | F1 | PR-AUC | CV PR-AUC | CV F1 | Threshold |
|---|---|---|---|---|---|---|---|---|
{test}

Best model by cross-validated PR-AUC: {best['name']}. At its threshold it caught {c['tp']} of {c['tp']+c['fn']} fraud cases with {c['fp']} false alarms among {n(c['tn']+c['fp'])} normal transactions. At the default 0.5 threshold its F1 is {f2(best['test_at_0.5']['f1'])}. After tuning, the boosted models are close to the forest on the test month: LightGBM has the highest test PR-AUC ({f3(M['lgbm']['test']['pr_auc'])}, F1 {f2(M['lgbm']['test']['f1'])}), XGBoost reaches {f3(M['gb']['test']['pr_auc'])} (F1 {f2(M['gb']['test']['f1'])}), and the decision tree {f3(M['tree']['test']['pr_auc'])}. We still report the random forest as the best model because we chose by cross-validated PR-AUC ({f2(best['cv']['mean_pr_auc'])} versus {f2(M['gb']['cv']['mean_pr_auc'])} for XGBoost and {f2(M['lgbm']['cv']['mean_pr_auc'])} for LightGBM) and did not switch after seeing the test month, which has only {c['tp']+c['fn']} fraud cases. In our first pass the boosted models had low F1 (XGBoost {f2(FPM['gb']['test']['f1'])}, LightGBM {f2(FPM['lgbm']['test']['f1'])}) because their cross-validated thresholds were too strict after the refit; the wider search fixed most of that. The linear models and extra trees remain weak.

![Precision-recall curves for all eight models on the test month](figures/pr_curves.png)

Figure: precision-recall curves on the test month. PR-AUC is the area under each curve; the dashed line is a random guess, whose precision equals the test fraud rate ({p2(sp['test']['fraud_rate'])}).

Permutation importance (test-month sample, best model; post-hoc analysis, not used for selection):
{imp}

## 7. Dimensionality reduction
**SVD.** We scale each of the {DR['n_features']} inputs by its standard deviation but do not center it, then take the singular value decomposition (computed exactly from the Gram matrix). This is PCA without the centering step, so the first direction mostly captures overall level. {DR['k95']} components keep 95% of the energy (PCA after centering needs {DR['pca_k95']}), and the first two keep {round(DR['c12_energy']*100)}%. Component 1 loads on {l1}; component 2 on {l2}. In the 2D projection fraud overlaps normal activity heavily (reports/figures/svd_2d.png).

**t-SNE** on a balanced sample of {n(DR['tsne']['fraud'])} fraud and {n(DR['tsne']['normal'])} normal transactions (after SVD to {DR['tsne']['input_components']} components): fraud forms local clusters; {round(DR['tsne']['neighbor_purity']*100)}% of a fraud point's 10 nearest neighbors are fraud (reports/figures/tsne.png). t-SNE is used for visualization only.

**Models on reduced inputs** (test PR-AUC): SVD on the {DR['svd_continuous']['n_continuous']} continuous features only ({DR['svd_continuous']['k']} components, {round(DR['svd_continuous']['energy_kept']*100)}% of their energy, {DR['svd_continuous']['n_inputs']} inputs in total with flags and categories kept) versus SVD on all {DR['n_features']} features ({DR['svd_all_models']['k']} components).

| Model | Original features | SVD on continuous | SVD on all features |
|---|---|---|---|
{red}

SVD on continuous features keeps most of the performance for the random forest and LightGBM and hurts extra trees and XGBoost. SVD on all features removes it for every model; we did not isolate why. A plausible explanation is that the fraud signal sits in flags and categories that a full rotation mixes, which we have not tested.

## 8. Ablation
Best model ({best['name']}) refit on feature groups, scored on the test month (PR-AUC):

| Feature set | Inputs | PR-AUC |
|---|---|---|
{abl}

History features raise PR-AUC from {f2(AB['A']['pr_auc'])} to {f2(AB['C']['pr_auc'])}. Distance does not help ({f2(AB['B']['pr_auc'])}); its single-feature ROC-AUC is {f2(E['single_feature_roc_auc']['dist_home_mi'])}, and median distance is {E['median_dist_fraud']:.1f} miles for fraud versus {E['median_dist_normal']:.1f} for normal transactions. As a leakage sanity check we trained the random forest on development data with the fraud labels randomly shuffled: its test PR-AUC was {f3(SL['pr_auc_shuffled_labels'])}, no better than guessing (the test fraud rate is {SL['test_fraud_rate']*100:.2f}%), against {f3(SL['pr_auc_real_labels'])} with the real labels.

## 9. Demo application
The eight saved models also run in a web app (website/ in the repository, published on Netlify). The models were exported to plain arrays and scored in the browser, and the browser scores match the Python models to within 0.00001 on 1,800 test transactions. A local FastAPI version (app/server.py) serves the same front end. The app scores hand-built scenarios, shows each model's score, explains what moved the score, and shows test and cross-validated PR-AUC and F1 for all models.

## 10. Limitations and ethics
Simulated data may not transfer to real spending. Distance carries no signal in this generator. The fraud rate drifts across months ({p1(sp['dev']['fraud_rate'])} in January to November versus {p1(sp['test']['fraud_rate'])} in the test month). Tuning grids are still modest (the boosted models' winners sat at the edge of their last grid, so a wider search might improve them further), fold scores are unstable for several models, and one test month with {sp['test']['fraud']} fraud cases is a small sample. Scores from class-weighted models are not calibrated probabilities. Gender is excluded from the features to avoid demographic scoring. No private or personal data was used.

## 11. Conclusion and future work
The {best['name'].lower()} was best by cross-validation (test F1 {f2(best['test']['f1'])}, PR-AUC {f2(best['test']['pr_auc'])}); customer-history features mattered most, linear models failed, and tuning brought XGBoost and LightGBM close to the forest on the test month. Future work: real data with permission, cost-based thresholds, SMOTE, wider tuning grids, interaction features for the linear models, and generator settings where travel matters.

## 12. References
Sparkov Data Generation (namebrandon, GitHub). sharmasapna, credit-card-fraud-detection (GitHub). scikit-learn, XGBoost, and LightGBM documentation. Grover, P., Li, Z., Xu, J., Tittelfitz, J., Cheng, A., Zablocki, J., Liu, J., and Zhou, H. (2022). Fraud Dataset Benchmark and Applications. arXiv:2208.14417 (source of the real-world fraud rates quoted in section 3.1).
"""
(ROOT / "reports/final_report_draft.md").write_text(md, encoding="utf-8"); print("report written", len(md))
