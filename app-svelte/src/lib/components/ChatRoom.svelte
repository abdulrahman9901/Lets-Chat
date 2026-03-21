<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { username } from '$lib/stores/auth';
	import {
		messages,
		participants,
		participantsMeta,
		participantsCount,
		chatName,
		admins,
		adminsMeta,
		chatKey,
		setChats,
		setCurrentRoom,
		type ChatMessage,
	} from '$lib/stores/message';
	import * as ws from '$lib/websocket';
	import { getChats } from '$lib/api/chat';
	import { leaveChat, deleteChat } from '$lib/api/chat';
	import { mediaInlineUrl } from '$lib/utils/media';
	import {
		openAddMemberPopup,
		openParticipantsPanel,
		openSidepanel,
		openUploadPopup,
	} from '$lib/stores/nav';
	import ChatKeyPopup from '$lib/components/ChatKeyPopup.svelte';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import ImageGallery from '$lib/components/ImageGallery.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import MessageBlock from '$lib/components/MessageBlock.svelte';

	interface Props {
		chatId: string | undefined;
	}

	let { chatId } = $props();

	let messageInput = $state('');
	let showConfirm = $state<{ action: 'leave' | 'delete'; fn: () => void } | null>(null);
	let showChatKeyPopup = $state(false);
	let showHeaderMenu = $state(false);
	let expandedImage = $state<{ url: string; filename: string; mediaPath: string } | null>(null);
	let expandedImageGroup = $state<ChatMessage[] | null>(null);
	let messagesEnd = $state<HTMLDivElement | undefined>(undefined);

	let validChatId = $derived(chatId && chatId !== '' && chatId !== 'undefined' && !isNaN(parseInt(chatId, 10)));
	let currentUser = $derived($username ?? '');
	let isParticipant = $derived($participants.length > 0 && $participants.includes(currentUser));
	let isAdmin = $derived($admins.includes(currentUser));
	let actorId = $derived(
		($participantsMeta ?? []).find((p) => p.username === currentUser)?.id ??
			($adminsMeta ?? []).find((p) => p.username === currentUser)?.id ??
			null
	);

	$effect(() => {
		if (!validChatId) {
			setCurrentRoom(null);
			return;
		}
		setCurrentRoom(chatId!);
		ws.connect(chatId);
		ws.fetchMessages(currentUser, chatId!, 50);
	});

	$effect(() => {
		const _ = $messages;
		tick().then(() => {
			messagesEnd?.scrollIntoView({ behavior: 'auto' });
		});
	});

	function sendMessage(e: SubmitEvent) {
		e.preventDefault();
		const content = messageInput.trim();
		if (!content || !validChatId) return;
		ws.newChatMessage({
			from: currentUser,
			content,
			chatId: chatId!,
		});
		messageInput = '';
	}

	function doLeave() {
		if (!validChatId || !currentUser) return;
		if (!actorId) return;
		leaveChat(chatId!, actorId)
			.then(() => {
				getChats(currentUser).then(setChats);
				goto('/');
			})
			.catch(() => {});
		showConfirm = null;
	}

	function doDelete() {
		if (!validChatId || !isAdmin) return;
		deleteChat(chatId!)
			.then(() => {
				getChats(currentUser).then(setChats);
				goto('/');
			})
			.catch(() => {});
		showConfirm = null;
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (expandedImage) expandedImage = null;
			else if (expandedImageGroup) expandedImageGroup = null;
			else showChatKeyPopup = false;
			showHeaderMenu = false;
		}
	}

	function onHeaderMenuClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement | null;
		if (!target) return;
		if (target.closest('[data-header-menu-root]')) return;
		showHeaderMenu = false;
	}

	$effect(() => {
		if (!showHeaderMenu) return;
		window.addEventListener('click', onHeaderMenuClickOutside, true);
		return () => window.removeEventListener('click', onHeaderMenuClickOutside, true);
	});

	function runHeaderAction(fn: () => void) {
		showHeaderMenu = false;
		fn();
	}

	function openImageGroup(messages: ChatMessage[]) {
		expandedImageGroup = messages;
	}

	function openImageFromGroup(msg: ChatMessage) {
		if (!msg.image) return;
		openImage(mediaInlineUrl(msg.image), msg.image);
	}

	function openImage(url: string, path: string) {
		const filename = path.split(/[/\\]/).pop() ?? 'image';
		expandedImage = { url, filename, mediaPath: path };
	}

	type MessageBlockType =
		| { type: 'system'; msg: ChatMessage }
		| { type: 'single'; msg: ChatMessage }
		| { type: 'imageGroup'; messages: ChatMessage[] };

	function isImageMsg(m: ChatMessage): boolean {
		return m.content == null && m.image != null && m.image !== '';
	}

	let dedupedMessages = $derived([...new Map(($messages ?? []).map((m) => [m.id, m])).values()]);

	let messageBlocks = $derived.by((): MessageBlockType[] => {
		const list = dedupedMessages;
		const blocks: MessageBlockType[] = [];
		let i = 0;
		while (i < list.length) {
			const msg = list[i];
			if (msg.system_message) {
				blocks.push({ type: 'system', msg });
				i += 1;
				continue;
			}
			if (isImageMsg(msg)) {
				let j = i;
				while (j + 1 < list.length && list[j + 1].author === msg.author && isImageMsg(list[j + 1])) {
					j += 1;
				}
				if (j > i) {
					blocks.push({ type: 'imageGroup', messages: list.slice(i, j + 1) });
					i = j + 1;
				} else {
					blocks.push({ type: 'single', msg });
					i += 1;
				}
				continue;
			}
			blocks.push({ type: 'single', msg });
			i += 1;
		}
		return blocks;
	});
</script>

<svelte:window onkeydown={handleEscape} />

{#if !validChatId}
	<div class="placeholder">
		<p>Select a chat or create one.</p>
	</div>
{:else if !isParticipant}
	<div class="placeholder">
		<p>You are not in this chat.</p>
	</div>
{:else}
	<div class="contact-profile">
		<button type="button" class="btn hamburger" aria-label="Open chats list" onclick={openSidepanel}>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>
		<div class="chat-icon" aria-hidden="true">
			<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
		</div>
		<p class="chat-title">
			<span class="chat-name">{$chatName ?? `Chat # ${chatId}`}</span>
			{#if isAdmin && $chatKey}
				<button type="button" class="chatkey" title="Click to show chat key" onclick={() => (showChatKeyPopup = true)}>@chatkey</button>
			{/if}
		</p>
		<div class="header-actions" data-header-menu-root>
			<button type="button" class="pill" onclick={() => runHeaderAction(openParticipantsPanel)} aria-label="Show participants">
				<span class="pill-icon" aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</span>
				<span class="pill-text">Participants</span>
				<span class="pill-count" aria-label="Participant count">{$participantsCount}</span>
			</button>

			<div class="menu">
				<button
					type="button"
					class="icon-btn"
					aria-haspopup="menu"
					aria-expanded={showHeaderMenu}
					aria-label="Chat actions"
					onclick={() => (showHeaderMenu = !showHeaderMenu)}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="12" cy="12" r="1" />
						<circle cx="19" cy="12" r="1" />
						<circle cx="5" cy="12" r="1" />
					</svg>
				</button>
				{#if showHeaderMenu}
					<div class="menu-pop" role="menu" aria-label="Chat actions menu">
						<button type="button" class="menu-item" role="menuitem" onclick={() => runHeaderAction(() => (showConfirm = { action: 'leave', fn: doLeave }))}>
							Leave chat
						</button>
						{#if isAdmin}
							<hr class="menu-sep" />
							<button
								type="button"
								class="menu-item danger"
								role="menuitem"
								onclick={() => runHeaderAction(() => (showConfirm = { action: 'delete', fn: doDelete }))}
							>
								Delete chat
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div id="messagesWindow" class="messages">
		<ul class="chat-log">
			{#each messageBlocks as block (block.type === 'imageGroup' ? block.messages.map((m) => m.id).join('-') : block.msg.id)}
				<MessageBlock
					{block}
					{currentUser}
					participants={$participants}
					participantsCount={$participantsCount}
					onOpenImage={openImage}
					onOpenImageGroup={openImageGroup}
				/>
			{/each}
			<li><div bind:this={messagesEnd} style="float: left; clear: both"></div></li>
		</ul>
	</div>

	<div class="messages-dial">
		<form onsubmit={sendMessage}>
			<div class="message-input">
				<div class="wrap">
					<textarea
						bind:value={messageInput}
						placeholder="Write your message..."
						rows="1"
						onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), document.querySelector<HTMLButtonElement>('.submit-msg')?.click())}
					></textarea>
					<button type="submit" class="submit submit-msg" aria-label="Send">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
					</button>
					<button type="button" class="attach" onclick={() => openUploadPopup()} aria-label="Attach">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
					</button>
				</div>
			</div>
		</form>
	</div>
{/if}

<ChatKeyPopup open={showChatKeyPopup} chatKey={$chatKey} onClose={() => (showChatKeyPopup = false)} />

<ImageGallery
	images={expandedImageGroup}
	onClose={() => (expandedImageGroup = null)}
	onSelectImage={openImageFromGroup}
/>

<ImageViewer image={expandedImage} onClose={() => (expandedImage = null)} />

<ConfirmModal
	open={showConfirm !== null}
	action={showConfirm?.action ?? 'leave'}
	onConfirm={() => showConfirm?.fn()}
	onCancel={() => (showConfirm = null)}
/>

<style>
	.placeholder {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--Text-Heading-Medium);
	}
	.contact-profile {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--Border-Subtle);
		background: var(--Background-Lift-8);
	}
	.contact-profile .hamburger {
		display: none;
	}
	.chat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: rgba(56, 189, 248, 0.2);
		color: var(--accent-glow);
		flex-shrink: 0;
	}
	.contact-profile p.chat-title {
		flex: 1;
		margin: 0;
		font-size: 16px;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chat-name {
		font-weight: 700;
		color: var(--Text-Heading-Strong);
		letter-spacing: 0.02em;
	}
	.chatkey {
		cursor: pointer;
		color: var(--accent-glow);
		margin-left: 8px;
		background: none;
		border: none;
		font: inherit;
		padding: 0;
	}
	.chatkey:hover {
		text-decoration: underline;
	}
	.header-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		background: rgba(242, 242, 242, 0.06);
		border: 1px solid var(--Border-Subtle);
		border-radius: 999px;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 13px;
		white-space: nowrap;
	}
	.pill:hover {
		color: var(--accent-glow);
	}
	.pill-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		opacity: 0.95;
	}
	.pill-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(56, 189, 248, 0.16);
		color: var(--accent-glow);
		font-weight: 750;
	}
	.menu {
		position: relative;
	}
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		border-radius: 10px;
		background: transparent;
		border: 1px solid var(--Border-Subtle);
		color: var(--Text-Heading-Strong);
		cursor: pointer;
	}
	.icon-btn:hover {
		color: var(--accent-glow);
	}
	.menu-pop {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		min-width: 200px;
		background: var(--Background-Lift-8);
		border: 1px solid var(--Border-Subtle);
		border-radius: 12px;
		padding: 6px;
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
		z-index: 20;
	}
	.menu-item {
		width: 100%;
		text-align: left;
		padding: 10px 10px;
		border: none;
		border-radius: 10px;
		background: transparent;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 13px;
	}
	.menu-item:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
	}
	.menu-item:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.menu-sep {
		border: none;
		border-top: 1px solid var(--Border-Subtle);
		margin: 6px 6px;
	}
	.menu-item.danger {
		color: #fb7185;
	}
	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}
	.chat-log {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.messages-dial {
		padding: 12px 16px;
		border-top: 1px solid var(--Border-Subtle);
		background: var(--Background-Lift-8);
	}
	.message-input .wrap {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}
	.message-input textarea {
		flex: 1;
		min-height: 44px;
		padding: 10px 12px;
		background: rgba(242, 242, 242, 0.08);
		border: 1px solid var(--Border-Subtle);
		border-radius: 12px;
		color: var(--Text-Heading-Strong);
		font-size: 15px;
		line-height: 1.35;
		resize: none;
	}

	.message-input textarea::placeholder {
		font-size: inherit;
		line-height: inherit;
	}
	.message-input .submit,
	.message-input .attach {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px 14px;
		background: var(--Button-Secondary-Default-Background-subtle);
		border: 1px solid var(--Button-Secondary-Default-Border);
		border-radius: 12px;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
	}
	.message-input .submit:hover,
	.message-input .attach:hover {
		color: var(--accent-glow);
	}

	@media (max-width: 768px) {
		.contact-profile {
			padding: 10px 10px;
			gap: 10px;
		}

		.chat-icon {
			display: none;
		}

		.contact-profile p.chat-title {
			font-size: 15px;
		}

		.header-actions {
			gap: 6px;
			flex-wrap: wrap;
			justify-content: flex-end;
		}

		.pill-text {
			display: none;
		}

		.pill {
			padding: 8px 8px;
		}

		.messages {
			padding: 12px 10px;
		}

		.messages-dial {
			padding: 10px 10px;
		}

		.message-input textarea {
			font-size: 14px;
		}

		.message-input .wrap {
			gap: 6px;
		}

		.message-input .submit,
		.message-input .attach {
			padding: 10px 12px;
		}
	}

	@media (max-width: 310px) {
		.message-input .wrap {
			gap: 4px;
		}

		.message-input textarea {
			min-height: 40px;
			padding: 8px 10px;
			font-size: 13px;
		}

		.message-input .submit,
		.message-input .attach {
			padding: 8px 10px;
		}

		.message-input .submit svg,
		.message-input .attach svg {
			width: 18px;
			height: 18px;
		}
	}
</style>
