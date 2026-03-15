<script lang="ts">
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
		messagesEnd?.scrollIntoView({ behavior: 'smooth' });
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
		<img src="https://img.icons8.com/pastel-glyph/128/2C3E50/communication--v1.png" alt="" />
		<p>
			{$chatName ?? `Chat # ${chatId}`}
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
					<button type="submit" class="submit submit-msg" aria-label="Send">↗</button>
					<button type="button" class="attach" onclick={() => openUploadPopup()} aria-label="Attach">📎</button>
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
	.contact-profile img {
		width: 48px;
		height: 48px;
	}
	.contact-profile p {
		flex: 1;
		margin: 0;
		font-size: 16px;
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
		padding: 10px 14px;
		background: var(--Button-Secondary-Default-Background-subtle);
		border: 1px solid var(--Button-Secondary-Default-Border);
		border-radius: 12px;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
	}
</style>
