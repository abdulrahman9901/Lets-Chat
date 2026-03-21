import hashlib
import secrets
from datetime import timedelta

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import serializers
from chat.models import Chat, Contact, Message

from django.db import transaction

from dj_rest_auth.registration.serializers import RegisterSerializer

from chat.services.contacts import get_user_contact
from chat.services.chat_update_commands import dispatch_chat_update_command, resolve_actor
from chat.services.chat_broadcast import broadcast_chats_update, broadcast_new_message
from chat.services.invite_keys import get_chat_key_for_id

from chat.models import GENDER_SELECTION

logger = logging.getLogger('chat.registration')

class CustomRegisterSerializer(RegisterSerializer):
    gender = serializers.ChoiceField(choices=GENDER_SELECTION, required=False, allow_null=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)

    # Define transaction.atomic to rollback the save operation in case of error
    @transaction.atomic
    def save(self, request):
        user = super().save(request)
        user.gender = self.validated_data.get('gender') or 'NS'
        user.phone_number = self.validated_data.get('phone_number') or ''

        if not user.email:
            raise serializers.ValidationError({'email': 'Email is required for verification'})

        otp_code = f'{secrets.randbelow(1000000):06d}'
        otp_hash = hashlib.sha256(f'{otp_code}:{settings.SECRET_KEY}'.encode('utf-8')).hexdigest()
        user.is_email_verified = False
        user.email_verification_code_hash = otp_hash
        user.email_verification_expires_at = timezone.now() + timedelta(minutes=settings.EMAIL_VERIFICATION_OTP_TTL_MINUTES)
        user.is_active = False

        try:
            send_mail(
                subject=settings.EMAIL_OTP_SUBJECT,
                message=(
                    'Your verification code is: {code}\n\n'
                    'This code will expire in {mins} minutes.\n'
                ).format(code=otp_code, mins=settings.EMAIL_VERIFICATION_OTP_TTL_MINUTES),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            logger.exception(
                'OTP email failed backend=%s host=%r user_set=%s to=%r from=%r',
                settings.EMAIL_BACKEND,
                getattr(settings, 'EMAIL_HOST', ''),
                bool(getattr(settings, 'EMAIL_HOST_USER', '')),
                user.email,
                settings.DEFAULT_FROM_EMAIL,
            )
            raise

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
        admin_username = admins[0]
        all_usernames = list({*participants, admin_username})
        contacts_by_username = {
            c.user.username: c
            for c in Contact.objects.select_related('user').filter(user__username__in=all_usernames)
        }

        for u in participants:
            if u not in contacts_by_username:
                contacts_by_username[u] = get_user_contact(u)

        participant_contacts = [contacts_by_username[u] for u in participants]
        chat.participants.add(*participant_contacts)

        admin_contact = contacts_by_username.get(admin_username) or get_user_contact(admin_username)
        chat.admins.add(admin_contact)

        message = Message.objects.create(
            contact=admin_contact,
            content='{} created this chat.'.format(admin_username),
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


class ChatListSerializer(ChatSerializer):
    class Meta:
        model = Chat
        fields = (
            'id',
            'name',
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
