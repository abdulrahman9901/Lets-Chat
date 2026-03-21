from django.urls import path

from .social_views import GoogleLoginView, FacebookLoginView


urlpatterns = [
    path('google/', GoogleLoginView.as_view(), name='social_google_login'),
    path('facebook/', FacebookLoginView.as_view(), name='social_facebook_login'),
]
