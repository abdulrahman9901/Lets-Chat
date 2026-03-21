from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Show effective email settings and test SMTP connection (Brevo / etc.)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send',
            metavar='EMAIL',
            help='Send one test message to this address (optional)',
        )

    def handle(self, *args, **options):
        self.stdout.write('Effective Django email configuration:')
        self.stdout.write(f'  EMAIL_BACKEND = {settings.EMAIL_BACKEND}')
        if 'console' in settings.EMAIL_BACKEND:
            self.stdout.write(
                self.style.WARNING(
                    '  Console email backend is active (EMAIL_HOST not set in env at startup). '
                    'OTP only appears in server logs; Brevo dashboard will show no sends. '
                    'Set EMAIL_HOST=smtp-relay.brevo.com and redeploy.',
                ),
            )
            return

        host = getattr(settings, 'EMAIL_HOST', '') or ''
        self.stdout.write(f'  EMAIL_HOST      = {host!r}')

        port = getattr(settings, 'EMAIL_PORT', '')
        user = getattr(settings, 'EMAIL_HOST_USER', '') or ''
        self.stdout.write(f'  EMAIL_PORT      = {port}')
        self.stdout.write(f'  EMAIL_USE_TLS   = {getattr(settings, "EMAIL_USE_TLS", None)}')
        self.stdout.write(f'  EMAIL_USE_SSL   = {getattr(settings, "EMAIL_USE_SSL", None)}')
        self.stdout.write(f'  EMAIL_HOST_USER = {"(set)" if user else "(empty - often invalid for Brevo)"}')
        self.stdout.write(f'  DEFAULT_FROM_EMAIL = {settings.DEFAULT_FROM_EMAIL!r}')

        self.stdout.write('Testing SMTP connection…')
        try:
            connection = get_connection()
            connection.open()
            connection.close()
        except Exception as exc:
            raise CommandError(f'SMTP connection failed: {exc}') from exc

        self.stdout.write(self.style.SUCCESS('SMTP connection OK.'))

        to_addr = options.get('send')
        if to_addr:
            send_mail(
                subject='Lets-Chat SMTP test',
                message='If you receive this, Django to Brevo SMTP is working.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_addr],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f'Test email sent to {to_addr!r}.'))
