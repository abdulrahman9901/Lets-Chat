from types import SimpleNamespace
from unittest.mock import patch

from allauth.core.exceptions import ImmediateHttpResponse
from django.test import TestCase, override_settings
from dj_rest_auth.registration.serializers import SocialLoginSerializer
from rest_framework import serializers as drf_serializers

from chat.models import CustomUser
from chat.social_auth import SocialAccountAdapter, VerifiedSocialLoginSerializer


class VerifiedSocialLoginSerializerTests(TestCase):
    def test_social_login_marks_user_verified_and_active(self):
        user = CustomUser.objects.create_user(
            username='social_u',
            email='social_u@example.com',
            password='pass12345',
            gender='NS',
            phone_number='',
        )
        user.is_active = False
        user.is_email_verified = False
        user.email_verification_code_hash = 'hash'
        user.email_verification_expires_at = None
        user.save()

        serializer = VerifiedSocialLoginSerializer(context={})
        with patch.object(SocialLoginSerializer, 'validate', return_value={'user': user}):
            result = serializer.validate({})

        self.assertEqual(result['user'].id, user.id)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)
        self.assertIsNone(user.email_verification_code_hash)


class _GoogleAdapterStub:
    provider_id = 'google'


class SocialOAuthCallbackUrlTests(TestCase):
    @override_settings(
        SOCIAL_GOOGLE_ALLOWED_REDIRECT_URIS=[
            'https://lets-chat-gray.vercel.app/oauth/callback/google',
            'http://localhost:5173/oauth/callback/google',
        ],
        SOCIAL_GOOGLE_CALLBACK_URL='https://lets-chat-gray.vercel.app/oauth/callback/google',
    )
    def test_multiple_allowed_redirects_require_redirect_uri_in_body(self):
        view = SimpleNamespace(callback_url='https://lets-chat-gray.vercel.app/oauth/callback/google')
        serializer = VerifiedSocialLoginSerializer(data={'code': 'x'})
        with self.assertRaises(drf_serializers.ValidationError):
            serializer.set_callback_url(view, _GoogleAdapterStub)

    @override_settings(
        SOCIAL_GOOGLE_ALLOWED_REDIRECT_URIS=[
            'https://lets-chat-gray.vercel.app/oauth/callback/google',
            'http://localhost:5173/oauth/callback/google',
        ],
        SOCIAL_GOOGLE_CALLBACK_URL='https://lets-chat-gray.vercel.app/oauth/callback/google',
    )
    def test_multiple_allowed_redirects_accept_matching_redirect_uri(self):
        view = SimpleNamespace(callback_url='https://lets-chat-gray.vercel.app/oauth/callback/google')
        serializer = VerifiedSocialLoginSerializer(
            data={
                'code': 'x',
                'redirect_uri': 'http://localhost:5173/oauth/callback/google',
            }
        )
        serializer.set_callback_url(view, _GoogleAdapterStub)
        self.assertEqual(serializer.callback_url, 'http://localhost:5173/oauth/callback/google')

    @override_settings(
        SOCIAL_GOOGLE_ALLOWED_REDIRECT_URIS=['http://localhost:5173/oauth/callback/google'],
        SOCIAL_GOOGLE_CALLBACK_URL='http://localhost:5173/oauth/callback/google',
    )
    def test_single_allowed_redirect_works_without_redirect_uri(self):
        view = SimpleNamespace(callback_url='http://localhost:5173/oauth/callback/google')
        serializer = VerifiedSocialLoginSerializer(data={'code': 'x'})
        serializer.set_callback_url(view, _GoogleAdapterStub)
        self.assertEqual(serializer.callback_url, 'http://localhost:5173/oauth/callback/google')


class SocialAccountAdapterTests(TestCase):
    def setUp(self):
        self.adapter = SocialAccountAdapter()

    def test_pre_social_login_requires_verified_primary_email(self):
        sociallogin = SimpleNamespace(
            is_existing=False,
            email_addresses=[SimpleNamespace(primary=True, verified=False)],
        )
        with self.assertRaises(ImmediateHttpResponse):
            self.adapter.pre_social_login(None, sociallogin)

    def test_pre_social_login_accepts_verified_primary_email(self):
        sociallogin = SimpleNamespace(
            is_existing=False,
            email_addresses=[SimpleNamespace(primary=True, verified=True)],
        )
        self.adapter.pre_social_login(None, sociallogin)

    def test_populate_user_sets_required_custom_fields(self):
        user = CustomUser(username='g', email='g@example.com')
        sociallogin = SimpleNamespace(user=user)
        out = self.adapter.populate_user(None, sociallogin, {})
        self.assertEqual(out.gender, 'NS')
        self.assertEqual(out.phone_number, '')
