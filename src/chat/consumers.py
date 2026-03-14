import json
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from chat.models import Chat, Message
from django.contrib.auth import get_user_model
from .views import load_last_messages, get_user_contact, get_current_chat
from .api.serializers import ChatSerializer

User = get_user_model()


class ChatConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.subscribed_rooms = set()

    def message_to_json(self, message):
        return {
            'id': message.id,
            'author': message.contact.user.username,
            'content': message.content,
            'timestamp': str(message.created_at),
            'system_message': message.system_message,
            'image': str(message.image),
        }

    def messages_to_json(self, messages):
        return [self.message_to_json(m) for m in messages]

    def join_room(self, data):
        room_id = str(data.get('room_id', data.get('chatId', '')))
        if not room_id:
            return
        group_name = f'chat_{room_id}'
        async_to_sync(self.channel_layer.group_add)(group_name, self.channel_name)
        self.subscribed_rooms.add(room_id)

    def leave_room(self, data):
        room_id = str(data.get('room_id', data.get('chatId', '')))
        if not room_id:
            return
        group_name = f'chat_{room_id}'
        async_to_sync(self.channel_layer.group_discard)(group_name, self.channel_name)
        self.subscribed_rooms.discard(room_id)

    def new_message(self, data):
        contact = get_user_contact(data['from'])
        current_chat = get_current_chat(data['chatId'])
        message = Message.objects.create(
            contact=contact,
            content=data['message'],
        )
        current_chat.messages.add(message)
        current_chat.save()
        room_id = str(current_chat.id)
        content = {
            'command': 'new_message',
            'message': self.message_to_json(message),
        }
        self.send_chat_message(room_id, content)

    def load_messages(self, data):
        chat_id = data['chatId']
        messages_qs = load_last_messages(chat_id, data.get('msgCount', 50))
        chat = get_current_chat(chat_id)
        username = data.get('username', '')
        members = [c.user.username for c in chat.participants.all()]
        admins = [a.user.username for a in chat.admins.all()]

        if username in members:
            content = {
                'command': 'messages',
                'room_id': str(chat.id),
                'messages': self.messages_to_json(messages_qs),
                'participants': members,
                'admins': admins,
                'name': chat.name,
                'chatKey': ChatSerializer(chat).data['chatKey'],
            }
        else:
            content = {
                'command': 'messages',
                'room_id': str(chat.id),
                'messages': [],
                'participants': members,
                'admins': [],
                'name': chat.name,
            }
        self.send_message(content)

    commands = {
        'join_room': join_room,
        'leave_room': leave_room,
        'new_message': new_message,
        'load_messages': load_messages,
    }

    def connect(self):
        self.accept()
        room_name = self.scope.get('url_route', {}).get('kwargs', {}).get('room_name')
        if room_name:
            self.join_room({'room_id': room_name, 'chatId': room_name})

    def disconnect(self, close_code):
        for room_id in list(self.subscribed_rooms):
            group_name = f'chat_{room_id}'
            async_to_sync(self.channel_layer.group_discard)(
                group_name,
                self.channel_name,
            )
        self.subscribed_rooms.clear()

    def receive(self, text_data):
        try:
            data = json.loads(text_data)
            cmd = data.get('command')
            handler = self.commands.get(cmd) if cmd else None
            if handler:
                handler(self, data)
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    def send_chat_message(self, room_id, message):
        group_name = f'chat_{room_id}'
        async_to_sync(self.channel_layer.group_send)(
            group_name,
            {'type': 'chat_message', 'message': message},
        )

    def send_message(self, message):
        self.send(text_data=json.dumps(message))

    def chat_message(self, event):
        self.send(text_data=json.dumps(event['message']))
