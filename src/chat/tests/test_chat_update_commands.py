from unittest.mock import patch

from django.test import TestCase
from rest_framework.parsers import JSONParser
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from chat.api.serializers import ChatSerializer
from chat.models import Chat, Contact, CustomUser, Message
from chat.services.chat_broadcast import broadcast_chats_update, broadcast_new_message


class _DummyChannelLayer:
    async def group_send(self, *args, **kwargs):
        return None


class _CaptureChannelLayer:
    def __init__(self):
        self.calls = []

    async def group_send(self, group_name, payload):
        self.calls.append((group_name, payload))


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

    @patch('chat.services.chat_broadcast.get_channel_layer', return_value=_DummyChannelLayer())
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

    @patch('chat.services.chat_broadcast.get_channel_layer', return_value=_DummyChannelLayer())
    def test_remove_member_by_username(self, _layer):
        django_req = self.factory.put(
            f'/chat/{self.chat.id}/update/',
            {'command': 'removeMember', 'username': self.user_admin.username, 'removedIds': [self.contact_a.id]},
            format='json',
        )
        req = Request(django_req, parsers=[JSONParser()])
        s = ChatSerializer(self.chat, data={}, partial=True, context={'request': req})
        s.is_valid(raise_exception=True)
        updated = s.save()

        self.assertFalse(updated.participants.filter(id=self.contact_a.id).exists())
        self.assertTrue(updated.messages.filter(system_message=True, content__icontains='removed').exists())

    @patch('chat.services.chat_broadcast.get_channel_layer')
    def test_chat_broadcast_payloads(self, mock_layer):
        layer = _CaptureChannelLayer()
        mock_layer.return_value = layer

        msg = Message.objects.create(contact=self.contact_admin, content='hello', system_message=True)

        broadcast_chats_update(self.chat)
        broadcast_new_message(self.chat, msg)

        self.assertEqual(len(layer.calls), 2)

        group_name_1, payload_1 = layer.calls[0]
        self.assertEqual(group_name_1, f'chat_{self.chat.id}')
        self.assertEqual(payload_1['type'], 'chat_message')
        self.assertEqual(payload_1['message']['command'], 'chatsUpdate')

        group_name_2, payload_2 = layer.calls[1]
        self.assertEqual(group_name_2, f'chat_{self.chat.id}')
        self.assertEqual(payload_2['type'], 'chat_message')
        self.assertEqual(payload_2['message']['command'], 'new_message')

        nested = payload_2['message']['message']
        self.assertEqual(nested['id'], msg.id)
        self.assertEqual(nested['author'], self.user_admin.username)
        self.assertEqual(nested['content'], 'hello')
        self.assertEqual(nested['system_message'], True)
        self.assertIn('timestamp', nested)

    @patch('chat.services.chat_broadcast.get_channel_layer', return_value=_DummyChannelLayer())
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
        self.assertTrue(updated.messages.filter(system_message=True, content__icontains='left this chat').exists())

    @patch('chat.services.chat_broadcast.get_channel_layer', return_value=_DummyChannelLayer())
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

    @patch('chat.services.chat_broadcast.get_channel_layer', return_value=_DummyChannelLayer())
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
        self.assertTrue(updated.messages.filter(system_message=True, content__icontains='promoted').exists())

