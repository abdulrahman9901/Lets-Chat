<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { checkAuthState, token } from '$lib/stores/auth';
	import { logout } from '$lib/api/auth';
	import { setMessages, addMessage, setChats } from '$lib/stores/message';
	import { getChats } from '$lib/api/chat';
	import * as ws from '$lib/websocket';

	let { children } = $props();

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	}

	const AUTH_EXPIRY_MS = 3600 * 1000;
	let logoutTimer: ReturnType<typeof setTimeout> | null = null;
	let installPromptEvent = $state<BeforeInstallPromptEvent | null>(null);
	let showInstallButton = $state(false);
	let isAndroid = $state(false);
	let showInstallHelp = $state(false);

	async function installApp() {
		if (!installPromptEvent) {
			showInstallHelp = true;
			return;
		}
		await installPromptEvent.prompt();
		await installPromptEvent.userChoice;
		installPromptEvent = null;
		showInstallButton = false;
	}

	onMount(() => {
		const isStandalone = () =>
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

		const updateInstallVisibility = () => {
			showInstallButton = !isStandalone() && isAndroid;
		};

		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			installPromptEvent = event as BeforeInstallPromptEvent;
			updateInstallVisibility();
		};

		const onAppInstalled = () => {
			installPromptEvent = null;
			showInstallButton = false;
		};

		const mediaQuery = window.matchMedia('(display-mode: standalone)');
		isAndroid = /Android/i.test(window.navigator.userAgent);
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
		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		window.addEventListener('appinstalled', onAppInstalled);
		mediaQuery.addEventListener('change', updateInstallVisibility);
		updateInstallVisibility();
		return () => {
			unsub();
			if (logoutTimer) clearTimeout(logoutTimer);
			window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
			window.removeEventListener('appinstalled', onAppInstalled);
			mediaQuery.removeEventListener('change', updateInstallVisibility);
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

{#if showInstallButton}
	<button type="button" class="install-app-button" onclick={installApp}>
		Install app
	</button>
	{#if showInstallHelp}
		<div class="install-app-help">
			Use Chrome menu (⋮) then tap Install app or Add to Home screen.
		</div>
	{/if}
{/if}

<style>
	.install-app-button {
		position: fixed;
		right: 14px;
		bottom: 14px;
		z-index: 1002;
		padding: 10px 14px;
		border-radius: 999px;
		border: 1px solid var(--Border-Subtle);
		background: rgba(56, 189, 248, 0.22);
		color: var(--Text-Heading-Strong);
		font-weight: 600;
		cursor: pointer;
	}

	.install-app-button:hover {
		background: rgba(56, 189, 248, 0.32);
	}

	.install-app-help {
		position: fixed;
		right: 14px;
		bottom: 58px;
		z-index: 1002;
		max-width: 260px;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1px solid var(--Border-Subtle);
		background: rgba(5, 8, 22, 0.94);
		color: var(--Text-Heading-Medium);
		font-size: 12px;
	}
</style>
