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
		<p class="hint">Enter the OTP sent to your email.</p>
		<form onsubmit={submit}>
			<input type="text" placeholder="OTP" bind:value={otp} disabled={loading} />
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
	.auth-page {
		min-height: 70vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}
	.auth-card {
		width: 420px;
		max-width: 100%;
		background: rgba(15, 23, 42, 0.98);
		border: 1px solid var(--Border-Subtle);
		border-radius: 16px;
		padding: 24px;
	}
	h1 {
		margin: 0 0 12px;
	}
	.hint {
		margin: 0 0 14px;
		color: var(--Text-Heading-Medium);
		font-size: 13px;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	input {
		padding: 10px 12px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 10px;
		background: var(--Background-Lift-8);
		color: var(--Text-Heading-Strong);
	}
	.error {
		color: #f87171;
		font-size: 13px;
		margin: 0;
	}
	button {
		padding: 10px 14px;
		border-radius: 12px;
		border: none;
		background: var(--accent-glow);
		color: #0a0a0a;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>

