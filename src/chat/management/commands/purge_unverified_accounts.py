from __future__ import annotations

import os
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import CustomUser


class Command(BaseCommand):
    help = 'Delete unverified accounts after an expiration window'

    def handle(self, *args, **options):
        otp_ttl_minutes = int(os.environ.get('EMAIL_VERIFICATION_OTP_TTL_MINUTES', settings.EMAIL_VERIFICATION_OTP_TTL_MINUTES))
        delete_after_hours = int(
            os.environ.get(
                'EMAIL_VERIFICATION_DELETE_AFTER_HOURS',
                settings.EMAIL_VERIFICATION_DELETE_AFTER_HOURS,
            ),
        )

        now = timezone.now()
        cutoff_expires = now - timedelta(hours=delete_after_hours) + timedelta(minutes=otp_ttl_minutes)

        qs = CustomUser.objects.filter(
            is_email_verified=False,
            email_verification_expires_at__lt=cutoff_expires,
        )
        deleted_count, _ = qs.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} unverified users'))

