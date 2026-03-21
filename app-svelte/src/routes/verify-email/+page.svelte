<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { verifyEmailOtp } from '$lib/api/auth';

	let otp = $state('');
	let loading = $state(false);
	let errorText = $state<string | null>(null);

	const username = $derived($page.url.searchParams.get('username') ?? '');

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!username) {
			errorText = 'Missing username in verification link';
			return;
		}
		if (!otp.trim()) {
			errorText = 'OTP is required';
			return;
		}

		loading = true;
		errorText = null;
		verifyEmailOtp({ username, otp: otp.trim() })
			.then(() => goto('/'))
			.catch((err: Error) => {
				errorText = err.message ?? 'Verification failed';
			})
			.finally(() => {
				loading = false;
			});
	}
</script>

<div class="auth-page">
	<div class="auth-card">
		<h1>Verify your email</h1>
		<p class="verify-hint">Enter the OTP sent to your email.</p>
		<form onsubmit={submit}>
			<input type="text" placeholder="OTP" bind:value={otp} disabled={loading} autocomplete="one-time-code" />
			{#if errorText}
				<p class="error">{errorText}</p>
			{/if}
			<button type="submit" disabled={loading}>
				{loading ? 'Verifying…' : 'Verify'}
			</button>
		</form>
	</div>
</div>

<style>
	.verify-hint {
		margin: 0 0 16px;
		color: var(--Text-Heading-Medium);
		font-size: 14px;
		line-height: 1.45;
	}
</style>

