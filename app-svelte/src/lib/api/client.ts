import { API_BASE_URL } from '$lib/config';
import { get } from 'svelte/store';
import { token } from '$lib/stores/auth';

function getCsrfToken(): string {
	const name = 'csrftoken';
	const cookies = document.cookie.split(';');
	for (const c of cookies) {
		const [k, v] = c.trim().split('=');
		if (k === name) return v ?? '';
	}
	return '';
}

export async function apiRequest<T>(
	endpoint: string,
	options: RequestInit & { body?: Record<string, unknown> } = {}
): Promise<T> {
	const t = get(token);
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(t ? { Authorization: `Token ${t}` } : {}),
		'X-CSRFToken': getCsrfToken(),
		...((options.headers as Record<string, string>) ?? {}),
	};
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
	const init: RequestInit = {
		...options,
		headers,
		credentials: 'omit',
	};
	if (
		options.method !== 'GET' &&
		options.body &&
		typeof options.body === 'object' &&
		headers['Content-Type'] === 'application/json'
	) {
		init.body = JSON.stringify(options.body);
	}
	const res = await fetch(url, init);
	if (!res.ok) {
		const errBody = await res.json().catch(() => ({}));
		throw new Error((errBody as { detail?: string }).detail ?? res.statusText);
	}
	return res.json() as Promise<T>;
}

export async function apiFormData(endpoint: string, formData: FormData): Promise<unknown> {
	const t = get(token);
	const headers: Record<string, string> = {
		...(t ? { Authorization: `Token ${t}` } : {}),
		'X-CSRFToken': getCsrfToken(),
	};
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
	const res = await fetch(url, {
		method: 'POST',
		headers,
		credentials: 'omit',
		body: formData,
	});
	if (!res.ok) throw new Error(res.statusText);
	return res.json();
}
