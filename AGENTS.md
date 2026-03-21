# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service | Port | Command |
|---|---|---|
| Django backend (Daphne) | 8000 | `cd src && python3 -m daphne -b 127.0.0.1 -p 8000 Justchat.asgi:application` |
| SvelteKit frontend | 5173 | `cd app-svelte && npm run dev -- --host 0.0.0.0` |

### Running the app

1. **Backend**: `cd src && python3 -m daphne -b 127.0.0.1 -p 8000 Justchat.asgi:application`
   - Requires `python3 manage.py migrate --noinput` on first run (SQLite, zero-config).
   - Uses `InMemoryChannelLayer` by default (no Redis needed for single-process dev).
2. **Frontend**: `cd app-svelte && npm run dev -- --host 0.0.0.0`
   - Copy `app-svelte/.env.example` to `app-svelte/.env` if `.env` doesn't exist. Defaults point to `127.0.0.1:8000`.

### Gotchas

- The root `package.json` scripts reference Windows paths (`.venv\Scripts\python.exe`). On Linux, run backend commands directly with `python3`.
- `svelte-check` reports 12 pre-existing TypeScript errors (type mismatches in API client body types). These are in the existing codebase.
- `python manage.py test` runs 0 tests — the project has no automated test suite.
- The `CustomRegisterSerializer.save()` method may not create `Contact` objects for new users depending on the allauth version. If user search / chat creation fails with "No Contact matches the given query", manually create contacts via Django shell: `Contact.objects.get_or_create(user=user)`.
- User search in the "Create Chat" modal uses OpenSearch by default (`USER_SEARCH_BACKEND=opensearch`). Without `OPENSEARCH_URL` configured, it falls back to DB `icontains` queries. If no users appear in search, set `USER_SEARCH_BACKEND=db` in the environment or provide `OPENSEARCH_URL`.
- Redis is optional for dev; set `REDIS_URL=redis://localhost:6379` and `docker compose up -d redis` only if you need cross-process WebSocket delivery.

### Lint / check / build

- **Svelte type check**: `cd app-svelte && npx svelte-check --tsconfig ./tsconfig.json`
- **Svelte build**: `cd app-svelte && npm run build`
- **Django check**: `cd src && python3 manage.py check`
