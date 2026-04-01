# Django DRF Backend (ART EDU TEST)

## 1) Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo
python manage.py runserver
```

## 1.1) PostgreSQL ga o'tish

1. `.env.example` ni `.env` ga ko'chiring va PostgreSQL qiymatlarini to'ldiring.
2. PostgreSQL bo'sh bazasini yarating.
3. Migratsiyani ishga tushiring:

```bash
python manage.py migrate
```

4. SQLite dagi eski ma'lumotlarni PostgreSQL ga ko'chiring:

```bash
python manage.py migrate_sqlite_to_postgres --flush
```

Izoh:
- `LEGACY_SQLITE_PATH` orqali eski `db.sqlite3` manzilini ko'rsatishingiz mumkin.
- `--skip-migrate` flagi schema allaqachon tayyor bo'lsa ishlatiladi.
- `--fixture path\to\data.json` bilan oraliq eksport faylini saqlab qolish mumkin.

## 2) Core API

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/token/refresh/`
- `GET /api/auth/me/`
- `GET|POST|PUT|DELETE /api/users/`
- `GET|POST|PUT|DELETE /api/groups/`
- `GET|POST|PUT|DELETE /api/subjects/?is_demo=true|false`
- `GET|POST|PUT|DELETE /api/modules/?is_demo=true|false`
- `GET|POST|PUT|DELETE /api/questions/?is_demo=true|false`
- `GET|DELETE /api/results/`
- `GET|PATCH /api/site-settings-admin/1/`
- `POST /api/imports/users/`
- `POST /api/imports/questions/`
- `GET /api/tests/available/`
- `POST /api/tests/start/`
- `POST /api/tests/submit/`
- `GET /api/snapshot/`

## 3) Note for current frontend

Frontend API bilan ishlashi uchun root loyihada `.env.local`ga qo'shing:

```bash
VITE_API_URL=http://127.0.0.1:8000/api
```

## 4) Production tavsiyasi

- `DEBUG=False` ishlating.
- `SECRET_KEY` ni majburiy kuchli qiymat bilan bering.
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` ni real domainlarga moslang.
- Static va media fayllarni `STATIC_ROOT` va `MEDIA_ROOT` orqali tashqi web server yoki object storage bilan serving qiling.
- WSGI uchun `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4` ishlatish tavsiya etiladi.

## 5) Oddiy load-test

Auth'dan keyingi oqimni 25 parallel foydalanuvchi bilan urib ko'rish:

```bash
python manage.py simulate_platform_load --users 25 --workers 10 --progress --skip-login
```

Agar test userlarda bitta umumiy parol bo'lsa login endpointni ham tekshirish mumkin:

```bash
python manage.py simulate_platform_load --users 25 --workers 10 --progress --password your_shared_password
```

## 6) Windows uchun barqaror backend start

`runserver` o'rniga `waitress` bilan ishlatish tavsiya etiladi.

Ishga tushirish:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend.ps1
```

To'xtatish:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop_backend.ps1
```

Holatini tekshirish:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check_backend.ps1
```

Windows login bo'lganda avtomatik ishga tushirish uchun Scheduled Task yaratish:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install_backend_startup.ps1
```
