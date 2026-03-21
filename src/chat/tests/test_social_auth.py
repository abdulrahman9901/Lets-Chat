from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase
from allauth.core.exceptions import ImmediateHttpResponse
from dj_rest_auth.registration.serializers import SocialLoginSerializer

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
