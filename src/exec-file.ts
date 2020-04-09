import fs from 'fs';
import ms from 'ms';
import createDebug from 'debug';
import { IncomingMessage, ServerResponse, MicriHandler, withWorker } from 'micri';
import SWR, { SWRError } from './swr';
import fetch from './fetch';
import fetchAPI from './fetch-graph-api';
import promiseCache from './promise-cache';
import { File } from './graph-api-types';
import { SiteConfig } from './get-site-config';

const MAX_AGE = ms('15m');
const REVALIDATE_AFTER = ms('30s');

const debug = createDebug('exec-file');
const getTempFilePath = (ctag: string) => `/tmp/ship-${Buffer.from(ctag).toString('base64')}`;
const parseIdFromCacheKey = (key: string) => JSON.parse(key)[1];

const handlerMetaCache = new WeakMap<MicriHandler, { siteConfig: SiteConfig; driveId: string; etag: string }>();
const handlerCache = new SWR<Promise<MicriHandler>>({
	max: 500, // TODO the cache size should be configurable (and somehow in MB)
	maxAge: MAX_AGE,
	revalidateAfter: REVALIDATE_AFTER,
	revalidate: (key: string, v: Promise<MicriHandler>): Promise<Promise<MicriHandler> | null> => {
		return new Promise(async (resolve, reject) => {
			const id = parseIdFromCacheKey(key);
			// TODO catch
			const cached = handlerMetaCache.get(await v);
			if (!cached) {
				// eslint-disable-next-line no-console
				console.error(`File handler cache is broken or not yet ready ${id}`);

				return resolve(v);
			}

			const { siteConfig, driveId, etag } = cached;

			debug(`Revalidating ${etag} from ${driveId}:${id}`);

			try {
				const file = await fetchAPI(`/drives/${driveId}/items/${id}`, {
					headers: {
						'if-none-match': etag,
					},
				});

				if (file.status === 'not_modified') {
					debug(`No changes to ${id}`);
					return resolve(v);
				}

				debug(`Found new ${etag} => ${file.eTag}`);
				return resolve(getHandler(siteConfig, file));
			} catch (err) {
				reject(err);
			}
		});
	},
	onError: (err: SWRError) => {
		// eslint-disable-next-line no-console
		console.error(`Revalidation failed for ${parseIdFromCacheKey(err.key)}:`, err.originalError);
	},
});

// Prune the cache sometimes
setInterval(() => {
	handlerCache.prune();
}, ms('30m'));

// The following environment variables will be inherited from the parent.
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

function makeEnv(siteConfig: SiteConfig): { [index: string]: string | undefined } {
	const pEnv = process.env;

	return Object.keys(pEnv)
		.filter((key: string) => ALLOWED_ENV.has(key))
		.reduce(
			(obj: { [index: string]: string | undefined }, key: string) => {
				obj[key] = pEnv[key];
				return obj;
			},
			{ ...siteConfig.functionsEnv }
		);
}

async function getHandler(siteConfig: SiteConfig, file: File): Promise<MicriHandler> {
	// eslint-disable-next-line no-console
	console.log(`Fetching function: ${file.id}${file.cTag}`);

	const tempPath = getTempFilePath(file.cTag);
	// TODO Check if we already have the file
	const writeStream = fs.createWriteStream(tempPath);

	const data = await fetch(file['@microsoft.graph.downloadUrl']);
	data.body.pipe(writeStream);

	const handlerP = new Promise<MicriHandler>((resolve, reject) => {
		data.body.on('end', () => {
			resolve(withWorker(tempPath, { env: makeEnv(siteConfig) }));
		});

		data.body.on('error', (err) => {
			reject(err);
		});
	});

	handlerP.then((handler) => {
		handlerMetaCache.set(handler, {
			siteConfig,
			driveId: file.parentReference.driveId,
			etag: file.eTag,
		});
	});

	return handlerP;
}

export default async function execFile(req: IncomingMessage, res: ServerResponse, siteConfig: SiteConfig, file: File) {
	const getHandlerCached = promiseCache<MicriHandler>(handlerCache, async (siteConfig: SiteConfig, _id: string) =>
		getHandler(siteConfig, file)
	);
	const handler = await getHandlerCached(siteConfig, file.id);

	return handler(req, res, null);
}
