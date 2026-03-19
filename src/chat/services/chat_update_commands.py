from __future__ import annotations

from collections.abc import Callable
from typing import Any

from django.db.models import QuerySet

from chat.models import Contact, Message

from chat.views import get_user_contact


def format_contact_names(contacts: QuerySet[Contact] | list[Contact]) -> str:
    names = [c.user.username for c in contacts]
    if not names:
        return ''
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return '{} and {}'.format(names[0], names[1])
    return '{}, and {}'.format(', '.join(names[:-1]), names[-1])


def contacts_from_ids(ids: list[int] | None) -> list[Contact]:
    if not ids:
        return []
    return list(Contact.objects.filter(id__in=ids))


def resolve_actor(data: dict[str, Any]) -> Contact | None:
    actor_id = data.get('actorId')
    actor = Contact.objects.filter(id=actor_id).first() if actor_id is not None else None
    if actor is not None:
        return actor

    username = data.get('username')
    if username:
        return get_user_contact(username)
    return None


def broadcast_chat_message(
    broadcaster: Callable[[Any, Message], None],
    chat: Any,
    message: Message,
) -> None:
    broadcaster(chat, message)


def handle_remove_member(
    chat: Any,
    actor: Contact | None,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    broadcaster: Callable[[Any, Message], None],
) -> Any:
    removed_ids = data.get('removedIds') or []
    removed_contacts = contacts_from_ids(removed_ids)
    actually_removed = [c for c in removed_contacts if c in chat.participants.all()]

    if not actually_removed and 'participants' in validated_data:
        snapshot_usernames = validated_data.get('participants') or []
        snapshot_contacts = [get_user_contact(u) for u in snapshot_usernames if u]
        actually_removed = list(set(chat.participants.all()) - set(snapshot_contacts))

    for c in actually_removed:
        chat.participants.remove(c)
        if c in chat.admins.all():
            chat.admins.remove(c)

    if actually_removed and actor:
        content = '{} removed {} from the chat'.format(actor.user.username, format_contact_names(actually_removed))
        msg = Message.objects.create(contact=actor, content=content, system_message=True)
        chat.messages.add(msg)
        broadcast_chat_message(broadcaster, chat, msg)

    chat.save()
    return chat


def handle_leave(
    chat: Any,
    actor: Contact | None,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    broadcaster: Callable[[Any, Message], None],
) -> Any:
    if actor and actor in chat.participants.all():
        chat.participants.remove(actor)
        if actor in chat.admins.all():
            chat.admins.remove(actor)
        content = '{} left the chat'.format(actor.user.username)
        msg = Message.objects.create(contact=actor, content=content, system_message=True)
        chat.messages.add(msg)
        broadcast_chat_message(broadcaster, chat, msg)

    chat.save()
    return chat


def handle_add_participant(
    chat: Any,
    actor: Contact | None,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    broadcaster: Callable[[Any, Message], None],
) -> Any:
    added_ids = data.get('addedIds') or []
    added_contacts = contacts_from_ids(added_ids)

    if not added_contacts and 'participants' in validated_data:
        snapshot_usernames = validated_data.get('participants') or []
        added_contacts = [get_user_contact(u) for u in snapshot_usernames if u]

    actually_added: list[Contact] = []
    for c in added_contacts:
        if c not in chat.participants.all():
            chat.participants.add(c)
            actually_added.append(c)

    if actually_added and actor:
        content = '{} added {} to the chat'.format(actor.user.username, format_contact_names(actually_added))
        msg = Message.objects.create(contact=actor, content=content, system_message=True)
        chat.messages.add(msg)
        broadcast_chat_message(broadcaster, chat, msg)

    chat.save()
    return chat


def handle_promote_admin(
    chat: Any,
    actor: Contact | None,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    broadcaster: Callable[[Any, Message], None],
) -> Any:
    promoted_ids = data.get('promotedIds') or []
    promoted_contacts = contacts_from_ids(promoted_ids)

    if not promoted_contacts and 'admins' in validated_data:
        snapshot_admins = validated_data.get('admins') or []
        promoted_contacts = [get_user_contact(u) for u in snapshot_admins if u]

    actually_promoted: list[Contact] = []
    for c in promoted_contacts:
        if c not in chat.admins.all():
            chat.admins.add(c)
            actually_promoted.append(c)

    if actually_promoted and actor:
        content = '{} made {} an admin in the chat'.format(actor.user.username, format_contact_names(actually_promoted))
        msg = Message.objects.create(contact=actor, content=content, system_message=True)
        chat.messages.add(msg)
        broadcast_chat_message(broadcaster, chat, msg)

    chat.save()
    return chat


COMMAND_HANDLERS = {
    'removeMember': handle_remove_member,
    'leave': handle_leave,
    'addParticipant': handle_add_participant,
    'promoteAdmin': handle_promote_admin,
    'addAdmin': handle_promote_admin,
}


def dispatch_chat_update_command(
    chat: Any,
    command: str,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    actor: Contact | None,
    broadcaster: Callable[[Any, Message], None],
) -> Any | None:
    handler = COMMAND_HANDLERS.get(command)
    if not handler:
        return None
    return handler(chat, actor, data, validated_data, broadcaster)

