from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


def _ensure_email_verified(user) -> None:
	if not getattr(user, 'is_active', True):
		raise AuthenticationFailed('User is not active')
	if not getattr(user, 'is_email_verified', False):
		raise AuthenticationFailed('Email is not verified')


class EmailVerifiedTokenAuthentication(TokenAuthentication):
	def authenticate(self, request):
		auth_result = super().authenticate(request)
		if auth_result is None:
			return None
		user, _token = auth_result
		_ensure_email_verified(user)
		return auth_result


class EmailVerifiedSessionAuthentication(SessionAuthentication):
	def authenticate(self, request):
		auth_result = super().authenticate(request)
		if auth_result is None:
			return None
		user, _ = auth_result
		_ensure_email_verified(user)
		return auth_result

