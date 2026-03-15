<script lang="ts">
	import { goto } from '$app/navigation';
	import { username, token } from '$lib/stores/auth';
	import { showJoinChatPopup, closeJoinChatPopup } from '$lib/stores/nav';
	import { setChats } from '$lib/stores/message';
	import { getChats, joinChat } from '$lib/api/chat';

	let chatKey = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const res = await joinChat($username!, chatKey.trim());
			await getChats($username!).then(setChats);
			closeJoinChatPopup();
			chatKey = '';
			goto(`/${res.data.id}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to join chat';
		} finally {
			loading = false;
		}
	}
</script>

{#if $showJoinChatPopup}
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && closeJoinChatPopup()}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Join Chat</h2>
			<form onsubmit={handleSubmit}>
				<label>Chat key</label>
				<input type="text" bind:value={chatKey} required placeholder="Paste chat key" disabled={loading} />
				{#if error}<p class="error">{error}</p>{/if}
				<div class="actions">
					<button type="button" onclick={closeJoinChatPopup}>Cancel</button>
					<button type="submit" disabled={loading}>Join</button>
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
	.modal form input {
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
