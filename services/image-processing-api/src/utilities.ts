import sharp from 'sharp';
import crypto from 'crypto';
import { promises as fsPromises, constants } from 'fs';
import type { Readable } from 'stream';
import {
	S3Client,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3';

type ServedImage = {
	buffer: Buffer;
	contentType: string;
};

const PROCESSED_CONTENT_TYPE = 'image/webp';
const PROCESSED_EXTENSION = 'webp';
const PROCESSED_QUALITY = 80;

function localFileExists(file: string): Promise<boolean> {
	return fsPromises
		.access(file, constants.F_OK)
		.then(() => true)
		.catch(() => false);
}

async function streamToBuffer(stream: Readable | undefined): Promise<Buffer> {
	if (!stream) return Buffer.alloc(0);
	return await new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		stream.on('data', (chunk: unknown) => {
			const buf = Buffer.isBuffer(chunk)
				? chunk
				: chunk instanceof Uint8Array
					? Buffer.from(chunk)
					: Buffer.from(String(chunk));
			chunks.push(buf);
		});
		stream.on('error', reject);
		stream.on('end', () => resolve(Buffer.concat(chunks as unknown as Uint8Array[])));
	});
}

function isS3Configured(): boolean {
	return Boolean(
		process.env.AWS_STORAGE_BUCKET_NAME &&
			process.env.AWS_S3_ENDPOINT_URL &&
			process.env.AWS_ACCESS_KEY_ID &&
			process.env.AWS_SECRET_ACCESS_KEY
	);
}

function getS3Client() {
	return new S3Client({
		region: process.env.AWS_S3_REGION_NAME ?? 'auto',
		endpoint: process.env.AWS_S3_ENDPOINT_URL,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
		},
		forcePathStyle: true,
	});
}

function getLocalOriginalPath(filename: string): string {
	return `./assets/full/${filename}.jpg`;
}

function getLocalThumbPath(filename: string, width: number, height: number): string {
	return `./assets/thumb/${filename}-${height}x${width}-thumb.${PROCESSED_EXTENSION}`;
}

function getProcessedObjectKey(originalKey: string, width: number, height: number): string {
	const digest = crypto.createHash('sha256').update(`${originalKey}:${width}x${height}`).digest('hex');
	return `processed/${digest}.${PROCESSED_EXTENSION}`;
}

export async function serveImage(params: {
	originalKey?: string;
	filename?: string;
	width?: number;
	height?: number;
}): Promise<ServedImage> {
	const originalKey = params.originalKey;
	const filename = params.filename;
	const width = params.width;
	const height = params.height;

	const needsResize = width !== undefined && height !== undefined;

	if (originalKey) {
		if (!isS3Configured()) {
			throw new Error('S3 is not configured');
		}

		const client = getS3Client();
		const bucketName = process.env.AWS_STORAGE_BUCKET_NAME as string;

		if (!needsResize) {
			const original = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: originalKey }));
			const bodyBuffer = await streamToBuffer(original.Body as Readable | undefined);
			return {
				buffer: bodyBuffer,
				contentType: original.ContentType ?? 'application/octet-stream',
			};
		}

		const processedKey = getProcessedObjectKey(originalKey, width, height);
		const exists = await (async (): Promise<boolean> => {
			try {
				await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: processedKey }));
				return true;
			} catch {
				return false;
			}
		})();

		if (exists) {
			const processed = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: processedKey }));
			const bodyBuffer = await streamToBuffer(processed.Body as Readable | undefined);
			return {
				buffer: bodyBuffer,
				contentType: processed.ContentType ?? PROCESSED_CONTENT_TYPE,
			};
		}

		const original = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: originalKey }));
		const originalBuffer = await streamToBuffer(original.Body as Readable | undefined);
		const resizedWebp = await sharp(originalBuffer)
			.resize(width, height, { fit: 'cover', position: 'center', withoutEnlargement: true })
			.webp({ quality: PROCESSED_QUALITY })
			.toBuffer();

		await client.send(
			new PutObjectCommand({
				Bucket: bucketName,
				Key: processedKey,
				Body: resizedWebp,
				ContentType: PROCESSED_CONTENT_TYPE,
			}),
		);

		return {
			buffer: resizedWebp,
			contentType: PROCESSED_CONTENT_TYPE,
		};
	}

	if (!filename) {
		throw new Error('Either originalKey or filename is required');
	}

	if (!needsResize) {
		const buffer = await fsPromises.readFile(getLocalOriginalPath(filename));
		return { buffer, contentType: 'image/jpeg' };
	}

	const thumbPath = getLocalThumbPath(filename, width, height);
	const thumbExists = await localFileExists(thumbPath);
	if (thumbExists) {
		const buffer = await fsPromises.readFile(thumbPath);
		return { buffer, contentType: PROCESSED_CONTENT_TYPE };
	}

	const originalPath = getLocalOriginalPath(filename);
	await sharp(originalPath)
		.resize(width, height, { fit: 'cover', position: 'center', withoutEnlargement: true })
		.webp({ quality: PROCESSED_QUALITY })
		.toFile(thumbPath);

	const buffer = await fsPromises.readFile(thumbPath);
	return { buffer, contentType: PROCESSED_CONTENT_TYPE };
}