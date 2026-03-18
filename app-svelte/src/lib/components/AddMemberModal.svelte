<script lang="ts">
	import { page } from '$app/stores';
	import { admins, adminsMeta, participants, participantsCount, participantsMeta } from '$lib/stores/message';
	import { showAddMemberPopup, closeAddMemberPopup } from '$lib/stores/nav';
	import { addParticipants } from '$lib/api/chat';
	import UserSearchBar from '$lib/components/UserSearchBar.svelte';
	import { username } from '$lib/stores/auth';

	let selectedUsers = $state<{ id: number; username: string }[]>([]);
	let role = $state<'Participant' | 'Admin'>('Participant');
	let loading = $state(false);
	let error = $state('');

	let chatId = $derived($page.params.chatId);
	let currentUsername = $derived($username ?? '');
	let actorId = $derived(
		($participantsMeta ?? []).find((p) => p.username === currentUsername)?.id ??
			($adminsMeta ?? []).find((p) => p.username === currentUsername)?.id ??
			null
	);

	function resetState() {
		selectedUsers = [];
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
		if (selectedUsers.length === 0) {
			error = 'Add at least one participant.';
			return;
		}
		if (!actorId) {
			error = 'Unable to identify current user.';
			return;
		}
		loading = true;
		try {
			const addedIds = selectedUsers.map((u) => u.id);
			const addedUsernames = selectedUsers.map((u) => u.username);
			await addParticipants(chatId, actorId, addedIds, role === 'Admin');
			const nextParticipants = Array.from(new Set([...($participants ?? []), ...addedUsernames]));
			participants.set(nextParticipants);
			participantsCount.set(nextParticipants.length);
			if (role === 'Admin') {
				const nextAdmins = Array.from(new Set([...($admins ?? []), ...addedUsernames]));
				admins.set(nextAdmins);
			}
			closeAddMemberPopup();
			selectedUsers = [];
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
			<h2>Add participant(s)</h2>
			<form onsubmit={handleSubmit}>
				<p class="hint">Type a name or part of it; click a suggestion to add. Chosen persons appear in the bar.</p>
				<UserSearchBar
					selected={selectedUsers}
					exclude={$participants}
					loading={loading}
					on:change={(e) => (selectedUsers = e.detail)}
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
