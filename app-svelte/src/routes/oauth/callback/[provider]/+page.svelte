<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { completeSocialLogin, type SocialProvider } from '$lib/api/auth';

	let loading = $state(true);
	let message = $state('Completing social sign-in...');
	let errorText = $state<string | null>(null);

	function providerFromPath(value: string): SocialProvider | null {
		return value === 'google' ? 'google' : null;
	}

	onMount(async () => {
		const provider = providerFromPath($page.params.provider || '');
		const code = $page.url.searchParams.get('code') || '';
		const state = $page.url.searchParams.get('state') || '';
		const oauthError = $page.url.searchParams.get('error') || '';

		if (oauthError) {
			errorText = 'Social login was cancelled or denied.';
			loading = false;
			return;
		}
		if (!provider || !code || !state) {
			errorText = 'Invalid social login callback.';
			loading = false;
			return;
		}

		try {
			await completeSocialLogin(provider, code, state);
			message = 'Signed in successfully. Redirecting...';
			await goto('/');
		} catch (err) {
			const e = err as Error;
			errorText = e.message || 'Social login failed.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="auth-page">
	<div class="auth-card">
		<h1>Social sign-in</h1>
		<p>{message}</p>
		{#if loading}
			<p>Please wait...</p>
		{/if}
		{#if errorText}
			<p class="error">{errorText}</p>
			<p class="link"><a href="/login">Back to login</a></p>
		{/if}
	</div>
</div>
