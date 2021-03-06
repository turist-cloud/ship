import vm from 'vm';
import ms from 'ms';
import createDebug from 'debug';
import { IncomingMessage, ServerResponse, MicriHandler, withWorker } from 'micri';
import ExecQueue from './exec-queue';
import SWR, { SWRError } from './cache/swr';
import fetch from './fetch';
import fetchAPI from './fetch-graph-api';
import promiseCache from './cache/promise-cache';
import { FUNCTIONS_MAX_CONCURRENT, FUNCTIONS_MAX_WAIT, FUNCTIONS_MAX_QUEUE } from './config';
import { File } from './graph-api-types';
import { SiteConfig } from './get-site-config';
import { sendError } from './error';

const MAX_AGE = ms('15m');
const REVALIDATE_AFTER = ms('30s');

const debug = createDebug('exec-file');
const parseIdFromCacheKey = (key: string) => JSON.parse(key)[1];
const execQueue = new ExecQueue(FUNCTIONS_MAX_CONCURRENT, FUNCTIONS_MAX_QUEUE, FUNCTIONS_MAX_WAIT);

const handlerMetaCache = new WeakMap<MicriHandler, { siteConfig: SiteConfig; driveId: string; etag: string }>();
const handlerCache = new SWR<Promise<MicriHandler>>({
	max: 500, // TODO the cache size should be configurable (and somehow in MB)
	maxAge: MAX_AGE,
	revalidateAfter: REVALIDATE_AFTER,
	revalidate: (key: string, v: Promise<MicriHandler>): Promise<Promise<MicriHandler> | null> => {
		return new Promise(async (resolve, reject) => {
			const id = parseIdFromCacheKey(key);
			let cached;

			try {
				cached = handlerMetaCache.get(await v);
				if (!cached) {
					// eslint-disable-next-line no-console
					console.error(`File handler cache is broken or not yet ready ${id}`);

					return resolve(v);
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(err);

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

	const resFile = await fetch(file['@microsoft.graph.downloadUrl']);
	const code = await resFile.text();
	const script = new vm.Script(code, { filename: file.name });
	const data = script.createCachedData();
	const jsHandler = withWorker(
		`(req, res, opts) => {
	const vm = require('vm');
	const s = new vm.Script(opts.code, { filename: opts.filename, cachedData: opts.data });
	const m = s.runInThisContext();
	const fs = require('fs'); // Disallow fs access
	for (const key of Object.keys(fs)) {
		fs[key] = null;
	}
	Object.freeze(fs);
	return m.render ? m.render(req, res) : m.default ? m.default(req, res) : m(req, res);
}`,
		{
			env: makeEnv(siteConfig),
			eval: true,
		}
	);

	const handler: MicriHandler = (req: IncomingMessage, res: ServerResponse) => {
		return jsHandler(req, res, {
			filename: file.name,
			code,
			data,
		});
	};

	handlerMetaCache.set(handler, {
		siteConfig,
		driveId: file.parentReference.driveId,
		etag: file.eTag,
	});

	return handler;
}

export default async function execFile(req: IncomingMessage, res: ServerResponse, siteConfig: SiteConfig, file: File) {
	const getHandlerCached = promiseCache<MicriHandler>(handlerCache, async (siteConfig: SiteConfig, _id: string) =>
		getHandler(siteConfig, file)
	);
	const [slot, handler] = await Promise.all([execQueue.getExecSlot(), getHandlerCached(siteConfig, file.id)]);

	if (!slot) {
		return sendError(req, res, 503, {
			code: 'service_unavailable',
			message: 'The Functions service is busy',
		});
	}

	const p = handler(req, res, null);
	p.finally(() => execQueue.releaseExecSlot());

	return p;
}
