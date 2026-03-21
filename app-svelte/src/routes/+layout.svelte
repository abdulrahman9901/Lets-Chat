<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import '../app.css';
	import { checkAuthState, token, getVerifyPending } from '$lib/stores/auth';
	import { logout } from '$lib/api/auth';
	import { setMessages, addMessage, setChats } from '$lib/stores/message';
	import { getChats } from '$lib/api/chat';
	import * as ws from '$lib/websocket';

	let { children } = $props();

	const AUTH_EXPIRY_MS = 3600 * 1000;
	let logoutTimer: ReturnType<typeof setTimeout> | null = null;
	let currentPath = '';
	let currentToken: string | null = null;

	function isPublicPath(pathname: string): boolean {
		return (
			pathname.startsWith('/login') ||
			pathname.startsWith('/register') ||
			pathname.startsWith('/verify-email') ||
			pathname.startsWith('/oauth/callback/')
		);
	}

	function enforceRouteAccess() {
		const pending = getVerifyPending();
		if (pending.pending) {
			if (!currentPath.startsWith('/verify-email')) {
				const q = pending.identifier ? `?identifier=${encodeURIComponent(pending.identifier)}` : '';
				goto(`/verify-email${q}`, { replaceState: true });
			}
			return;
		}
		if (!currentToken && !isPublicPath(currentPath)) {
			goto('/login', { replaceState: true });
		}
	}

	onMount(() => {
		checkAuthState();
		const unsubPage = page.subscribe((p) => {
			currentPath = p.url.pathname;
			enforceRouteAccess();
		});
		const unsub = token.subscribe((t) => {
			currentToken = t;
			if (logoutTimer) {
				clearTimeout(logoutTimer);
				logoutTimer = null;
			}
			enforceRouteAccess();
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
			unsubPage();
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
