<script lang="ts">
	import { goto } from '$app/navigation';
	import { token, loading, error } from '$lib/stores/auth';
	import { register as doRegister, clearError } from '$lib/api/auth';
	import { parsePhoneNumberFromString } from 'libphonenumber-js';

	let username = $state('');
	let email = $state('');
	let password1 = $state('');
	let password2 = $state('');
	let gender = $state('');
	let phone_number = $state('');

	$effect(() => {
		if ($token) goto('/');
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (password1 !== password2) {
			error.set('Passwords do not match');
			return;
		}
		clearError();
		loading.set(true);

		let formattedPhone: string | null = null;
		const trimmedPhone = phone_number.trim();
		if (trimmedPhone) {
			const parsed = parsePhoneNumberFromString(trimmedPhone);
			if (!parsed || !parsed.isValid()) {
				error.set('Invalid phone number');
				loading.set(false);
				return;
			}
			formattedPhone = parsed.format('E.164');
		}

		doRegister({
			username,
			email,
			password1,
			password2,
			...(gender && { gender }),
			...(formattedPhone && { phone_number: formattedPhone }),
		})
			.then(() => goto('/'))
			.catch((err: Error) => {
				error.set(err.message ?? 'Registration failed');
			})
			.finally(() => loading.set(false));
	}
</script>

<div class="auth-page">
	<div class="auth-card">
		<h1>Create account</h1>
		<form onsubmit={handleSubmit}>
			<input type="text" placeholder="Username" bind:value={username} disabled={$loading} />
			<input type="email" placeholder="Email" bind:value={email} disabled={$loading} />
			<input type="password" placeholder="Password" bind:value={password1} disabled={$loading} />
			<input type="password" placeholder="Confirm password" bind:value={password2} disabled={$loading} />
			<select bind:value={gender} disabled={$loading} aria-label="Gender (optional)">
				<option value="">Gender (optional)</option>
				<option value="M">Male</option>
				<option value="F">Female</option>
				<option value="NS">Other</option>
			</select>
			<input type="text" placeholder="Phone (optional)" bind:value={phone_number} disabled={$loading} />
			{#if $error}
				<p class="error">{$error}</p>
			{/if}
			<button type="submit" disabled={$loading}>{$loading ? 'Creating…' : 'Register'}</button>
		</form>
		<p class="link"><a href="/login">Already have an account?</a></p>
	</div>
</div>
