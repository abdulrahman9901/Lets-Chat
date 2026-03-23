import { API_BASE_URL } from '$lib/config';
import { get } from 'svelte/store';
import { token } from '$lib/stores/auth';

export function getCsrfToken(): string {
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
	options: Omit<RequestInit, 'body' | 'headers'> & {
		body?: unknown;
		headers?: Record<string, string>;
	} = {}
): Promise<T> {
	const t = get(token);
	const { body, headers: extraHeaders, ...rest } = options;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(t ? { Authorization: `Token ${t}` } : {}),
		'X-CSRFToken': getCsrfToken(),
		...(extraHeaders ?? {}),
	};
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
	const init: RequestInit = {
		...rest,
		headers,
		credentials: 'omit',
	};

	const isBodyInit = (v: unknown): v is BodyInit =>
		typeof v === 'string' ||
		v instanceof Blob ||
		v instanceof FormData ||
		v instanceof URLSearchParams ||
		v instanceof ArrayBuffer;

	if (rest.method !== 'GET' && body != null) {
		if (isBodyInit(body)) {
			init.body = body;
		} else if (typeof body === 'object' && headers['Content-Type'] === 'application/json') {
			init.body = JSON.stringify(body);
		}
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
