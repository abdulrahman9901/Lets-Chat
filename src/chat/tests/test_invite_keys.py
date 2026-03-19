from django.test import TestCase
from cryptography.fernet import InvalidToken

from chat.services.invite_keys import decrypter, get_chat_key_for_id


class InviteKeysTests(TestCase):
    def test_invite_key_round_trip(self):
        key = get_chat_key_for_id(123)
        chat_id = decrypter(key)
        self.assertEqual(chat_id, 123)

    def test_invite_key_tamper_rejected(self):
        key = get_chat_key_for_id(123)
        # Change the last character inside the signature part (still hex), so the regex still matches.
        tampered_last = 'b' if key[-1] != 'b' else 'c'
        tampered_key = f'{key[:-1]}{tampered_last}'

        with self.assertRaises(InvalidToken):
            decrypter(tampered_key)

