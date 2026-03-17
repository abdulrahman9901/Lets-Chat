<script lang="ts">
	import { page } from '$app/stores';
	import { username } from '$lib/stores/auth';
	import { participants } from '$lib/stores/message';
	import { showKickMemberPopup, closeKickMemberPopup } from '$lib/stores/nav';
	import { kickMembers } from '$lib/api/chat';

	let selected: string[] = $state([]);
	let loading = $state(false);
	let error = $state('');

	let chatId = $derived($page.params.chatId);
	let others = $derived($participants.filter((p) => p !== $username));

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!chatId) return;
		error = '';
		const newParticipants = $participants.filter((p) => !selected.includes(p));
		if (newParticipants.length === 0) {
			error = 'Cannot remove all participants.';
			return;
		}
		loading = true;
		try {
			await kickMembers(chatId, newParticipants);
			closeKickMemberPopup();
			selected = [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to kick member(s)';
		} finally {
			loading = false;
		}
	}
</script>

{#if $showKickMemberPopup}
	<div
		class="modal-overlay"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && closeKickMemberPopup()}
		onkeydown={(e) => e.key === 'Escape' && closeKickMemberPopup()}
	>
		<div class="modal">
			<h2>Kick member(s)</h2>
			<form onsubmit={handleSubmit}>
				<p class="field-label">Select members to remove</p>
				<div class="checkboxes">
					{#each others as p}
						<label class="checkbox">
							<input type="checkbox" value={p} bind:group={selected} />
							{p}
						</label>
					{/each}
				</div>
				{#if error}<p class="error">{error}</p>{/if}
				<div class="actions">
					<button type="button" onclick={closeKickMemberPopup}>Cancel</button>
					<button type="submit" disabled={loading || selected.length === 0}>Kick</button>
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
	.modal .checkboxes {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 8px;
	}
	.modal .checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
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
		background: #dc2626;
		border-color: #dc2626;
		color: #fff;
	}
</style>
