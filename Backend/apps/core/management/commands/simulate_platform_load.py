import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.core.management.base import BaseCommand
from rest_framework.test import APIClient

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Platforma uchun oddiy parallel load-test ssenariysi"

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=25, help="Nechta foydalanuvchi parallel ishlasin")
        parser.add_argument("--workers", type=int, default=10, help="Thread pool hajmi")
        parser.add_argument("--progress", action="store_true", help="Test progress endpointlarini ham urib ko'rish")
        parser.add_argument("--password", type=str, default="", help="Agar barcha test userlar bir xil parolda bo'lsa shu yerda bering")
        parser.add_argument("--skip-login", action="store_true", help="Login endpointni chetlab o'tib, auth'dan keyingi oqimni test qiladi")

    def handle(self, *args, **options):
        total_users = options["users"]
        workers = options["workers"]
        include_progress = options["progress"]
        shared_password = options["password"]
        skip_login = options["skip_login"]

        users = list(
            User.objects.filter(role="TINGLOVCHI", is_active=True).exclude(password="").order_by("id")[:total_users]
        )
        if not users:
            self.stdout.write(self.style.ERROR("Load-test uchun aktiv tinglovchi foydalanuvchilar topilmadi."))
            return

        started = time.perf_counter()
        timings = []
        failures = []

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(self._exercise_user_flow, user.id, include_progress, shared_password, skip_login) for user in users]
            for future in as_completed(futures):
                try:
                    result = future.result()
                    timings.append(result["duration_ms"])
                except Exception as exc:
                    failures.append(str(exc))

        total_duration_ms = round((time.perf_counter() - started) * 1000, 2)
        avg_ms = round(statistics.mean(timings), 2) if timings else 0
        p95_ms = round(sorted(timings)[max(0, int(len(timings) * 0.95) - 1)], 2) if timings else 0

        self.stdout.write(self.style.SUCCESS("Load-test yakunlandi"))
        self.stdout.write(f"Parallel foydalanuvchi: {len(users)}")
        self.stdout.write(f"Worker soni: {workers}")
        self.stdout.write(f"Umumiy vaqt: {total_duration_ms} ms")
        self.stdout.write(f"O'rtacha oqim vaqti: {avg_ms} ms")
        self.stdout.write(f"P95 oqim vaqti: {p95_ms} ms")
        self.stdout.write(f"Muvaffaqiyatli oqimlar: {len(timings)}")
        self.stdout.write(f"Xatolar: {len(failures)}")
        for failure in failures[:10]:
            self.stdout.write(self.style.WARNING(f"- {failure}"))

    def _exercise_user_flow(self, user_id, include_progress, shared_password="", skip_login=False):
        user = User.objects.get(id=user_id)
        password = shared_password or user.username or "123"
        client = APIClient(HTTP_HOST="localhost")

        flow_started = time.perf_counter()

        if skip_login:
            client.force_authenticate(user=user)
        else:
            login_response = client.post("/api/auth/login/", {"username": user.username, "password": password}, format="json", secure=True)
            if login_response.status_code != 200:
                raise RuntimeError(f"{user.username}: login {login_response.status_code}")

            access = login_response.data["access"]
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        snapshot_response = client.get("/api/snapshot/", secure=True)
        if snapshot_response.status_code != 200:
            raise RuntimeError(f"{user.username}: snapshot {snapshot_response.status_code}")

        available_response = client.get("/api/tests/available/", secure=True)
        if available_response.status_code != 200:
            raise RuntimeError(f"{user.username}: available tests {available_response.status_code}")

        if include_progress:
            module_candidates = available_response.data.get("main") or available_response.data.get("demo") or []
            if module_candidates:
                module_id = module_candidates[0]["id"]
                start_response = client.post("/api/tests/start/", {"moduleId": module_id}, format="json", secure=True)
                if start_response.status_code not in {200, 201}:
                    raise RuntimeError(f"{user.username}: start test {start_response.status_code}")
                attempt = start_response.data
                questions = attempt.get("questions") or []
                if questions:
                    progress_response = client.post(
                        "/api/tests/progress/",
                        {
                            "attemptId": attempt["id"],
                            "answers": {str(questions[0]["id"]): 0},
                            "currentQuestionIndex": 0,
                        },
                        format="json",
                        secure=True,
                    )
                    if progress_response.status_code != 200:
                        raise RuntimeError(f"{user.username}: save progress {progress_response.status_code}")

        return {"duration_ms": round((time.perf_counter() - flow_started) * 1000, 2)}
