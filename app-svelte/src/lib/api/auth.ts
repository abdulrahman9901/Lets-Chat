import { API_BASE_URL } from '$lib/config';
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
