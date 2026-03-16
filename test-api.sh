#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-https://p01--lets-chat-backend--z4h9tx526rgd.code.run}"
USERNAME="${USERNAME:-alice}"
EMAIL="${EMAIL:-alice@example.com}"
PASSWORD="${PASSWORD:-password}"

echo "Using API_BASE=$API_BASE"
echo "USERNAME=$USERNAME EMAIL=$EMAIL"

echo
echo "1) Register (will fail if user already exists, that’s OK)…"
curl -sS -X POST "$API_BASE/dj-rest-auth/registration/" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"email\": \"$EMAIL\",
    \"password1\": \"$PASSWORD\",
    \"password2\": \"$PASSWORD\"
  }" || true

echo
echo
echo "2) Login and capture token…"
LOGIN_JSON="$(curl -sS -X POST "$API_BASE/dj-rest-auth/login/" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\"
  }")"

echo "Login response: $LOGIN_JSON"
TOKEN="$(printf '%s' "$LOGIN_JSON" | python -c 'import sys,json;print(json.load(sys.stdin)["key"])')"
echo "TOKEN=$TOKEN"

echo
echo "3) List chats for $USERNAME…"
curl -sS "$API_BASE/chat/?username=$USERNAME" \
  -H "Authorization: Token $TOKEN" \
  -H "Accept: application/json"
echo

echo
echo "4) User search (for typeahead) q=$USERNAME…"
curl -sS "$API_BASE/chat/users/search/?q=$USERNAME&limit=10" \
  -H "Authorization: Token $TOKEN" \
  -H "Accept: application/json"
echo

echo
echo "Done."