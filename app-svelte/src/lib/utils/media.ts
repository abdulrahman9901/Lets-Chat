import { API_BASE_URL, IMAGE_PROCESSING_BASE_URL } from '$lib/config';

type MediaDownloadOptions = {
	width?: number;
	height?: number;
	download?: boolean;
};

export function mediaDownloadUrl(file: string, options: MediaDownloadOptions = {}): string {
	const normalizedFile = normalizeMediaKey(file);
	const params = new URLSearchParams();
	params.set('file', normalizedFile);

	if (options.width !== undefined && options.height !== undefined) {
		params.set('width', String(options.width));
		params.set('height', String(options.height));
	}

	params.set('download', options.download ? '1' : '0');
	return `${API_BASE_URL}/chat/media/download/?${params.toString()}`;
}

export function mediaInlineUrl(file: string): string {
	return mediaDownloadUrl(file, { download: false });
}

export function mediaThumbUrl(file: string, width: number, height: number): string {
	const normalizedFile = normalizeMediaKey(file);
	if (IMAGE_PROCESSING_BASE_URL) {
		const params = new URLSearchParams();
		params.set('key', normalizedFile);
		params.set('width', String(width));
		params.set('height', String(height));
		return `${IMAGE_PROCESSING_BASE_URL}/api/images?${params.toString()}`;
	}
	return mediaDownloadUrl(normalizedFile, { width, height, download: false });
}

export function mediaThumbFallbackUrl(file: string, width: number, height: number): string {
	return mediaDownloadUrl(file, { width, height, download: false });
}

function normalizeMediaKey(file: string): string {
	return String(file ?? '')
		.trim()
		.replace(/^https?:\/\/[^/]+\//, '')
		.replace(/\\/g, '/')
		.replace(/^\/+/, '');
}

