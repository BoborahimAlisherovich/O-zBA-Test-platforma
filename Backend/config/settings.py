import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(path=None, *args, **kwargs):
        env_path = Path(path) if path else None
        if not env_path or not env_path.exists():
            return False
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
        return True

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-change-me")
DEBUG = env_bool("DEBUG", False)
if not DEBUG and SECRET_KEY == "django-insecure-change-me":
    raise ImproperlyConfigured("SECRET_KEY must be set in environment when DEBUG is False.")

ALLOWED_HOSTS = [h.strip() for h in os.getenv(
    "ALLOWED_HOSTS",
    "127.0.0.1,localhost",
).split(",") if h.strip()]
LOCAL_DEV_HOSTS = {"127.0.0.1", "localhost", "testserver"}
ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, *LOCAL_DEV_HOSTS]))
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

USE_JAZZMIN = env_bool("USE_JAZZMIN", False)
ENABLE_PUBLIC_REGISTRATION = env_bool("ENABLE_PUBLIC_REGISTRATION", False)
LOGIN_RATE_LIMIT_ATTEMPTS = int(os.getenv("LOGIN_RATE_LIMIT_ATTEMPTS", "5"))
LOGIN_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("LOGIN_RATE_LIMIT_WINDOW_SECONDS", "300"))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "apps.accounts",
    "apps.core",
]

if USE_JAZZMIN:
    INSTALLED_APPS.insert(0, "jazzmin")

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

default_sqlite_path = BASE_DIR / "db.sqlite3"
legacy_sqlite_path = Path(os.getenv("LEGACY_SQLITE_PATH", str(default_sqlite_path)))
database_engine = os.getenv("DATABASE_ENGINE", "").strip().lower()

use_postgres = database_engine == "postgres"
use_mysql = database_engine == "mysql"

if use_postgres:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "artedu_test"),
            "USER": os.getenv("POSTGRES_USER", "postgres"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
            "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("POSTGRES_CONN_MAX_AGE", "60")),
        }
    }
elif use_mysql:
    try:
        import pymysql
        pymysql.install_as_MySQLdb()
    except ImportError:
        pass
        
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("POSTGRES_DB", "artedu_test"), # using same env var names for simplicity
            "USER": os.getenv("POSTGRES_USER", "root"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
            "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.getenv("POSTGRES_PORT", "3306"),
            "OPTIONS": {
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
                "charset": "utf8mb4",
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": default_sqlite_path,
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
MEDIA_URL = '/media/'

MEDIA_ROOT = os.getenv("MEDIA_ROOT", str(BASE_DIR / "media"))
STATIC_ROOT = os.getenv("STATIC_ROOT", str(BASE_DIR / "staticfiles"))


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", False)
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5173").split(",")
    if origin.strip()
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
non_local_hosts = [host for host in ALLOWED_HOSTS if host not in LOCAL_DEV_HOSTS]
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", bool(non_local_hosts) and not DEBUG)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = env_bool("CSRF_COOKIE_HTTPONLY", False)
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)
SECURE_REFERRER_POLICY = os.getenv("SECURE_REFERRER_POLICY", "same-origin")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        }
    },
    "loggers": {
        "apps.accounts": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
