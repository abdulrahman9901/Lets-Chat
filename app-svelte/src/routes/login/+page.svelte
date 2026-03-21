<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { token, loading, error } from '$lib/stores/auth';
	import { login as doLogin, clearError } from '$lib/api/auth';
	import { logger } from '$lib/logger';
	import SocialLoginButtons from '$lib/components/SocialLoginButtons.svelte';

	let username = $state('');
	let password = $state('');

	function toUserFacingAuthError(raw: string): string {
		const msg = (raw || '').trim();
		if (!msg || msg === 'Login failed') return 'Unable to sign in. Please check your username and password.';
		if (msg === 'Failed to fetch') return 'Unable to reach the server. Please check your connection and try again.';
		if (msg.toLowerCase().includes('network')) return 'Network error while contacting the server. Please try again.';
		return msg;
	}

	$effect(() => {
		const prefill =
			$page.url.searchParams.get('identifier') ??
			$page.url.searchParams.get('username') ??
			'';
		if (prefill && !username) username = prefill;
	});

	$effect(() => {
		if ($token) goto('/');
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		clearError();
		loading.set(true);
		doLogin({ username, password })
			.then(() => {
				logger.info('auth:login:success', { username });
				goto('/');
			})
			.catch((err: Error) => {
				const msg = err?.message ?? 'Login failed';
				logger.error('auth:login:error', { username, message: msg });
				error.set(toUserFacingAuthError(msg));
			})
			.finally(() => loading.set(false));
	}
</script>

<div class="auth-page">
	<div class="auth-card">
		<h1>Log in</h1>
		<form onsubmit={handleSubmit}>
			<input
				type="text"
				placeholder="Username"
				bind:value={username}
				disabled={$loading}
				autocomplete="username"
			/>
			<input
				type="password"
				placeholder="Password"
				bind:value={password}
				disabled={$loading}
				autocomplete="current-password"
			/>
			{#if $error}
				<p class="error">{$error}</p>
			{/if}
			<button type="submit" disabled={$loading}>{$loading ? 'Signing in…' : 'Sign in'}</button>
		</form>
		<SocialLoginButtons />
		<p class="link"><a href="/register">Create an account</a></p>
		<p class="link"><a href="/verify-email">Verify email</a></p>
	</div>
</div>
