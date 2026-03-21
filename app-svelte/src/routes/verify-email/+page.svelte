<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { verifyEmailOtp, resendEmailOtp } from '$lib/api/auth';
	import { getVerifyPending } from '$lib/stores/auth';

	let otp = $state('');
	let loading = $state(false);
	let errorText = $state<string | null>(null);
	let resendLoading = $state(false);
	let resendInfo = $state<string | null>(null);
	let resendError = $state<string | null>(null);
	let resendSecondsLeft = $state(0);
	let identifierFromContext = $state(false);

	let intervalId: ReturnType<typeof setInterval> | null = null;

	function toUserFacingVerifyError(raw: string): string {
		const msg = (raw || '').trim();
		if (!msg || msg === 'Verification failed') return 'Unable to verify the code. Please check it and try again.';
		if (msg === 'Failed to fetch') return 'Unable to reach the server. Please check your connection and try again.';
		if (msg.toLowerCase().includes('network')) return 'Network error while contacting the server. Please try again.';
		return msg;
	}

	let identifier = $state('');

	$effect(() => {
		const qIdentifier =
			$page.url.searchParams.get('identifier') ??
			$page.url.searchParams.get('username') ??
			$page.url.searchParams.get('email') ??
			'';
		if (qIdentifier) {
			identifier = qIdentifier;
			identifierFromContext = true;
			return;
		}
		const pending = getVerifyPending();
		if (pending.identifier) {
			identifier = pending.identifier;
			identifierFromContext = true;
			return;
		}
		identifierFromContext = false;
	});

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
		if (!identifier.trim()) {
			errorText = 'Enter your username or email';
			return;
		}
		if (!otp.trim()) {
			errorText = 'OTP is required';
			return;
		}

		loading = true;
		errorText = null;
		verifyEmailOtp({ username: identifier.trim(), otp: otp.trim() })
			.then(() => goto(`/login?identifier=${encodeURIComponent(identifier.trim())}&verified=1`))
			.catch((err: Error) => {
				errorText = toUserFacingVerifyError(err.message ?? 'Verification failed');
			})
			.finally(() => {
				loading = false;
			});
	}

	async function resend() {
		if (!identifier.trim() || resendSecondsLeft > 0 || resendLoading) return;
		resendInfo = null;
		resendError = null;
		resendLoading = true;
		try {
			const { cooldown } = await resendEmailOtp(identifier.trim());
			resendInfo = 'If an account exists, a new code was sent.';
			startCooldown(cooldown);
		} catch (err) {
			const e = err as Error & { retryAfter?: number };
			if (typeof e.retryAfter === 'number' && e.retryAfter > 0) {
				startCooldown(e.retryAfter);
			}
			resendError = toUserFacingVerifyError(e.message ?? 'Could not resend code');
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
			{#if identifierFromContext}
				<p class="verify-identifier" title={identifier}>Verifying for: {identifier}</p>
			{:else}
				<input
					type="text"
					placeholder="Username or email"
					bind:value={identifier}
					disabled={loading}
					autocomplete="username"
				/>
			{/if}
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
					disabled={resendLoading || !identifier.trim()}
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

	.verify-identifier {
		margin: 0 0 10px;
		font-size: 14px;
		color: var(--Text-Heading-Medium);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
