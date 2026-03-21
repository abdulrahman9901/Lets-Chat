export const API_BASE_URL =
	typeof import.meta.env !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
		? String(import.meta.env.VITE_API_BASE_URL)
		: 'http://127.0.0.1:8000';

export const WS_BASE_URL =
	typeof import.meta.env !== 'undefined' && import.meta.env?.VITE_WS_BASE_URL
		? String(import.meta.env.VITE_WS_BASE_URL)
		: 'ws://127.0.0.1:8000';

export const IMAGE_PROCESSING_BASE_URL =
	typeof import.meta.env !== 'undefined' && import.meta.env?.VITE_IMAGE_PROCESSING_BASE_URL
		? String(import.meta.env.VITE_IMAGE_PROCESSING_BASE_URL)
		: '';

export const SOCIAL_GOOGLE_CLIENT_ID =
	typeof import.meta.env !== 'undefined' && import.meta.env?.VITE_SOCIAL_GOOGLE_CLIENT_ID
		? String(import.meta.env.VITE_SOCIAL_GOOGLE_CLIENT_ID)
		: '';
