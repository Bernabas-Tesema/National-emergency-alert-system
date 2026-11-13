import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


DEBUG = _env_bool("DEV_MODE", default=True)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or os.getenv("JWT_SECRET") or "django-dev-secret-change-me"
ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", "127.0.0.1,localhost")

INSTALLED_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "alerts_api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


def _build_databases() -> dict:
    database_url = os.getenv("DATABASE_URL", "sqlite:///./django_alerts.db").strip()
    if database_url.startswith(("postgres://", "postgresql://")):
        try:
            import dj_database_url
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "PostgreSQL DATABASE_URL requires dj-database-url. pip install -r requirements.txt"
            ) from exc
        return {
            "default": dj_database_url.parse(
                database_url,
                conn_max_age=int(os.getenv("DB_CONN_MAX_AGE", "60")),
                ssl_require=_env_bool("DB_SSL_REQUIRE", default=False),
            )
        }

    sqlite_path = database_url.replace("sqlite:///", "", 1) if database_url.startswith("sqlite:///") else str(
        BASE_DIR / "django_alerts.db"
    )
    name = (BASE_DIR / sqlite_path).resolve() if not os.path.isabs(sqlite_path) else sqlite_path
    return {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": name,
        }
    }


DATABASES = _build_databases()

_redis_url = os.getenv("REDIS_URL", "").strip()
if _redis_url:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_url,
            "KEY_PREFIX": "ethioalert",
        }
    }
elif DEBUG:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "ethioalert-dev",
        }
    }
else:
    # Multi-worker safe without Redis (run: python manage.py createcachetable).
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.db.DatabaseCache",
            "LOCATION": "ethio_cache_table",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("TIME_ZONE", "Africa/Addis_Ababa")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        ),
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

PLATFORM_NAME = os.getenv("PLATFORM_NAME", "EthioAlert")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

LOGIN_URL = "/admin/login/"
LOGIN_REDIRECT_URL = "/admin/"
LOGOUT_REDIRECT_URL = "/admin/login/"

UNFOLD = {
    "SITE_TITLE": "EthioAlert Admin",
    "SITE_HEADER": "EthioAlert",
    "SITE_SUBHEADER": "Operations admin",
    "SITE_SYMBOL": "shield",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "THEME": "light",
    "COLORS": {
        "primary": {
            "50": "eff6ff",
            "100": "dbeafe",
            "200": "bfdbfe",
            "300": "93c5fd",
            "400": "60a5fa",
            "500": "3b82f6",
            "600": "2563eb",
            "700": "1d4ed8",
            "800": "1e40af",
            "900": "1e3a8a",
            "950": "172554",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": "Operations",
                "separator": True,
                "items": [
                    {"title": "Dashboard", "icon": "dashboard", "link": "/admin/"},
                    {"title": "EthioAlert AI", "icon": "auto_awesome", "link": "/admin/ethio-ai/"},
                    {"title": "Staff accounts", "icon": "badge", "link": "/admin/alerts_api/staffaccount/"},
                    {"title": "Cases", "icon": "folder_open", "link": "/admin/alerts_api/case/"},
                    {"title": "Alerts", "icon": "campaign", "link": "/admin/alerts_api/alert/"},
                    {"title": "Citizens", "icon": "phone_android", "link": "/admin/alerts_api/citizen/"},
                    {"title": "Audit log", "icon": "history", "link": "/admin/alerts_api/auditlog/"},
                ],
            },
            {
                "title": "Links",
                "separator": True,
                "items": [
                    {"title": "API health", "icon": "monitor_heart", "link": "/health"},
                    {"title": "Web console", "icon": "open_in_new", "link": FRONTEND_URL},
                ],
            },
        ],
    },
}

CORS_ALLOWED_ORIGINS = _env_list(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
CORS_ALLOWED_ORIGIN_REGEXES = (
    [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
    ]
    if DEBUG
    else []
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = _env_list("CSRF_TRUSTED_ORIGINS") or list(CORS_ALLOWED_ORIGINS)

REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "alerts_api.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "alerts_api.throttling.EthioAnonRateThrottle",
        "alerts_api.throttling.EthioUserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "120/min"),
        "user": os.getenv("THROTTLE_USER", "600/min"),
    },
}

JWT_SECRET = os.getenv("JWT_SECRET", "replace-this-with-a-long-random-secret")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))
OTP_MINUTES = int(os.getenv("OTP_MINUTES", "5"))
STAFF_ADMIN_PASSWORD = os.getenv("STAFF_ADMIN_PASSWORD", "change-me")
STAFF_OFFICER_PASSWORD = os.getenv("STAFF_OFFICER_PASSWORD", "change-me")
DJANGO_ADMIN_PASSWORD = os.getenv("DJANGO_ADMIN_PASSWORD", "change-me")
STAFF_FALLBACK_OTP_EMAIL = os.getenv("STAFF_FALLBACK_OTP_EMAIL", "")

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8088").rstrip("/")
AI_SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "ethioalert-ai-local-dev-key")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@ethioalert.local")
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = _env_bool("EMAIL_USE_TLS", default=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO" if not DEBUG else "DEBUG"),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "alerts_api": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# --- Production hardening ---
if not DEBUG:
    _weak = {
        "",
        "django-dev-secret-change-me",
        "replace-this-with-a-long-random-secret",
        "change-me",
        "ethioalert-ai-local-dev-key",
    }
    missing = []
    if SECRET_KEY in _weak or len(SECRET_KEY) < 40:
        missing.append("DJANGO_SECRET_KEY (long random)")
    if JWT_SECRET in _weak or len(JWT_SECRET) < 32:
        missing.append("JWT_SECRET (long random)")
    if AI_SERVICE_KEY in _weak or len(AI_SERVICE_KEY) < 24:
        missing.append("AI_SERVICE_KEY (shared with AI service)")
    if not ALLOWED_HOSTS or ALLOWED_HOSTS == ["*"]:
        missing.append("ALLOWED_HOSTS (explicit hosts)")
    if not CORS_ALLOWED_ORIGINS:
        missing.append("CORS_ORIGINS")
    if missing:
        raise RuntimeError(
            "Production (DEV_MODE=false) rejected weak/missing settings: " + ", ".join(missing)
        )

    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = _env_bool("SECURE_SSL_REDIRECT", default=True)
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
