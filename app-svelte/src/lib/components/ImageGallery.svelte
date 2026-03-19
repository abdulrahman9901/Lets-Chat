<script lang="ts">
	import { API_BASE_URL } from '$lib/config';
	import type { ChatMessage } from '$lib/stores/message';

	interface Props {
		images: ChatMessage[] | null;
		onClose: () => void;
		onSelectImage: (msg: ChatMessage) => void;
	}
	let { images, onClose, onSelectImage }: Props = $props();
</script>

{#if images && images.length > 0}
	<div
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Image gallery"
		onclick={onClose}
	>
		<div class="popup" onclick={(e) => e.stopPropagation()}>
			<div class="header">
				<span class="title">{images.length} image{images.length === 1 ? '' : 's'}</span>
				<button type="button" class="close-btn" onclick={onClose} aria-label="Close">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<div class="scroll">
				{#each images as msg (msg.id)}
					{#if msg.image}
						<button
							type="button"
							class="item"
							onclick={() => onSelectImage(msg)}
						>
							<img src={`${API_BASE_URL}/chat/media/download/?file=${encodeURIComponent(msg.image)}`} alt="" />
						</button>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: 16px;
		box-sizing: border-box;
	}
	.popup {
		display: flex;
		flex-direction: column;
		background: var(--Background-Lift-8, #1a1a1a);
		border-radius: 16px;
		border: 1px solid var(--Border-Subtle);
		max-width: 90vw;
		max-height: 90vh;
		width: 640px;
		overflow: hidden;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--Border-Subtle);
		flex-shrink: 0;
	}
	.title {
		font-size: 16px;
		font-weight: 600;
		color: var(--Text-Heading-Strong);
	}
	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: none;
		background: none;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		border-radius: 8px;
	}
	.close-btn:hover {
		background: var(--Button-Secondary-Hover-Background-subtle);
	}
	.scroll {
		overflow-y: auto;
		overflow-x: hidden;
		padding: 16px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
		align-content: start;
		min-height: 200px;
	}
	.item {
		display: block;
		aspect-ratio: 1;
		padding: 0;
		margin: 0;
		border: none;
		border-radius: 8px;
		overflow: hidden;
		background: var(--Border-Subtle);
		cursor: pointer;
		min-width: 0;
	}
	.item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.item:hover img {
		opacity: 0.9;
	}
</style>
