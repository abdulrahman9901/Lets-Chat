<script lang="ts">
	import { page } from '$app/stores';
	import { participants } from '$lib/stores/message';
	import { showAddMemberPopup, closeAddMemberPopup } from '$lib/stores/nav';
	import { addParticipants } from '$lib/api/chat';
	import UserSearchBar from '$lib/components/UserSearchBar.svelte';

	let selectedUsernames = $state<string[]>([]);
	let role = $state<'Participant' | 'Admin'>('Participant');
	let loading = $state(false);
	let error = $state('');
	let searchQuery = $state('');
	let searchResults = $state<{ id: number; username: string; email: string }[]>([]);
	let searchDebounce: ReturnType<typeof setTimeout> | null = null;

	let chatId = $derived($page.params.chatId);

	function resetState() {
		selectedUsernames = [];
		role = 'Participant';
		error = '';
		loading = false;
	}

	$effect(() => {
		if (!$showAddMemberPopup) resetState();
	});

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
	<div
		class="modal-overlay"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && closeAddMemberPopup()}
		onkeydown={(e) => e.key === 'Escape' && closeAddMemberPopup()}
	>
		<div class="modal">
			<h2>Add member(s)</h2>
			<form onsubmit={handleSubmit}>
				<p class="field-label">Add participants</p>
				<p class="hint">Type a name or part of it; click a suggestion to add. Chosen persons appear in the bar.</p>
				<UserSearchBar
					selected={selectedUsernames}
					exclude={$participants}
					loading={loading}
					on:change={(e) => (selectedUsernames = e.detail)}
				/>
				<p class="field-label">Role</p>
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
