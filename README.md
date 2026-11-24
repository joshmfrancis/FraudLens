# Credit Card Fraud Detection

Joshua Francis and Logan Digilormo. Graduate Machine Learning, LSU Shreveport.

Eight classical machine learning models (logistic regression, decision tree, random forest, extra trees, XGBoost, LightGBM,
calibrated linear SVM, Naive Bayes) for detecting fraud in simulated credit card transactions, with time-aware cross-validation,
F1 and PR-AUC reporting, SVD and t-SNE dimensionality reduction, and an Apple-inspired web demo (published as a static site on Netlify).

## Repository layout
- `Presentations/` proposal, intermediate, and final decks, each in its own folder with speaker notes
- `website/` the published site: demo (models run in the browser), final report, and the three presentations as tabs
- `netlify.toml` tells Netlify to publish `website/`
- `Project Files/fraud-detection-ml/` all code, trained models, the local demo, and the report (`reports/final_report_draft.md`)

## Quick start
Open a terminal in the code folder (quotes are needed because of the space in the name):

    cd "Project Files/fraud-detection-ml"

Then follow the setup and run instructions for Mac and Windows in
[Project Files/fraud-detection-ml/README.md](Project%20Files/fraud-detection-ml/README.md).
