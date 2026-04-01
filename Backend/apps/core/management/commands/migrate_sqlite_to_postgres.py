from pathlib import Path
from tempfile import NamedTemporaryFile

from django.conf import settings
from django.core.management import BaseCommand, CommandError, call_command
from django.db import connections


MODEL_LABELS = [
    "accounts.user",
    "core.group",
    "core.subject",
    "core.module",
    "core.modulesubjectconfig",
    "core.question",
    "core.testresult",
]


class Command(BaseCommand):
    help = "Legacy SQLite bazadagi loyiha ma'lumotlarini default PostgreSQL bazaga ko'chiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--legacy-db",
            default="sqlite_legacy",
            help="Eski SQLite connection aliasi",
        )
        parser.add_argument(
            "--target-db",
            default="default",
            help="Yangi PostgreSQL connection aliasi",
        )
        parser.add_argument(
            "--fixture",
            help="Oraliq JSON fixture fayli uchun yo'l. Berilmasa vaqtinchalik fayl ishlatiladi.",
        )
        parser.add_argument(
            "--skip-migrate",
            action="store_true",
            help="PostgreSQL uchun migrate bosqichini o'tkazib yuboradi.",
        )
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Importdan oldin target bazani tozalaydi.",
        )

    def handle(self, *args, **options):
        legacy_db = options["legacy_db"]
        target_db = options["target_db"]

        if legacy_db not in settings.DATABASES:
            raise CommandError(
                f"'{legacy_db}' connection topilmadi. LEGACY_SQLITE_PATH va DATABASE_ENGINE ni tekshiring."
            )
        if target_db not in settings.DATABASES:
            raise CommandError(f"'{target_db}' connection topilmadi.")

        legacy_engine = settings.DATABASES[legacy_db]["ENGINE"]
        target_engine = settings.DATABASES[target_db]["ENGINE"]

        if legacy_engine != "django.db.backends.sqlite3":
            raise CommandError(f"'{legacy_db}' SQLite bo'lishi kerak. Hozir: {legacy_engine}")
        if target_engine != "django.db.backends.postgresql":
            raise CommandError(f"'{target_db}' PostgreSQL bo'lishi kerak. Hozir: {target_engine}")

        legacy_name = Path(str(settings.DATABASES[legacy_db]["NAME"]))
        if not legacy_name.exists():
            raise CommandError(f"SQLite fayli topilmadi: {legacy_name}")

        connections[legacy_db].ensure_connection()
        connections[target_db].ensure_connection()

        if not options["skip_migrate"]:
            self.stdout.write(self.style.NOTICE("1/4 PostgreSQL migratsiyalari ishga tushirilmoqda..."))
            call_command("migrate", database=target_db, interactive=False, verbosity=options["verbosity"])

        if options["flush"]:
            self.stdout.write(self.style.WARNING("2/4 Target baza tozalanmoqda..."))
            call_command("flush", database=target_db, interactive=False, verbosity=options["verbosity"])
        else:
            self.stdout.write(self.style.NOTICE("2/4 Target baza flush qilinmadi. Yangi yoki bo'sh baza tavsiya etiladi."))

        fixture = options.get("fixture")
        if fixture:
            fixture_path = Path(fixture)
            fixture_path.parent.mkdir(parents=True, exist_ok=True)
            temp_file_ctx = None
        else:
            temp_file_ctx = NamedTemporaryFile(suffix=".json", delete=False)
            fixture_path = Path(temp_file_ctx.name)
            temp_file_ctx.close()

        self.stdout.write(self.style.NOTICE(f"3/4 SQLite ma'lumotlari eksport qilinmoqda: {fixture_path}"))
        call_command(
            "dumpdata",
            *MODEL_LABELS,
            database=legacy_db,
            output=str(fixture_path),
            indent=2,
            verbosity=options["verbosity"],
        )

        self.stdout.write(self.style.NOTICE("4/4 PostgreSQL bazaga import qilinmoqda..."))
        call_command("loaddata", str(fixture_path), database=target_db, verbosity=options["verbosity"])

        if not fixture:
            fixture_path.unlink(missing_ok=True)

        self.stdout.write(self.style.SUCCESS("SQLite ma'lumotlari PostgreSQL bazaga muvaffaqiyatli ko'chirildi."))
