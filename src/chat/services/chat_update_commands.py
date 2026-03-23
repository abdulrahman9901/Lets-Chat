from __future__ import annotations

from collections.abc import Callable
from typing import Any

from django.db.models import QuerySet, Q

from chat.models import Contact, CustomUser, Message

from chat.services.contacts import get_user_contact


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
    # `ids` can come from either:
    # - Contact.id (participants/admins snapshots)
    # - CustomUser.id (user search results)
    ids_set = set(ids)
    base_contacts = Contact.objects.select_related('user').filter(Q(id__in=ids_set) | Q(user__id__in=ids_set))

    # If the frontend sends CustomUser.id but the Contact row is missing,
    # ensure we create it so M2M relations are applied correctly.
    user_ids_from_input = list(ids_set)
    existing_contact_user_ids = set(base_contacts.values_list('user__id', flat=True))
    users = CustomUser.objects.filter(id__in=user_ids_from_input).exclude(id__in=existing_contact_user_ids)

    if users.exists():
        Contact.objects.bulk_create([Contact(user=u) for u in users])

    return list(
        Contact.objects.select_related('user').filter(Q(id__in=ids_set) | Q(user__id__in=ids_set)),
    )


def contacts_from_user_ids(user_ids: list[int] | None) -> list[Contact]:
    if not user_ids:
        return []

    user_ids_set = set(user_ids)
    base_contacts = Contact.objects.select_related('user').filter(user__id__in=user_ids_set)
    existing_contact_user_ids = set(base_contacts.values_list('user__id', flat=True))
    users = CustomUser.objects.filter(id__in=user_ids_set).exclude(id__in=existing_contact_user_ids)

    if users.exists():
        Contact.objects.bulk_create([Contact(user=u) for u in users])

    return list(Contact.objects.select_related('user').filter(user__id__in=user_ids_set))


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
    existing_participant_ids = set(chat.participants.values_list('id', flat=True))
    existing_admin_ids = set(chat.admins.values_list('id', flat=True))

    removed_contacts = contacts_from_ids(removed_ids)
    removed_map = {c.id: c for c in removed_contacts}
    actually_removed_ids = set(removed_map.keys()) & existing_participant_ids
    actually_removed = [removed_map[cid] for cid in actually_removed_ids]

    if not actually_removed and 'participants' in validated_data:
        snapshot_usernames = validated_data.get('participants') or []
        snapshot_ids = set(
            Contact.objects.filter(user__username__in=snapshot_usernames).values_list('id', flat=True)
        )
        actually_removed_ids = existing_participant_ids - snapshot_ids
        actually_removed = list(
            Contact.objects.select_related('user').filter(id__in=actually_removed_ids)
        )

    if actually_removed:
        chat.participants.remove(*actually_removed)
        admins_to_remove = [c for c in actually_removed if c.id in existing_admin_ids]
        if admins_to_remove:
            chat.admins.remove(*admins_to_remove)

    if actually_removed and actor:
        content = '{} removed {} from this chat.'.format(
            actor.user.username,
            format_contact_names(actually_removed),
        )
        msg = Message.objects.create(contact=actor, content=content, system_message=True)
        chat.messages.add(msg)
        broadcast_chat_message(broadcaster, chat, msg)

    return chat


def handle_leave(
    chat: Any,
    actor: Contact | None,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    broadcaster: Callable[[Any, Message], None],
) -> Any:
    if actor and chat.participants.filter(id=actor.id).exists():
        chat.participants.remove(actor)
        if chat.admins.filter(id=actor.id).exists():
            chat.admins.remove(actor)
        content = '{} left this chat.'.format(actor.user.username)
        msg = Message.objects.create(contact=actor, content=content, system_message=True)
        chat.messages.add(msg)
        broadcast_chat_message(broadcaster, chat, msg)
    return chat


def handle_add_participant(
    chat: Any,
    actor: Contact | None,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    broadcaster: Callable[[Any, Message], None],
) -> Any:
    added_ids = data.get('addedIds') or []
    added_contacts = contacts_from_user_ids(added_ids)

    if not added_contacts and 'participants' in validated_data:
        snapshot_usernames = validated_data.get('participants') or []
        added_contacts = [get_user_contact(u) for u in snapshot_usernames if u]

    existing_participant_ids = set(chat.participants.values_list('id', flat=True))
    existing_admin_ids = set(chat.admins.values_list('id', flat=True))

    actually_added: list[Contact] = []
    missing_participants_from_added = [c for c in added_contacts if c.id not in existing_participant_ids]
    if missing_participants_from_added:
        chat.participants.add(*missing_participants_from_added)
        actually_added.extend(missing_participants_from_added)
        existing_participant_ids.update({c.id for c in missing_participants_from_added})

    promoted_ids = data.get('promotedIds') or []
    promoted_contacts = contacts_from_user_ids(promoted_ids)

    missing_participants_from_promoted = [
        c for c in promoted_contacts if c.id not in existing_participant_ids
    ]
    if missing_participants_from_promoted:
        chat.participants.add(*missing_participants_from_promoted)
        actually_added.extend(missing_participants_from_promoted)
        existing_participant_ids.update({c.id for c in missing_participants_from_promoted})

    missing_admins = [c for c in promoted_contacts if c.id not in existing_admin_ids]
    if missing_admins:
        chat.admins.add(*missing_admins)
        existing_admin_ids.update({c.id for c in missing_admins})

    if actor:
        if actually_added:
            content = '{} added {} to this chat.'.format(
                actor.user.username,
                format_contact_names(actually_added),
            )
            msg = Message.objects.create(contact=actor, content=content, system_message=True)
            chat.messages.add(msg)
            broadcast_chat_message(broadcaster, chat, msg)
        elif missing_admins:
            content = '{} promoted {} to admin.'.format(
                actor.user.username,
                format_contact_names(missing_admins),
            )
            msg = Message.objects.create(contact=actor, content=content, system_message=True)
            chat.messages.add(msg)
            broadcast_chat_message(broadcaster, chat, msg)
    return chat


def handle_promote_admin(
    chat: Any,
    actor: Contact | None,
    data: dict[str, Any],
    validated_data: dict[str, Any],
    broadcaster: Callable[[Any, Message], None],
) -> Any:
    promoted_ids = data.get('promotedIds') or []
    promoted_contacts = contacts_from_user_ids(promoted_ids)

    existing_admin_ids = set(chat.admins.values_list('id', flat=True))
    actually_promoted = [c for c in promoted_contacts if c.id not in existing_admin_ids]
    if actually_promoted:
        chat.admins.add(*actually_promoted)

    if actually_promoted and actor:
        content = '{} promoted {} to admin.'.format(
            actor.user.username,
            format_contact_names(actually_promoted),
        )
        msg = Message.objects.create(contact=actor, content=content, system_message=True)
        chat.messages.add(msg)
        broadcast_chat_message(broadcaster, chat, msg)
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

