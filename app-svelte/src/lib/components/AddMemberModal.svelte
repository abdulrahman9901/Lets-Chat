<script lang="ts">
	import { page } from '$app/stores';
	import { username } from '$lib/stores/auth';
	import { participants } from '$lib/stores/message';
	import { showAddMemberPopup, closeAddMemberPopup } from '$lib/stores/nav';
	import { addParticipants } from '$lib/api/chat';

	let contactsInput = $state('');
	let role = $state<'Participant' | 'Admin'>('Participant');
	let loading = $state(false);
	let error = $state('');

	let chatId = $derived($page.params.chatId);

	function parseContacts(s: string): string[] {
		return s
			.split(/[\s,]+/)
			.map((x) => x.trim())
			.filter(Boolean);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!chatId) return;
		error = '';
		const newUsernames = parseContacts(contactsInput);
		if (newUsernames.length === 0) {
			error = 'Add at least one username.';
			return;
		}
		loading = true;
		try {
			await addParticipants(chatId, $participants, newUsernames, role === 'Admin');
			closeAddMemberPopup();
			contactsInput = '';
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
				<label>Contacts (usernames, comma-separated)</label>
				<input type="text" bind:value={contactsInput} placeholder="user1, user2" disabled={loading} />
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
		background: #1a1a1a;
		border-radius: 16px;
		padding: 24px;
		border: 1px solid var(--Border-Subtle);
		min-width: 320px;
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
	.modal form input[type='text'] {
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
