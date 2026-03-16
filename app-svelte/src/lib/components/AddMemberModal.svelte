<script lang="ts">
	import { page } from '$app/stores';
	import { participants } from '$lib/stores/message';
	import { showAddMemberPopup, closeAddMemberPopup } from '$lib/stores/nav';
	import { addParticipants, searchUsers } from '$lib/api/chat';

	let selectedUsernames = $state<string[]>([]);
	let role = $state<'Participant' | 'Admin'>('Participant');
	let loading = $state(false);
	let error = $state('');
	let searchQuery = $state('');
	let searchResults = $state<{ id: number; username: string; email: string }[]>([]);
	let searchDebounce: ReturnType<typeof setTimeout> | null = null;

	let chatId = $derived($page.params.chatId);

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
				const existing = new Set(selectedUsernames);
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

	function addUser(u: { username: string }) {
		if (selectedUsernames.includes(u.username)) return;
		selectedUsernames = [...selectedUsernames, u.username];
		searchQuery = '';
		searchResults = [];
	}

	function removeUser(username: string) {
		selectedUsernames = selectedUsernames.filter((p) => p !== username);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!chatId) return;
		error = '';
		if (selectedUsernames.length === 0) {
			error = 'Add at least one participant.';
			return;
		}
		loading = true;
		try {
			await addParticipants(chatId, $participants, selectedUsernames, role === 'Admin');
			closeAddMemberPopup();
			selectedUsernames = [];
			role = 'Participant';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add member(s)';
		} finally {
			loading = false;
		}
	}
</script>

{#if $showAddMemberPopup}
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && closeAddMemberPopup()}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Add member(s)</h2>
			<form onsubmit={handleSubmit}>
				<label>Add participants</label>
				<p class="hint">Type a name or part of it; click a suggestion to add. Chosen persons appear in the bar.</p>
				<div class="search-wrap">
					<div class="search-bar">
						{#each selectedUsernames as name (name)}
							<span class="chip">
								{name}
								<button type="button" class="chip-remove" onclick={() => removeUser(name)} aria-label="Remove">×</button>
							</span>
						{/each}
						<input
							type="text"
							bind:value={searchQuery}
							oninput={onSearchInput}
							placeholder={selectedUsernames.length ? 'Add another…' : 'e.g. charlie or cha'}
							disabled={loading}
							autocomplete="off"
							class="search-input"
						/>
					</div>
					{#if searchResults.length > 0}
						<ul class="search-dropdown" role="listbox">
							{#each searchResults as u (u.id)}
								<li role="option">
									<button type="button" onclick={() => addUser(u)}>
										<span class="username">{u.username}</span>
										{#if u.email}<span class="email">{u.email}</span>{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<label>Role</label>
				<div class="role">
					<label class="radio"><input type="radio" bind:group={role} value="Participant" /> Participant</label>
					<label class="radio"><input type="radio" bind:group={role} value="Admin" /> Admin</label>
				</div>
				{#if error}<p class="error">{error}</p>{/if}
				<div class="actions">
					<button type="button" onclick={closeAddMemberPopup}>Cancel</button>
					<button type="submit" disabled={loading}>Add</button>
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
		overflow: visible;
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
	.modal form input[type='text']:not(.search-input) {
		width: 100%;
		padding: 10px 12px;
		background: var(--Background-Lift-8);
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		color: var(--Text-Heading-Strong);
		font-size: 14px;
	}
	.modal .role {
		display: flex;
		gap: 16px;
		margin-top: 8px;
	}
	.modal .radio {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
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
