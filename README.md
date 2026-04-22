# Fraud Detection Pipeline

A production-ready fraud detection platform with hybrid ML scoring (XGBoost + Isolation Forest), a Django/Celery backend, and a React (Vite) frontend dashboard.

## Architecture

```
┌──────────────┐     ┌──────────────────────────────────────┐     ┌──────────────┐
│   Frontend   │────▶│           Django Backend             │────▶│  PostgreSQL  │
│  React/Vite  │     │  DRF API + Celery Workers + Redis    │     │   Database   │
│  :5173       │     │  :8000                               │     │   :5432      │
└──────────────┘     └──────────┬───────────────────────────┘     └──────────────┘
                               │
                     ┌─────────▼──────────┐
                     │   ML Models (pkl)  │
                     │  XGBoost + IsoForest│
                     │   /ML/models/      │
                     └────────────────────┘
```

## Components

| Component | Path | Tech Stack |
|-----------|------|------------|
| **ML Pipeline** | `/ML` | Python, XGBoost, Isolation Forest, scikit-learn |
| **Backend API** | `/Backend` | Django, DRF, Celery, Redis, PostgreSQL |
| **Frontend** | `/Frontend` | React, Vite, Chart.js, Recharts |

## Pipeline Stages

1. **Ingestion** — Upload CSV/JSON/Excel → parse rows → dispatch to Celery
2. **Cleaning** — Validate & clean raw rows → insert into `transactions` table
3. **Feature Engineering** — Compute 12 engineered features (shared module)
4. **Risk Scoring** — Hybrid: 80% XGBoost + 20% Isolation Forest → 0.0–1.0
5. **Decision** — Compare risk score against dynamic thresholds → ALLOWED / REVIEW / BLOCKED
6. **Human Review** — Analyst review queue for flagged transactions
7. **Adaptive Engine** — Auto-adjust rule weights & thresholds from feedback

## Complete Start-to-Finish Guide (Local Development)

Follow these steps to get the entire application running locally from scratch.

### Step 1: Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Docker** (Easiest way to run Redis on Windows) or **Redis 7+** installed natively.

### Step 2: Configure Environment Variables

Create a file named `.env` in the **root directory** of the project (e.g., `PBL/.env`) and add the following configuration. Update the `POSTGRES_PASSWORD` and paths as needed for your system:

```ini
# ─── Django ───
DJANGO_SECRET_KEY=django-insecure-prod-ready-key-777
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,*

# ─── PostgreSQL ───
POSTGRES_DB=fraud_pipeline
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_database_password_here
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# ─── Redis ───
REDIS_URL=redis://localhost:6379/0

# ─── ML Models (Use absolute paths for your system) ───
ML_DIR=C:\path\to\your\PBL\ML
ML_MODELS_DIR=C:\path\to\your\PBL\ML\models

# ─── Encryption (AES-256-GCM, 32-byte hex key) ───
ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2

# ─── Pipeline ───
BATCH_SIZE=1000
```

### Step 3: Start Services (Database & Redis)

1. **PostgreSQL**: Ensure your PostgreSQL server is running. Create the database using `psql` or pgAdmin:
   ```sql
   CREATE DATABASE fraud_pipeline;
   ```
2. **Redis**: Start a Redis instance. If you have Docker installed, you can simply run:
   ```bash
   docker run -d -p 6379:6379 --name redis-fraud redis
   ```

### Step 4: ML Models (Initial Setup Only)

If you haven't trained the machine learning models yet, you need to generate them so the backend can load them for scoring.

Open a terminal in the `ML/` directory:
```bash
cd ML
python train_xgb.py
python train_isolation.py
```
*(Ensure `xgb_model.pkl` and `isolation_forest.pkl` are generated in `ML/models/`)*

### Step 5: Backend Setup & Running

Open a terminal in the `Backend/` directory:

```bash
cd Backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Setup the database tables
python manage.py migrate

# 3. Create an admin user to access the dashboard
python manage.py createsuperuser

# 4. Start the Django API server
python manage.py runserver 0.0.0.0:8000
```

### Step 6: Start Celery Workers

The backend relies on Celery to process transactions asynchronously. You must run these in separate terminals.

**Terminal A (Inside `Backend/` directory):**
Start the task worker to process the queues:
```bash
python -m celery -A backend worker -l info -Q cleaning_queue,features_queue,scoring_queue,decisions_queue,adaptive_queue,audit_queue -P solo
```
*(Note: `-P solo` is often required on Windows to prevent execution pool issues).*

**Terminal B (Inside `Backend/` directory):**
Start the Celery Beat scheduler (for recurring tasks like the adaptive engine):
```bash
python -m celery -A backend beat -l info
```

### Step 7: Frontend Setup & Running

Open a new terminal in the `Frontend/` directory:

```bash
cd Frontend

# 1. Install Node dependencies
npm install

# 2. Start the React development server
npm run dev
```

### Success! 🎉
You can now access:
*   **Frontend Dashboard**: `http://localhost:5173`
*   **Backend API**: `http://localhost:8000/api/`
*   **Django Admin Panel**: `http://localhost:8000/admin/`

Log in to the dashboard using the superuser credentials you created in Step 5.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate and get token |
| POST | `/api/auth/logout` | Invalidate token |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/ingestion/upload` | Upload dataset file |
| GET | `/api/ingestion/<id>/status` | Dataset processing status |
| GET | `/api/reviews/queue` | Pending review queue |
| POST | `/api/reviews/<id>/claim` | Claim a review |
| GET | `/api/reviews/<id>/detail` | Full review details |
| POST | `/api/reviews/<id>/submit` | Submit review verdict |
| GET | `/api/transactions/classified` | Risk-classified transactions |
| GET | `/api/settings/thresholds` | Current thresholds |
| GET | `/api/settings/rules` | Fraud rules |
| GET | `/api/settings/audit-logs` | Audit log history |
| GET | `/api/analytics/dashboard` | Aggregated analytics |
| GET | `/api/analytics/hourly-activity` | Per-hour transaction stats |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | dev key | Django secret key |
| `DEBUG` | `True` | Debug mode |
| `POSTGRES_DB` | `fraud_pipeline` | Database name |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_HOST` | `localhost` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `ML_DIR` | Auto-detected | Path to ML directory |
| `ML_MODELS_DIR` | `ML/models/` | Path to model files |
| `BATCH_SIZE` | `1000` | Rows per Celery batch |

## Docker

```bash
docker-compose up --build
```

> **Note:** The legacy `main.py` (FastAPI) is deprecated. All functionality is handled by the Django backend.
