<script lang="ts">
	import { goto } from '$app/navigation';
	import { username, token } from '$lib/stores/auth';
	import { showAddChatPopup, closeAddChatPopup } from '$lib/stores/nav';
	import { setChats } from '$lib/stores/message';
	import { getChats, createChat, searchUsers } from '$lib/api/chat';
	import * as ws from '$lib/websocket';

	let chatName = $state('');
	let selectedParticipants = $state<string[]>([]);
	let loading = $state(false);
	let error = $state('');
	let searchQuery = $state('');
	let searchResults = $state<{ id: number; username: string; email: string }[]>([]);
	let searchDebounce: ReturnType<typeof setTimeout> | null = null;

	function runSearch() {
		const q = searchQuery.trim();
		if (!q) {
			searchResults = [];
			return;
		}
		searchUsers(q, 15)
			.then((list) => {
				if (searchQuery.trim() !== q) return;
				const arr = Array.isArray(list) ? list : [];
				const existing = new Set(selectedParticipants);
				searchResults = arr.filter((u) => u && typeof u.username === 'string' && !existing.has(u.username));
			})
			.catch(() => {
				if (searchQuery.trim() !== q) return;
				searchResults = [];
			});
	}

	function onSearchInput() {
		if (searchDebounce) clearTimeout(searchDebounce);
		searchDebounce = setTimeout(runSearch, 120);
	}

	function addParticipant(u: { username: string }) {
		if (selectedParticipants.includes(u.username)) return;
		if (u.username === $username) return;
		selectedParticipants = [...selectedParticipants, u.username];
		runSearch();
	}

	function removeParticipant(username: string) {
		selectedParticipants = selectedParticipants.filter((p) => p !== username);
	}

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
			chatName = '';
			selectedParticipants = [];
			goto(`/${res.id}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create chat';
		} finally {
			loading = false;
		}
	}
</script>

{#if $showAddChatPopup}
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && closeAddChatPopup()}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Create Chat</h2>
			<form onsubmit={handleSubmit}>
				<label>Chat name</label>
				<input type="text" bind:value={chatName} required placeholder="Chat name" disabled={loading} />
				<label>Add participants</label>
				<p class="hint">Type a name or part of it; click a suggestion to add. Chosen persons appear in the bar.</p>
				<div class="search-wrap">
					<div class="search-bar">
						{#each selectedParticipants as name (name)}
							<span class="chip">
								{name}
								<button type="button" class="chip-remove" onclick={() => removeParticipant(name)} aria-label="Remove">×</button>
							</span>
						{/each}
						<input
							type="text"
							bind:value={searchQuery}
							oninput={onSearchInput}
							placeholder={selectedParticipants.length ? 'Add another…' : 'e.g. charlie or cha'}
							disabled={loading}
							autocomplete="off"
							class="search-input"
						/>
					</div>
					{#if searchResults.length > 0}
						<ul class="search-dropdown" role="listbox">
							{#each searchResults as u (u.id)}
								<li role="option">
									<button type="button" onclick={() => addParticipant(u)}>
										<span class="username">{u.username}</span>
										{#if u.email}<span class="email">{u.email}</span>{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
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
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal {
		width: var(--modal-width);
		max-width: var(--modal-width);
		background: #1a1a1a;
		border-radius: 16px;
		padding: 24px;
		border: 1px solid var(--Border-Subtle);
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
	.search-wrap {
		position: relative;
		overflow: visible;
	}
	.search-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		padding: 6px 12px;
		background: var(--Background-Lift-8);
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
	}
	.search-bar .search-input {
		flex: 1 1 120px;
		min-width: 120px;
		padding: 6px 0;
		margin: 0;
		border: none;
		background: transparent;
		outline: none;
		font-size: 14px;
		color: var(--Text-Heading-Strong);
	}
	.search-bar .search-input::placeholder {
		color: var(--Text-Heading-Medium);
	}
	.search-bar .chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: rgba(56, 189, 248, 0.25);
		border-radius: 6px;
		font-size: 13px;
		color: var(--Text-Heading-Strong);
	}
	.search-bar .chip-remove {
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		opacity: 0.8;
	}
	.search-bar .chip-remove:hover {
		opacity: 1;
	}
	.search-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px 0;
		list-style: none;
		background: #1a1a1a;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
	}
	.search-dropdown button {
		width: 100%;
		padding: 8px 12px;
		text-align: left;
		background: none;
		border: none;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 14px;
		display: block;
	}
	.search-dropdown button:hover {
		background: rgba(242, 242, 242, 0.08);
	}
	.search-dropdown .username {
		font-weight: 600;
		display: block;
	}
	.search-dropdown .email {
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
</style>
