import { writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/config', () => ({
	API_BASE_URL: 'http://api.test',
	WS_BASE_URL: 'ws://api.test'
}));

const tokenStore = writable<string | null>('token123');

vi.mock('$lib/stores/auth', () => ({
	token: tokenStore
}));

describe('apiRequest', () => {
	it('stringifies JSON object bodies and adds auth + CSRF headers', async () => {
		document.cookie = 'csrftoken=csrf123';
			const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({
			ok: true,
			statusText: 'OK',
			json: async () => ({ ok: true })
		}));

		(globalThis as any).fetch = fetchSpy;

		const { apiRequest } = await import('./client');

		const payload = { command: 'leave', actorId: 1 };
		const res = await apiRequest<{ ok: boolean }>('/chat/1/update/', {
			method: 'PUT',
			body: payload
		});

		expect(res.ok).toBe(true);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
			const call = fetchSpy.mock.calls[0];
			expect(call).toBeDefined();
			const url = call[0];
			const init = call[1] as RequestInit;
		expect(url).toBe('http://api.test/chat/1/update/');
		expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
		expect((init.headers as Record<string, string>)['Authorization']).toBe('Token token123');
		expect((init.headers as Record<string, string>)['X-CSRFToken']).toBe('csrf123');
		expect(init.body).toBe(JSON.stringify(payload));
	});

	it('passes through BodyInit strings without JSON stringifying', async () => {
		document.cookie = 'csrftoken=csrf123';
			const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({
			ok: true,
			statusText: 'OK',
			json: async () => ({ ok: true })
		}));

		(globalThis as any).fetch = fetchSpy;

		const { apiRequest } = await import('./client');

		await apiRequest<{ ok: boolean }>('/x', {
			method: 'POST',
			body: 'raw-body'
		});

			const call = fetchSpy.mock.calls[0];
			expect(call).toBeDefined();
			const init = call[1] as RequestInit;
			expect(init.body).toBe('raw-body');
	});

	it('does not set a body on GET requests', async () => {
		document.cookie = 'csrftoken=csrf123';
			const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({
			ok: true,
			statusText: 'OK',
			json: async () => ({ ok: true })
		}));

		(globalThis as any).fetch = fetchSpy;

		const { apiRequest } = await import('./client');

		await apiRequest<{ ok: boolean }>('/x', {
			method: 'GET',
			body: { command: 'leave', actorId: 1 }
		});

			const call = fetchSpy.mock.calls[0];
			expect(call).toBeDefined();
			const init = call[1] as RequestInit;
			expect(init.body).toBeUndefined();
	});

	it('throws server detail on non-2xx responses', async () => {
		document.cookie = 'csrftoken=csrf123';
		const fetchSpy = vi.fn(async () => ({
			ok: false,
			statusText: 'Bad Request',
			json: async () => ({ detail: 'bad' })
		}));

		(globalThis as any).fetch = fetchSpy;

		const { apiRequest } = await import('./client');

		await expect(
			apiRequest('/x', { method: 'POST', body: { command: 'leave', actorId: 1 } })
		).rejects.toThrow('bad');
	});
});

