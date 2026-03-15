<script lang="ts">
	import { page } from '$app/stores';
	import { username } from '$lib/stores/auth';
	import { showUploadPopup, closeUploadPopup } from '$lib/stores/nav';
	import { uploadToChat } from '$lib/api/chat';

	let fileList: File[] = $state([]);
	let loading = $state(false);
	let error = $state('');

	let chatId = $derived($page.params.chatId);

	function addFiles(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) fileList = [...fileList, ...Array.from(input.files)];
	}

	function removeFile(i: number) {
		fileList = fileList.filter((_, idx) => idx !== i);
	}

	async function handleUpload() {
		if (!chatId || !$username || fileList.length === 0) return;
		error = '';
		loading = true;
		try {
			await uploadToChat(chatId, $username, fileList);
			fileList = [];
			closeUploadPopup();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			loading = false;
		}
	}
</script>

{#if $showUploadPopup}
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && closeUploadPopup()}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Upload to chat</h2>
			<div class="upload-zone">
				<label class="file-label">
					<input type="file" accept="image/*" multiple onchange={addFiles} />
					+ Add files
				</label>
				{#each fileList as file, i}
					<div class="file-item">
						<span>{file.name}</span>
						<button type="button" onclick={() => removeFile(i)} aria-label="Remove">×</button>
					</div>
				{/each}
			</div>
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
		max-height: calc(100vh - 48px);
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
	.file-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
		font-size: 14px;
	}
	.file-item button {
		background: none;
		border: none;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 18px;
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
</style>
