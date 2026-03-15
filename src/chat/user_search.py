from django.conf import settings
from django.db.models import Q

from chat.models import CustomUser

USER_SEARCH_INDEX = getattr(settings, 'OPENSEARCH_USER_INDEX', 'users')
USER_SEARCH_LIMIT_DEFAULT = getattr(settings, 'USER_SEARCH_LIMIT_DEFAULT', 20)


def _search_users_db(query: str, limit: int) -> list[dict]:
    if not query or not query.strip():
        return []
    q = query.strip()
    qs = (
        CustomUser.objects.filter(Q(username__icontains=q) | Q(email__icontains=q))
        .order_by('username')
        .values('id', 'username', 'email')[:limit]
    )
    return [{"id": r["id"], "username": r["username"], "email": r.get("email") or ""} for r in qs]


def _search_users_opensearch(query: str, limit: int) -> list[dict]:
    try:
        from opensearchpy import OpenSearch
    except ImportError:
        return _search_users_db(query, limit)
    url = getattr(settings, 'OPENSEARCH_URL', None)
    if not url:
        return _search_users_db(query, limit)
    client = OpenSearch([url], use_ssl=url.startswith('https'))
    index = USER_SEARCH_INDEX
    body = {
        "size": limit,
        "query": {
            "bool": {
                "should": [
                    {"match": {"username": {"query": query, "fuzziness": "AUTO"}}},
                    {"match_phrase_prefix": {"username": {"query": query}}},
                    {"wildcard": {"email": {"value": f"*{query}*", "case_insensitive": True}}},
                ]
            }
        },
        "_source": ["id", "username", "email"],
    }
    try:
        resp = client.search(index=index, body=body)
        hits = resp.get("hits", {}).get("hits", [])
        out = [
            {
                "id": h["_source"].get("id"),
                "username": h["_source"].get("username", ""),
                "email": h["_source"].get("email") or "",
            }
            for h in hits
        ]
        if not out:
            return _search_users_db(query.strip(), limit)
        return out
    except Exception:
        return _search_users_db(query.strip(), limit)


def search_users(query: str, limit: int | None = None) -> list[dict]:
    limit = limit or USER_SEARCH_LIMIT_DEFAULT
    backend = getattr(settings, 'USER_SEARCH_BACKEND', 'db')
    if backend == 'opensearch':
        return _search_users_opensearch(query, limit)
    return _search_users_db(query, limit)
