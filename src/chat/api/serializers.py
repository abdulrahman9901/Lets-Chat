from rest_framework import serializers
from chat.models import Chat, Contact, Message

from django.db import transaction

from dj_rest_auth.registration.serializers import RegisterSerializer

from chat.services.contacts import get_user_contact
from chat.services.chat_update_commands import dispatch_chat_update_command, resolve_actor
from chat.services.chat_broadcast import broadcast_chats_update, broadcast_new_message

from chat.models import GENDER_SELECTION

from django.conf import settings
from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken
import hashlib
import hmac
import re

_key = getattr(settings, 'CHAT_FERNET_KEY', None)
if _key is None:
    _key = Fernet.generate_key()
elif isinstance(_key, str):
    _key = _key.encode('utf-8')
f = Fernet(_key)


_CHAT_KEY_SHORT_RE = re.compile(r'^(?P<id>[0-9a-z]{1,12})-(?P<sig>[0-9a-f]{12})$')
_BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'


def _int_to_base36(n: int) -> str:
    if n < 0:
        raise ValueError('Negative values are not supported')
    if n == 0:
        return '0'
    out = []
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


def get_chat_key_for_id(chat_id):
    """
    Generate a compact invite code for a chat id.

    Format: base36(chat_id) + '-' + truncated HMAC signature
    Example: 2k-1a2b3c4d5e6f
    """
    id_int = int(chat_id)
    id36 = _int_to_base36(id_int)
    sig = _sign_chat_id(id36)
    return '{}-{}'.format(id36, sig)


def decrypter(key):
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
    if isinstance(raw, str):
        raw = raw.encode('utf-8')
    return int(f.decrypt(raw).decode())

class CustomRegisterSerializer(RegisterSerializer):
    gender = serializers.ChoiceField(choices=GENDER_SELECTION)
    phone_number = serializers.CharField(max_length=30)

    # Define transaction.atomic to rollback the save operation in case of error
    @transaction.atomic
    def save(self, request):
        user = super().save(request)
        user.gender = self.data.get('gender')
        user.phone_number = self.data.get('phone_number')
        contact = Contact()
        contact.user = user
        user.save()
        contact.save()
        return user

class ContactSerializer(serializers.StringRelatedField):
    def to_internal_value(self, value):
        return value


class ChatSerializer(serializers.ModelSerializer):
    participants = ContactSerializer(many=True, required=False)
    admins = ContactSerializer(many=True, required=False)
    chatKey = serializers.SerializerMethodField('get_chat_key')
    participantsMeta = serializers.SerializerMethodField('get_participants_meta')
    adminsMeta = serializers.SerializerMethodField('get_admins_meta')

    def get_chat_key(self, instance):
        return get_chat_key_for_id(instance.id)

    def get_participants_meta(self, instance):
        return [{'id': c.id, 'username': c.user.username} for c in instance.participants.all()]

    def get_admins_meta(self, instance):
        return [{'id': c.id, 'username': c.user.username} for c in instance.admins.all()]

    allowed_methods = ['get', 'post', 'put', 'delete', 'options','update']
    
    class Meta:
        model = Chat
        fields = (
            'id',
            'name',
            'messages',
            'participants',
            'admins',
            'participantsMeta',
            'adminsMeta',
            'chatKey',
        )
        read_only = ('id')
        extra_kwargs = {
            'participants': {'required': False},
            'admins': {'required': False},
        }

    def create(self, validated_data):
        participants = validated_data.pop('participants')
        admins = validated_data.pop('admins')
        name = validated_data.pop('name')
        chat = Chat()
        chat.name = name
        chat.save()
        for username in participants:
            contact = get_user_contact(username)
            chat.participants.add(contact)

        chat.admins.add(get_user_contact(admins[0]))

        message = Message.objects.create(
            contact=get_user_contact(admins[0]),
            content='{} created the chat'.format(admins[0]),
            system_message=True,
        )
        chat.messages.add(message)

        chat.save()
        return chat

        
    def update(self, instance, validated_data):
        request = self.context.get("request")
        data = request.data

        broadcast_chats_update(instance)

        command = data.get('command') or ''
        actor = resolve_actor(data)
        updated = dispatch_chat_update_command(
            chat=instance,
            command=command,
            data=data,
            validated_data=validated_data,
            actor=actor,
            broadcaster=broadcast_new_message,
        )
        if updated is not None:
            return updated

        validated_data.pop('participants', None)
        validated_data.pop('admins', None)
        return super().update(instance, validated_data)
