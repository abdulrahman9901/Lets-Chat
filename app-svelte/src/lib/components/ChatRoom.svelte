<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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
	import { leaveChat, deleteChat, addParticipants, kickMembers } from '$lib/api/chat';
	import {
		openAddMemberPopup,
		openKickMemberPopup,
		openUploadPopup,
	} from '$lib/stores/nav';
	import { onMount } from 'svelte';

	interface Props {
		chatId: string | undefined;
	}

let { chatId } = $props();

let messageInput = $state('');
let showConfirm = $state<{ action: 'leave' | 'delete'; fn: () => void } | null>(null);
let showChatKeyPopup = $state(false);
let copiedFeedback = $state(false);
let copiedFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
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

	function timestampDisplay(ts: string): string {
		const diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
		const d = new Date(ts);
		if (diff < 1) return 'just now...';
		if (diff < 60) return diff < 2 ? 'one min. ago' : `${diff} mins. ago`;
		if (diff < 24 * 60) return diff < 120 ? 'one hour ago' : `${Math.round(diff / 60)} hours ago`;
		if (diff < 31 * 24 * 60)
			return diff < 48 * 60 ? 'a day ago' : `${Math.round(diff / (60 * 24))} days ago`;
		return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}`;
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

	function downloadImage() {
		if (!expandedImage) return;
		const downloadUrl = `${API_BASE_URL}/chat/media/download/?file=${encodeURIComponent(expandedImage.mediaPath)}`;
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.setAttribute('src', downloadUrl);
		document.body.appendChild(iframe);
		setTimeout(() => document.body.removeChild(iframe), 5000);
	}

	$effect(() => {
		if (!showChatKeyPopup) {
			copiedFeedback = false;
			if (copiedFeedbackTimeout) {
				clearTimeout(copiedFeedbackTimeout);
				copiedFeedbackTimeout = null;
			}
		}
	});

	async function copyChatKey() {
		if (!$chatKey) return;
		if (copiedFeedbackTimeout) clearTimeout(copiedFeedbackTimeout);
		try {
			await navigator.clipboard.writeText($chatKey);
			copiedFeedback = true;
			copiedFeedbackTimeout = setTimeout(() => {
				copiedFeedbackTimeout = null;
				copiedFeedback = false;
			}, 2500);
		} catch (_) {}
	}

	let dedupedMessages = $derived([...new Map(($messages ?? []).map((m) => [m.id, m])).values()]);

	type MessageBlock =
		| { type: 'system'; msg: ChatMessage }
		| { type: 'single'; msg: ChatMessage }
		| { type: 'imageGroup'; messages: ChatMessage[] };

	function isImageMsg(m: ChatMessage): boolean {
		return m.content == null && m.image != null && m.image !== '';
	}

	let messageBlocks = $derived.by(() => {
		const list = dedupedMessages;
		const blocks: MessageBlock[] = [];
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
				{#if block.type === 'system'}
					<li class="sys"><p class="sys">{block.msg.content}</p></li>
				{:else if block.type === 'single'}
					{@const msg = block.msg}
					{@const isSelf = currentUser === msg.author}
					{@const inChat = $participants.includes(msg.author)}
					<li class={inChat ? (isSelf ? 'sent' : 'replies') : 'replies out'}>
						{#if $participantsCount >= 0}
							<small class={inChat ? (isSelf ? 'sender' : 'reciever') : 'out'}>{msg.author}</small>
						{/if}
						<br />
						{#if msg.content == null && msg.image}
							<button
								type="button"
								class="messageImage-wrap"
								onclick={() => openImage(`${API_BASE_URL}/media/${msg.image}`, msg.image ?? '')}
							>
								<img
									src="{API_BASE_URL}/media/{msg.image}"
									alt="Chat image"
									class="messageImage {inChat ? (isSelf ? 'imgsent' : 'imgrecv') : 'imgout'}"
								/>
							</button>
						{:else}
							<p>{msg.content ?? ''}</p>
						{/if}
						<br />
						<small class="timestamp">{timestampDisplay(msg.timestamp)}</small>
					</li>
				{:else}
					{@const group = block.messages}
					{@const isSelf = currentUser === group[0].author}
					{@const inChat = $participants.includes(group[0].author)}
					{@const displayCount = Math.min(4, group.length)}
					{@const extraCount = group.length > 4 ? group.length - 4 : 0}
					<li class={inChat ? (isSelf ? 'sent' : 'replies') : 'replies out'}>
						{#if $participantsCount >= 0}
							<small class={inChat ? (isSelf ? 'sender' : 'reciever') : 'out'}>{group[0].author}</small>
						{/if}
						<br />
						<button
							type="button"
							class="image-group image-group-{displayCount} {inChat ? (isSelf ? 'imgsent' : 'imgrecv') : 'imgout'}"
							onclick={() => openImageGroup(group)}
						>
							{#each group.slice(0, 4) as msg, idx}
								<span class="image-group-cell">
									<img src="{API_BASE_URL}/media/{msg.image}" alt="" />
									{#if idx === 3 && extraCount > 0}
										<span class="image-group-more">+{extraCount}</span>
									{/if}
								</span>
							{/each}
						</button>
						<br />
						<small class="timestamp">{timestampDisplay(group[group.length - 1].timestamp)}</small>
					</li>
				{/if}
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

{#if showChatKeyPopup && $chatKey}
	<div
		class="modal-overlay chatkey-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Chat key"
		onclick={() => (showChatKeyPopup = false)}
	>
		<div class="modal chatkey-popup" onclick={(e) => e.stopPropagation()} role="document">
			<p class="chatkey-label">Chat key (share to invite)</p>
			<div class="chatkey-row">
				<output class="chatkey-value" id="chatkey-value">{$chatKey}</output>
				<div class="chatkey-copy-wrap">
					{#if copiedFeedback}
						<span class="chatkey-copy-tooltip">Copied!</span>
					{/if}
					<button type="button" class="chatkey-copy" class:copied={copiedFeedback} onclick={copyChatKey} aria-label={copiedFeedback ? 'Copied' : 'Copy chat key'}>
						{#if copiedFeedback}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
						{/if}
					</button>
				</div>
			</div>
			<button type="button" class="chatkey-close" onclick={() => (showChatKeyPopup = false)}>Close</button>
		</div>
	</div>
{/if}

{#if expandedImageGroup && expandedImageGroup.length > 0}
	<div
		class="image-gallery-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Image gallery"
		onclick={() => (expandedImageGroup = null)}
	>
		<div class="image-gallery-popup" onclick={(e) => e.stopPropagation()}>
			<div class="image-gallery-header">
				<span class="image-gallery-title">{expandedImageGroup.length} image{expandedImageGroup.length === 1 ? '' : 's'}</span>
				<button type="button" class="image-gallery-close" onclick={() => (expandedImageGroup = null)} aria-label="Close">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<div class="image-gallery-scroll">
				{#each expandedImageGroup as msg (msg.id)}
					{#if msg.image}
						<button
							type="button"
							class="image-gallery-item"
							onclick={() => openImageFromGroup(msg)}
						>
							<img src="{API_BASE_URL}/media/{msg.image}" alt="" />
						</button>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

{#if expandedImage}
	<div
		class="image-viewer-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="View image"
		onclick={() => (expandedImage = null)}
		onkeydown={(e) => e.key === 'Escape' && (expandedImage = null)}
	>
		<div class="image-viewer-toolbar">
			<button type="button" class="image-viewer-icon-btn" onclick={(e) => (e.stopPropagation(), downloadImage())} aria-label="Download">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
			</button>
			<button type="button" class="image-viewer-icon-btn" onclick={(e) => (e.stopPropagation(), expandedImage = null)} aria-label="Close">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<div class="image-viewer-content" onclick={(e) => e.stopPropagation()}>
			<img src={expandedImage.url} alt="" class="image-viewer-img" />
		</div>
	</div>
{/if}

{#if showConfirm}
	<div class="modal-overlay" role="dialog" aria-modal="true">
		<div class="modal">
			<p>Do you want to {showConfirm.action} the chat?</p>
			<div class="modal-actions">
				<button type="button" onclick={() => (showConfirm = null)}>Cancel</button>
				<button type="button" class="danger" onclick={() => showConfirm?.fn()}>OK</button>
			</div>
		</div>
	</div>
{/if}

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
	.chatkey-overlay {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.chatkey-popup {
		max-width: 320px;
		width: 100%;
	}
	.chatkey-label {
		margin: 0 0 8px 0;
		font-size: 14px;
		color: var(--Text-Heading-Medium);
	}
	.chatkey-row {
		display: flex;
		align-items: stretch;
		gap: 0;
		margin-bottom: 12px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		background: var(--Background-Lift-8);
		overflow: visible;
	}
	.chatkey-value {
		flex: 1;
		padding: 10px 12px;
		border: none;
		background: transparent;
		font-family: ui-monospace, monospace;
		font-size: 13px;
		word-break: break-all;
		user-select: all;
		min-width: 0;
	}
	.chatkey-copy-wrap {
		position: relative;
		display: flex;
		align-items: stretch;
		overflow: visible;
	}
	.chatkey-copy-tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%) translateY(-6px);
		padding: 4px 8px;
		font-size: 11px;
		font-weight: 600;
		color: #fff;
		background: #374151;
		border-radius: 4px;
		white-space: nowrap;
		pointer-events: none;
		z-index: 10;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
	}
	.chatkey-copy-tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		margin-left: -4px;
		border: 4px solid transparent;
		border-top-color: #374151;
	}
	.chatkey-copy {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px 12px;
		background: var(--Button-Secondary-Default-Background-subtle);
		border: none;
		border-left: 1px solid var(--Border-Subtle);
		border-radius: 0 8px 8px 0;
		cursor: pointer;
		color: var(--Text-Heading-Medium);
	}
	.chatkey-copy:hover {
		background: var(--Button-Secondary-Hover-Background-subtle);
	}
	.chatkey-copy.copied {
		color: var(--accent-glow, #22c55e);
	}
	.chatkey-close {
		width: 100%;
		padding: 10px 16px;
		font-size: 14px;
		font-weight: 500;
		color: var(--Text-Heading-Strong);
		background: var(--Button-Secondary-Default-Background-subtle);
		border: 1px solid var(--Button-Secondary-Default-Border);
		border-radius: 8px;
		cursor: pointer;
	}
	.chatkey-close:hover {
		background: var(--Button-Secondary-Hover-Background-subtle);
		border-color: var(--Button-Secondary-Hover-Border);
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
	.chat-log li.sys {
		text-align: center;
		color: var(--Text-Heading-Medium);
		margin: 8px 0;
	}
	.chat-log li.sent {
		text-align: right;
		margin: 8px 0;
	}
	.chat-log li.replies {
		text-align: left;
		margin: 8px 0;
	}
	.chat-log li.sent .image-group {
		margin-left: auto;
	}
	.chat-log .sender,
	.chat-log .reciever {
		font-size: 12px;
		color: var(--Text-Heading-Medium);
	}
	.chat-log .timestamp {
		font-size: 11px;
		color: var(--Text-Heading-Medium);
	}
	.messageImage-wrap {
		display: inline-block;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 8px;
	}
	.chat-log .messageImage {
		max-width: 200px;
		max-height: 200px;
		object-fit: cover;
		border-radius: 8px;
		display: block;
		vertical-align: middle;
	}
	.messageImage-wrap:hover .messageImage {
		opacity: 0.9;
	}
	.image-group {
		display: grid;
		gap: 3px;
		max-width: 320px;
		border-radius: 12px;
		overflow: hidden;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
	}
	.image-group-2 {
		grid-template-columns: 1fr 1fr;
	}
	.image-group-3 {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
	}
	.image-group-3 .image-group-cell:first-child {
		grid-row: span 2;
	}
	.image-group-4 {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
	}
	.image-group-cell {
		position: relative;
		display: block;
		padding: 0;
		margin: 0;
		border: none;
		background: var(--Border-Subtle);
		cursor: pointer;
		aspect-ratio: 1;
		overflow: hidden;
		min-width: 0;
		min-height: 0;
	}
	.image-group-cell img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		vertical-align: middle;
	}
	.image-group-cell:hover img {
		opacity: 0.92;
	}
	.image-group-more {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		font-size: 24px;
		font-weight: 700;
	}
	.image-gallery-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: 16px;
		box-sizing: border-box;
	}
	.image-gallery-popup {
		display: flex;
		flex-direction: column;
		background: var(--Background-Lift-8, #1a1a1a);
		border-radius: 16px;
		border: 1px solid var(--Border-Subtle);
		max-width: 90vw;
		max-height: 90vh;
		width: 640px;
		overflow: hidden;
	}
	.image-gallery-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--Border-Subtle);
		flex-shrink: 0;
	}
	.image-gallery-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--Text-Heading-Strong);
	}
	.image-gallery-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: none;
		background: none;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		border-radius: 8px;
	}
	.image-gallery-close:hover {
		background: var(--Button-Secondary-Hover-Background-subtle);
	}
	.image-gallery-scroll {
		overflow-y: auto;
		overflow-x: hidden;
		padding: 16px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
		align-content: start;
		min-height: 200px;
	}
	.image-gallery-item {
		display: block;
		aspect-ratio: 1;
		padding: 0;
		margin: 0;
		border: none;
		border-radius: 8px;
		overflow: hidden;
		background: var(--Border-Subtle);
		cursor: pointer;
		min-width: 0;
	}
	.image-gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.image-gallery-item:hover img {
		opacity: 0.9;
	}
	.image-viewer-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: 16px;
		box-sizing: border-box;
	}
	.image-viewer-toolbar {
		position: absolute;
		top: 16px;
		right: 16px;
		display: flex;
		gap: 12px;
		z-index: 10;
	}
	.image-viewer-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		cursor: pointer;
	}
	.image-viewer-icon-btn:hover {
		background: rgba(0, 0, 0, 0.8);
	}
	.image-viewer-content {
		display: flex;
		align-items: center;
		justify-content: center;
		max-width: 100%;
		max-height: 100%;
		padding: 60px 16px 16px;
		box-sizing: border-box;
	}
	.image-viewer-img {
		max-width: 100%;
		max-height: calc(100vh - 80px);
		object-fit: contain;
		border-radius: 8px;
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
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal {
		background: #1a1a1a;
		border-radius: 16px;
		padding: 24px;
		border: 1px solid var(--Border-Subtle);
		min-width: 280px;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 16px;
	}
	.modal-actions button {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--Border-Subtle);
		background: var(--Button-Secondary-Default-Background-subtle);
		color: var(--Text-Heading-Strong);
		cursor: pointer;
	}
	.modal-actions button.danger {
		background: #dc2626;
		border-color: #dc2626;
	}
</style>
