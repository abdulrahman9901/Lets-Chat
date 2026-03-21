<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { token, loading, error } from '$lib/stores/auth';
	import { login as doLogin, clearError } from '$lib/api/auth';
	import { logger } from '$lib/logger';

	let username = $state('');
	let password = $state('');

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
				error.set(
					msg === 'Failed to fetch'
						? 'Cannot reach server. Is the backend running at http://127.0.0.1:8000?'
						: msg
				);
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
		<p class="link"><a href="/register">Create an account</a></p>
		<p class="link"><a href="/verify-email">Verify email</a></p>
	</div>
</div>
