import ssl
from functools import cached_property

from django.core.mail.backends.smtp import EmailBackend


class UnsafeTLSSMTPEmailBackend(EmailBackend):
    @cached_property
    def ssl_context(self):
        context = ssl._create_unverified_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        return context

