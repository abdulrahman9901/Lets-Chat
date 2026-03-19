<script lang="ts">
	import { mediaDownloadUrl, mediaInlineFallbackUrl } from '$lib/utils/media';

	interface ImageRef {
		url: string;
		filename: string;
		mediaPath: string;
	}

	interface Props {
		image: ImageRef | null;
		onClose: () => void;
	}
	let { image, onClose }: Props = $props();

	function download() {
		if (!image) return;
		const downloadUrl = mediaDownloadUrl(image.mediaPath, { download: true });
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.setAttribute('src', downloadUrl);
		document.body.appendChild(iframe);
		setTimeout(() => document.body.removeChild(iframe), 5000);
	}

	function handleImageError(event: Event): void {
		if (!image) return;
		const img = event.currentTarget as HTMLImageElement | null;
		if (!img || img.dataset.fallbackApplied === '1') return;
		img.dataset.fallbackApplied = '1';
		img.src = mediaInlineFallbackUrl(image.mediaPath);
	}
</script>

{#if image}
	<div
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-label="View image"
		onclick={onClose}
	>
		<div class="toolbar">
			<button type="button" class="icon-btn" onclick={(e) => (e.stopPropagation(), download())} aria-label="Download">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
			</button>
			<button type="button" class="icon-btn" onclick={(e) => (e.stopPropagation(), onClose())} aria-label="Close">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<div class="content" onclick={(e) => e.stopPropagation()}>
			<img src={image.url} onerror={handleImageError} alt="" class="img" />
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: 16px;
		box-sizing: border-box;
	}
	.toolbar {
		position: absolute;
		top: 16px;
		right: 16px;
		display: flex;
		gap: 12px;
		z-index: 10;
	}
	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		cursor: pointer;
	}
	.icon-btn:hover {
		background: rgba(0, 0, 0, 0.8);
	}
	.content {
		display: flex;
		align-items: center;
		justify-content: center;
		max-width: 100%;
		max-height: 100%;
		padding: 60px 16px 16px;
		box-sizing: border-box;
	}
	.img {
		max-width: 100%;
		max-height: calc(100vh - 80px);
		object-fit: contain;
		border-radius: 8px;
	}
</style>
