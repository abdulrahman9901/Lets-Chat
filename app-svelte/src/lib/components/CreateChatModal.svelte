<script lang="ts">
	import { goto } from '$app/navigation';
	import { username, token } from '$lib/stores/auth';
	import { showAddChatPopup, closeAddChatPopup } from '$lib/stores/nav';
	import { setChats } from '$lib/stores/message';
	import { getChats, createChat } from '$lib/api/chat';
	import UserSearchBar from '$lib/components/UserSearchBar.svelte';
	import * as ws from '$lib/websocket';

	let chatName = $state('');
	let selectedParticipants = $state<string[]>([]);
	let loading = $state(false);
	let error = $state('');
	let searchQuery = $state('');
	let searchResults = $state<{ id: number; username: string; email: string }[]>([]);
	let searchDebounce: ReturnType<typeof setTimeout> | null = null;

	function resetState() {
		chatName = '';
		selectedParticipants = [];
		error = '';
		loading = false;
	}

	$effect(() => {
		if (!$showAddChatPopup) resetState();
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		const participants = [$username!].concat(selectedParticipants);
		if (participants.length < 2) {
			error = 'Add at least one participant.';
			return;
		}
		loading = true;
		try {
			const res = await createChat({
				name: chatName,
				participants,
				admins: [$username!],
			});
			await getChats($username!).then(setChats);
			ws.fetchMessages($username!, String(res.id));
			closeAddChatPopup();
			resetState();
			goto(`/${res.id}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create chat';
		} finally {
			loading = false;
		}
	}
</script>

{#if $showAddChatPopup}
	<div
		class="modal-overlay"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && closeAddChatPopup()}
		onkeydown={(e) => e.key === 'Escape' && closeAddChatPopup()}
	>
		<div class="modal">
			<h2>Create Chat</h2>
			<form onsubmit={handleSubmit}>
				<label for="chatname-input">Chat name</label>
				<input id="chatname-input" type="text" bind:value={chatName} required placeholder="Chat name" disabled={loading} />
				<p class="field-label">Add participants</p>
				<p class="hint">Type a name or part of it; click a suggestion to add. Chosen persons appear in the bar.</p>
				<UserSearchBar
					selected={selectedParticipants}
					exclude={[$username].filter(Boolean) as string[]}
					loading={loading}
					on:change={(e) => (selectedParticipants = e.detail)}
				/>
				{#if error}<p class="error">{error}</p>{/if}
				<div class="actions">
					<button type="button" onclick={closeAddChatPopup}>Cancel</button>
					<button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Start New Chat'}</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.32);
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 18px;
		z-index: 80;
	}
	.modal {
		width: var(--modal-width);
		max-width: var(--modal-width);
		max-height: min(72vh, 720px);
		background: rgba(15, 23, 42, 1);
		border: 1px solid var(--Border-Subtle);
		border-radius: 12px;
		padding: 16px 18px 14px;
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.modal h2 {
		margin: 0 0 16px;
		font-size: 18px;
	}
	.modal form label {
		display: block;
		margin: 12px 0 4px;
		font-size: 14px;
		color: var(--Text-Heading-Medium);
	}
	.modal .hint {
		margin: 0 0 6px;
		font-size: 12px;
		color: var(--Text-Heading-Medium);
	}
	.modal form input:not(.search-input) {
		width: 100%;
		padding: 10px 12px;
		background: var(--Background-Lift-8);
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		color: var(--Text-Heading-Strong);
		font-size: 14px;
	}
	.modal .error {
		margin: 8px 0 0;
		color: #f87171;
		font-size: 13px;
	}
	.modal .actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 16px;
	}
	.modal .actions button {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--Border-Subtle);
		background: var(--Button-Secondary-Default-Background-subtle);
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 14px;
	}
	.modal .actions button[type='submit'] {
		background: var(--accent-glow);
		color: #0a0a0a;
		border: none;
	}
	@media (max-width: 768px) {
		.modal-overlay {
			padding: 10px 8px;
		}
		.modal {
			width: min(100vw - 16px, 420px);
			max-height: calc(100vh - 32px);
		}
	}
</style>
