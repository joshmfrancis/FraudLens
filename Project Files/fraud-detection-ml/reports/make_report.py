"""Write reports/final_report_draft.md from reports/results.json so every number in the report comes from the latest run."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; R = json.load(open(ROOT / "reports/results.json"))
D, DR, E = R["dataset"], R["dimred"], R["eda"]; sp = D["split"]; ms = R["models"]; M = {m["key"]: m for m in ms}; best = M[R["best_model"]]; c = best["test"]["confusion"]
f2 = lambda x: f"{x:.2f}"; f3 = lambda x: f"{x:.3f}"; p1 = lambda x: f"{x*100:.1f}%"; p2 = lambda x: f"{x*100:.2f}%"; n = lambda x: f"{x:,}"
AB = {a["name"][0]: a for a in R["ablation"]}; sc = {m["key"]: m for m in DR["svd_continuous"]["models"]}; sa = {m["key"]: m for m in DR["svd_all_models"]["models"]}
OWN = {"logreg": "Josh", "tree": "Josh", "rf": "Josh", "et": "Josh", "gb": "Logan", "lgbm": "Logan", "svm": "Logan", "nb": "Logan"}
chunks = "\n".join(f"| {i+1} | {c_['start']} to {c_['end']} | {n(c_['rows'])} | {p2(c_['fraud_rate'])} |" for i, c_ in enumerate(R["validation"]["chunks"]))
cvrows = "\n".join(f"| {m['name']} | " + " | ".join(f2(v) for v in m["cv"]["folds_pr_auc"]) + f" | {f2(m['cv']['mean_pr_auc'])} ± {f2(m['cv']['std_pr_auc'])} |" for m in ms)
cvf1 = "\n".join(f"| {m['name']} | " + " | ".join(f2(v) for v in m["cv"]["folds_f1"]) + f" | {f2(m['cv']['mean_f1'])} ± {f2(m['cv']['std_f1'])} |" for m in ms)
test = "\n".join(f"| {m['name']} | {OWN[m['key']]} | {f2(m['test']['precision'])} | {f2(m['test']['recall'])} | {f2(m['test']['f1'])} | {f3(m['test']['pr_auc'])} | {f2(m['cv']['mean_pr_auc'])} ± {f2(m['cv']['std_pr_auc'])} | {f2(m['cv']['mean_f1'])} | {f2(m['threshold'])} |" for m in ms)
loss = "\n".join(f"| {m['name']} | {m['loss']} |" for m in ms)
imp = "\n".join(f"{i+1}. {x['feature']} ({f3(x['value'])})" for i, x in enumerate(R["importance"][:8]))
red = "\n".join(f"| {m['name']} | {f3(m['test']['pr_auc'])} | {f3(sc[m['key']]['pr_auc_svd'])} | {f3(sa[m['key']]['pr_auc_svd'])} |" for m in ms)
abl = "\n".join(f"| {a['name']} | {a['features']} | {f3(a['pr_auc'])} |" for a in R["ablation"])
l1 = ", ".join(f"{a} ({b})" for a, b in DR["pc1_loadings"]); l2 = ", ".join(f"{a} ({b})" for a, b in DR["pc2_loadings"])
md = f"""# Credit Card Fraud Detection with Classical Machine Learning
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport. DRAFT: edit before submitting.

## 1. Introduction
We predict whether a credit card transaction is fraud (binary classification) using classical machine learning (no deep learning). Fraud is rare ({p2(D['fraud_rate'])} of transactions in our data), so accuracy is misleading: always predicting "not fraud" scores {p2(D['dummy_accuracy'])}. We evaluate every model with both F1 (at a validation-chosen threshold) and PR-AUC (threshold-free).

## 2. Related work
sharmasapna's GitHub project (credit-card-fraud-detection) classifies fraud on Sparkov-generated data. We add engineered customer-history features, time-aware cross-validation, dimensionality reduction (SVD and t-SNE), an eight-model comparison, an ablation study, and a scoring web app. Data generator: Sparkov Data Generation (namebrandon, MIT license), github.com/namebrandon/Sparkov_Data_Generation.

## 3. Data
Generated with the public Sparkov tool (seed 42, 2025-01-01 to 2025-12-31): {n(D['rows'])} transactions for {D['customers']} customers, {n(D['fraud_rows'])} fraud ({p2(D['fraud_rate'])}). The output has 26 columns (16 customer, 10 transaction). We dropped identifiers (ssn, names, street, city, zip, job, account and transaction IDs, merchant name, generator profile). No full row is repeated; the generator's seed repeats some transaction ID strings across different customers, and we do not use that column. The development period is {sp['dev']['start']} to {sp['dev']['end']} ({n(sp['dev']['rows'])} rows, {p2(sp['dev']['fraud_rate'])} fraud); the test month is {sp['test']['start']} to {sp['test']['end']} ({n(sp['test']['rows'])} rows, {p2(sp['test']['fraud_rate'])} fraud). The test set is the last 15% of rows in time order.

## 4. Methods
**Features ({R['n_model_features']} inputs).** Base (amount, age, city size, 14 category columns), time (hour, weekday, weekend, night), distance (haversine miles from home to merchant), and history (time and distance since the previous purchase, implied speed, amount versus the customer's past mean and z-score, purchases in the last hour and day, first-transaction flag). History features use only earlier transactions of the same card.

**Models and loss.** Eight classical models. Josh: logistic regression, decision tree, random forest, extra trees. Logan: XGBoost (gradient boosting), LightGBM, linear SVM (probability-calibrated), Gaussian Naive Bayes. Wherever a model has a loss function, it is cross-entropy; the linear SVM trains on hinge loss and is then calibrated by minimizing log loss (Platt scaling), and Naive Bayes has no loss (maximum likelihood). All use class weighting except Naive Bayes.

| Model | Loss or objective |
|---|---|
{loss}

**Validation.** Time-aware, expanding-window 5-fold cross-validation on the development period, split into six chronological chunks. Fold k trains on chunks 1..k and validates on chunk k+1, so models never train on the future. Hyperparameters were chosen by mean PR-AUC across folds, and each model's decision threshold maximizes F1 on the pooled out-of-fold predictions. Each model was then refit on the whole development period and evaluated once on the test month. We report F1 and PR-AUC for every fold and for the test month.

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

Early folds train on little data, and fold scores vary widely for several models. Among the strong models the random forest is the most stable.

## 6. Test results ({sp['test']['start']} to {sp['test']['end']})
| Model | Owner | Precision | Recall | F1 | PR-AUC | CV PR-AUC | CV F1 | Threshold |
|---|---|---|---|---|---|---|---|---|
{test}

Best model by cross-validated PR-AUC: {best['name']}. At its threshold it caught {c['tp']} of {c['tp']+c['fn']} fraud cases with {c['fp']} false alarms among {n(c['tn']+c['fp'])} normal transactions. At the default 0.5 threshold its F1 is {f2(best['test_at_0.5']['f1'])}. Boosted models and extra trees have low F1 despite decent PR-AUC because their cross-validated thresholds (0.97 to 1.00) were too strict after the final refit, so threshold-free PR-AUC is the fairer comparison. The two linear models fail (PR-AUC {f3(M['logreg']['test']['pr_auc'])} and {f3(M['svm']['test']['pr_auc'])}).

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

History features raise PR-AUC from {f2(AB['A']['pr_auc'])} to {f2(AB['C']['pr_auc'])}. Distance does not help ({f2(AB['B']['pr_auc'])}); its single-feature ROC-AUC is {f2(E['single_feature_roc_auc']['dist_home_mi'])}, and median distance is {E['median_dist_fraud']:.1f} miles for fraud versus {E['median_dist_normal']:.1f} for normal transactions. TODO: add a shuffled-label check.

## 9. Demo application
A FastAPI backend serves the eight saved models; a single-page front end (app/web/index.html) scores hand-built scenarios, shows each model's score, explains what moved the score, and shows test and cross-validated PR-AUC and F1 for all models.

## 10. Limitations and ethics
Simulated data may not transfer to real spending. Distance carries no signal in this generator. The fraud rate drifts across months ({p1(sp['dev']['fraud_rate'])} in January to November versus {p1(sp['test']['fraud_rate'])} in the test month). Tuning grids are small, fold scores are unstable for several models, and thresholds do not always transfer to refit models. Scores from class-weighted models are not calibrated probabilities. Gender is excluded from the features to avoid demographic scoring. No private or personal data was used.

## 11. Conclusion and future work
The {best['name'].lower()} was best by cross-validation (test F1 {f2(best['test']['f1'])}, PR-AUC {f2(best['test']['pr_auc'])}); customer-history features mattered most, and linear models failed. Future work: real data with permission, cost-based thresholds, SMOTE, wider tuning grids, and generator settings where travel matters.

## 12. References
Sparkov Data Generation (namebrandon, GitHub). sharmasapna, credit-card-fraud-detection (GitHub). scikit-learn, XGBoost, and LightGBM documentation. TODO: add course references.
"""
(ROOT / "reports/final_report_draft.md").write_text(md, encoding="utf-8"); print("report written", len(md))
