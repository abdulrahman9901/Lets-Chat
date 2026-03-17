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
	<div
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Confirm"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && onCancel()}
		onkeydown={(e) => e.key === 'Escape' && onCancel()}
	>
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
	@media (max-width: 768px) {
		.overlay {
			padding: 10px 8px;
		}
		.modal {
			width: min(100vw - 16px, 420px);
			max-height: calc(100vh - 32px);
		}
	}
</style>
