from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    label = "core"

    def ready(self):
        """
        Python 3.14 + Django 5.1 compatibility patch:
        django.template.context.BaseContext.__copy__ uses copy(super()),
        which raises AttributeError on Python 3.14.
        """
        try:
            from django.template.context import BaseContext

            if getattr(BaseContext, "_py314_copy_patch_applied", False):
                return

            def _safe_copy(self):
                duplicate = self.__class__.__new__(self.__class__)
                if hasattr(self, "__dict__"):
                    duplicate.__dict__ = self.__dict__.copy()
                duplicate.dicts = self.dicts[:]
                return duplicate

            BaseContext.__copy__ = _safe_copy
            BaseContext._py314_copy_patch_applied = True
        except Exception:
            # Admin should continue to work even if patch import fails silently.
            pass
