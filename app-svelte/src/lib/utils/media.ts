import { API_BASE_URL } from '$lib/config';

type MediaDownloadOptions = {
	width?: number;
	height?: number;
	download?: boolean;
};

export function mediaDownloadUrl(file: string, options: MediaDownloadOptions = {}): string {
	const params = new URLSearchParams();
	params.set('file', file);

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

