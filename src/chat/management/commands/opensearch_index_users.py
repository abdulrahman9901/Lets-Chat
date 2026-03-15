from django.core.management.base import BaseCommand
from django.conf import settings

from chat.models import CustomUser
from chat.user_search import USER_SEARCH_INDEX


class Command(BaseCommand):
    help = "Create OpenSearch users index and index all CustomUser documents. Set OPENSEARCH_URL; USER_SEARCH_BACKEND defaults to opensearch."

    def handle(self, *args, **options):
        url = getattr(settings, 'OPENSEARCH_URL', None)
        if not url:
            self.stdout.write(self.style.WARNING("OPENSEARCH_URL is not set. Skipping."))
            return
        try:
            from opensearchpy import OpenSearch
        except ImportError:
            self.stdout.write(self.style.ERROR("opensearch-py is not installed. pip install opensearch-py"))
            return
        client = OpenSearch([url], use_ssl=url.startswith('https'))
        index = USER_SEARCH_INDEX
        if not client.indices.exists(index=index):
            client.indices.create(
                index=index,
                body={
                    "mappings": {
                        "properties": {
                            "id": {"type": "integer"},
                            "username": {"type": "text"},
                            "email": {"type": "keyword"},
                        }
                    }
                },
            )
            self.stdout.write(f"Created index {index}")
        count = 0
        for u in CustomUser.objects.all().values("id", "username", "email"):
            client.index(
                index=index,
                id=u["id"],
                body={"id": u["id"], "username": u["username"] or "", "email": (u.get("email") or "")},
                refresh=True,
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Indexed {count} users into {index}."))
