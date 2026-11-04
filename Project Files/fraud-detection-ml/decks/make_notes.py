"""Build the speaker-notes .txt files from the decks' own slide notes (so the script always matches the slides) plus Q&A and definitions.
Usage: python make_notes.py <repo>/decks/out <outdir>"""
import json, re, sys, textwrap
from pathlib import Path
from pptx import Presentation

OUT, DEST = Path(sys.argv[1]), Path(sys.argv[2]); DEST.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parents[1]
R = json.load(open(ROOT / "reports/results.json"))
M = {m["key"]: m for m in R["models"]}; D = R["dataset"]; DR = R["dimred"]; AB = {a["name"][0]: a for a in R["ablation"]}
f2 = lambda x: f"{x:.2f}"; f3 = lambda x: f"{x:.3f}"; p1 = lambda x: f"{x*100:.1f}%"; n = lambda x: f"{x:,}"
best = M[R["best_model"]]; rf, tree, lr, sv, nb, gb, lg, et = (M[k] for k in ["rf", "tree", "logreg", "svm", "nb", "gb", "lgbm", "et"])
hi = max(R["models"], key=lambda m: m["cv"]["std_pr_auc"]); sp = D["split"]
sc = {m["key"]: m for m in DR["svd_continuous"]["models"]}; sa = {m["key"]: m for m in DR["svd_all_models"]["models"]}
W = lambda s, ind="": textwrap.fill(s, 72, initial_indent=ind, subsequent_indent=ind + ("   " if ind == "" else ""))
def wrap_block(s): return "\n".join(textwrap.fill(p, 72) for p in s.split("\n"))
def slides(pptx):
    out = []
    for i, sl in enumerate(Presentation(pptx).slides, 1):
        t = sl.shapes.title.text if sl.shapes.title is not None else ""
        if not t:
            for sh in sl.placeholders:
                if sh.placeholder_format.type is not None and "TITLE" in str(sh.placeholder_format.type): t = sh.text_frame.text.replace("\n", " ")
        note = sl.notes_slide.notes_text_frame.text; who, txt = note.split(": ", 1); out.append((i, t, who, txt))
    return out
def part1(name, sl):
    j = [i for i, _, w, _ in sl if w == "JOSH"]; l = [i for i, _, w, _ in sl if w == "LOGAN"]
    h = f"CREDIT CARD FRAUD DETECTION - {name.upper()} PRESENTATION NOTES\nJoshua Francis and Logan Digilormo\n\n" + "=" * 50 + "\nPART 1: TALKING POINTS\n" + "=" * 50
    h += f"\nSpeakers alternate each slide. Josh: {', '.join(map(str, j))}. Logan: {', '.join(map(str, l))}.\n"
    for i, t, w, txt in sl:
        h += f"\n--- SLIDE {i}: {t.upper() if t else 'TITLE'} ({w.title()}) ---\n" + wrap_block(txt) + "\n"
    return h
def qa(items): return "\n\n" + "=" * 50 + "\nPART 2: QUESTIONS YOU MAY GET, WITH ANSWERS\n" + "=" * 50 + "\n" + "".join(f"\nQ: {q}\nA: " + textwrap.fill(a, 72, subsequent_indent="   ") + "\n" for q, a in items)
def defs(items): return "\n" + "=" * 50 + "\nPART 3: DEFINITIONS\n" + "=" * 50 + "\n\n" + "\n".join(textwrap.fill(f"{k}: {v}", 72, subsequent_indent="  ") for k, v in items) + "\n"

DEFS = [
 ("Cross-entropy (log loss)", "The loss that penalizes confident wrong probabilities. Logistic regression, XGBoost, and LightGBM minimize it directly."),
 ("Entropy split criterion", "A tree chooses the split that most reduces entropy (the cross-entropy of the class mix), instead of the default Gini impurity. Used by our tree, forest, and extra trees."),
 ("Hinge loss", "A margin loss used by support vector machines. It is not cross-entropy, so we calibrate the SVM's scores with log loss afterward."),
 ("Probability calibration (Platt scaling)", "Fitting a small logistic curve that turns a model's raw scores into probabilities, by minimizing log loss."),
 ("Maximum likelihood", "Choosing parameters that make the training data most probable. Naive Bayes is fit this way and has no separate loss function."),
 ("Logistic regression", "A model that learns one weight per feature and outputs a probability."),
 ("Decision tree", "A flowchart of yes/no questions that ends in a prediction."),
 ("Random forest", "Many decision trees, each trained on a random slice of the data, that vote."),
 ("Extra trees (extremely randomized trees)", "Like a random forest, but split points are chosen more randomly, which adds variety between trees."),
 ("Gradient boosting / XGBoost", "Trees built one after another, each correcting the previous ones' mistakes. XGBoost is a popular, fast implementation."),
 ("LightGBM", "Another boosting implementation. It grows trees leaf by leaf, which is fast but can overfit with large trees, so we keep ours small."),
 ("Linear SVM (support vector machine)", "Finds the straight-line boundary with the widest margin between the classes. Fast, but it cannot express non-linear patterns."),
 ("Naive Bayes", "Applies Bayes' rule while assuming features are independent. Very fast and stable, but the independence assumption is wrong here."),
 ("SVD (singular value decomposition)", "Rewrites a data table as new directions ordered by how much of the data they capture. We keep the first few to reduce dimensions."),
 ("PCA (principal component analysis)", "SVD applied after subtracting each column's mean (centering). We use uncentered SVD, so the first direction mostly reflects overall level."),
 ("Energy (explained variance)", "The share of the data that a component captures. For uncentered SVD it is the squared singular value divided by the sum of all of them."),
 ("t-SNE", "A nonlinear method that places similar points near each other in 2D, used only for visualization."),
 ("Cross-validation", "Repeatedly training on one part of the data and validating on another to estimate performance and choose settings."),
 ("Time-aware (expanding-window) cross-validation", "Folds that always train on earlier data and validate on later data, so a model never sees the future."),
 ("F1 score", "One number balancing precision and recall at a chosen threshold."),
 ("PR-AUC", "Area under the precision-recall curve. It summarizes performance across all thresholds and suits rare-class problems."),
 ("Precision / recall", "Precision: of the transactions we flag, how many are fraud. Recall: of all fraud, how much we catch."),
 ("Threshold", "The score cutoff for flagging fraud, chosen from the pooled validation predictions."),
 ("Class weights", "A multiplier that makes mistakes on the rare class (fraud) count more during training."),
 ("Ablation", "Re-training with groups of features removed or added to see which ones help."),
 ("Concept drift", "When a pattern, here the fraud rate, changes over time."),
 ("Data leakage", "When a model gets information it would not have in real life, such as future transactions."),
]
COMMON = [
 ("What loss function do you use?", f"Wherever a model has a loss, it is cross-entropy. Logistic regression minimizes binary cross-entropy (log loss). XGBoost and LightGBM use the binary logistic objective, which is also log loss. The decision tree, random forest, and extra trees choose splits with the entropy criterion, built from cross-entropy, instead of Gini. The linear SVM trains on hinge loss, which is a margin loss, so we then calibrate it with log loss (Platt scaling). Naive Bayes has no loss: it is fit by maximum likelihood."),
 ("How did you use cross-validation?", f"Time-aware, expanding-window cross-validation with 5 folds over January to November. Each fold trains on earlier chunks and validates on the next chunk, so the models never train on the future. Settings were chosen by mean PR-AUC across folds, thresholds from the pooled validation predictions, and December was held out until the end. We also record F1 for every fold. Random forest averaged PR-AUC {f2(rf['cv']['mean_pr_auc'])} +/- {f2(rf['cv']['std_pr_auc'])} and F1 {f2(rf['cv']['mean_f1'])}."),
 ("Why not ordinary shuffled k-fold?", "Shuffling mixes future transactions into training and inflates scores, because history features and fraud patterns depend on time. Time-ordered folds match how a real system is used."),
 ("Why report both F1 and PR-AUC?", "F1 depends on a threshold, and PR-AUC does not. F1 shows how the model behaves at the cutoff we would actually use; PR-AUC compares the models' ranking of transactions independent of that cutoff. When they disagree, as with LightGBM, the gap tells us the threshold did not transfer."),
 ("What is SVD, and how is it different from PCA?", f"SVD rewrites the data table as new directions ordered by how much of the data they capture. PCA is SVD after centering each column. We scale columns but do not center them, so the first direction mostly reflects overall level. It takes {DR['k95']} of {DR['n_features']} components to keep 95% of the energy, versus {DR['pca_k95']} for PCA."),
 ("What did you find with dimensionality reduction?", f"SVD on all features collapses every model (forest {f3(sa['rf']['pr_auc_svd'])} versus {f2(rf['test']['pr_auc'])}). SVD on only the 13 continuous features, keeping flags and categories, keeps most performance for the forest ({f2(sc['rf']['pr_auc_svd'])}) and LightGBM ({f2(sc['lgbm']['pr_auc_svd'])}) but hurts extra trees ({f2(sc['et']['pr_auc_svd'])} versus {f2(et['test']['pr_auc'])}). t-SNE shows fraud forms local clusters: {round(DR['tsne']['neighbor_purity']*100)}% of a fraud point's 10 nearest neighbors are fraud."),
 ("Why did SVD on all features hurt so much?", "We observed it but did not isolate the cause. A likely reason is that the fraud signal lives in flags and categories (such as the night flag) that a rotation across all features mixes together. We treat that as a hypothesis."),
 ("Which model is best?", f"By cross-validation, the random forest: PR-AUC {f2(rf['cv']['mean_pr_auc'])} +/- {f2(rf['cv']['std_pr_auc'])}. On the test month it has PR-AUC {f2(rf['test']['pr_auc'])} and the best F1, {f2(rf['test']['f1'])}. The decision tree ties it on test PR-AUC ({f2(tree['test']['pr_auc'])}), but its validation folds range from {f2(min(tree['cv']['folds_pr_auc']))} to {f2(max(tree['cv']['folds_pr_auc']))}."),
 ("Why are XGBoost's and LightGBM's F1 scores low?", f"Their PR-AUC is {f2(gb['test']['pr_auc'])} and {f2(lg['test']['pr_auc'])}, but the thresholds chosen in cross-validation ({f2(gb['threshold'])} and {f2(lg['threshold'])}) were too strict after the final refit, so they flag few fraud cases (F1 {f2(gb['test']['f1'])} and {f2(lg['test']['f1'])}). PR-AUC does not depend on a threshold, so it is the fairer comparison."),
 ("Why do logistic regression and the linear SVM fail?", f"Test PR-AUC is {f3(lr['test']['pr_auc'])} and {f3(sv['test']['pr_auc'])}. Fraud depends on combinations of amount, hour, and customer history, which a straight-line boundary cannot express. The SVM's cross-validation is also unstable ({f2(sv['cv']['mean_pr_auc'])} +/- {f2(sv['cv']['std_pr_auc'])}). They remain useful baselines."),
 ("Why is Naive Bayes weak but stable?", f"Its cross-validated PR-AUC is {f2(nb['cv']['mean_pr_auc'])} +/- {f2(nb['cv']['std_pr_auc'])}, the smallest spread of any model, because it has almost nothing to tune. But it assumes features are independent, which they are not (amount and amount-versus-average, for example), so it is capped at a low score ({f2(nb['test']['pr_auc'])} on test)."),
 ("Why didn't distance from home help?", f"In this generated data, fraud is no farther from home than normal purchases (medians {R['eda']['median_dist_fraud']:.1f} vs {R['eda']['median_dist_normal']:.1f} miles; single-feature ROC-AUC {f2(R['eda']['single_feature_roc_auc']['dist_home_mi'])}). It is a finding about the simulator, not about real fraud."),
 ("How do you avoid leakage?", "History features use only a customer's earlier transactions, folds are time-ordered, and December was evaluated once."),
 ("Why does the test fraud rate differ?", f"Fraud is {p1(sp['dev']['fraud_rate'])} of transactions in January to November but {p1(sp['test']['fraud_rate'])} in December. The generator does not spread fraud evenly across months. We list it as a limitation."),
 ("How much fraud is in the data?", f"{n(D['fraud_rows'])} of {n(D['rows'])} transactions, {p1(D['fraud_rate'])}, across {D['customers']} customers. Always guessing 'not fraud' would be {p1(D['dummy_accuracy'])} accurate."),
 ("Some transaction numbers repeat. Is the data duplicated?", "No. No full row is repeated. The generator's seed makes some transaction ID strings repeat across different customers, and we never use that column as a feature."),
 ("Is any of this real data?", "No. It is simulated with the public Sparkov generator. No private or personal data is used."),
 ("Is this deep learning?", "No. All eight models are classical machine learning."),
 ("Who did what?", "Josh: logistic regression, decision tree, random forest, extra trees, plus the feature pipeline and ablation. Logan: XGBoost, LightGBM, calibrated linear SVM, Naive Bayes, plus tuning and thresholds for them. Together: demo, decks, report, GitHub."),
]
FINAL_EXTRA = [
 ("What drives the predictions?", f"For the random forest, shuffling amount hurts most, then the night flag, hour of day, and amount compared with the customer's average. Distance from home is not a leading feature."),
 ("Do the features help?", f"Yes, the history ones. Random forest PR-AUC is {f2(AB['A']['pr_auc'])} with base, time, and category only, {f2(AB['C']['pr_auc'])} when history features are added, and {f2(AB['B']['pr_auc'])} when distance is added to the base set instead."),
 ("What would you do with more time?", "Try real data with permission, cost-based thresholds, wider tuning grids, and generator settings where travel matters."),
]
INTER_EXTRA = [("What is left?", "Deeper tuning, the full ablation write-up, the scoring demo, the final deck (Nov 22), the report (Dec 6), and the GitHub repo.")]

# ---- proposal: keep the earlier Q&A and glossary, updated for eight models, SVD, F1 + PR-AUC and time-aware CV
sl = slides(OUT / "Fraud_Detection_Proposal.pptx"); txt = part1("Proposal", sl)
old = Path(sys.argv[3]).read_text(encoding="utf-8") if len(sys.argv) > 3 else ""
if old:
    q = old[old.index("PART 2:") - 51:]
    for a, b in [("We're using logistic regression, a decision tree, a random\n   forest, and gradient boosting, which are classical machine learning\n   methods.", "We're using eight classical machine learning models: logistic\n   regression, a decision tree, a random forest, extra trees, XGBoost,\n   LightGBM, a linear SVM, and Naive Bayes."),
                 ("Why these four models?", "Why eight models?"), ("Why not KNN or SVM?", "Why not KNN?"),
                 ("They get slow on a dataset with millions of rows, and tree-based\n   models usually do better on tabular data like this.", "It gets slow at prediction time on a dataset with hundreds of thousands\n   of rows. We do include a linear SVM, calibrated to give probabilities."),
                 ("1.2% of transactions (9,500 of\n   822,484)", f"{p1(D['fraud_rate'])} of transactions ({n(D['fraud_rows'])} of\n   {n(D['rows'])})"), ("1.2%", p1(D["fraud_rate"])), ("98.8%", p1(D["dummy_accuracy"])),
                 ("so it's our main comparison number, and we'll report both\n   separately too.", "so we report it, and we also report PR-AUC, which needs no threshold."),
                 ("a time-based split, a four-model\n   comparison, and a scoring demo.", "time-aware cross-validation, an eight-model\n   comparison with F1 and PR-AUC, dimensionality reduction with SVD and\n   t-SNE, and a scoring demo."),
                 ("all four models tuned", "all eight models tuned"), ("comparing four\n   models", "comparing eight\n   models"),
                 ("We expect the random forest and gradient boosting to beat the logistic\n   regression baseline on recall and F1,", "We expect the tree ensembles and boosted models to beat the logistic\n   regression baseline on F1 and PR-AUC,"),
                 ("On a validation set held out from the training data, adjusting things\n   like tree depth and the number of trees for the tree-based models. The\n   test set is only used for the final results.", "With time-aware cross-validation on the earlier months: five folds, each\n   training on earlier data and validating on the next chunk. The last\n   month is held out and only used for the final results."),
                 ("A real fraud system trains on the past and predicts the future. A\n   random split would mix future transactions into training and make\n   results look better than they should.", "A real fraud system trains on the past and predicts the future. A\n   random split would mix future transactions into training and make\n   results look better than they should. Inside the training period, we\n   use time-aware cross-validation for the same reason."),
                 ("Try SMOTE, run a wider hyperparameter search, and report PR-AUC to\n   summarize performance across all possible cutoffs.", "Try SMOTE, run a wider hyperparameter search, and try cost-based\n   thresholds."),
                 ("Optional extra metric for us.", "We report it alongside F1."),
                 ("(Optional extra metric for us.)", "(We report it alongside F1.)")]:
        q = q.replace(a, b)
    q = re.sub(r"\n==+\nBEFORE YOU PRESENT.*?(?=\n==+\nPART 3)", "\n", q, flags=re.S)
    q = q.replace("PART 3: DEFINITIONS (QUICK GLOSSARY)", "PART 3: DEFINITIONS (QUICK GLOSSARY)")
    q = q.rstrip() + "\n\nNEW SINCE THE FIRST DRAFT\n" + "\n".join(textwrap.fill(f"{k}: {v}", 72, subsequent_indent="  ") for k, v in DEFS) + "\n"
    txt += "\n" + q
(DEST / "Proposal Presentation Notes.txt").write_text(txt, encoding="utf-8")
for nm, fn, extra in [("Intermediate", "Fraud_Detection_Intermediate.pptx", INTER_EXTRA), ("Final", "Fraud_Detection_Final.pptx", FINAL_EXTRA)]:
    (DEST / f"{nm} Presentation Notes.txt").write_text(part1(nm, slides(OUT / fn)) + qa(COMMON + extra) + "\n" + defs(DEFS), encoding="utf-8")
print("notes written")
