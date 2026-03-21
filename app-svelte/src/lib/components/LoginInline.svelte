<script lang="ts">
	import { goto } from '$app/navigation';
import { loading, error } from '$lib/stores/auth';
import { login as doLogin, clearError } from '$lib/api/auth';
import { logger } from '$lib/logger';

	let username = $state('');
	let password = $state('');

function toUserFacingAuthError(raw: string): string {
	const msg = (raw || '').trim();
	if (!msg || msg === 'Login failed') return 'Unable to sign in. Please check your username and password.';
	if (msg === 'Failed to fetch') return 'Unable to reach the server. Please check your connection and try again.';
	if (msg.toLowerCase().includes('network')) return 'Network error while contacting the server. Please try again.';
	return msg;
}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		clearError();
		loading.set(true);
		doLogin({ username, password })
			.then(() => {
				logger.info('auth:login:inline:success', { username });
				goto('/');
			})
			.catch((err: Error) => {
				const msg = err?.message ?? 'Login failed';
				logger.error('auth:login:inline:error', { username, message: msg });
				error.set(toUserFacingAuthError(msg));
			})
			.finally(() => loading.set(false));
	}
</script>

<div class="auth-page">
	<div class="auth-card">
		<h1>Log in</h1>
		<form onsubmit={handleSubmit}>
			<input type="text" placeholder="Username" bind:value={username} disabled={$loading} />
			<input type="password" placeholder="Password" bind:value={password} disabled={$loading} />
			{#if $error}
				<p class="error">{$error}</p>
			{/if}
			<button type="submit" disabled={$loading}>Sign in</button>
		</form>
		<p class="link"><a href="/register">Create an account</a></p>
	</div>
</div>
