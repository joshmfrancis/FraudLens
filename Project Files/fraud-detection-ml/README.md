# Credit Card Fraud Detection (classical ML)
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport.

Binary classification of simulated credit card transactions (public Sparkov generator, MIT license): 877,369 transactions, 998 customers, 1.07% fraud.
**Eight models** (Josh: logistic regression, decision tree, random forest, extra trees. Logan: XGBoost, LightGBM, linear SVM with probability calibration, Naive Bayes).
**Loss:** wherever a model has a loss it is cross-entropy (log loss for logistic regression, XGBoost, LightGBM; entropy split criterion for the tree, forest, and extra trees). The linear SVM trains on hinge loss and is calibrated with log loss (Platt scaling); Naive Bayes has no loss (maximum likelihood).
**Validation:** time-aware, expanding-window 5-fold cross-validation on Jan-Nov 2025; the last month is the test set. **Metrics:** both F1 and PR-AUC, in cross-validation and on test.
**Dimensionality reduction:** SVD (scaled, not centered; compared with PCA), t-SNE on a balanced sample, and all eight models trained on SVD inputs.
**Class imbalance:** the data stays imbalanced; class weights (`class_weight="balanced"` or a tuned `scale_pos_weight`), PR-AUC and F1 instead of accuracy, a cutoff tuned in cross-validation, and validation/test data that keep the real fraud rate. No SMOTE.
**Hyperparameter tuning:** grid search on the same time-aware folds (`src/fraud/cv.py`, grids in `src/fraud/common.py`); the winner has the best mean PR-AUC. The boosted models are searched in three rounds, each around the previous winner. The test month is never used for tuning.
**Leakage:** history features use only earlier purchases of the same card (running totals subtract the current row; counts look back only), and the split and folds are in time order (`src/fraud/features.py`).
**Data validity:** `src/fraud/validity.py` checks that the generated data behaves as Sparkov's fraud profiles say (see report section 3.1); the fraud rate is a generator setting, not a real-world measurement.

| Model | Owner | Precision | Recall | Test F1 | Test PR-AUC | CV PR-AUC (mean ± SD) | CV F1 |
|---|---|---|---|---|---|---|---|
| Logistic regression | Josh | 0.03 | 0.03 | 0.03 | 0.006 | 0.13 ± 0.12 | 0.22 |
| Decision tree | Josh | 0.67 | 0.74 | 0.70 | 0.773 | 0.46 ± 0.32 | 0.48 |
| Random forest | Josh | 0.74 | 0.68 | 0.71 | 0.763 | 0.72 ± 0.07 | 0.67 |
| Extra trees | Josh | 0.84 | 0.28 | 0.42 | 0.488 | 0.50 ± 0.10 | 0.39 |
| XGBoost (gradient boosting) | Logan | 0.83 | 0.60 | 0.69 | 0.753 | 0.69 ± 0.10 | 0.63 |
| LightGBM | Logan | 0.84 | 0.64 | 0.73 | 0.809 | 0.64 ± 0.07 | 0.57 |
| Linear SVM (calibrated) | Logan | 0.00 | 0.00 | 0.00 | 0.011 | 0.40 ± 0.29 | 0.06 |
| Naive Bayes | Logan | 0.28 | 0.34 | 0.31 | 0.151 | 0.30 ± 0.04 | 0.47 |

Findings: customer-history features lift random forest PR-AUC from 0.61 to 0.77; distance from home carries no signal in this generated data (ROC-AUC 0.50: fraud and normal purchases are the same distance from home); linear models fail; tuning moved XGBoost's cross-validated PR-AUC from 0.51 to 0.69 and LightGBM's from 0.46 to 0.64, so the boosted models are now close to the forest on the test month (the forest is still best by cross-validation); 22 of 31 SVD components keep 95% of the energy (PCA needs 25); SVD on the continuous features keeps most of the random forest's performance (0.72 vs 0.76) while SVD on all features removes it.
Numbers come from `reports/results.json` and change slightly if you regenerate the data.

## Requirements
Python 3.11 or newer (3.12 recommended). Git is optional. Works on Windows, macOS, and Linux. Use the pinned versions in `requirements.txt` (the saved models were created with the pinned scikit-learn version).

## Run the web demo (trained models are included)

### macOS (Terminal)
```
cd path/to/fraud-detection-ml
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
brew install libomp            # one time; XGBoost and LightGBM need it
uvicorn app.server:app --port 8000
```

### Windows (PowerShell)
```
cd path\to\fraud-detection-ml
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.server:app --port 8000
```
If PowerShell refuses to activate the environment, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and activate again.
In Command Prompt, activate with `.venv\Scripts\activate.bat` instead.

Important: run `uvicorn` only after the virtual environment is activated. If you see `ModuleNotFoundError: No module named 'lightgbm'` or `xgboost`, create/activate the project venv and install the pinned requirements from the project root.

Then open http://localhost:8000 (the local version runs the saved Python models through FastAPI). If the port is busy, use `--port 8001`. Scores are model outputs on simulated data; most models use class weights, so they are not true probabilities. The model switcher offers all eight models.

## Rebuild the data, models, and results
Activate the environment as above, then run one command (it works the same on every OS):

| | Command |
|---|---|
| macOS | `python3 run_all.py` |
| Windows | `py run_all.py` |

It downloads the open-source generator, generates the data (seed 42), builds features, runs cross-validation and grid search, trains and tests all eight models, runs SVD/t-SNE, and writes the data-validity check, the boosting check, and the PR-curve figure.
A full run now takes roughly 1 to 2 hours (data generation plus the wider tuning grids; it depends on your CPU cores). For a quick test use `--customers 200` (numbers will differ); `--skip-generate` reuses data already in `data/raw`; `--use-zip` downloads the generator as a zip instead of using git.

## Troubleshooting
- `python`/`python3` not found: on Windows use `py`; on macOS install Python from python.org or `brew install python`.
- `libxgboost.dylib` or LightGBM could not be loaded (macOS): run `brew install libomp`.
- scikit-learn version warnings: run `pip install -r requirements.txt` inside the virtual environment so the pinned versions are used.
- The Sparkov generator uses Python multiprocessing. It was tested on Linux; if it fails on Windows, run `run_all.py` inside WSL (Windows Subsystem for Linux).

## Layout
`run_all.py` rebuild everything | `src/fraud/` pipeline (load, make_features, features, common, cv, train, svd, dimred, dimred_continuous, validity, boosting_probe, figures) | `app/` local FastAPI backend and front end, plus `export_web_models.py` |
`reports/` results.json, cv_results.json, figures, report draft (make_report.py rebuilds it) | `models/` trained models | `data/sample/` 5,000-row sample.

## Published website
The `website/` folder at the repository root is a static copy of the demo plus the final report and the three presentations. Its demo scores in the browser (the models are exported to plain arrays by `app/export_web_models.py`, which `run_all.py` runs at the end), so any static host works. To view it locally: `cd website && python -m http.server 8080`, then open http://localhost:8080. Netlify publishes it using `netlify.toml` at the repository root.
