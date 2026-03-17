<script lang="ts">
	import { page } from '$app/stores';
	import { username } from '$lib/stores/auth';
	import { showUploadPopup, closeUploadPopup } from '$lib/stores/nav';
	import { uploadToChat } from '$lib/api/chat';

	const MAX_FILES_PER_UPLOAD = 50;

	let fileList: File[] = $state([]);
	let loading = $state(false);
	let uploadPercent = $state(0);
	let error = $state('');

	let chatId = $derived($page.params.chatId);
	let uploadLabel = $derived(
		fileList.length === 1 ? '1 image' : `${fileList.length} images`
	);

	function addFiles(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files) return;
		const added = Array.from(input.files);
		const kept = fileList.length + added.length <= MAX_FILES_PER_UPLOAD
			? added
			: added.slice(0, Math.max(0, MAX_FILES_PER_UPLOAD - fileList.length));
		fileList = [...fileList, ...kept];
		input.value = '';
	}

	function removeFile(i: number) {
		fileList = fileList.filter((_, idx) => idx !== i);
	}

	async function handleUpload() {
		if (!chatId || !$username || fileList.length === 0) return;
		error = '';
		uploadPercent = 0;
		loading = true;
		try {
			await uploadToChat(chatId, $username, fileList, (p) => (uploadPercent = p));
			fileList = [];
			closeUploadPopup();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			loading = false;
			uploadPercent = 0;
		}
	}
</script>

{#if $showUploadPopup}
	<div
		class="modal-overlay"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && closeUploadPopup()}
		onkeydown={(e) => e.key === 'Escape' && closeUploadPopup()}
	>
		<div class="modal">
			<h2>Upload to chat</h2>
			<div class="upload-zone">
				<label class="file-label">
					<input type="file" accept="image/*" multiple onchange={addFiles} />
					+ Add files
				</label>
				<p class="upload-hint">
					{#if fileList.length > 0}
						<span class="selected-count">{fileList.length} {fileList.length === 1 ? 'image' : 'images'} selected</span>
						<span class="hint-sep"> · </span>
					{/if}
					Max {MAX_FILES_PER_UPLOAD} images per upload.
				</p>
				<div class="file-list">
					{#each fileList as file, i}
						<div class="file-item">
							<span>{file.name}</span>
							<button type="button" onclick={() => removeFile(i)} aria-label="Remove">×</button>
						</div>
					{/each}
				</div>
			</div>
			{#if loading}
				<div class="progress-section" role="status" aria-live="polite">
					<p class="progress-label">Uploading {uploadLabel} — {uploadPercent}%</p>
					<div class="progress-track">
						<div class="progress-fill" style="width: {uploadPercent}%"></div>
					</div>
				</div>
			{/if}
			{#if error}<p class="error">{error}</p>{/if}
			<div class="actions">
				<button type="button" onclick={closeUploadPopup}>Cancel</button>
				<button type="button" onclick={handleUpload} disabled={fileList.length === 0 || loading}>
					{loading ? 'Uploading…' : 'Start Upload'}
				</button>
			</div>
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
		overflow-y: auto;
	}
	.modal h2 {
		margin: 0 0 16px;
		font-size: 18px;
	}
	.upload-zone {
		border: 1px dashed var(--Border-Subtle);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 12px;
	}
	.file-list {
		margin-top: 12px;
	}
	.file-label {
		display: inline-block;
		padding: 8px 16px;
		background: var(--Button-Secondary-Default-Background-subtle);
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
	}
	.file-label input {
		display: none;
	}
	.upload-hint {
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--Text-Heading-Medium, #9ca3af);
	}
	.selected-count {
		color: var(--accent-glow, #22d3ee);
		font-weight: 600;
	}
	.hint-sep {
		opacity: 0.7;
	}
	.file-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
		font-size: 14px;
	}
	.file-item:first-child {
		margin-top: 0;
	}
	.file-item button {
		background: none;
		border: none;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 18px;
	}
	.progress-section {
		margin-bottom: 16px;
	}
	.progress-label {
		margin: 0 0 8px 0;
		font-size: 14px;
		color: var(--Text-Heading-Medium, #e5e7eb);
	}
	.progress-track {
		height: 8px;
		background: var(--Border-Subtle, #374151);
		border-radius: 4px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: var(--accent-glow, #22d3ee);
		border-radius: 4px;
		transition: width 0.15s ease-out;
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
	.modal .actions button:last-child {
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
