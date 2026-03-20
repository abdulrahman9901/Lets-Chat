import hashlib
from datetime import timedelta

from django.conf import settings
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from chat.models import CustomUser


class EmailVerificationTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user_password = 'pass1234'

	def _make_user(self, username: str, email: str, otp: str | None, expires_delta: timedelta | None):
		u = CustomUser.objects.create_user(
			username=username,
			email=email,
			password=self.user_password,
			gender='M',
			phone_number='1',
		)
		u.is_email_verified = False
		u.is_active = False
		if otp is not None and expires_delta is not None:
			u.email_verification_code_hash = hashlib.sha256(
				f'{otp}:{settings.SECRET_KEY}'.encode('utf-8'),
			).hexdigest()
			u.email_verification_expires_at = timezone.now() + expires_delta
		u.save()
		return u

	def test_verify_otp_success(self):
		otp = '123456'
		u = self._make_user('otp_user', 'otp_user@example.com', otp=otp, expires_delta=timedelta(minutes=5))

		res = self.client.post(
			'/chat/email/verify-otp/',
			{'username': u.username, 'otp': otp},
			format='json',
		)

		self.assertEqual(res.status_code, 200)
		u.refresh_from_db()
		self.assertTrue(u.is_email_verified)
		self.assertTrue(u.is_active)
		self.assertIsNone(u.email_verification_code_hash)
		self.assertIsNone(u.email_verification_expires_at)

	def test_verify_otp_invalid_code(self):
		u = self._make_user('otp_user2', 'otp_user2@example.com', otp='123456', expires_delta=timedelta(minutes=5))

		res = self.client.post(
			'/chat/email/verify-otp/',
			{'username': u.username, 'otp': '000000'},
			format='json',
		)

		self.assertEqual(res.status_code, 400)
		u.refresh_from_db()
		self.assertFalse(u.is_email_verified)

	def test_verify_otp_expired(self):
		u = self._make_user('otp_user3', 'otp_user3@example.com', otp='123456', expires_delta=timedelta(minutes=-1))

		res = self.client.post(
			'/chat/email/verify-otp/',
			{'username': u.username, 'otp': '123456'},
			format='json',
		)

		self.assertEqual(res.status_code, 400)
		u.refresh_from_db()
		self.assertFalse(u.is_email_verified)

	def test_purge_unverified_accounts_deletes_expired(self):
		otp_ttl_minutes = settings.EMAIL_VERIFICATION_OTP_TTL_MINUTES
		delete_after_hours = settings.EMAIL_VERIFICATION_DELETE_AFTER_HOURS
		now = timezone.now()
		cutoff_expires = now - timedelta(hours=delete_after_hours) + timedelta(minutes=otp_ttl_minutes)

		expired_user = CustomUser.objects.create_user(
			username='expired_u',
			email='expired_u@example.com',
			password=self.user_password,
			gender='M',
			phone_number='1',
		)
		expired_user.is_email_verified = False
		expired_user.is_active = False
		expired_user.email_verification_code_hash = hashlib.sha256(
			'123456:{}'.format(settings.SECRET_KEY).encode('utf-8'),
		).hexdigest()
		expired_user.email_verification_expires_at = cutoff_expires - timedelta(minutes=1)
		expired_user.save()

		fresh_user = CustomUser.objects.create_user(
			username='fresh_u',
			email='fresh_u@example.com',
			password=self.user_password,
			gender='M',
			phone_number='1',
		)
		fresh_user.is_email_verified = False
		fresh_user.is_active = False
		fresh_user.email_verification_code_hash = hashlib.sha256(
			'123456:{}'.format(settings.SECRET_KEY).encode('utf-8'),
		).hexdigest()
		fresh_user.email_verification_expires_at = cutoff_expires + timedelta(minutes=1)
		fresh_user.save()

		verified_user = CustomUser.objects.create_user(
			username='verified_u',
			email='verified_u@example.com',
			password=self.user_password,
			gender='M',
			phone_number='1',
		)
		verified_user.is_email_verified = True
		verified_user.is_active = True
		verified_user.save()

		from django.core.management import call_command

		call_command('purge_unverified_accounts')

		self.assertFalse(CustomUser.objects.filter(username='expired_u').exists())
		self.assertTrue(CustomUser.objects.filter(username='fresh_u').exists())
		self.assertTrue(CustomUser.objects.filter(username='verified_u').exists())

