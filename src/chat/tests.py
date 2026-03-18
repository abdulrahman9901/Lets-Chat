from unittest.mock import patch

from django.test import TestCase
from rest_framework.parsers import JSONParser
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from chat.api.serializers import ChatSerializer
from chat.models import Chat, Contact, CustomUser


class _DummyChannelLayer:
    async def group_send(self, *args, **kwargs):
        return None


class ChatUpdateCommandsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.user_admin = CustomUser.objects.create_user(username='admin_u', password='x', gender='M', phone_number='1')
        self.user_a = CustomUser.objects.create_user(username='a_u', password='x', gender='M', phone_number='2')
        self.user_b = CustomUser.objects.create_user(username='b_u', password='x', gender='M', phone_number='3')

        self.contact_admin = Contact.objects.create(user=self.user_admin)
        self.contact_a = Contact.objects.create(user=self.user_a)
        self.contact_b = Contact.objects.create(user=self.user_b)

        self.chat = Chat.objects.create(name='t')
        self.chat.participants.add(self.contact_admin, self.contact_a)
        self.chat.admins.add(self.contact_admin)

    @patch('chat.api.serializers.get_channel_layer', return_value=_DummyChannelLayer())
    def test_remove_member_by_ids(self, _layer):
        django_req = self.factory.put(
            f'/chat/{self.chat.id}/update/',
            {'command': 'removeMember', 'actorId': self.contact_admin.id, 'removedIds': [self.contact_a.id]},
            format='json',
        )
        req = Request(django_req, parsers=[JSONParser()])
        s = ChatSerializer(self.chat, data={}, partial=True, context={'request': req})
        s.is_valid(raise_exception=True)
        updated = s.save()

        self.assertFalse(updated.participants.filter(id=self.contact_a.id).exists())
        self.assertTrue(updated.messages.filter(system_message=True, content__icontains='removed').exists())

    @patch('chat.api.serializers.get_channel_layer', return_value=_DummyChannelLayer())
    def test_leave_by_ids(self, _layer):
        django_req = self.factory.put(
            f'/chat/{self.chat.id}/update/',
            {'command': 'leave', 'actorId': self.contact_a.id},
            format='json',
        )
        req = Request(django_req, parsers=[JSONParser()])
        s = ChatSerializer(self.chat, data={}, partial=True, context={'request': req})
        s.is_valid(raise_exception=True)
        updated = s.save()

        self.assertFalse(updated.participants.filter(id=self.contact_a.id).exists())
        self.assertTrue(updated.messages.filter(system_message=True, content__icontains='left the chat').exists())

    @patch('chat.api.serializers.get_channel_layer', return_value=_DummyChannelLayer())
    def test_add_participant_by_ids(self, _layer):
        django_req = self.factory.put(
            f'/chat/{self.chat.id}/update/',
            {'command': 'addParticipant', 'actorId': self.contact_admin.id, 'addedIds': [self.contact_b.id]},
            format='json',
        )
        req = Request(django_req, parsers=[JSONParser()])
        s = ChatSerializer(self.chat, data={}, partial=True, context={'request': req})
        s.is_valid(raise_exception=True)
        updated = s.save()

        self.assertTrue(updated.participants.filter(id=self.contact_b.id).exists())
        self.assertTrue(updated.messages.filter(system_message=True, content__icontains='added').exists())

    @patch('chat.api.serializers.get_channel_layer', return_value=_DummyChannelLayer())
    def test_promote_admin_by_ids(self, _layer):
        self.chat.participants.add(self.contact_b)

        django_req = self.factory.put(
            f'/chat/{self.chat.id}/update/',
            {'command': 'promoteAdmin', 'actorId': self.contact_admin.id, 'promotedIds': [self.contact_b.id]},
            format='json',
        )
        req = Request(django_req, parsers=[JSONParser()])
        s = ChatSerializer(self.chat, data={}, partial=True, context={'request': req})
        s.is_valid(raise_exception=True)
        updated = s.save()

        self.assertTrue(updated.admins.filter(id=self.contact_b.id).exists())
        self.assertTrue(updated.messages.filter(system_message=True, content__icontains='admin').exists())
