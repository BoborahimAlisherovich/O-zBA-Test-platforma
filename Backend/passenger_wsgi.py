import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent

# Shared hostinglarda Passenger ilova papkasini har doim to'g'ri topa olmaydi.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Agar hostingda virtualenv alohida papkada bo'lsa, shu env bilan to'ldiriladi.
venv_python = os.environ.get("PASSENGER_PYTHON")
if venv_python:
    venv_site_packages = Path(venv_python).resolve().parent.parent / "Lib" / "site-packages"
    if venv_site_packages.exists() and str(venv_site_packages) not in sys.path:
        sys.path.insert(0, str(venv_site_packages))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from config.wsgi import application
