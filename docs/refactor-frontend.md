---
title: Frontend Refactor Log
description: Decisions and changes for SvelteKit and legacy React.
---

## Scope

This document records **all meaningful frontend changes** during the refactor:

- New SvelteKit app behavior, UI, and state management
- Legacy React app changes (if any)
- WebSocket client behavior
- Frontend auth, error handling, and logging

For each significant change, add:

- **What changed**
- **Why**
- **Implications for UX or APIs**

## 2026‑03‑17 – Slack-like participants + header actions menu

- **What changed**
  - **`ChatRoom.svelte`**: Replaced the row of header action buttons with a **Participants pill** (shows count) and a single **“…” actions menu** for global chat actions only.
  - **`ParticipantsPanel.svelte`**: Added a centered, narrower participants modal that lists participants and admins; includes search plus an `Everyone / Admins / Members` filter and admin-only member management actions. The filter control now has custom menu-like styling instead of the native select look.
  - **`stores/nav.ts`**: Added `showParticipantsPanel` state + open/close helpers.
  - **`api/client.ts`**: Fixed `apiRequest` typing so callers can pass plain payload objects without TypeScript intersection issues.
  - **Modals/popups**: Improved focusability/backdrop behavior (tabindex + Escape handling) to reduce a11y issues.
- **Why**
  - Slack-style UX keeps the header clean while still making participants and chat actions quickly accessible, while ensuring participant management only lives in one place.
- **Impact**
  - Chat header is simpler; participants are discoverable and member management is consolidated in the modal with quick filtering, and the filter control visually matches the rest of the UI. No backend API changes.

## 2026‑03‑16 – Chat open scroll to latest messages (no smooth scroll)

- **What changed**
  - **ChatRoom.svelte:** Scroll-to-bottom on message load now uses Svelte `tick()` so the scroll runs after the message list DOM is updated, and `scrollIntoView({ behavior: 'auto' })` instead of `behavior: 'smooth'`. Opening a chat shows the latest messages in view immediately without animating from the first message.
- **Why**
  - Opening a chat was starting at the first message and smooth-scrolling down to the last, which felt wrong; users expect to see the most recent messages that fit in the window, like typical chat apps.
- **Impact**
  - Initial open shows last messages in view; new messages still scroll the view to bottom instantly (no smooth scroll). No change to message order or loading.

## 2026‑03‑15 – Add Member modal search and single-bar styling

- **What changed**
  - **AddMemberModal:** Generic form rule for `input[type='text']` now excludes `.search-input` so the participant search uses only the inline bar styling (chips + input inside one bar), fixing the “two bars” look. Search uses `onSearchInput` with 120ms debounce (same as Create Chat) so typeahead runs reliably; adding a user removes them from dropdown locally instead of re-fetching.
  - **CreateChatModal:** Same exclusion for `.search-input` so the create-chat participant bar is a single bar.
- **Why**
  - Add modal search was not working and the bar looked like two nested inputs; user asked for searchable add modal and clean single bar.
- **Impact**
  - Add (and Create) participant search is one clear bar with chips and typeahead; search runs on type.

## 2026‑03‑15 – Unified modal width

- **What changed**
  - `app.css`: added `--modal-width: min(420px, 92vw)` in `:root`.
  - CreateChatModal, AddMemberModal, JoinChatModal, KickMemberModal, ChatKeyPopup, ConfirmModal, UploadModal: `.modal` / `.popup` now use `width: var(--modal-width)` and `max-width: var(--modal-width)`; removed `min-width` so width is fixed and consistent.
- **Why**
  - User requested fixed popup width and the same width for Create/Join chat, Kick/Add member, and Chat key popups relative to screen.
- **Impact**
  - All listed modals share one responsive width; no resizing between popups.

## 2026‑03‑15 – User search typeahead (add member / create chat)

- **What changed**
  - **API:** `searchUsers(q, limit)` in `$lib/api/chat.ts` calls `GET /chat/users/search/?q=...&limit=...` and returns `UserSearchHit[]` (`id`, `username`, `email`). Used for any flow that targets users.
  - **AddMemberModal and CreateChatModal:** Single “Add participants” flow: one search input (placeholder “Search by name or email, then click to add”), debounced typeahead dropdown, and selected users shown as removable chips below. Removed the second “Contacts (usernames, comma-separated)” text field to avoid two search-like fields; participants are added only via search and removed via chip ×. Results exclude already-selected participants (and in Create Chat, the current user).
- **Why**
  - User requested fast user search (DB or OpenSearch) and similar-name results; a single search + chips UX avoids confusion between “search” and “contacts” fields.
- **Impact**
  - One clear field for finding and adding users; selected list is visible as chips and editable (remove only). Same API and backend behavior as before.

## 2026‑03‑17 – Shared user search bar, modal reset, and favicon fix

- **What changed**
  - Extracted a reusable `UserSearchBar.svelte` component used by `CreateChatModal` and `AddMemberModal` for participant search (chips + debounced dropdown + styles) and wired it to accept an `exclude` list so existing chat members / current user are never suggested. Both modals now reset their `$state` (selected participants, error, loading) when the popup closes, matching `ChatKeyPopup`’s cleanup behavior. The favicon SVG path was corrected (`h-.5` instead of `h- .5`) so strict parsers render it reliably, and the obsolete `apiFormData` wrapper was removed in favor of `apiFormDataWithProgress`.
- **Why**
  - Avoided ~90 lines of duplicated logic/styles, fixed stale state across modal open/close cycles, ensured users cannot try to add existing participants, and cleaned up SVG / dead API code surfaced during review.
- **Impact**
  - Participant search UX is consistent and resilient across modals, the favicon renders correctly in all browsers, and the API client surface area stays minimal (no unused exports).

## 2026‑03‑17 – Participants filter styled as menu control

- **What changed**
  - Updated the `ParticipantsPanel.svelte` filter `<select>` to use a pill-like, rounded style with subtle background, border, and hover states, plus a custom caret, closely matching the header `icon-btn`/menu visual language rather than the browser’s native select look.
- **Why**
  - To make the participants filter feel like part of the same Slack-like header/menu system and avoid the jarring native dropdown styling.
- **Impact**
  - Filter dropdown now visually matches surrounding controls while keeping native keyboard behavior and accessibility semantics.

## 2026‑03‑15 – Image groups and gallery (WhatsApp-style)

- **What changed**
  - **Grouping:** Consecutive image-only messages from the same author are rendered as a single block (`messageBlocks` derived from `dedupedMessages`). Blocks are either `system`, `single`, or `imageGroup`.
  - **Grid in timeline:** Image groups show up to 4 thumbnails in a grid (2×2; 3 images use one large + two small). If the group has more than 4 images, the 4th cell shows a “+N” overlay (e.g. +8 for 12 images).
  - **Alignment:** Sent image groups use `margin-left: auto` so they align right; replies stay left.
  - **Gallery popup:** Clicking the image group opens a scrollable fullscreen-style popup listing all images in that group (grid of thumbnails). Header shows “N images” and a Close (X) button. Clicking an image opens the single-image fullscreen viewer (with download and X). Closing the image viewer does not close the gallery so the user can open another image from the same group.
  - **Single-image viewer:** Unchanged (fullscreen overlay, download + X, Escape/overlay to close). Gallery closes only via its Close button, overlay click, or Escape when the viewer is not open.
- **Why**
  - Match WhatsApp-style presentation when many images are sent in a batch: one block with preview and count, expandable to browse all.
- **Impact**
  - Fewer list items for multi-image bursts; sent/received alignment is correct; users can open a group, scroll all images, and open/close the viewer without losing the gallery.

## 2026‑03‑15 – Fullscreen image viewer and download

- **What changed**
  - Chat images in the timeline are clickable; clicking opens a fullscreen overlay with the image, a download icon button, and an X (close) button. Download uses the backend endpoint `GET /chat/media/download/?file=<mediaPath>` via a hidden iframe so the browser triggers a file download instead of opening the image in a new tab.
  - `expandedImage` state holds `url`, `filename`, and `mediaPath`; `openImageFromGroup` opens the same viewer from the gallery without closing the gallery.
- **Why**
  - Users wanted a proper fullscreen view and reliable download (cross-origin fetch was opening in a new tab). Backend download endpoint returns `Content-Disposition: attachment`.
- **Impact**
  - View and download work consistently; gallery and single-image viewer coexist (close viewer → gallery stays open).

## 2026‑03‑15 – Upload modal: progress, count, and scroll

- **What changed**
  - **Cap:** 50 images per upload (`MAX_FILES_PER_UPLOAD`). When adding files, only up to 50 total are kept; extra selections are dropped. Hint: “Max 50 images per upload.”
  - **Selected count:** When at least one file is selected, the hint shows “X image(s) selected” (accent styling) so the user always sees how many are selected.
  - **Progress:** Upload uses `apiFormDataWithProgress` (XHR) so upload progress is reported. While uploading, a progress section shows “Uploading N images — X%” and a progress bar. `uploadPercent` is reset when the popup closes or upload finishes.
  - **Scroll:** Modal has `max-height: calc(100vh - 48px)` and `overflow-y: auto` so many files don’t exceed viewport height.
  - **API:** `app-svelte/src/lib/api/client.ts` exposes `apiFormDataWithProgress(endpoint, formData, onProgress?)` using `XMLHttpRequest` and `xhr.upload.onprogress` to report 0–100% when `lengthComputable`. `apiFormData` calls it without a callback. `uploadToChat` in `chat.ts` accepts an optional `onProgress` and passes it through so the modal can show the bar.
- **Why**
  - Backend enforces `DATA_UPLOAD_MAX_NUMBER_FILES = 50`; frontend cap and hint avoid server error and give clear feedback. Progress and count improve UX for large batches; scroll prevents layout overflow.
- **Impact**
  - Users see selected count, max limit, upload progress, and a scrollable modal; they cannot submit more than 50 files in one request.

## 2026‑03‑15 – Chat header icon and message name visibility

- **What changed**
  - **ChatRoom header:** Replaced generic image with a chat-bubble SVG icon in a rounded container (accent background). Chat name is in a `.chat-name` span with bolder font and stronger color for visibility.
  - **MessageBlock:** Sender names now show a small user/avatar SVG icon beside the name. Names use distinct colors: sent (you) = accent blue (`#38bdf8`), other participants use a stable color chosen from a palette based on their username (hash), and left-chat users use a muted color (`--Text-Heading-Medium`). Name row uses `name-row` + `name-sender` / `name-reciever` / `name-out` and slightly larger, bolder text.
- **Why**
  - User asked for an image icon beside the name in the chat room and for names to be more visible with different colors.
- **Impact**
  - Header and message authors are easier to scan; sent vs received vs left-chat is clear by color and icon, and different participants are color-distinct within a chat.

## 2026‑03‑15 – ChatRoom split into smaller components (separation of concerns)

- **What changed**
  - `ChatRoom.svelte` was reduced from ~910 lines by extracting: **ChatKeyPopup.svelte** (chat key modal, copy + “Copied!” tooltip), **ImageViewer.svelte** (fullscreen image + download), **ImageGallery.svelte** (group image gallery popup), **ConfirmModal.svelte** (leave/delete confirmation), **MessageBlock.svelte** (system/single/imageGroup rendering and styles), and **`$lib/utils/format.ts`** (`formatMessageTimestamp`). ChatRoom now composes these components and keeps only layout (contact-profile, messages area, messages-dial), placeholder states, message-block derivation, and escape handling.
- **Why**
  - Minimum file size and clearer separation of concerns: each modal and the message block have their own file and styles; ChatRoom stays focused on room state and composition.
- **Impact**
  - Easier to maintain and test; no behavior change. Chat key, image viewer, gallery, confirm dialog, and message list rendering are in dedicated components.

## 2026‑03‑15 – Chat key popup (click to show)

- **What changed**
  - In `app-svelte/src/lib/components/ChatRoom.svelte`, the chat key for admins is no longer shown only via the native `title` tooltip. Clicking “@chatkey” opens a modal that shows the key in a row with a copy button (icon) and a styled Close button. Copy uses `navigator.clipboard.writeText`; after copy, the button shows a checkmark and a “Copied!” tooltip above it for ~2.5s (tooltip does not change button size). Popup width is constrained (`max-width: 320px`). Escape or overlay click closes the popup; `<svelte:window onkeydown>` for Escape is at component top level (not inside blocks). Ref: `handleEscape`, `copyChatKey`, `copiedFeedback`, `chatkey-popup`, `chatkey-row`, `chatkey-copy`, `chatkey-close`. Implementation has since moved to **ChatKeyPopup.svelte** (see “ChatRoom split” entry).
- **Why**
  - The “chatkey popup” was not working: the React app used a click-triggered Popover; Svelte had only a hover tooltip. Click-to-show with copy and clear close matches the original and supports copy-paste.
- **Impact**
  - Admins can click @chatkey to see and copy the key; no change for non-admins or when `chatKey` is null.

## 2026‑03‑14 – WebSocket chat switch performance

- **What changed**
  - Added a small send queue in `app-svelte/src/lib/websocket.ts` so any WebSocket messages issued while the socket is connecting are queued and flushed on `onopen`.
  - Removed the `waitForSocket` polling loop from `app-svelte/src/lib/components/ChatRoom.svelte` and now call `ws.connect(chatId)` and `ws.fetchMessages(currentUser, chatId, 50)` directly when `chatId` changes.
- **Why**
  - Switching chats took 5–10 seconds because the UI waited for a socket to reach `OPEN` while the connection was repeatedly opened/closed, and early `load_messages` commands were lost.
- **Impact**
  - Chat switching now feels effectively immediate; messages load as soon as the socket opens without polling, and transient connection churn no longer blocks navigation.

## 2026‑03 – Single persistent WebSocket + per-room cache

- **What changed**
  - **WebSocket:** One connection to `ws/chat/` (no room in path). `connect(roomId)` sends `leave_room` for the current room (if any), then `join_room(roomId)`. Pending messages are queued until open and flushed on `onopen`. Reconnect uses the last room.
  - **Store:** Per-room cache `roomCache: Map<roomId, RoomCache>` and `setCurrentRoom(roomId)` to show cached messages/participants/name/admins/chatKey for that room. `setMessages` and `addMessage` update cache and, when `room_id === currentRoomId`, the reactive stores. Backend now sends `room_id` in the `messages` response.
  - **ChatRoom:** On chat change, `setCurrentRoom(chatId)` first (instant UI from cache), then `ws.connect(chatId)` and `fetchMessages`. Removed refetch after sending a message (server echoes `new_message`).
- **Why**
  - Production-ready behavior: no new connection per room, instant switch using cache, single source of truth for “current room” and subscriptions.
- **Impact**
  - Switching chats is immediate (cache) and one round-trip for fresh messages; scales to many chats and many messages.

