"""
Django settings for fraud detection pipeline.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (one level above Backend/)
load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,backend,*').split(',')

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # Project apps
    'pipeline',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ---------------------------------------------------------------------------
# Database — PostgreSQL
# ---------------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'fraud_pipeline'),
        'USER': os.getenv('POSTGRES_USER', 'postgres'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'postgres'),
        'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
        'PORT': os.getenv('POSTGRES_PORT', '5432'),
    }
}

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# ---------------------------------------------------------------------------
# CORS — allow React dev server
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
]
CORS_ALLOW_ALL_ORIGINS = DEBUG

# ---------------------------------------------------------------------------
# Celery + Redis
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True

# Named queues
CELERY_TASK_ROUTES = {
    'pipeline.tasks.cleaning.process_cleaning_batch': {'queue': 'cleaning_queue'},
    'pipeline.tasks.features.process_feature_engineering_batch': {'queue': 'features_queue'},
    'pipeline.tasks.scoring.process_risk_scoring_batch': {'queue': 'scoring_queue'},
    'pipeline.tasks.decisions.process_decisions_batch': {'queue': 'decisions_queue'},
    'pipeline.tasks.adaptive.run_adaptive_engine': {'queue': 'adaptive_queue'},
    'pipeline.tasks.audit.verify_audit_chain': {'queue': 'audit_queue'},
}

# Beat schedule
CELERY_BEAT_SCHEDULE = {
    'run-adaptive-engine-daily': {
        'task': 'pipeline.tasks.adaptive.run_adaptive_engine',
        'schedule': 86400.0,  # every 24 hours
    },
    'verify-audit-chain-6h': {
        'task': 'pipeline.tasks.audit.verify_audit_chain',
        'schedule': 21600.0,  # every 6 hours
    },
}

# ---------------------------------------------------------------------------
# ML Configuration (read-only — models are NOT retrained)
# ---------------------------------------------------------------------------
ML_DIR = os.getenv('ML_DIR', str(BASE_DIR.parent / 'ML'))
ML_MODELS_DIR = os.getenv('ML_MODELS_DIR', str(Path(ML_DIR) / 'models'))

# ---------------------------------------------------------------------------
# Encryption key for reviewer notes (AES-256-GCM)
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# For AES-256-GCM we use a 32-byte key (hex-encoded = 64 chars)
# ---------------------------------------------------------------------------
ENCRYPTION_KEY = os.getenv(
    'ENCRYPTION_KEY',
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2'
)

# ---------------------------------------------------------------------------
# Pipeline configuration
# ---------------------------------------------------------------------------
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '1000'))
SIMULATION_BASE_DATE = '2024-01-01T00:00:00+00:00'  # For step→UTC conversion

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Password validation (default)
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
