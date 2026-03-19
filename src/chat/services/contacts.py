from __future__ import annotations

from django.shortcuts import get_object_or_404

from chat.models import Contact, CustomUser


def get_user_contact(username: str) -> Contact:
    user = get_object_or_404(CustomUser, username=username)
    return get_object_or_404(Contact, user=user)

