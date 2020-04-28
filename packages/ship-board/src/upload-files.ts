import fs from 'fs';
import { Readable } from 'stream';
import { join as pathJoin } from 'path';
import { readFileSync } from 'fs';
import { Glob } from 'glob';
import ignore from 'ignore';
import { Sema } from 'async-sema';
import Adal from './adal';
import fetch from './fetch';
import graphFetch from './fetch-graph-api';
import { IGNORE_PATH, DEFAULT_IGNORE_PATTERNS } from './config';

const { open } = fs.promises;

const CHUNK_SIZE = 983040;
const MAX_CONCURRENT = 40;

async function uploadChunk(uploadUrl: string, rangeHeader: string, chunk: Buffer) {
	const res = await fetch(uploadUrl, {
		method: 'PUT',
		headers: {
			'Content-Length': `${chunk.length}`,
			'Content-Range': rangeHeader,
		},
		body: chunk,
	});

	if (![200, 201, 202].includes(res.status)) {
		const body = await res.json();

		console.error(body);

		throw new Error(`Invalid response on upload: ${res.statusText}`);
	}
}

async function uploadFile(adal: Adal, spoRoot: string, pathname: string, stream: Readable, size: number) {
	const uploadSession = await graphFetch(adal, `${pathJoin(spoRoot, pathname)}:/createUploadSession`, {
		method: 'POST',
		body: {
			item: {
				'@microsoft.graph.conflictBehavior': 'fail',
			},
		},
	});

	if (typeof uploadSession.uploadUrl !== 'string') {
		throw new Error('Invalid upload session');
	}

	let rangeStart = 0;
	const reqSema = new Sema(1);
	const promises: Promise<any>[] = [];

	return new Promise((resolve, reject) => {
		stream.on('readable', async () => {
			await reqSema.acquire();

			try {
				let chunk: Buffer | null = null;

				while (null !== (chunk = stream.read(CHUNK_SIZE))) {
					const rangeEnd = rangeStart + chunk.length - 1;
					const rangeHeader = `bytes ${rangeStart}-${rangeEnd}/${size}`;

					const p = uploadChunk(uploadSession.uploadUrl, rangeHeader, chunk);
					promises.push(p);
					await p;
					rangeStart += chunk.length;
				}
			} catch (err) {
				if (stream.readable) {
					stream.destroy();
				}
				return reject(err);
			} finally {
				reqSema.release();
			}
		});

		stream.on('end', () => {
			reqSema.drain().then(() => {
				Promise.all(promises).then(resolve).catch(reject);
			});
		});
	});
}

export default async function uploadFiles(adal: Adal, spoRoot: string): Promise<void> {
	const glob = new Glob('**', {
		dot: true,
		nodir: true,
		nosort: true,
	});
	const ign = ignore();

	ign.add(DEFAULT_IGNORE_PATTERNS);
	try {
		const ignorePatterns = readFileSync(IGNORE_PATH).toString();
		ign.add(ignorePatterns);
	} catch (err) {
		console.error(`No ${IGNORE_PATH} file`);
	}

	const s = new Sema(MAX_CONCURRENT, { pauseFn: glob.pause, resumeFn: glob.resume });
	return new Promise((resolve, reject) => {
		glob.on('match', async (pathname: string) => {
			try {
				if (ign.ignores(pathname)) {
					console.error(`Ignored file ${pathname}`);

					return;
				}

				await s.acquire();
				const file = await open(pathname, 'r');
				const { size: fileSize } = await file.stat();

				console.error(`Uploading ${pathname}`);
				await uploadFile(adal, spoRoot, pathname, fs.createReadStream('', { fd: file.fd }), fileSize);

				file.close();
				s.release();
			} catch (err) {
				console.error(err);
				err.message = `${err.message} (${pathname})`;
				reject(err);
			}
		});
		glob.on('end', () => {
			s.drain().then(() => {
				resolve();
			});
		});
		glob.on('error', (err: Error) => {
			glob.abort();
			reject(err);
		});
	});
}
