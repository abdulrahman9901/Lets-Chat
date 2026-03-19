import express from 'express';
import { Request, Response } from 'express';

import { serveImage } from '../../utilities';

const images = express.Router();
const MAX_RESIZE_DIMENSION = 4096;
const DEFAULT_PUBLIC_CACHE_SECONDS = 31536000;

function parsePositiveInt(value: unknown): number | undefined {
	if (value === undefined) return undefined;
	const raw = Array.isArray(value) ? value[0] : value;
	const num = Number(raw);
	if (!Number.isFinite(num) || num < 1) return undefined;
	return Math.floor(num);
}

function normalizeAllowedOrigins(): string[] {
	const raw = process.env.ALLOWED_ORIGINS ?? '*';
	if (raw.trim() === '*') return ['*'];
	return raw
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function applyCors(req: Request, res: Response): void {
	const allowedOrigins = normalizeAllowedOrigins();
	const origin = req.headers.origin;
	if (allowedOrigins.includes('*')) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Vary', 'Origin');
		return;
	}
	if (origin && allowedOrigins.includes(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Vary', 'Origin');
	}
}

function isSafeObjectKey(key: string): boolean {
	if (!key) return false;
	if (key.includes('..') || key.startsWith('/') || key.startsWith('\\') || key.includes('\\')) return false;
	return key.startsWith('uploads/');
}

images.options('/images', (req: Request, res: Response): void => {
	applyCors(req, res);
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.status(204).end();
});

images.get('/images', async (req: Request, res: Response): Promise<void> => {
	applyCors(req, res);
	const key = typeof req.query.key === 'string' ? req.query.key : undefined;
	const filename = typeof req.query.filename === 'string' ? req.query.filename : undefined;

	const width = parsePositiveInt(req.query.width);
	const height = parsePositiveInt(req.query.height);

	const hasWidth = req.query.width !== undefined;
	const hasHeight = req.query.height !== undefined;

	if (!key && !filename) {
		res.status(400).send('Please provide either key or filename');
		return;
	}
	if (key && !isSafeObjectKey(key)) {
		res.status(400).send('Invalid image key');
		return;
	}

	if ((hasWidth || hasHeight) && (width === undefined || height === undefined)) {
		res.status(400).send('Please provide positive numerical values for width and height');
		return;
	}
	if (width !== undefined && height !== undefined) {
		if (width > MAX_RESIZE_DIMENSION || height > MAX_RESIZE_DIMENSION) {
			res.status(400).send('Requested dimensions are too large');
			return;
		}
	}

	try {
		const served = await serveImage({
			originalKey: key,
			filename,
			width,
			height,
		});

		res.setHeader('Content-Type', served.contentType);
		if (width !== undefined && height !== undefined) {
			res.setHeader('Cache-Control', `public, max-age=${DEFAULT_PUBLIC_CACHE_SECONDS}, immutable`);
		} else {
			res.setHeader('Cache-Control', 'public, max-age=300');
		}
		res.send(served.buffer);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes('not configured')) {
			res.status(500).send('Image processing storage is not configured');
			return;
		}
		res.status(404).send('Image not found');
	}
});

export default images;
