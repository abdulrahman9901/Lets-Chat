import { API_BASE_URL, SOCIAL_GOOGLE_CLIENT_ID } from '$lib/config';
import { apiRequest, getCsrfToken } from './client';
import { setAuth, clearError, setVerifyPending, clearVerifyPending } from '$lib/stores/auth';
import { resetNavState } from '$lib/stores/nav';

export interface LoginPayload {
	username: string;
	password: string;
}

export interface RegisterPayload {
	username: string;
	email: string;
	password1: string;
	password2: string;
	gender?: string;
	phone_number?: string;
}

interface LoginResponse {
	key: string;
}

export async function login(payload: LoginPayload): Promise<{ token: string; username: string }> {
	const data = await apiRequest<LoginResponse>('/rest-auth/login/', {
		method: 'POST',
		body: payload,
	});
	clearVerifyPending();
	setAuth(data.key, payload.username);
	return { token: data.key, username: payload.username };
}

export async function register(
	payload: RegisterPayload
): Promise<{ token: string; username: string }> {
	await apiRequest<LoginResponse>('/rest-auth/registration/', {
		method: 'POST',
		body: payload,
	});
	setAuth(null, null);
	setVerifyPending(payload.username);
	return { token: '', username: payload.username };
}

export async function logout(): Promise<void> {
	try {
		await apiRequest('/rest-auth/logout/', { method: 'POST', body: {} });
	} catch {
		// ignore
	} finally {
		setAuth(null, null);
		resetNavState();
	}
}

export { clearError } from '$lib/stores/auth';

export interface VerifyEmailOtpPayload {
	username: string;
	otp: string;
}

export async function verifyEmailOtp(payload: VerifyEmailOtpPayload): Promise<unknown> {
	const result = await apiRequest('/chat/email/verify-otp/', {
		method: 'POST',
		body: payload,
	});
	clearVerifyPending();
	return result;
}

export type ResendEmailOtpResult = { cooldown: number };

export async function resendEmailOtp(username: string): Promise<ResendEmailOtpResult> {
	const url = `${API_BASE_URL}/chat/email/resend-otp/`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCsrfToken(),
		},
		body: JSON.stringify({ identifier: username }),
		credentials: 'omit',
	});
	const data = (await res.json().catch(() => ({}))) as {
		detail?: string;
		retry_after?: number;
		cooldown?: number;
	};
	if (!res.ok) {
		const err = new Error(
			typeof data.detail === 'string' ? data.detail : res.statusText || 'Resend failed'
		) as Error & { retryAfter?: number };
		if (typeof data.retry_after === 'number') err.retryAfter = data.retry_after;
		throw err;
	}
	return { cooldown: typeof data.cooldown === 'number' ? data.cooldown : 60 };
}

export type SocialProvider = 'google';

function randomState(length = 32): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let out = '';
	const random = crypto.getRandomValues(new Uint8Array(length));
	for (const byte of random) out += chars[byte % chars.length];
	return out;
}

function callbackUrlFor(provider: SocialProvider): string {
	return `${window.location.origin}/oauth/callback/${provider}`;
}

function socialAuthorizeUrl(provider: SocialProvider): string {
	if (provider !== 'google') {
		throw new Error('Unsupported social provider');
	}
	const clientId = SOCIAL_GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw new Error('google social login is not configured.');
	}
	const callback = callbackUrlFor(provider);
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: callback,
		response_type: 'code',
		scope: 'openid email profile',
		state: randomState(),
	});
	sessionStorage.setItem(`oauth_state_${provider}`, params.get('state') || '');
	params.set('prompt', 'select_account');
	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function beginSocialLogin(provider: SocialProvider): void {
	const url = socialAuthorizeUrl(provider);
	window.location.href = url;
}

async function fetchUsernameForToken(authToken: string): Promise<string> {
	const res = await fetch(`${API_BASE_URL}/rest-auth/user/`, {
		method: 'GET',
		headers: {
			Authorization: `Token ${authToken}`,
			'X-CSRFToken': getCsrfToken(),
		},
		credentials: 'omit',
	});
	if (!res.ok) {
		throw new Error('Unable to load user profile after social login.');
	}
	const data = (await res.json()) as { username?: string; email?: string };
	return data.username || data.email || 'social-user';
}

export async function completeSocialLogin(
	provider: SocialProvider,
	code: string,
	state: string
): Promise<{ token: string; username: string }> {
	const expectedState = sessionStorage.getItem(`oauth_state_${provider}`) || '';
	if (!expectedState || state !== expectedState) {
		throw new Error('Invalid social login state. Please try again.');
	}
	sessionStorage.removeItem(`oauth_state_${provider}`);
	const redirect_uri = callbackUrlFor(provider);
	const data = await apiRequest<LoginResponse>(`/rest-auth/social/${provider}/`, {
		method: 'POST',
		body: { code, redirect_uri },
	});
	const resolvedUsername = await fetchUsernameForToken(data.key);
	clearVerifyPending();
	setAuth(data.key, resolvedUsername);
	return { token: data.key, username: resolvedUsername };
}
