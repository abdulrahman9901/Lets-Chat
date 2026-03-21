from django.http import JsonResponse
from allauth.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from dj_rest_auth.registration.serializers import SocialLoginSerializer


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        super().pre_social_login(request, sociallogin)
        if sociallogin.is_existing:
            return
        email_addresses = list(getattr(sociallogin, 'email_addresses', []) or [])
        if not email_addresses:
            raise ImmediateHttpResponse(
                JsonResponse({'detail': 'Social account did not provide an email address.'}, status=400),
            )
        primary = next((email for email in email_addresses if email.primary), email_addresses[0])
        if not primary.verified:
            raise ImmediateHttpResponse(
                JsonResponse({'detail': 'Social email must be verified by the provider.'}, status=400),
            )


class VerifiedSocialLoginSerializer(SocialLoginSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = attrs['user']
        changed_fields: list[str] = []
        if not user.is_active:
            user.is_active = True
            changed_fields.append('is_active')
        if not getattr(user, 'is_email_verified', False):
            user.is_email_verified = True
            changed_fields.append('is_email_verified')
        if getattr(user, 'email_verification_code_hash', None):
            user.email_verification_code_hash = None
            changed_fields.append('email_verification_code_hash')
        if getattr(user, 'email_verification_expires_at', None):
            user.email_verification_expires_at = None
            changed_fields.append('email_verification_expires_at')
        if changed_fields:
            user.save(update_fields=changed_fields)
        return attrs
