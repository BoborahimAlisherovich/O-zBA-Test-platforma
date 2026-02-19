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
- `GET /api/results/`
- `GET /api/tests/available/`
- `POST /api/tests/start/`
- `POST /api/tests/submit/`
- `GET /api/snapshot/`
- `POST /api/snapshot/sync/` (admin uchun, frontend CRUD sync)

## 3) Note for current frontend

Frontend API bilan ishlashi uchun root loyihada `.env.local`ga qo'shing:

```bash
VITE_API_URL=http://127.0.0.1:8000/api
```
