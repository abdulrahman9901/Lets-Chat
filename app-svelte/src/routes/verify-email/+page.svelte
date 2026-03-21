<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { verifyEmailOtp, resendEmailOtp } from '$lib/api/auth';

	let otp = $state('');
	let loading = $state(false);
	let errorText = $state<string | null>(null);
	let resendLoading = $state(false);
	let resendInfo = $state<string | null>(null);
	let resendError = $state<string | null>(null);
	let resendSecondsLeft = $state(0);

	let intervalId: ReturnType<typeof setInterval> | null = null;

	const username = $derived($page.url.searchParams.get('username') ?? '');

	function clearTimer() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function startCooldown(seconds: number) {
		clearTimer();
		resendSecondsLeft = Math.max(0, seconds);
		intervalId = setInterval(() => {
			resendSecondsLeft -= 1;
			if (resendSecondsLeft <= 0) {
				resendSecondsLeft = 0;
				clearTimer();
			}
		}, 1000);
	}

	onDestroy(() => clearTimer());

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

	async function resend() {
		if (!username || resendSecondsLeft > 0 || resendLoading) return;
		resendInfo = null;
		resendError = null;
		resendLoading = true;
		try {
			const { cooldown } = await resendEmailOtp(username);
			resendInfo = 'If an account exists for this username, a new code was sent to its email.';
			startCooldown(cooldown);
		} catch (err) {
			const e = err as Error & { retryAfter?: number };
			if (typeof e.retryAfter === 'number' && e.retryAfter > 0) {
				startCooldown(e.retryAfter);
			}
			resendError = e.message ?? 'Could not resend code';
		} finally {
			resendLoading = false;
		}
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
		<p class="resend-row">
			{#if resendSecondsLeft > 0}
				<span class="resend-wait">Resend available in {resendSecondsLeft}s</span>
			{:else}
				<button
					type="button"
					class="resend-btn"
					disabled={resendLoading || !username}
					onclick={resend}
				>
					{resendLoading ? 'Sending…' : 'Resend code'}
				</button>
			{/if}
		</p>
		{#if resendInfo}
			<p class="resend-info" role="status">{resendInfo}</p>
		{/if}
		{#if resendError}
			<p class="error">{resendError}</p>
		{/if}
	</div>
</div>

<style>
	.verify-hint {
		margin: 0 0 16px;
		color: var(--Text-Heading-Medium);
		font-size: 14px;
		line-height: 1.45;
	}

	.resend-row {
		margin: 16px 0 0;
		text-align: center;
		font-size: 14px;
	}

	.resend-wait {
		color: var(--Text-Heading-Medium);
	}

	.resend-btn {
		margin: 0;
		padding: 0;
		border: none;
		background: none;
		color: var(--accent-glow, #38bdf8);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.resend-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		text-decoration: none;
	}

	.resend-info {
		margin: 10px 0 0;
		font-size: 13px;
		color: var(--Text-Heading-Medium);
		line-height: 1.45;
	}
</style>
