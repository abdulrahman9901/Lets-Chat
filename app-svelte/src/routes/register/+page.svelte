<script lang="ts">
	import { goto } from '$app/navigation';
	import { token, loading, error } from '$lib/stores/auth';
	import { register as doRegister, clearError } from '$lib/api/auth';
	import { parsePhoneNumberFromString } from 'libphonenumber-js';
	import { z } from 'zod';

	let username = $state('');
	let email = $state('');
	let password1 = $state('');
	let password2 = $state('');
	let gender = $state('');
	let phone_number = $state('');

	const RegistrationSchema = z
		.object({
			username: z
				.string()
				.min(3, { message: 'Username must be at least 3 characters.' })
				.regex(/^[a-zA-Z0-9_]+$/, {
					message:
						'Username can only contain letters, numbers, and underscores. No spaces or special characters.',
				}),
			email: z.string().email({ message: 'Enter a valid email address.' }),
			password1: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
			password2: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
			gender: z.enum(['M', 'F', 'NS']).optional(),
			phone_number: z
				.string()
				.regex(/^\+[1-9]\d{1,14}$/, {
					message: 'Phone must be a valid number in international format (e.g. +1 234 567 8900).',
				})
				.optional(),
		})
		.refine((d) => d.password1 === d.password2, {
			message: 'Passwords do not match',
			path: ['password2'],
		});

	$effect(() => {
		if ($token) goto('/');
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
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

		const usernameTrimmed = username.trim();
		const emailTrimmed = email.trim();
		const genderValue = gender ? gender : undefined;
		const payload = {
			username: usernameTrimmed,
			email: emailTrimmed,
			password1,
			password2,
			...(genderValue ? { gender: genderValue } : {}),
			...(formattedPhone ? { phone_number: formattedPhone } : {}),
		};

		const parsed = RegistrationSchema.safeParse(payload);
		if (!parsed.success) {
			error.set(parsed.error.issues[0]?.message ?? 'Invalid registration data');
			return;
		}

		clearError();
		loading.set(true);

		doRegister({
			username: parsed.data.username,
			email: parsed.data.email,
			password1: parsed.data.password1,
			password2: parsed.data.password2,
			...(parsed.data.gender && { gender: parsed.data.gender }),
			...(parsed.data.phone_number && { phone_number: parsed.data.phone_number }),
		})
			.then(() => goto(`/verify-email?username=${encodeURIComponent(parsed.data.username)}`))
			.catch((err: Error) => {
				error.set(err.message ?? 'Registration failed');
			})
			.finally(() => loading.set(false));
	}
</script>

<div class="auth-page">
	<div class="auth-card auth-card--wide">
		<h1>Create account</h1>
		<form onsubmit={handleSubmit}>
			<div class="auth-field">
				<label for="reg-username">Username</label>
				<input
					id="reg-username"
					type="text"
					autocomplete="username"
					placeholder="letters, numbers, underscores"
					bind:value={username}
					disabled={$loading}
				/>
			</div>
			<div class="auth-field">
				<label for="reg-email">Email</label>
				<input
					id="reg-email"
					type="email"
					autocomplete="email"
					placeholder="you@example.com"
					bind:value={email}
					disabled={$loading}
				/>
			</div>
			<div class="auth-field">
				<label for="reg-password1">Password</label>
				<input
					id="reg-password1"
					type="password"
					autocomplete="new-password"
					placeholder="At least 8 characters"
					bind:value={password1}
					disabled={$loading}
				/>
			</div>
			<div class="auth-field">
				<label for="reg-password2">Confirm password</label>
				<input
					id="reg-password2"
					type="password"
					autocomplete="new-password"
					placeholder="Re-enter password"
					bind:value={password2}
					disabled={$loading}
				/>
			</div>
			<div class="auth-field">
				<label for="reg-gender"
					>Gender <span class="auth-field-hint">(optional)</span></label
				>
				<select id="reg-gender" bind:value={gender} disabled={$loading}>
					<option value="">Not specified</option>
					<option value="M">Male</option>
					<option value="F">Female</option>
					<option value="NS">Other</option>
				</select>
			</div>
			<div class="auth-field">
				<label for="reg-phone"
					>Phone <span class="auth-field-hint">(optional)</span></label
				>
				<input
					id="reg-phone"
					type="tel"
					autocomplete="tel"
					placeholder="e.g. +1 234 567 8900"
					bind:value={phone_number}
					disabled={$loading}
				/>
			</div>
			{#if $error}
				<p class="error">{$error}</p>
			{/if}
			<button type="submit" disabled={$loading}>{$loading ? 'Creating…' : 'Register'}</button>
		</form>
		<p class="link"><a href="/login">Already have an account?</a></p>
	</div>
</div>
