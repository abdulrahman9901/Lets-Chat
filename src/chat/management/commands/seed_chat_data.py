import random
from datetime import timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import CustomUser, Contact, Chat, Message
from chat.services.invite_keys import get_chat_key_for_id


USER_NAMES = [
    "alice",
    "bob",
    "charlie",
    "diana",
    "eric",
    "fatima",
    "george",
    "hana",
]


class Command(BaseCommand):
    help = "Seed database with demo users, chats, messages, images, and activity history for the chat app."

    def add_arguments(self, parser):
        parser.add_argument(
            "--chats",
            type=int,
            default=5,
            help="Number of chats to create (default: 5)",
        )
        parser.add_argument(
            "--messages",
            type=int,
            default=40,
            help="Approximate number of messages per chat (default: 40)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete existing demo data created by this command before reseeding.",
        )

    def handle(self, *args, **options):
        num_chats = options["chats"]
        messages_per_chat = options["messages"]
        force = options["force"]

        self.stdout.write(self.style.WARNING("Seeding chat data..."))

        if force:
            self._clear_existing()

        users = self._ensure_users()
        contacts = {u.username: Contact.objects.get(user=u) for u in users}

        chats = self._create_chats(
            contacts=contacts,
            num_chats=num_chats,
            messages_per_chat=messages_per_chat,
        )

        self._print_credentials(users)
        self._print_chat_keys(chats)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete: {len(users)} users, {len(contacts)} contacts, {len(chats)} chats."
            )
        )

    def _clear_existing(self):
        # Only clear demo data; leave other content intact.
        self.stdout.write("Clearing existing chats and messages...")
        Chat.objects.all().delete()
        Message.objects.all().delete()

    def _ensure_users(self):
        self.stdout.write("Ensuring demo users exist...")
        users = []
        for name in USER_NAMES:
            user, created = CustomUser.objects.get_or_create(
                username=name,
                defaults={
                    "email": f"{name}@example.com",
                    "gender": "NS",
                    "phone_number": f"+1000000{random.randint(1000, 9999)}",
                },
            )
            if created:
                user.set_password("password")
                user.save()
            Contact.objects.get_or_create(user=user)
            users.append(user)
        return users

    def _create_chats(self, contacts, num_chats, messages_per_chat):
        self.stdout.write("Creating chats, messages, and activity history...")
        all_contacts = list(contacts.values())
        chats = []

        now = timezone.now()

        for i in range(num_chats):
            participants = random.sample(
                all_contacts, k=random.randint(3, min(5, len(all_contacts)))
            )
            admins = random.sample(participants, k=1)

            chat = Chat.objects.create(name=f"Demo Chat {i + 1}")
            chat.participants.set(participants)
            chat.admins.set(admins)

            # System message: chat created
            creator = admins[0]
            created_msg = Message.objects.create(
                contact=creator,
                content=f"{creator.user.username} created the chat.",
                system_message=True,
                created_at=now - timedelta(days=2),
            )
            chat.messages.add(created_msg)

            # Activity: participants joined
            for c in participants:
                if c == creator:
                    continue
                join_msg = Message.objects.create(
                    contact=c,
                    content=f"{c.user.username} joined the chat.",
                    system_message=True,
                    created_at=now - timedelta(days=2) + timedelta(minutes=random.randint(1, 30)),
                )
                chat.messages.add(join_msg)

            # Regular messages, including some with images
            last_time = now - timedelta(days=1)
            for _ in range(messages_per_chat):
                contact = random.choice(participants)
                last_time += timedelta(minutes=random.randint(1, 15))

                # 1 in 6 messages will be an image (sometimes with caption)
                is_image = random.random() < 1 / 6
                if is_image:
                    img = self._create_dummy_image()
                    content = random.choice(
                        [
                            None,
                            "Check out this image",
                            "Screenshot from earlier",
                            "Here is what I meant.",
                        ]
                    )
                    msg = Message.objects.create(
                        contact=contact,
                        content=content,
                        system_message=False,
                        created_at=last_time,
                        image=img,
                    )
                else:
                    text = random.choice(
                        [
                            "Hey, how is it going?",
                            "This chat app is looking good.",
                            "Did you see the latest update?",
                            "I just uploaded some images.",
                            "Let’s try a group call later.",
                            "Nice, the image viewer works great.",
                        ]
                    )
                    msg = Message.objects.create(
                        contact=contact,
                        content=text,
                        system_message=False,
                        created_at=last_time,
                    )

                chat.messages.add(msg)

            chats.append(chat)

        return chats

    def _print_credentials(self, users):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("--- Log in with (password for all: password) ---"))
        for u in users:
            self.stdout.write(f"  {u.username}")
        self.stdout.write("")

    def _print_chat_keys(self, chats):
        self.stdout.write(self.style.SUCCESS("--- Chat keys (paste in Join Chat to join a chat) ---"))
        for chat in chats:
            key = get_chat_key_for_id(chat.id)
            self.stdout.write(f"  {chat.name or chat.id}: {key}")
        self.stdout.write("")

    def _create_dummy_image(self):
        # Small 1x1 PNG; frontend only needs a valid file path.
        from io import BytesIO

        try:
            from PIL import Image
        except ImportError:
            # Fallback to an empty file if Pillow is not available
            filename = f"uploads/demo-{random.randint(1000, 9999)}.png"
            return ContentFile(b"", name=filename)

        img = Image.new("RGB", (4, 4), color=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        filename = f"uploads/demo-{random.randint(1000, 9999)}.png"
        return ContentFile(buffer.getvalue(), name=filename)

