export function generateTraceId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `t-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
