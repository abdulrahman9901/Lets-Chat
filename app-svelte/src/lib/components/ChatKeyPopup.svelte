<script lang="ts">
	interface Props {
		open: boolean;
		chatKey: string | null;
		onClose: () => void;
	}
	let { open = false, chatKey = null, onClose }: Props = $props();

	let copiedFeedback = $state(false);
	let copiedFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!open) {
			copiedFeedback = false;
			if (copiedFeedbackTimeout) {
				clearTimeout(copiedFeedbackTimeout);
				copiedFeedbackTimeout = null;
			}
		}
	});

	async function copyChatKey() {
		if (!chatKey) return;
		if (copiedFeedbackTimeout) clearTimeout(copiedFeedbackTimeout);
		try {
			await navigator.clipboard.writeText(chatKey);
			copiedFeedback = true;
			copiedFeedbackTimeout = setTimeout(() => {
				copiedFeedbackTimeout = null;
				copiedFeedback = false;
			}, 2500);
		} catch (_) {}
	}
</script>

{#if open && chatKey}
	<div
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Chat key"
		onclick={onClose}
	>
		<div class="popup" onclick={(e) => e.stopPropagation()} role="document">
			<p class="label">Chat key (share to invite)</p>
			<div class="row">
				<output class="value" id="chatkey-value">{chatKey}</output>
				<div class="copy-wrap">
					{#if copiedFeedback}
						<span class="copy-tooltip">Copied!</span>
					{/if}
					<button
						type="button"
						class="copy-btn"
						class:copied={copiedFeedback}
						onclick={copyChatKey}
						aria-label={copiedFeedback ? 'Copied' : 'Copy chat key'}
					>
						{#if copiedFeedback}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
						{/if}
					</button>
				</div>
			</div>
			<button type="button" class="close-btn" onclick={onClose}>Close</button>
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
	.popup {
		background: #1a1a1a;
		border-radius: 16px;
		padding: 24px;
		border: 1px solid var(--Border-Subtle);
		max-width: 320px;
		width: 100%;
	}
	.label {
		margin: 0 0 8px 0;
		font-size: 14px;
		color: var(--Text-Heading-Medium);
	}
	.row {
		display: flex;
		align-items: stretch;
		gap: 0;
		margin-bottom: 12px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		background: var(--Background-Lift-8);
		overflow: visible;
	}
	.value {
		flex: 1;
		padding: 10px 12px;
		border: none;
		background: transparent;
		font-family: ui-monospace, monospace;
		font-size: 13px;
		word-break: break-all;
		user-select: all;
		min-width: 0;
	}
	.copy-wrap {
		position: relative;
		display: flex;
		align-items: stretch;
		overflow: visible;
	}
	.copy-tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%) translateY(-6px);
		padding: 4px 8px;
		font-size: 11px;
		font-weight: 600;
		color: #fff;
		background: #374151;
		border-radius: 4px;
		white-space: nowrap;
		pointer-events: none;
		z-index: 10;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
	}
	.copy-tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		margin-left: -4px;
		border: 4px solid transparent;
		border-top-color: #374151;
	}
	.copy-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px 12px;
		background: var(--Button-Secondary-Default-Background-subtle);
		border: none;
		border-left: 1px solid var(--Border-Subtle);
		border-radius: 0 8px 8px 0;
		cursor: pointer;
		color: var(--Text-Heading-Medium);
	}
	.copy-btn:hover {
		background: var(--Button-Secondary-Hover-Background-subtle);
	}
	.copy-btn.copied {
		color: var(--accent-glow, #22c55e);
	}
	.close-btn {
		width: 100%;
		padding: 10px 16px;
		font-size: 14px;
		font-weight: 500;
		color: var(--Text-Heading-Strong);
		background: var(--Button-Secondary-Default-Background-subtle);
		border: 1px solid var(--Button-Secondary-Default-Border);
		border-radius: 8px;
		cursor: pointer;
	}
	.close-btn:hover {
		background: var(--Button-Secondary-Hover-Background-subtle);
		border-color: var(--Button-Secondary-Hover-Border);
	}
</style>
