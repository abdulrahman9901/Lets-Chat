<script lang="ts">
	interface Props {
		open: boolean;
		action: 'leave' | 'delete';
		onConfirm: () => void;
		onCancel: () => void;
	}
	let { open, action, onConfirm, onCancel }: Props = $props();
</script>

{#if open}
	<div class="overlay" role="dialog" aria-modal="true" aria-label="Confirm">
		<div class="modal">
			<p>Do you want to {action} the chat?</p>
			<div class="actions">
				<button type="button" onclick={onCancel}>Cancel</button>
				<button type="button" class="danger" onclick={onConfirm}>OK</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
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
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 16px;
	}
	.actions button {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--Border-Subtle);
		background: var(--Button-Secondary-Default-Background-subtle);
		color: var(--Text-Heading-Strong);
		cursor: pointer;
	}
	.actions button.danger {
		background: #dc2626;
		border-color: #dc2626;
	}
</style>
