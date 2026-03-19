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
	options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
): Promise<T> {
	const t = get(token);
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(t ? { Authorization: `Token ${t}` } : {}),
		'X-CSRFToken': getCsrfToken(),
		...((options.headers as Record<string, string>) ?? {}),
	};
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
	const { body, ...rest } = options;
	const init: RequestInit = {
		...rest,
		headers,
		credentials: 'omit',
	};
	if (
		options.method !== 'GET' &&
		body !== undefined &&
		headers['Content-Type'] === 'application/json'
	) {
		init.body = JSON.stringify(body);
	}
	const res = await fetch(url, init);
	if (!res.ok) {
		const errBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		const msg =
			typeof errBody?.detail === 'string'
				? errBody.detail
				: Array.isArray(errBody?.non_field_errors) && errBody.non_field_errors.length > 0
					? String(errBody.non_field_errors[0])
					: typeof errBody === 'object' && errBody !== null
						? (Object.values(errBody).flat().find((v) => typeof v === 'string') as string) ??
							res.statusText
						: res.statusText;
		throw new Error(msg || res.statusText);
	}
	return res.json() as Promise<T>;
}

export async function apiFormData(endpoint: string, formData: FormData): Promise<unknown> {
	return apiFormDataWithProgress(endpoint, formData);
}

export function apiFormDataWithProgress(
	endpoint: string,
	formData: FormData,
	onProgress?: (percent: number) => void
): Promise<unknown> {
	const t = get(token);
	const headers: Record<string, string> = {
		...(t ? { Authorization: `Token ${t}` } : {}),
		'X-CSRFToken': getCsrfToken(),
	};
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', url);
		Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
		xhr.withCredentials = false;
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable && e.total > 0) onProgress?.(Math.round((100 * e.loaded) / e.total));
			else onProgress?.(0);
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					resolve(JSON.parse(xhr.responseText || 'null'));
				} catch {
					resolve(null);
				}
			} else {
				reject(new Error(xhr.statusText || `HTTP ${xhr.status}`));
			}
		};
		xhr.onerror = () => reject(new Error('Network error'));
		xhr.send(formData);
	});
}
