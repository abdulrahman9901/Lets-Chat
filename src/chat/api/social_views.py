from django.conf import settings
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

from chat.social_auth import VerifiedSocialLoginSerializer


class BaseSocialLoginView(SocialLoginView):
    serializer_class = VerifiedSocialLoginSerializer
    client_class = OAuth2Client

    def dispatch(self, request, *args, **kwargs):
        try:
            return super().dispatch(request, *args, **kwargs)
        except ImmediateHttpResponse as exc:
            return exc.response


class GoogleLoginView(BaseSocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = settings.SOCIAL_GOOGLE_CALLBACK_URL


class FacebookLoginView(BaseSocialLoginView):
    adapter_class = FacebookOAuth2Adapter
    callback_url = settings.SOCIAL_FACEBOOK_CALLBACK_URL
