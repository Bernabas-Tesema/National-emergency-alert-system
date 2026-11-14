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
    "jazzmin",
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

JAZZMIN_SETTINGS = {
    "site_title": "EthioAlert Admin",
    "site_header": "EthioAlert",
    "site_brand": "EthioAlert",
    "welcome_sign": "Sign in to EthioAlert operations admin",
    "copyright": "EthioAlert",
    "search_model": ["alerts_api.StaffAccount", "alerts_api.Case", "alerts_api.Citizen"],
    "topmenu_links": [
        {"name": "Dashboard", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "EthioAlert AI", "url": "/admin/ethio-ai/", "new_window": False},
        {"name": "API health", "url": "/health", "new_window": True},
        {"name": "Web console", "url": FRONTEND_URL, "new_window": True},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": [
        "alerts_api",
        "alerts_api.StaffAccount",
        "alerts_api.Case",
        "alerts_api.Alert",
        "alerts_api.Citizen",
        "alerts_api.AuditLog",
        "auth",
    ],
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "alerts_api.StaffAccount": "fas fa-id-badge",
        "alerts_api.Case": "fas fa-folder-open",
        "alerts_api.Alert": "fas fa-bullhorn",
        "alerts_api.Citizen": "fas fa-mobile-alt",
        "alerts_api.DeliveryLog": "fas fa-paper-plane",
        "alerts_api.AuditLog": "fas fa-history",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    "related_modal_active": True,
    "custom_css": None,
    "custom_js": "admin/js/login_autocomplete.js",
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-primary",
    "accent": "accent-primary",
    "navbar": "navbar-dark navbar-primary",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "default",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success",
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


def _csrf_origins_for_hosts(hosts: list[str]) -> list[str]:
    """Django admin POST needs the API's own https origin in CSRF_TRUSTED_ORIGINS."""
    origins: list[str] = []
    for host in hosts:
        cleaned = host.strip().split(":")[0]
        if not cleaned or cleaned == "*" or cleaned.startswith("."):
            continue
        origins.append(f"https://{cleaned}")
        if DEBUG:
            origins.append(f"http://{cleaned}")
            origins.append(f"http://{cleaned}:8081")
    return origins


CSRF_TRUSTED_ORIGINS = list(
    dict.fromkeys(
        (_env_list("CSRF_TRUSTED_ORIGINS") or list(CORS_ALLOWED_ORIGINS))
        + _csrf_origins_for_hosts(ALLOWED_HOSTS)
    )
)

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
