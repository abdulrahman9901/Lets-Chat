import { apiRequest } from './client';
import { setAuth, clearError } from '$lib/stores/auth';
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
	setAuth(data.key, payload.username);
	return { token: data.key, username: payload.username };
}

export async function register(
	payload: RegisterPayload
): Promise<{ token: string; username: string }> {
	const data = await apiRequest<LoginResponse>('/rest-auth/registration/', {
		method: 'POST',
		body: payload,
	});
	setAuth(data.key, payload.username);
	return { token: data.key, username: payload.username };
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
	return apiRequest('/chat/email/verify-otp/', {
		method: 'POST',
		body: payload,
	});
}
