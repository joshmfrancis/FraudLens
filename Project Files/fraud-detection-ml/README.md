# Credit Card Fraud Detection (classical ML)
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport.

Binary classification of simulated credit card transactions (public Sparkov generator, MIT license): 877,369 transactions, 998 customers, 1.07% fraud.
**Eight models** (Josh: logistic regression, decision tree, random forest, extra trees. Logan: XGBoost, LightGBM, linear SVM with probability calibration, Naive Bayes).
**Loss:** wherever a model has a loss it is cross-entropy (log loss for logistic regression, XGBoost, LightGBM; entropy split criterion for the tree, forest, and extra trees). The linear SVM trains on hinge loss and is calibrated with log loss (Platt scaling); Naive Bayes has no loss (maximum likelihood).
**Validation:** time-aware, expanding-window 5-fold cross-validation on Jan-Nov 2025; the last month is the test set. **Metrics:** both F1 and PR-AUC, in cross-validation and on test.
**Dimensionality reduction:** SVD (scaled, not centered; compared with PCA), t-SNE on a balanced sample, and all eight models trained on SVD inputs.

| Model | Owner | Precision | Recall | Test F1 | Test PR-AUC | CV PR-AUC (mean ± SD) | CV F1 |
|---|---|---|---|---|---|---|---|
| Logistic regression | Josh | 0.02 | 0.01 | 0.02 | 0.005 | 0.13 ± 0.12 | 0.21 |
| Decision tree | Josh | 0.67 | 0.74 | 0.70 | 0.773 | 0.46 ± 0.32 | 0.48 |
| Random forest | Josh | 0.81 | 0.65 | 0.72 | 0.767 | 0.71 ± 0.08 | 0.66 |
| Extra trees | Josh | 0.80 | 0.23 | 0.36 | 0.474 | 0.47 ± 0.11 | 0.34 |
| XGBoost (gradient boosting) | Logan | 0.93 | 0.18 | 0.30 | 0.630 | 0.51 ± 0.18 | 0.34 |
| LightGBM | Logan | 0.99 | 0.11 | 0.19 | 0.735 | 0.46 ± 0.23 | 0.25 |
| Linear SVM (calibrated) | Logan | 0.00 | 0.00 | 0.00 | 0.009 | 0.40 ± 0.29 | 0.06 |
| Naive Bayes | Logan | 0.28 | 0.34 | 0.31 | 0.151 | 0.30 ± 0.04 | 0.47 |

Findings: customer-history features lift random forest PR-AUC from 0.55 to 0.77; distance from home carries no signal in this generated data (ROC-AUC 0.50); linear models fail; 22 of 31 SVD components keep 95% of the energy (PCA needs 25);
SVD on the continuous features keeps most of the random forest's performance (0.68 vs 0.77) while SVD on all features removes it. Numbers come from `reports/results.json` and change slightly if you regenerate the data.

## Requirements
Python 3.11 or newer (3.12 recommended). Git is optional. Works on Windows, macOS, and Linux. Use the pinned versions in `requirements.txt` (the saved models were created with the pinned scikit-learn version).

## Run the web demo (trained models are included)

### macOS (Terminal)
```
cd path/to/fraud-detection-ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
brew install libomp            # one time; XGBoost and LightGBM need it
uvicorn app.server:app --port 8000
```

### Windows (PowerShell)
```
cd path\to\fraud-detection-ml
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.server:app --port 8000
```
If PowerShell refuses to activate the environment, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and activate again.
In Command Prompt, activate with `.venv\Scripts\activate.bat` instead.

Then open http://localhost:8000. If the port is busy, use `--port 8001`. Scores are model outputs on simulated data; most models use class weights, so they are not true probabilities. The model switcher offers all eight models.

## Rebuild the data, models, and results
Activate the environment as above, then run one command (it works the same on every OS):

| | Command |
|---|---|
| macOS | `python3 run_all.py` |
| Windows | `py run_all.py` |

It downloads the open-source generator, generates the data (seed 42), builds features, runs cross-validation, trains and tests all eight models, and runs SVD/t-SNE.
A full run takes roughly 20-40 minutes. For a quick test use `--customers 200` (numbers will differ); `--skip-generate` reuses data already in `data/raw`; `--use-zip` downloads the generator as a zip instead of using git.

## Troubleshooting
- `python`/`python3` not found: on Windows use `py`; on macOS install Python from python.org or `brew install python`.
- `libxgboost.dylib` or LightGBM could not be loaded (macOS): run `brew install libomp`.
- scikit-learn version warnings: run `pip install -r requirements.txt` inside the virtual environment so the pinned versions are used.
- The Sparkov generator uses Python multiprocessing. It was tested on Linux; if it fails on Windows, run `run_all.py` inside WSL (Windows Subsystem for Linux).

## Layout
`run_all.py` rebuild everything | `src/fraud/` pipeline (load, make_features, common, cv, train, svd, dimred, dimred_continuous) | `app/` backend and front end |
`reports/` results.json, cv_results.json, figures, report draft (make_report.py rebuilds it) | `decks/` pptxgenjs scripts and make_notes.py that build the three decks and notes (reference only; needs Node) | `models/` trained models | `data/sample/` 5,000-row sample.
