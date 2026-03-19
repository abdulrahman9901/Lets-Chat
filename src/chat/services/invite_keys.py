from __future__ import annotations

import hashlib
import hmac
import re
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

_key = getattr(settings, 'CHAT_FERNET_KEY', None)
if _key is None:
    _key = Fernet.generate_key()
elif isinstance(_key, str):
    _key = _key.encode('utf-8')

_fernet = Fernet(_key)

_CHAT_KEY_SHORT_RE = re.compile(r'^(?P<id>[0-9a-z]{1,12})-(?P<sig>[0-9a-f]{12})$')
_BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'


def _int_to_base36(n: int) -> str:
    if n < 0:
        raise ValueError('Negative values are not supported')
    if n == 0:
        return '0'

    out: list[str] = []
    while n:
        n, rem = divmod(n, 36)
        out.append(_BASE36_ALPHABET[rem])
    return ''.join(reversed(out))


def _base36_to_int(s: str) -> int:
    s = s.lower().strip()
    if not s:
        raise ValueError('Empty base36 string')

    n = 0
    for ch in s:
        idx = _BASE36_ALPHABET.find(ch)
        if idx < 0:
            raise ValueError('Invalid base36 character')
        n = n * 36 + idx
    return n


def _sign_chat_id(id36: str) -> str:
    secret = str(settings.SECRET_KEY).encode('utf-8')
    msg = id36.encode('ascii')
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()[:12]


def get_chat_key_for_id(chat_id: Any) -> str:
    """
    Generate a compact invite code for a chat id.

    Format: base36(chat_id) + '-' + truncated HMAC signature
    Example: 2k-1a2b3c4d5e6f
    """

    id_int = int(chat_id)
    id36 = _int_to_base36(id_int)
    sig = _sign_chat_id(id36)
    return '{}-{}'.format(id36, sig)


def decrypter(key: Any) -> int:
    raw = str(key).strip() if not isinstance(key, str) else key.strip()

    m = _CHAT_KEY_SHORT_RE.match(raw)
    if m:
        id36 = m.group('id')
        provided_sig = m.group('sig')
        expected_sig = _sign_chat_id(id36)
        if not hmac.compare_digest(provided_sig, expected_sig):
            raise InvalidToken()
        return _base36_to_int(id36)

    # Backward compatible: old Fernet-encrypted tokens
    raw_bytes = raw.encode('utf-8')
    return int(_fernet.decrypt(raw_bytes).decode())


__all__ = ['get_chat_key_for_id', 'decrypter', 'InvalidToken']

