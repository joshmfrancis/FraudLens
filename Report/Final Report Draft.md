# Credit Card Fraud Detection with Classical Machine Learning
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport. DRAFT: edit before submitting.

## 1. Introduction
We predict whether a credit card transaction is fraud (binary classification) using classical machine learning (no deep learning). Fraud is rare (1.07% of transactions in our data), so accuracy is misleading: always predicting "not fraud" scores 98.93%. We evaluate every model with both F1 (at a validation-chosen threshold) and PR-AUC (threshold-free).

## 2. Related work
sharmasapna's GitHub project (credit-card-fraud-detection) classifies fraud on Sparkov-generated data. We add engineered customer-history features, time-aware cross-validation, dimensionality reduction (SVD and t-SNE), an eight-model comparison, an ablation study, and a scoring web app. Data generator: Sparkov Data Generation (namebrandon, MIT license), github.com/namebrandon/Sparkov_Data_Generation.

## 3. Data
Generated with the public Sparkov tool (seed 42, 2025-01-01 to 2025-12-31): 877,369 transactions for 998 customers, 9,377 fraud (1.07%). The output has 26 columns (16 customer, 10 transaction). We dropped identifiers (ssn, names, street, city, zip, job, account and transaction IDs, merchant name, generator profile). No full row is repeated; the generator's seed repeats some transaction ID strings across different customers, and we do not use that column. The development period is 2025-01-01 to 2025-11-30 (745,763 rows, 1.17% fraud); the test month is 2025-11-30 to 2025-12-31 (131,606 rows, 0.50% fraud). The test set is the last 15% of rows in time order.

## 4. Methods
**Features (31 inputs).** Base (amount, age, city size, 14 category columns), time (hour, weekday, weekend, night), distance (haversine miles from home to merchant), and history (time and distance since the previous purchase, implied speed, amount versus the customer's past mean and z-score, purchases in the last hour and day, first-transaction flag). History features use only earlier transactions of the same card.

**Models and loss.** Eight classical models. Josh: logistic regression, decision tree, random forest, extra trees. Logan: XGBoost (gradient boosting), LightGBM, linear SVM (probability-calibrated), Gaussian Naive Bayes. Wherever a model has a loss function, it is cross-entropy; the linear SVM trains on hinge loss and is then calibrated by minimizing log loss (Platt scaling), and Naive Bayes has no loss (maximum likelihood). All use class weighting except Naive Bayes.

| Model | Loss or objective |
|---|---|
| Logistic regression | binary cross-entropy (log loss) |
| Decision tree | entropy split criterion (cross-entropy) |
| Random forest | entropy split criterion (cross-entropy) |
| Extra trees | entropy split criterion (cross-entropy) |
| XGBoost (gradient boosting) | binary cross-entropy (binary:logistic) |
| LightGBM | binary cross-entropy (objective=binary) |
| Linear SVM (calibrated) | hinge loss, then log-loss (Platt) probability calibration |
| Naive Bayes | maximum likelihood (no loss function) |

**Validation.** Time-aware, expanding-window 5-fold cross-validation on the development period, split into six chronological chunks. Fold k trains on chunks 1..k and validates on chunk k+1, so models never train on the future. Hyperparameters were chosen by mean PR-AUC across folds, and each model's decision threshold maximizes F1 on the pooled out-of-fold predictions. Each model was then refit on the whole development period and evaluated once on the test month. We report F1 and PR-AUC for every fold and for the test month.

| Chunk | Dates | Rows | Fraud rate |
|---|---|---|---|
| 1 | 2025-01-01 to 2025-03-14 | 124,293 | 1.49% |
| 2 | 2025-03-14 to 2025-05-10 | 124,293 | 1.17% |
| 3 | 2025-05-10 to 2025-06-28 | 124,293 | 1.02% |
| 4 | 2025-06-28 to 2025-08-13 | 124,293 | 0.99% |
| 5 | 2025-08-13 to 2025-10-04 | 124,293 | 1.13% |
| 6 | 2025-10-04 to 2025-11-30 | 124,298 | 1.22% |

## 5. Cross-validation results
PR-AUC by fold:

| Model | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Mean ± SD |
|---|---|---|---|---|---|---|
| Logistic regression | 0.32 | 0.21 | 0.03 | 0.02 | 0.04 | 0.13 ± 0.12 |
| Decision tree | 0.09 | 0.06 | 0.67 | 0.68 | 0.79 | 0.46 ± 0.32 |
| Random forest | 0.73 | 0.57 | 0.72 | 0.74 | 0.81 | 0.71 ± 0.08 |
| Extra trees | 0.54 | 0.25 | 0.48 | 0.51 | 0.57 | 0.47 ± 0.11 |
| XGBoost (gradient boosting) | 0.48 | 0.24 | 0.75 | 0.45 | 0.65 | 0.51 ± 0.18 |
| LightGBM | 0.53 | 0.03 | 0.72 | 0.47 | 0.54 | 0.46 ± 0.23 |
| Linear SVM (calibrated) | 0.17 | 0.26 | 0.10 | 0.59 | 0.87 | 0.40 ± 0.29 |
| Naive Bayes | 0.36 | 0.26 | 0.25 | 0.30 | 0.32 | 0.30 ± 0.04 |

F1 by fold (at each model's pooled out-of-fold threshold):

| Model | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Mean ± SD |
|---|---|---|---|---|---|---|
| Logistic regression | 0.49 | 0.39 | 0.07 | 0.06 | 0.05 | 0.21 ± 0.19 |
| Decision tree | 0.18 | 0.14 | 0.68 | 0.67 | 0.72 | 0.48 ± 0.26 |
| Random forest | 0.69 | 0.56 | 0.66 | 0.67 | 0.72 | 0.66 ± 0.06 |
| Extra trees | 0.49 | 0.23 | 0.32 | 0.30 | 0.33 | 0.34 ± 0.08 |
| XGBoost (gradient boosting) | 0.46 | 0.24 | 0.34 | 0.33 | 0.33 | 0.34 ± 0.07 |
| LightGBM | 0.59 | 0.06 | 0.12 | 0.32 | 0.14 | 0.25 ± 0.19 |
| Linear SVM (calibrated) | 0.24 | 0.00 | 0.06 | 0.00 | 0.00 | 0.06 ± 0.09 |
| Naive Bayes | 0.52 | 0.44 | 0.45 | 0.46 | 0.45 | 0.47 ± 0.03 |

Early folds train on little data, and fold scores vary widely for several models. Among the strong models the random forest is the most stable.

## 6. Test results (2025-11-30 to 2025-12-31)
| Model | Owner | Precision | Recall | F1 | PR-AUC | CV PR-AUC | CV F1 | Threshold |
|---|---|---|---|---|---|---|---|---|
| Logistic regression | Josh | 0.02 | 0.01 | 0.02 | 0.005 | 0.13 ± 0.12 | 0.21 | 1.00 |
| Decision tree | Josh | 0.67 | 0.74 | 0.70 | 0.773 | 0.46 ± 0.32 | 0.48 | 0.97 |
| Random forest | Josh | 0.81 | 0.65 | 0.72 | 0.767 | 0.71 ± 0.08 | 0.66 | 0.87 |
| Extra trees | Josh | 0.80 | 0.23 | 0.36 | 0.474 | 0.47 ± 0.11 | 0.34 | 0.97 |
| XGBoost (gradient boosting) | Logan | 0.93 | 0.18 | 0.30 | 0.630 | 0.51 ± 0.18 | 0.34 | 0.99 |
| LightGBM | Logan | 0.99 | 0.11 | 0.19 | 0.735 | 0.46 ± 0.23 | 0.25 | 1.00 |
| Linear SVM (calibrated) | Logan | 0.00 | 0.00 | 0.00 | 0.009 | 0.40 ± 0.29 | 0.06 | 0.68 |
| Naive Bayes | Logan | 0.28 | 0.34 | 0.31 | 0.151 | 0.30 ± 0.04 | 0.47 | 1.00 |

Best model by cross-validated PR-AUC: Random forest. At its threshold it caught 426 of 652 fraud cases with 100 false alarms among 130,954 normal transactions. At the default 0.5 threshold its F1 is 0.39. Boosted models and extra trees have low F1 despite decent PR-AUC because their cross-validated thresholds (0.97 to 1.00) were too strict after the final refit, so threshold-free PR-AUC is the fairer comparison. The two linear models fail (PR-AUC 0.005 and 0.009).

Permutation importance (test-month sample, best model; post-hoc analysis, not used for selection):
1. amt (0.700)
2. is_night (0.349)
3. hour (0.163)
4. amt_ratio (0.111)
5. amt_mean_past (0.053)
6. txn_24h (0.052)
7. amt_z (0.039)
8. age (0.038)

## 7. Dimensionality reduction
**SVD.** We scale each of the 31 inputs by its standard deviation but do not center it, then take the singular value decomposition (computed exactly from the Gram matrix). This is PCA without the centering step, so the first direction mostly captures overall level. 22 components keep 95% of the energy (PCA after centering needs 25), and the first two keep 60%. Component 1 loads on amt_mean_past (0.465), dist_home_mi (0.431), age (0.399), dist_from_prev_mi (0.339); component 2 on amt_ratio (0.441), amt (0.435), amt_z (0.408), txn_24h (-0.284). In the 2D projection fraud overlaps normal activity heavily (reports/figures/svd_2d.png).

**t-SNE** on a balanced sample of 3,000 fraud and 3,000 normal transactions (after SVD to 15 components): fraud forms local clusters; 85% of a fraud point's 10 nearest neighbors are fraud (reports/figures/tsne.png). t-SNE is used for visualization only.

**Models on reduced inputs** (test PR-AUC): SVD on the 13 continuous features only (8 components, 95% of their energy, 26 inputs in total with flags and categories kept) versus SVD on all 31 features (22 components).

| Model | Original features | SVD on continuous | SVD on all features |
|---|---|---|---|
| Logistic regression | 0.005 | 0.004 | 0.004 |
| Decision tree | 0.773 | 0.600 | 0.038 |
| Random forest | 0.767 | 0.685 | 0.006 |
| Extra trees | 0.474 | 0.172 | 0.004 |
| XGBoost (gradient boosting) | 0.630 | 0.425 | 0.005 |
| LightGBM | 0.735 | 0.683 | 0.005 |
| Linear SVM (calibrated) | 0.009 | 0.010 | 0.004 |
| Naive Bayes | 0.151 | 0.004 | 0.003 |

SVD on continuous features keeps most of the performance for the random forest and LightGBM and hurts extra trees and XGBoost. SVD on all features removes it for every model; we did not isolate why. A plausible explanation is that the fraud signal sits in flags and categories that a full rotation mixes, which we have not tested.

## 8. Ablation
Best model (Random forest) refit on feature groups, scored on the test month (PR-AUC):

| Feature set | Inputs | PR-AUC |
|---|---|---|
| A: base + time + category | 21 | 0.550 |
| B: A + distance | 22 | 0.520 |
| C: A + history | 30 | 0.773 |
| D: all features | 31 | 0.767 |
| E: all minus distance and speed | 28 | 0.783 |

History features raise PR-AUC from 0.55 to 0.77. Distance does not help (0.52); its single-feature ROC-AUC is 0.50, and median distance is 49.1 miles for fraud versus 48.9 for normal transactions. TODO: add a shuffled-label check.

## 9. Demo application
A FastAPI backend serves the eight saved models; a single-page front end (app/web/index.html) scores hand-built scenarios, shows each model's score, explains what moved the score, and shows test and cross-validated PR-AUC and F1 for all models.

## 10. Limitations and ethics
Simulated data may not transfer to real spending. Distance carries no signal in this generator. The fraud rate drifts across months (1.2% in January to November versus 0.5% in the test month). Tuning grids are small, fold scores are unstable for several models, and thresholds do not always transfer to refit models. Scores from class-weighted models are not calibrated probabilities. Gender is excluded from the features to avoid demographic scoring. No private or personal data was used.

## 11. Conclusion and future work
The random forest was best by cross-validation (test F1 0.72, PR-AUC 0.77); customer-history features mattered most, and linear models failed. Future work: real data with permission, cost-based thresholds, SMOTE, wider tuning grids, and generator settings where travel matters.

## 12. References
Sparkov Data Generation (namebrandon, GitHub). sharmasapna, credit-card-fraud-detection (GitHub). scikit-learn, XGBoost, and LightGBM documentation. TODO: add course references.
