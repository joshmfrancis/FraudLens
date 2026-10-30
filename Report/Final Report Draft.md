# Credit Card Fraud Detection with Classical Machine Learning
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport. DRAFT: edit before submitting.

## 1. Introduction
We predict whether a credit card transaction is fraud (binary classification) using classical machine learning (no deep learning). Fraud is rare (1.16% of transactions in our data), so accuracy is misleading: always predicting "not fraud" scores 98.84%. We evaluate with precision, recall, F1, and PR-AUC.

## 2. Related work
sharmasapna's GitHub project (credit-card-fraud-detection) classifies fraud on Sparkov-generated data. We add engineered customer-history features, time-aware cross-validation, dimensionality reduction (PCA and t-SNE), a four-model comparison, an ablation study, and a scoring web app. Data generator: Sparkov Data Generation (namebrandon, MIT license), github.com/namebrandon/Sparkov_Data_Generation.

## 3. Data
Generated with the public Sparkov tool (seed 42, 2025-01-01 to 2025-12-31): 822,484 transactions for 999 customers, 9,500 fraud (1.16%). The output has 26 columns (16 customer, 10 transaction). We dropped identifiers (ssn, names, street, city, zip, job, account and transaction IDs, merchant name, generator profile). The development period is 2025-01-01 to 2025-11-30 (699,111 rows, 1.28% fraud); the test month is 2025-11-30 to 2025-12-31 (123,373 rows, 0.46% fraud).

## 4. Methods
**Features (31 inputs).** Base (amount, age, city size, 14 category columns), time (hour, weekday, weekend, night), distance (haversine miles from home to merchant), and history (time and distance since the previous purchase, implied speed, amount versus the customer's past mean and z-score, purchases in the last hour and day, first-transaction flag). History features use only earlier transactions of the same card.

**Models and loss.** Logistic regression (standardized inputs; minimizes binary cross-entropy, i.e. log loss), decision tree and random forest (entropy split criterion, i.e. information gain from cross-entropy), and gradient boosting (XGBoost, objective binary:logistic, i.e. log loss). All use class weighting.

**Validation.** Time-aware, expanding-window 5-fold cross-validation on the development period, split into six chronological chunks. Fold k trains on chunks 1..k and validates on chunk k+1, so models never train on the future. Hyperparameters were chosen by mean PR-AUC across folds, and each model's decision threshold maximizes F1 on the pooled out-of-fold predictions. Each model was then refit on the whole development period and evaluated once on the test month.

| Chunk | Dates | Rows | Fraud rate |
|---|---|---|---|
| 1 | 2025-01-01 to 2025-03-14 | 116,518 | 1.80% |
| 2 | 2025-03-14 to 2025-05-10 | 116,518 | 1.31% |
| 3 | 2025-05-10 to 2025-06-28 | 116,518 | 0.97% |
| 4 | 2025-06-28 to 2025-08-13 | 116,518 | 0.98% |
| 5 | 2025-08-13 to 2025-10-05 | 116,518 | 1.26% |
| 6 | 2025-10-05 to 2025-11-30 | 116,521 | 1.34% |

## 5. Cross-validation results (PR-AUC by fold)
| Model | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Mean ± SD |
|---|---|---|---|---|---|---|
| Logistic regression | 0.36 | 0.19 | 0.03 | 0.03 | 0.03 | 0.13 ± 0.13 |
| Decision tree | 0.10 | 0.14 | 0.69 | 0.70 | 0.77 | 0.48 ± 0.30 |
| Random forest | 0.75 | 0.55 | 0.77 | 0.78 | 0.83 | 0.73 ± 0.10 |
| Gradient boosting | 0.61 | 0.26 | 0.74 | 0.42 | 0.75 | 0.56 ± 0.19 |

Early folds train on little data, and fold scores vary widely for the tree, gradient boosting, and logistic regression. The random forest is the most stable.

## 6. Test results (December)
| Model | Precision | Recall | F1 | PR-AUC | CV PR-AUC | Threshold |
|---|---|---|---|---|---|---|
| Logistic regression | 0.05 | 0.03 | 0.04 | 0.006 | 0.13 ± 0.13 | 1.00 |
| Decision tree | 0.68 | 0.65 | 0.66 | 0.689 | 0.48 ± 0.30 | 0.98 |
| Random forest | 0.81 | 0.65 | 0.72 | 0.764 | 0.73 ± 0.10 | 0.88 |
| Gradient boosting | 1.00 | 0.17 | 0.30 | 0.660 | 0.56 ± 0.19 | 0.99 |

Best model by cross-validated PR-AUC: Random forest. At its threshold it caught 373 of 571 fraud cases with 85 false alarms among 122,802 normal transactions. At the default 0.5 threshold its F1 is 0.36. Gradient boosting's F1 (0.30) is low because its cross-validated threshold (0.99) was too strict after refitting; its threshold-free PR-AUC (0.66) is the fairer comparison.

Permutation importance (test-month sample, best model; post-hoc analysis, not used for selection):
1. amt (0.656)
2. is_night (0.300)
3. hour (0.189)
4. amt_ratio (0.106)
5. amt_mean_past (0.045)
6. age (0.042)
7. txn_24h (0.034)
8. cat_grocery_pos (0.021)

## 7. Dimensionality reduction
**PCA** on the 31 standardized inputs (fit on the development period): 25 components keep 95% of the variance, and the first two keep 17%. PC1 loads on recent-activity features (txn_24h, txn_1h, secs_since_prev); PC2 loads on amount features (amt_ratio, amt, amt_z). In the 2D projection fraud overlaps normal activity heavily (reports/figures/pca_2d.png).

**t-SNE** on a balanced sample of 3,000 fraud and 3,000 normal transactions (after PCA to 15 components): fraud forms local clusters; 84% of a fraud point's 10 nearest neighbors are fraud (reports/figures/tsne.png). t-SNE is used for visualization only.

**Models on reduced inputs** (test PR-AUC): PCA on the 13 continuous features only (11 components, 97% of their variance, 29 inputs in total) versus PCA on all 31 features (25 components).

| Model | Original features | PCA on continuous | PCA on all features |
|---|---|---|---|
| Logistic regression | 0.006 | 0.004 | 0.003 |
| Decision tree | 0.689 | 0.641 | 0.004 |
| Random forest | 0.764 | 0.700 | 0.004 |
| Gradient boosting | 0.660 | 0.506 | 0.004 |

PCA on continuous features keeps most of the performance. PCA on all features removes it; we did not isolate why. A plausible explanation is that the fraud signal sits in flags and categories that a full rotation mixes, which we have not tested.

## 8. Ablation
Random forest refit on feature groups, scored on the test month (PR-AUC):

| Feature set | Inputs | PR-AUC |
|---|---|---|
| A: base + time + category | 21 | 0.574 |
| B: A + distance | 22 | 0.524 |
| C: A + history | 30 | 0.766 |
| D: all features | 31 | 0.764 |
| E: all minus distance and speed | 28 | 0.765 |

History features raise PR-AUC from 0.57 to 0.77. Distance does not help (0.52); its single-feature ROC-AUC is 0.50, and median distance is 49.0 miles for fraud versus 48.9 for normal transactions. TODO: add a shuffled-label check.

## 9. Demo application
A FastAPI backend serves the four saved models; a single-page front end (app/web/index.html) scores hand-built scenarios, shows each model's score, and explains what moved the score.

## 10. Limitations and ethics
Simulated data may not transfer to real spending. Distance carries no signal in this generator. The fraud rate drifts across months (1.3% in January to November versus 0.5% in December). Tuning grids are small, fold scores are unstable for several models, and thresholds do not always transfer to refit models. Gender is excluded from the features to avoid demographic scoring. No private or personal data was used.

## 11. Conclusion and future work
The random forest was best (test F1 0.72, PR-AUC 0.76); customer-history features mattered most. Future work: real data with permission, cost-based thresholds, SMOTE, and generator settings where travel matters.

## 12. References
Sparkov Data Generation (namebrandon, GitHub). sharmasapna, credit-card-fraud-detection (GitHub). scikit-learn and XGBoost documentation. TODO: add course references.
