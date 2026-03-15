<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { username } from '$lib/stores/auth';
	import {
		messages,
		participants,
		participantsCount,
		chatName,
		admins,
		chatKey,
		setChats,
		setCurrentRoom,
		type ChatMessage,
	} from '$lib/stores/message';
	import { API_BASE_URL } from '$lib/config';
	import * as ws from '$lib/websocket';
	import { getChats } from '$lib/api/chat';
	import { leaveChat, deleteChat } from '$lib/api/chat';
	import {
		openAddMemberPopup,
		openKickMemberPopup,
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
	let expandedImage = $state<{ url: string; filename: string; mediaPath: string } | null>(null);
	let expandedImageGroup = $state<ChatMessage[] | null>(null);
	let messagesEnd = $state<HTMLDivElement | undefined>(undefined);

	let validChatId = $derived(chatId && chatId !== '' && chatId !== 'undefined' && !isNaN(parseInt(chatId, 10)));
	let currentUser = $derived($username ?? '');
	let isParticipant = $derived($participants.length > 0 && $participants.includes(currentUser));
	let isAdmin = $derived($admins.includes(currentUser));

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
		const withoutSelf = $participants.filter((p) => p !== currentUser);
		leaveChat(chatId!, withoutSelf)
			.then(() => {
				getChats(currentUser).then(setChats);
				goto('/');
			})
			.catch(() => {});
		showConfirm = null;
	}

	function doDelete() {
		if (!validChatId) return;
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
		}
	}

	function openImageGroup(messages: ChatMessage[]) {
		expandedImageGroup = messages;
	}

	function openImageFromGroup(msg: ChatMessage) {
		if (!msg.image) return;
		openImage(`${API_BASE_URL}/media/${msg.image}`, msg.image);
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
		<a href="/" class="btn back">←</a>
		<div class="chat-icon" aria-hidden="true">
			<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
		</div>
		<p class="chat-title">
			<span class="chat-name">{$chatName ?? `Chat # ${chatId}`}</span>
			{#if isAdmin && $chatKey}
				<button type="button" class="chatkey" title="Click to show chat key" onclick={() => (showChatKeyPopup = true)}>@chatkey</button>
			{/if}
		</p>
		<div class="actions">
			<button type="button" class="dropdown-btn" onclick={() => (showConfirm = { action: 'leave', fn: doLeave })}>
				Leave Chat
			</button>
			<button
				type="button"
				class="dropdown-btn"
				disabled={!isAdmin}
				onclick={() => openAddMemberPopup()}
			>
				Add member(s)
			</button>
			<button
				type="button"
				class="dropdown-btn"
				disabled={!isAdmin}
				onclick={() => openKickMemberPopup()}
			>
				Kick member(s)
			</button>
			<button
				type="button"
				class="dropdown-btn"
				disabled={!isAdmin}
				onclick={() => (showConfirm = { action: 'delete', fn: doDelete })}
			>
				Delete the Chat
			</button>
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
	.contact-profile .back {
		color: var(--Text-Heading-Strong);
		text-decoration: none;
		font-size: 18px;
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
	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.dropdown-btn {
		padding: 8px 12px;
		background: var(--Button-Secondary-Default-Background-subtle);
		border: 1px solid var(--Button-Secondary-Default-Border);
		border-radius: 8px;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 13px;
	}
	.dropdown-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		resize: none;
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
</style>
