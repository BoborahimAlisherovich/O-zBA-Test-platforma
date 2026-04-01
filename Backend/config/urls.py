from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.core.urls")),
]

local_dev_hosts = {"127.0.0.1", "localhost", "testserver"}
should_serve_media = settings.DEBUG or any(host in local_dev_hosts for host in settings.ALLOWED_HOSTS)

if should_serve_media:
    media_prefix = settings.MEDIA_URL.lstrip("/")
    urlpatterns += [
        re_path(rf"^{media_prefix}(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]

#update
