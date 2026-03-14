<script lang="ts">
	import { page } from '$app/stores';
	import { token, username } from '$lib/stores/auth';
	import Sidepanel from '$lib/components/Sidepanel.svelte';
	import ChatRoom from '$lib/components/ChatRoom.svelte';
	import LoginInline from '$lib/components/LoginInline.svelte';
	import CreateChatModal from '$lib/components/CreateChatModal.svelte';
	import JoinChatModal from '$lib/components/JoinChatModal.svelte';
	import AddMemberModal from '$lib/components/AddMemberModal.svelte';
	import KickMemberModal from '$lib/components/KickMemberModal.svelte';
	import UploadModal from '$lib/components/UploadModal.svelte';

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
		<KickMemberModal />
		<UploadModal />
		<Sidepanel />
		<div id="content" class="content">
			<ChatRoom {chatId} />
		</div>
	</div>
{/if}
