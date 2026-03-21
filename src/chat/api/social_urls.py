from django.urls import path

from .social_views import GoogleLoginView


urlpatterns = [
    path('google/', GoogleLoginView.as_view(), name='social_google_login'),
]
