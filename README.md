# Credit Card Fraud Detection (classical ML)
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport.

Binary classification of simulated credit card transactions (public Sparkov generator, MIT license): 822,484 transactions, 999 customers, 1.16% fraud.
Four models: logistic regression, decision tree, random forest, gradient boosting (XGBoost). **Loss:** every model optimizes cross-entropy (log loss for logistic regression and
XGBoost `binary:logistic`; entropy split criterion for the tree and forest). **Validation:** time-aware, expanding-window 5-fold cross-validation on Jan-Nov 2025; December is the test month.
**Dimensionality reduction:** PCA (variance, loadings, 2D view), t-SNE (balanced sample), and models on PCA inputs.

| Model | Precision | Recall | F1 | PR-AUC (test) | CV PR-AUC (mean ± SD) |
|---|---|---|---|---|---|
| Logistic regression | 0.05 | 0.03 | 0.04 | 0.006 | 0.13 ± 0.13 |
| Decision tree | 0.68 | 0.65 | 0.66 | 0.689 | 0.48 ± 0.30 |
| Random forest | 0.81 | 0.65 | 0.72 | 0.764 | 0.73 ± 0.10 |
| Gradient boosting | 1.00 | 0.17 | 0.30 | 0.660 | 0.56 ± 0.19 |

Findings: customer-history features lift PR-AUC from 0.57 to 0.77; distance from home carries no signal in this generated data (ROC-AUC 0.50);
PCA on the continuous features keeps most of the performance, while PCA on all features removes it.

## Reproduce
macOS: `brew install libomp` (XGBoost needs OpenMP). Then `./scripts_run.sh` regenerates the data and results (seeds fixed; `cv.py` and `train.py` checkpoint and may need a rerun).
Sample data: `data/sample/sample_5k.csv` (identifier columns removed). Data is simulated; no private data is used.

## Web demo (FraudLens)
```
pip install -r requirements.txt
uvicorn app.server:app --port 8000     # then open http://localhost:8000
```
`app/web/index.html` is a single-page, Apple-inspired front end (light/dark, no frameworks). It calls `/api/predict`, `/api/results`, `/api/cities`.
Scores are model outputs on simulated data, not calibrated probabilities. Use the pinned versions in `requirements.txt` (models were saved with scikit-learn 1.8.0).

## Layout
`src/fraud/` pipeline (load, features, common, cv, train, dimred, dimred_continuous) | `app/` backend and front end | `reports/` results.json, cv_results.json, figures, report draft |
`decks/` pptxgenjs scripts that build the three decks from results.json (reference only) | `models/` trained models.
