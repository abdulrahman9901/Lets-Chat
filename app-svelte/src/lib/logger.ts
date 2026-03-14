import { API_BASE_URL } from '$lib/config';

type Level = 'debug' | 'info' | 'warn' | 'error';

async function send(level: Level, message: string, context?: unknown) {
	const payload = {
		level,
		message,
		context: context ?? {},
	};

	try {
		// Fire-and-forget; failures here should not break the UI
		await fetch(`${API_BASE_URL}/chat/logs/frontend/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});
	} catch {
		// ignore
	}

	if (import.meta.env.DEV) {
		// Still mirror to console in dev for quick inspection
		// eslint-disable-next-line no-console
		console[level === 'warn' ? 'warn' : level](message, context);
	}
}

export const logger = {
	debug: (message: string, context?: unknown) => send('debug', message, context),
	info: (message: string, context?: unknown) => send('info', message, context),
	warn: (message: string, context?: unknown) => send('warn', message, context),
	error: (message: string, context?: unknown) => send('error', message, context),
};

