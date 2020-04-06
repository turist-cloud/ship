import fs from 'fs';
import LRU from 'lru-cache';
import ms from 'ms';
import { IncomingMessage, ServerResponse, MicriHandler, withWorker } from 'micri';
import fetch from './fetch';
import promiseCache from './promise-cache';
import { File } from './graph-api-types';

const getTempFilePath = (ctag: string) => `/tmp/ship-${Buffer.from(ctag).toString('base64')}`;

const handlerCache = new LRU<string, Promise<MicriHandler>>({
	max: 500, // TODO the cache size should be configurable (and somehow in MB)
	maxAge: ms('15m'),
	updateAgeOnGet: true,
	dispose: (key: string) => {
		const [ctag] = JSON.parse(key);
		const tempPath = getTempFilePath(ctag);

		// This is synchronous because otherwise we could endup deleting an
		// entry that we were just writing, in case the same file is
		// reintroduced immediately.
		// TODO a promise lock would be nicer here
		try {
			fs.unlinkSync(tempPath);
		} catch (err) {
			err.message = `Failed to unlink "${tempPath}": ${err.message}`;

			console.error(err);
		}
	},
});

// Prune the cache sometimes
setInterval(() => {
	handlerCache.prune();
}, ms('30m'));

const ALLOWED_ENV = new Set([
	'HOME',
	'HOSTNAME',
	'LANG',
	'LC_CTYPE',
	'LOGNAME',
	'MAIL',
	'PATH',
	'PWD',
	'SHELL',
	'TERM',
	'USER',
]);

function makeEnv(): { [index: string]: string | undefined } {
	const pEnv = process.env;

	return Object.keys(pEnv)
		.filter((key: string) => ALLOWED_ENV.has(key))
		.reduce((obj: { [index: string]: string | undefined }, key: string) => {
			obj[key] = pEnv[key];
			return obj;
		}, {});
}

export default async function execFile(req: IncomingMessage, res: ServerResponse, file: File) {
	const getHandler = promiseCache<MicriHandler>(handlerCache, async (ctag: string) => {
		console.log(`Fetching function: ${ctag}`);

		const tempPath = getTempFilePath(ctag);
		// TODO Check if we already have the file
		const writeStream = fs.createWriteStream(tempPath);

		const data = await fetch(file['@microsoft.graph.downloadUrl']);
		data.body.pipe(writeStream);

		return new Promise((resolve, reject) => {
			data.body.on('end', () => {
				resolve(withWorker(tempPath, { env: makeEnv() }));
			});

			data.body.on('error', (err) => {
				reject(err);
			});
		});
	});
	const handler = await getHandler(file.cTag);

	return handler(req, res, null);
}
