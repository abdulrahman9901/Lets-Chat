from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Validate critical production safety settings'

    def handle(self, *args, **options):
        debug_enabled = bool(getattr(settings, 'DEBUG', False))
        allowed_hosts = list(getattr(settings, 'ALLOWED_HOSTS', []))
        email_ssl_no_verify = (
            getattr(settings, 'EMAIL_BACKEND', '') == 'chat.email_backends.UnsafeTLSSMTPEmailBackend'
        )

        self.stdout.write('Production safety check')
        self.stdout.write(f'  DEBUG={debug_enabled}')
        self.stdout.write(f'  ALLOWED_HOSTS={allowed_hosts}')
        self.stdout.write(
            f'  EMAIL_SSL_NO_VERIFY_BACKEND={email_ssl_no_verify}',
        )

        issues = []
        if debug_enabled:
            issues.append('DEBUG is True')
        if '*' in allowed_hosts:
            issues.append("ALLOWED_HOSTS contains '*'")
        if email_ssl_no_verify:
            issues.append('Unsafe SMTP backend is enabled')

        if issues:
            raise CommandError('Production safety check failed: ' + '; '.join(issues))

        self.stdout.write(self.style.SUCCESS('Production safety check passed'))

