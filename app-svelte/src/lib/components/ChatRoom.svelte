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

	let dedupedMessages = $derived([...new Map(($messages ?? []).map((m) => [m.id, m])).values()]);
</script>

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
				<small class="chatkey" title={$chatKey}>@chatkey</small>
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
			{#each dedupedMessages as msg (msg.id)}
				{#if msg.system_message}
					<li class="sys"><p class="sys">{msg.content}</p></li>
				{:else}
					{@const isSelf = currentUser === msg.author}
					{@const inChat = $participants.includes(msg.author)}
					<li class={inChat ? (isSelf ? 'sent' : 'replies') : 'replies out'}>
						{#if $participantsCount >= 0}
							<small class={inChat ? (isSelf ? 'sender' : 'reciever') : 'out'}>{msg.author}</small>
						{/if}
						<br />
						{#if msg.content == null && msg.image}
							<img
								src="{API_BASE_URL}/media/{msg.image}"
								alt=""
								class="messageImage {inChat ? (isSelf ? 'imgsent' : 'imgrecv') : 'imgout'}"
							/>
						{:else}
							<p>{msg.content ?? ''}</p>
						{/if}
						<br />
						<small class="timestamp">{timestampDisplay(msg.timestamp)}</small>
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
	.chat-log .sender,
	.chat-log .reciever {
		font-size: 12px;
		color: var(--Text-Heading-Medium);
	}
	.chat-log .timestamp {
		font-size: 11px;
		color: var(--Text-Heading-Medium);
	}
	.chat-log .messageImage {
		max-width: 200px;
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
