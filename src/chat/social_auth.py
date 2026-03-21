from django.http import JsonResponse
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from dj_rest_auth.registration.serializers import SocialLoginSerializer
from rest_framework import serializers

from chat.models import Contact


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        if not getattr(user, 'gender', None):
            user.gender = 'NS'
        phone = getattr(user, 'phone_number', None)
        if phone is None or phone == '':
            user.phone_number = ''
        return user

    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form=form)
        Contact.objects.get_or_create(user=user)
        return user

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
    def set_callback_url(self, view, adapter_class):
        from django.conf import settings

        pid = getattr(adapter_class, 'provider_id', '')
        if pid == 'google':
            allowed = list(getattr(settings, 'SOCIAL_GOOGLE_ALLOWED_REDIRECT_URIS', []) or [])
        else:
            allowed = []

        if not allowed:
            super().set_callback_url(view, adapter_class)
            return

        initial = getattr(self, 'initial_data', None) or {}
        raw = (initial.get('redirect_uri') or initial.get('callback_url') or '').strip()

        if len(allowed) == 1:
            if raw and raw not in allowed:
                raise serializers.ValidationError(
                    {'redirect_uri': [f'Allowed redirect URI for this server: {allowed[0]}']}
                )
            self.callback_url = raw if raw in allowed else allowed[0]
            return

        if not raw or raw not in allowed:
            raise serializers.ValidationError(
                {
                    'redirect_uri': [
                        'When multiple OAuth callbacks are configured, send redirect_uri with the exact '
                        'URL used for this login (same as the Google redirect to your app). Allowed: '
                        + ', '.join(allowed)
                    ]
                }
            )
        self.callback_url = raw

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
