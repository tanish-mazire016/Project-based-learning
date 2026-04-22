"""
╔═══════════════════════════════════════════════════════════════════════╗
║                    ⚠️  DEPRECATED — DO NOT USE  ⚠️                    ║
║                                                                       ║
║  This FastAPI server has been superseded by the Django backend.        ║
║                                                                       ║
║  The Django backend provides:                                         ║
║    - Full REST API (DRF)    → python manage.py runserver              ║
║    - Authentication         → Token-based via /api/auth/login         ║
║    - Celery task pipeline   → celery -A backend worker                ║
║    - ML model inference     → XGBoost + Isolation Forest scoring      ║
║    - All endpoints          → /api/ingestion, /api/reviews, etc.      ║
║                                                                       ║
║  To start the Django backend:                                         ║
║    cd Backend                                                         ║
║    python manage.py runserver 0.0.0.0:8000                            ║
║                                                                       ║
║  This file is kept for historical reference only.                     ║
╚═══════════════════════════════════════════════════════════════════════╝
"""

import warnings
warnings.warn(
    "main.py (FastAPI) is DEPRECATED. Use the Django backend instead: "
    "python manage.py runserver",
    DeprecationWarning,
    stacklevel=1,
)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="DEPRECATED — Use Django Backend",
    description="This FastAPI app is deprecated. Use the Django backend instead.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "message": "⚠️ This FastAPI server is DEPRECATED.",
        "action": "Use the Django backend: python manage.py runserver",
        "django_api": "http://localhost:8000/api/",
    }
