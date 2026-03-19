import express from 'express';
import { Request, Response } from 'express';

import { serveImage } from '../../utilities';

const images = express.Router();

function parsePositiveInt(value: unknown): number | undefined {
	if (value === undefined) return undefined;
	const raw = Array.isArray(value) ? value[0] : value;
	const num = Number(raw);
	if (!Number.isFinite(num) || num < 1) return undefined;
	return Math.floor(num);
}

images.get('/images', async (req: Request, res: Response): Promise<void> => {
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

	if ((hasWidth || hasHeight) && (width === undefined || height === undefined)) {
		res.status(400).send('Please provide positive numerical values for width and height');
		return;
	}

	try {
		const served = await serveImage({
			originalKey: key,
			filename,
			width,
			height,
		});

		res.setHeader('Content-Type', served.contentType);
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
