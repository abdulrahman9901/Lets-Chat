<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { checkAuthState, token } from '$lib/stores/auth';
	import { logout } from '$lib/api/auth';
	import { setMessages, addMessage, setChats } from '$lib/stores/message';
	import { getChats } from '$lib/api/chat';
	import * as ws from '$lib/websocket';

	let { children } = $props();

	const AUTH_EXPIRY_MS = 3600 * 1000;
	let logoutTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		checkAuthState();
		const unsub = token.subscribe((t) => {
			if (logoutTimer) {
				clearTimeout(logoutTimer);
				logoutTimer = null;
			}
			if (t) {
				ws.addCallbacks(
					(payload) =>
						setMessages({
							messages: payload.messages ?? [],
							participants: payload.participants ?? [],
							participantsMeta: payload.participantsMeta ?? [],
							name: payload.name,
							admins: payload.admins,
							adminsMeta: payload.adminsMeta ?? [],
							system_message: payload.system_message,
							chatKey: payload.chatKey,
							room_id: payload.room_id,
						}),
					(msg) => addMessage(msg),
					(u) => {
						getChats(u).then((chats) => setChats(chats));
					}
				);
				const exp = typeof localStorage !== 'undefined' ? localStorage.getItem('expirationDate') : null;
				const expiry = exp ? new Date(exp).getTime() - Date.now() : AUTH_EXPIRY_MS;
				logoutTimer = setTimeout(() => logout(), Math.max(0, expiry));
			}
		});
		return () => {
			unsub();
			if (logoutTimer) clearTimeout(logoutTimer);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href="/pwa-icon.svg" />
	<link rel="apple-touch-icon" href="/pwa-192.png" />
	<meta name="theme-color" content="#050816" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>

{@render children()}
