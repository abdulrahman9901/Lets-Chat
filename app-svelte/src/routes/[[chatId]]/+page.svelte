<script lang="ts">
	import { page } from '$app/stores';
	import { token, username } from '$lib/stores/auth';
	import Sidepanel from '$lib/components/Sidepanel.svelte';
	import ChatRoom from '$lib/components/ChatRoom.svelte';
	import LoginInline from '$lib/components/LoginInline.svelte';
	import CreateChatModal from '$lib/components/CreateChatModal.svelte';
	import JoinChatModal from '$lib/components/JoinChatModal.svelte';
	import AddMemberModal from '$lib/components/AddMemberModal.svelte';
	import UploadModal from '$lib/components/UploadModal.svelte';
	import ParticipantsPanel from '$lib/components/ParticipantsPanel.svelte';
	import { openSidepanel, showSidepanel } from '$lib/stores/nav';

	let chatId = $derived($page.params.chatId);
	let isAuthenticated = $derived($token != null);
</script>

{#if !isAuthenticated}
	<LoginInline />
{:else}
	<div id="frame" class="frame">
		<CreateChatModal />
		<JoinChatModal />
		<AddMemberModal />
		<UploadModal />
		<ParticipantsPanel />
		<Sidepanel />

		{#if !$showSidepanel}
			<button
				type="button"
				class="sidepanel-tongue"
				aria-label="Open chats list"
				onclick={openSidepanel}
			>
				<span class="tongue-icon" aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="4" y1="6" x2="20" y2="6" />
						<line x1="4" y1="12" x2="20" y2="12" />
						<line x1="4" y1="18" x2="20" y2="18" />
					</svg>
				</span>
			</button>
		{/if}

		<div id="content" class="content">
			<ChatRoom {chatId} />
		</div>
	</div>
{/if}

<style>
	.sidepanel-tongue {
		position: absolute;
		top: 50%;
		left: 0;
		transform: translate(-50%, -50%);
		width: 40px;
		height: 72px;
		display: none;
		align-items: center;
		justify-content: center;
		border-radius: 0 999px 999px 0;
		border: 1px solid var(--Border-Subtle);
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(10px);
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
	}

	.sidepanel-tongue .tongue-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.sidepanel-tongue:hover {
		color: var(--accent-glow);
		border-color: var(--accent-glow);
	}

	@media (max-width: 768px) {
		.sidepanel-tongue {
			display: inline-flex;
		}
	}
</style>
