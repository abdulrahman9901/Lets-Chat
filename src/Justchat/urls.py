from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.views.static import serve
from django.conf.urls.static import static

urlpatterns = []

if settings.DEBUG:
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', serve, {'document_root': str(settings.STATIC_ROOT.resolve())}),
    ]

urlpatterns += [
    path('admin/', admin.site.urls),
    path('chat/', include('chat.api.urls', namespace='chat')),
    path('rest-auth/', include('dj_rest_auth.urls')),
    path('rest-auth/registration/', include('dj_rest_auth.registration.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


