<script lang="ts">
	import { goto } from '$app/navigation';
	import { username, token } from '$lib/stores/auth';
	import { chats } from '$lib/stores/message';
	import { getChats } from '$lib/api/chat';
	import { logout } from '$lib/api/auth';
	import {
		openAddChatPopup,
		openJoinChatPopup,
	} from '$lib/stores/nav';
	import { onMount } from 'svelte';

	let searchTerm = $state('');

	$effect(() => {
		const u = $username;
		const t = $token;
		if (u && t) getChats(u).then((list) => chats.set(list));
	});

	let filteredChats = $derived(
		$chats.filter((c) =>
			!searchTerm ? true : (c.name ?? `Chat # ${c.id}`).toLowerCase().includes(searchTerm.toLowerCase())
		)
	);
</script>

<div id="sidepanel" class="sidepanel">
	<div class="profile">
		<div class="wrap">
			<img src="https://img.icons8.com/ios-filled/100/95a5a6/user-male-circle.png" alt="" class="avatar" />
			<p>{$username}</p>
			<button class="authBtn" onclick={() => logout()}>Logout</button>
		</div>
	</div>
	<div class="search">
		<label for="search-input"><span aria-hidden="true">⌕</span></label>
		<input
			id="search-input"
			type="text"
			placeholder="Search chats..."
			bind:value={searchTerm}
		/>
	</div>
	<div class="contacts">
		<ul>
			{#each filteredChats as chat (chat.id)}
				<li class="contact">
					<a href="/{chat.id}" class="contact-link">
						<span class="contact-status online"></span>
						<img src="https://img.icons8.com/pastel-glyph/128/E6EAEA/communication--v1.png" alt="" />
						<div class="meta">
							<p class="name">{chat.name ?? `Chat # ${chat.id}`}</p>
							<p class="members">
								You
								{chat.participants.length > 2
									? ` and ${chat.participants.length - 1} others`
									: chat.participants.length > 1
										? ` and ${chat.participants[1]}`
										: ' only'}
							</p>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	</div>
	<div class="bottom-bar">
		<button type="button" onclick={() => openAddChatPopup()}><span>Create Chat</span></button>
		<button type="button" onclick={() => openJoinChatPopup()}><span>Join chat</span></button>
	</div>
</div>

<style>
	.sidepanel {
		width: 280px;
		min-width: 280px;
		height: 100%;
		background: rgba(18, 18, 18, 0.4);
		border-right: 1px solid var(--Border-Subtle);
		display: flex;
		flex-direction: column;
	}
	.profile .wrap {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px;
	}
	.profile img.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}
	.profile p {
		flex: 1;
		margin: 0;
		font-size: 14px;
	}
	.authBtn {
		background: var(--Button-Secondary-Default-Background-subtle);
		border: 1px solid var(--Button-Secondary-Default-Border);
		color: var(--Text-Heading-Strong);
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 13px;
	}
	.search {
		padding: 8px 12px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.search input {
		flex: 1;
		padding: 8px 12px;
		background: var(--Background-Lift-8);
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		color: var(--Text-Heading-Strong);
		font-size: 14px;
	}
	.contacts {
		flex: 1;
		overflow-y: auto;
	}
	.contacts ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.contact {
		margin: 0;
	}
	.contact-link {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px;
		color: var(--Text-Heading-Strong);
		text-decoration: none;
		border-bottom: 1px solid rgba(242, 242, 242, 0.06);
	}
	.contact-link:hover {
		background: rgba(242, 242, 242, 0.06);
	}
	.contact-status {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent-glow);
		flex-shrink: 0;
	}
	.contact-link img {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.meta {
		flex: 1;
		min-width: 0;
	}
	.meta .name {
		margin: 0 0 2px;
		font-size: 14px;
		font-weight: 500;
	}
	.meta .members {
		margin: 0;
		font-size: 12px;
		color: var(--Text-Heading-Medium);
	}
	.bottom-bar {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		border-top: 1px solid var(--Border-Subtle);
	}
	.bottom-bar button {
		padding: 10px 12px;
		background: var(--Button-Secondary-Default-Background-subtle);
		border: 1px solid var(--Button-Secondary-Default-Border);
		border-radius: 12px;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 14px;
		text-align: left;
	}
	.bottom-bar button:hover {
		background: rgba(242, 242, 242, 0.12);
	}
</style>
