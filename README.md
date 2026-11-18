# DropGuard

DropGuard is a student academic-risk prediction and counseling application. Its fitted Scikit-learn Random Forest pipeline estimates an **academic-risk proxy**: `academic_risk = 1` when `G3 < 10`. This is not actual dropout prediction or an observed dropout outcome. Predictions use the 32 features in `backend/data/metadata.json`; neither `G3` nor `academic_risk` is accepted as a prediction input.

The supplied model, dataset, metadata, and evaluation artifacts are preserved. The application does not train or replace the model.

## Project structure

```text
DropGuard/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Health, prediction, analytics, and model routers
│   │   ├── core/             # Paths and environment configuration
│   │   ├── schemas/          # Strict prediction request/response schema
│   │   └── services/         # Cached model, dataset, and evaluation services
│   ├── data/                 # Supplied CSVs and metadata
│   ├── models/               # Supplied fitted Joblib pipeline
│   ├── tests/
│   ├── .python-version       # Render runtime compatibility pin
│   ├── requirements.txt
│   └── requirements-dev.txt
├── render.yaml               # Render FastAPI web service
├── vercel.json               # Vercel Vite build/output settings
├── frontend/                 # React, TypeScript, Vite, Tailwind, Recharts
├── scripts/dev-backend.mjs   # Python venv/dependency bootstrap and Uvicorn
├── package.json              # npm workspace and combined dev launcher
└── README.md
```

## One-command development setup

Requirements: Node.js 20+ with npm, and Python 3.12 available as `python3.12`. Python 3.12 is used to preserve compatibility with the supplied Scikit-learn **1.6.1** model.

Open the repository root in VS Code, then run:

```bash
npm install
npm run dev
```

This starts Vite at `http://127.0.0.1:5173` and FastAPI at `http://127.0.0.1:8000` in the same terminal. On the first `npm run dev`, the launcher creates `backend/.venv` and installs `backend/requirements-dev.txt`. It hashes the requirements file and skips pip installation on later starts unless the file changes. If Python 3.12 is missing or either server fails, the launcher prints an error and stops the other process. Press Ctrl+C to shut down both services.

For local development, the frontend sends same-origin `/api` requests and Vite proxies them to `VITE_DEV_API_TARGET` (`http://127.0.0.1:8000` by default). Copy `.env.example` to `.env` to configure local settings. `VITE_API_BASE_URL` is left blank locally and is set to the deployed backend origin for production builds. The API docs are at `http://127.0.0.1:8000/docs`.

## Production deployment preparation

The repository is prepared for separate Vercel and Render services. Deployment has not been performed.

### Vercel frontend

Import the repository with the **repository root** as the project root. [`vercel.json`](vercel.json) configures the root npm install, `npm run build`, and `frontend/dist` output. Add this Vercel project environment variable for **Production**, **Preview**, and any other environment where the deployed UI should call the API:

| Variable | Required value |
| --- | --- |
| `VITE_API_BASE_URL` | The Render API origin, for example `https://dropguard-api.onrender.com`, without a trailing slash |

Vite embeds `VITE_API_BASE_URL` at build time, so rebuild/redeploy the frontend after changing it. Do not put credentials or secrets in `VITE_` variables; they are public in browser bundles.

### Render backend

[`render.yaml`](render.yaml) defines a Python web service rooted at `backend/`, installs `requirements.txt`, runs Uvicorn on Render's `$PORT`, and checks `/api/health`. [`backend/.python-version`](backend/.python-version) and the Blueprint pin Python 3.12.11 to match the tested Scikit-learn 1.6.1 environment. The service reads the model and data from the repository's `backend/models/` and `backend/data/` paths; they must remain included in the deployed repository.

Set the following Render environment variables:

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` (set by `render.yaml`) |
| `CORS_ORIGINS` | The exact deployed Vercel origin(s), comma-separated, such as `https://dropguard.vercel.app`; no path, trailing slash, or wildcard |
| `PYTHON_VERSION` | `3.12.11` (set by `render.yaml`) |

`CORS_ORIGINS` is marked `sync: false`, so provide it in the Render Blueprint setup/dashboard. Production startup fails if it is unset or contains `*`. Production API errors are logged server-side and return sanitized error messages. The local `backend/.venv` is ignored and is not part of deployment; Render installs the declared dependencies in its own environment. The model is loaded and the dataset is validated at application startup, and the health endpoint reports model readiness.

### Deployment limitations to address before serving real student records

The API currently has no user authentication, authorization, or request rate limiting. Exact-origin CORS controls browser access but does not make a public API private. Establish access controls, data-handling policy, monitoring, and appropriate hosting/privacy review before using this with identifiable student records. No hosting secrets belong in the repository.

## API endpoints

All endpoints are under `/api`. JSON validation errors use HTTP 422. Model/data service failures use HTTP 503. Dataset statistics and model results are read from the supplied artifacts.

### Health

`GET /api/health` reports API status and model readiness. At startup, the complete fitted pipeline is loaded once and the supplied dataset is validated and cached. Startup fails if either required artifact cannot be loaded.

Example response:

```json
{"status":"ok","model_loaded":true,"model_load_error":null}
```

### Prediction

`POST /api/predict` accepts all 32 input fields as defined in the metadata. Categorical values use the source dataset labels; numeric fields must be JSON integers. Missing fields, unexpected fields (including `G3` and `academic_risk`), out-of-range ratings/grades, and invalid category values return 422 with field-level details.

Example request:

```json
{
  "school":"GP","sex":"F","age":18,"address":"U","famsize":"GT3","Pstatus":"A",
  "Medu":4,"Fedu":4,"Mjob":"at_home","Fjob":"teacher","reason":"course","guardian":"mother",
  "traveltime":2,"studytime":2,"failures":0,"schoolsup":"yes","famsup":"no","paid":"no",
  "activities":"no","nursery":"yes","higher":"yes","internet":"no","romantic":"no",
  "famrel":4,"freetime":3,"goout":4,"Dalc":1,"Walc":1,"health":3,"absences":4,"G1":0,"G2":11
}
```

Example response:

```json
{
  "predicted_class":0,
  "academic_risk_probability":0.1376713174204369,
  "risk_category":"No elevated academic risk indicated",
  "classification_threshold":0.5,
  "classification_rule":"The fitted Scikit-learn classifier's predict() result (highest class probability); class 0 wins an exact tie.",
  "target_definition":"1 if G3 < 10, otherwise 0"
}
```

The threshold is Scikit-learn's default binary `predict()` decision boundary (argmax of class probabilities), not a separately tuned counseling threshold. The class returned by `predict()` determines the risk category.

### Dataset analytics

- `GET /api/analytics/overview` — dataset row count, missing cells, input count, and observed target counts/rates. Example: `{"row_count":649,"input_feature_count":32,"academic_risk_distribution":[{"class":0,"count":549},{"class":1,"count":100}]}` (the response also includes percentages and target notes).
- `GET /api/analytics/distribution` — observed value counts for every input feature plus the academic-risk label. Response excerpt from the supplied data: `{"row_count":649,"categorical":{"school":[{"value":"GP","count":423},{"value":"MS","count":226}],"sex":[{"value":"F","count":383},{"value":"M","count":266}]}`. The response also includes all other feature counts.
- `GET /api/analytics/grades` — count, mean, median, standard deviation, min/max for G1, G2, and G3, plus means by supplied academic-risk label. Response excerpt: `{"grades":{"G1":{"count":649,"mean":11.399075500770415},"G2":{"count":649,"mean":11.570107858243452},"G3":{"count":649,"mean":11.906009244992296}}`.
- `GET /api/analytics/factors` — unadjusted group counts and observed academic-risk rates for each of the 32 input features. Response excerpt: `{"factors":{"school":[{"value":"GP","student_count":423,"academic_risk_count":32,"academic_risk_rate":0.07565011820330969},{"value":"MS","student_count":226,"academic_risk_count":68,"academic_risk_rate":0.3008849557522124}]}}`. These summaries describe associations and do not establish causes.

G3 and the label are used only for descriptive analytics and supplied-label group summaries. Neither is passed to the prediction pipeline.

### Model performance and comparison

- `GET /api/model/metrics` — test metrics from `metadata.json` and the Random Forest training time from `test_model_comparison.csv`, plus Random Forest cross-validation metrics from `cv_model_comparison.csv`. Response excerpt: `{"model_name":"Random Forest","test":{"accuracy":0.9153846153846154,"precision":0.6956521739130435,"recall":0.8,"f1_score":0.7441860465116279,"roc_auc":0.9459090909090909,"training_time_seconds":0.5032076835632324},"classification_threshold":0.5}`. The response also contains all cross-validation metrics and source/limitation notes.
- `GET /api/model/comparison` — test and cross-validation results for all models present in both supplied comparison CSVs, plus metrics recomputed from each held-out prediction/probability pair. The original `test` and `cross_validation` fields are retained. Response excerpt for Random Forest: `{"model":"Random Forest","test":{"accuracy":0.9153846153846154,"precision":0.6956521739130435,"recall":0.8,"f1_score":0.7441860465116279,"roc_auc":0.9459090909090909,"training_time_seconds":0.5032076835632324},"held_out_predictions":{"accuracy":0.9153846153846154,"precision":0.6956521739130435,"recall":0.8,"f1_score":0.7441860465116279,"per_class_metrics":[{"class":0,"precision":0.9626168224299065,"recall":0.9363636363636364,"f1_score":0.9493087557603687,"support":110},{"class":1,"precision":0.6956521739130435,"recall":0.8,"f1_score":0.7441860465116279,"support":20}],"roc_auc":0.9459090909090909,"sample_count":130}}`. The response includes all five models.
- `GET /api/model/confusion-matrix` — calculates each model's matrix from `y_true` and its `*_prediction` column. Label order is `[0,1]`; rows are true labels and columns are predicted labels. Example for Random Forest: `{"model":"Random Forest","labels":[0,1],"matrix":[[103,7],[4,16]],"true_negative":103,"false_positive":7,"false_negative":4,"true_positive":16}`. Both class labels also include precision, recall, F1, and support. Predictions are never derived from probabilities.
- `GET /api/model/roc-data` — returns one ROC curve per model, calculating FPR/TPR from `y_true` and that model's probability column (the probability of class 1). Each model entry includes `auc`, aligned `fpr`, `tpr`, and `thresholds` arrays. For example, Random Forest AUC is `0.9459090909090909`, matching the exported test metric. A `null` first threshold represents scikit-learn's positive-infinity starting threshold; corresponding FPR/TPR values are zero. The route does not use prediction columns to build ROC curves.

The held-out file `backend/data/test_predictions.csv` must contain 130 rows, both `y_true` classes, all five prediction/probability column pairs, no missing/non-finite values, labels limited to 0/1, and probabilities in [0, 1]. It is read once and cached per backend process. Invalid files make the evaluation endpoints return HTTP 503 with the validation error; no predictions are generated or retrained.

### Explainability

`GET /api/model/feature-importance` extracts impurity-based importances from the fitted Random Forest. It returns transformed one-hot feature names and aggregates them back to the 32 original inputs where possible. Example item from the supplied model: `{"feature":"G2","importance":0.26476009319586186}`. The response explicitly cautions that feature importance is not causal explanation.

### Model verification

`GET /api/model/verify` loads the supplied complete pipeline if necessary, validates the 32-feature schema, and predicts on the first supplied CSV row using only those input features. Example response: `{"status":"verified","model_name":"Random Forest","model_type":"Pipeline","input_feature_count":32,"sample_prediction":0,"sample_probabilities":{"0":0.8623286825795636,"1":0.1376713174204369},"target_definition":"1 if G3 < 10, otherwise 0","prediction_stage":"After the second grading period","sample_source":"first supplied dataset row; G3 and academic_risk excluded"}`. The returned values come from the current model inference.

## Tests

The pytest suite exercises every endpoint, checks valid and invalid prediction payloads, compares analytics to the CSV, validates the held-out evaluation data, and checks confusion matrices, per-class metrics, and ROC coordinates/AUC against the exported metrics for all five models. Install the development requirements before running it:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
pip check
```

No training or model replacement occurs in tests or during development startup.
