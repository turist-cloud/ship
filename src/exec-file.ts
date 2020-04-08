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

const MAX_AGE = ms('1m');
const REVALIDATE_AFTER = ms('1s');

const debug = createDebug('exec-file');
const getTempFilePath = (ctag: string) => `/tmp/ship-${Buffer.from(ctag).toString('base64')}`;
const parseCtagFromCacheKey = (key: string) => JSON.parse(key)[1];

const handlerMetaCache = new WeakMap<
	MicriHandler,
	{ siteConfig: SiteConfig; driveId: string; id: string; etag: string }
>();
const handlerCache = new SWR<Promise<MicriHandler>>({
	max: 500, // TODO the cache size should be configurable (and somehow in MB)
	maxAge: MAX_AGE,
	revalidateAfter: REVALIDATE_AFTER,
	revalidate: (key: string, v: Promise<MicriHandler>): Promise<Promise<MicriHandler> | null> => {
		return new Promise(async (resolve, reject) => {
			const ctag = parseCtagFromCacheKey(key);
			const cached = handlerMetaCache.get(await v);
			if (!cached) {
				// eslint-disable-next-line no-console
				console.error(`File handler cache is broken or not yet ready ${ctag}`);

				return resolve(v);
			}

			const { siteConfig, driveId, id, etag } = cached;

			debug(`Revalidating ${ctag} from ${driveId}:${id}`);

			try {
				const file = await fetchAPI(`/drives/${driveId}/items/${id}`, {
					headers: {
						'if-none-match': etag,
					},
				});

				if (file.status === 'not_modified') {
					debug(`No changes to ${ctag}`);
					return resolve(v);
				}

				debug(`Found new ${ctag} => ${file.cTag}`);
				return resolve(getHandler(siteConfig, file, ctag));
			} catch (err) {
				reject(err);
			}
		});
	},
	onError: (err: SWRError) => {
		// eslint-disable-next-line no-console
		console.error(`Revalidation failed for ${parseCtagFromCacheKey(err.key)}:`, err.originalError);
	},
	dispose: (key: string) => {
		const ctag = parseCtagFromCacheKey(key);
		const tempPath = getTempFilePath(ctag);

		try {
			// TODO This is currently dangerous if an old files is restored in
			// OneDrive!
			//fs.unlinkSync(tempPath);
		} catch (err) {
			err.message = `Failed to unlink "${tempPath}": ${err.message}`;

			// eslint-disable-next-line no-console
			console.error(err);
		}
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

async function getHandler(siteConfig: SiteConfig, file: File, ctag: string): Promise<MicriHandler> {
	// eslint-disable-next-line no-console
	console.log(`Fetching function: ${ctag}`);

	const tempPath = getTempFilePath(ctag);
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
			id: file.id,
			etag: file.eTag,
		});
	});

	return handlerP;
}

export default async function execFile(req: IncomingMessage, res: ServerResponse, siteConfig: SiteConfig, file: File) {
	const getHandlerCached = promiseCache<MicriHandler>(handlerCache, async (siteConfig: SiteConfig, ctag: string) =>
		getHandler(siteConfig, file, ctag)
	);
	const handler = await getHandlerCached(siteConfig, file.cTag);

	return handler(req, res, null);
}
