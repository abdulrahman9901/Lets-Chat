import { writable } from 'svelte/store';

const AUTH_EXPIRY_SEC = 3600;

function clearStorage() {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem('token');
	localStorage.removeItem('expirationDate');
	localStorage.removeItem('username');
	document.cookie.split(';').forEach((c) => {
		const name = c.trim().split('=')[0];
		if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
	});
}

function setStorage(token: string, username: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem('token', token);
	localStorage.setItem('expirationDate', new Date(Date.now() + AUTH_EXPIRY_SEC * 1000).toISOString());
	localStorage.setItem('username', username);
}

export const token = writable<string | null>(null);
export const username = writable<string | null>(null);
export const loading = writable(false);
export const error = writable<string | null>(null);

export function setAuth(t: string | null, u: string | null) {
	token.set(t);
	username.set(u);
	if (t && u) setStorage(t, u);
	else clearStorage();
}

export function checkAuthState(): { token: string; username: string } | null {
	if (typeof localStorage === 'undefined') return null;
	const t = localStorage.getItem('token');
	const u = localStorage.getItem('username');
	const exp = localStorage.getItem('expirationDate');
	if (!t || !u) {
		clearStorage();
		token.set(null);
		username.set(null);
		return null;
	}
	const expirationDate = new Date(exp ?? 0);
	if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
		clearStorage();
		token.set(null);
		username.set(null);
		return null;
	}
	token.set(t);
	username.set(u);
	return { token: t, username: u };
}

export function clearError() {
	error.set(null);
}
