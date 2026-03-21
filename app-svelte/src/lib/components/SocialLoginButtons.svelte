<script lang="ts">
	import { beginSocialLogin, type SocialProvider } from '$lib/api/auth';

	const providers: Array<{ id: SocialProvider; label: string }> = [
		{ id: 'google', label: 'Continue with Google' },
	];

	let errorText = $state<string | null>(null);

	function start(provider: SocialProvider) {
		try {
			errorText = null;
			beginSocialLogin(provider);
		} catch (err) {
			const e = err as Error;
			errorText = e.message || 'Social login is not configured.';
		}
	}
</script>

<div class="social-auth">
	<div class="social-auth__list">
		{#each providers as provider}
			<button type="button" class="social-auth__btn" onclick={() => start(provider.id)}>
				{provider.label}
			</button>
		{/each}
	</div>
	{#if errorText}
		<p class="error">{errorText}</p>
	{/if}
</div>

<style>
	.social-auth {
		margin-top: 14px;
	}

	.social-auth__list {
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
	}

	.social-auth__btn {
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid rgba(148, 163, 184, 0.35);
		background: rgba(15, 23, 42, 0.45);
		color: var(--Text-Heading-White, #e2e8f0);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}

	.social-auth__btn:hover {
		background: rgba(30, 41, 59, 0.55);
	}
</style>
