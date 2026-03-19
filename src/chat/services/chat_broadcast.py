from __future__ import annotations

from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from chat.models import Message


def broadcast_chats_update(chat: Any) -> None:
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'chat_{}'.format(chat.id),
        {
            'type': 'chat_message',
            'message': {'command': 'chatsUpdate'},
        },
    )


def broadcast_new_message(chat: Any, message: Message) -> None:
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'chat_{}'.format(chat.id),
        {
            'type': 'chat_message',
            'message': {
                'command': 'new_message',
                'message': {
                    'id': message.id,
                    'author': message.contact.user.username,
                    'content': message.content,
                    'timestamp': str(message.created_at),
                    'system_message': message.system_message,
                    'image': str(message.image),
                },
            },
        },
    )

