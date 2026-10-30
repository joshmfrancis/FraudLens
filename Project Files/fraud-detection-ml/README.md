# Credit Card Fraud Detection (classical ML)
Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport.

Binary classification of simulated credit card transactions (public Sparkov generator, MIT license): 822,484 transactions, 999 customers, 1.16% fraud.
Four models: logistic regression, decision tree, random forest, gradient boosting (XGBoost). **Loss:** every model optimizes cross-entropy (log loss for logistic regression and
XGBoost `binary:logistic`; entropy split criterion for the tree and forest). **Validation:** time-aware, expanding-window 5-fold cross-validation on Jan-Nov 2025; December is the test month.
**Dimensionality reduction:** PCA (variance, loadings, 2D view), t-SNE (balanced sample), and models trained on PCA inputs.

| Model | Precision | Recall | F1 | PR-AUC (test) | CV PR-AUC (mean ± SD) |
|---|---|---|---|---|---|
| Logistic regression | 0.05 | 0.03 | 0.04 | 0.006 | 0.13 ± 0.13 |
| Decision tree | 0.68 | 0.65 | 0.66 | 0.689 | 0.48 ± 0.30 |
| Random forest | 0.81 | 0.65 | 0.72 | 0.764 | 0.73 ± 0.10 |
| Gradient boosting | 1.00 | 0.17 | 0.30 | 0.660 | 0.56 ± 0.19 |

Findings: customer-history features lift PR-AUC from 0.57 to 0.77; distance from home carries no signal in this generated data (ROC-AUC 0.50);
PCA on the continuous features keeps most of the performance, while PCA on all features removes it.

## Requirements
Python 3.11 or newer (3.12 recommended). Git is optional. Works on Windows, macOS, and Linux. Use the pinned versions in `requirements.txt` (the saved models were created with scikit-learn 1.8.0).

## Run the web demo (trained models are included)

### macOS (Terminal)
```
cd path/to/fraud-detection-ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
brew install libomp            # one time; XGBoost needs it
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

Then open http://localhost:8000. If the port is busy, use `--port 8001`. Scores are model outputs on simulated data, not calibrated probabilities.

## Rebuild the data, models, and results
Activate the environment as above, then run one command (it works the same on every OS):

| | Command |
|---|---|
| macOS | `python3 run_all.py` |
| Windows | `py run_all.py` |

It downloads the open-source generator, generates the data (seed 42), builds features, runs cross-validation, trains and tests the models, and runs PCA/t-SNE.
A full run takes roughly 20-40 minutes. For a quick test use `--customers 200` (numbers will differ); `--skip-generate` reuses data already in `data/raw`; `--use-zip` downloads the generator as a zip instead of using git.

## Troubleshooting
- `python`/`python3` not found: on Windows use `py`; on macOS install Python from python.org or `brew install python`.
- `libxgboost.dylib could not be loaded` (macOS): run `brew install libomp`.
- scikit-learn version warnings: run `pip install -r requirements.txt` inside the virtual environment so the pinned versions are used.
- The Sparkov generator uses Python multiprocessing. It was tested on Linux; if it fails on Windows, run `run_all.py` inside WSL (Windows Subsystem for Linux).

## Layout
`run_all.py` rebuild everything | `src/fraud/` pipeline (load, make_features, common, cv, train, dimred, dimred_continuous) | `app/` backend and front end |
`reports/` results.json, cv_results.json, figures, report draft | `decks/` pptxgenjs scripts that build the three decks (reference only) | `models/` trained models | `data/sample/` 5,000-row sample.
