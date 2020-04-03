import { normalize as pathNormalize } from 'path';
import { parse } from 'url';
import LRU from 'lru-cache';
import accesslog from 'access-log';
import micri from 'micri';
import { IncomingMessage, ServerResponse, send } from 'micri';
import _apiFetch from './fetch-graph-api';
import fetch from './fetch';
import getEnv from './get-env';
import promiseCache from './promise-cache';
import { File } from './graph-api-types';
import { sendError } from './error';

const CACHE_SEC = 30;
const CACHE_CONTROL = `public, max-age=${CACHE_SEC}, must-revalidate, s-maxage=${CACHE_SEC}, stale-while-revalidate`;
const [ROOT] = getEnv('ROOT');

const metaCache = new LRU({
	max: 100,
	maxAge: CACHE_SEC * 1000,
});

const apiFetch = promiseCache(metaCache, _apiFetch);

function removeTrailing(str: string, ch: string): string {
	return !str.endsWith(ch) ? str : removeTrailing(str.slice(0, -1), ch);
}

function buildUrl(host: string, path: string): string {
	host = host.split(':')[0];

	if (
		!/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(
			host
		)
	) {
		throw TypeError('Invalid host');
	}

	if (path.includes(':')) {
		throw TypeError('Invalid path');
	}

	path = pathNormalize(path);
	path = removeTrailing(path, '/');
	path = `/${host}${path}`;

	return `${ROOT}${path}:`;
}

async function sendFile(req: IncomingMessage, res: ServerResponse, file: File) {
	const headers: { [key: string]: string | string[] } = {};

	if (req.headers['accept-encoding']) {
		headers['accept-encoding'] = req.headers['accept-encoding'];
	}

	const data = await fetch(file['@microsoft.graph.downloadUrl'], {
		method: req.method,
		compress: false,
		// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
		// @ts-ignore
		headers,
	});
	const transferEncoding = data.headers.get('transfer-encoding');
	const contentType = data.headers.get('content-type');
	const contentEncoding = data.headers.get('content-encoding');
	const len = data.headers.get('content-length');

	if (transferEncoding) {
		res.setHeader('transfer-encoding', transferEncoding);
	}
	res.setHeader('Content-Type', contentType || 'application/octet-stream');
	if (contentEncoding) {
		res.setHeader('Content-Encoding', contentEncoding);
	}
	if (len) {
		res.setHeader('Content-Length', len);
	}
	res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
	res.setHeader('Cache-Control', CACHE_CONTROL);
	res.setHeader('ETag', file.eTag);

	send(res, data.status, data.body);
}

const ALLOW_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const ALLOW_METHODS_STR = ALLOW_METHODS.join(', ');

const server = micri(async (req: IncomingMessage, res: ServerResponse) => {
	accesslog(req, res);

	res.setHeader('Vary', 'Accept, Accept-Encoding, Range');

	if (!ALLOW_METHODS.includes(req.method || '')) {
		res.setHeader('Allow', ALLOW_METHODS_STR);
		return sendError(req, res, 405, {
			code: 'method_not_allowed',
			message: 'Method not allowed',
		});
	}

	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': ALLOW_METHODS_STR,
			'Access-Control-Allow-Headers': 'Accept, Range',
			'Access-Control-Expose-Headers':
				'Accept-Ranges, Content-Length, Content-Type, Content-Encoding, Content-Disposition, Date, ETag, Transfer-Encoding, Server',
			'Access-Control-Max-Age': '86400',
		});
		res.end();
		return;
	}

	const url = parse(req.url || '/', true);
	const host = req.headers.host;

	if (!host) {
		return sendError(req, res, 400, {
			code: 'invalid_host',
			message: 'Invalid Host',
		});
	}

	const graphUrl = buildUrl(host, url.pathname || '');
	const meta = await apiFetch(graphUrl);

	if (!meta) {
		return sendError(req, res, 404, {
			code: 'not_found',
			message: 'Page not found',
		});
	} else if (meta.folder) {
		const { value: dir } = await apiFetch(`${graphUrl}/children`);

		const index = dir.find(
			(o: File) =>
				o.name &&
				o.file && // It's a file
				o.name.toLowerCase().startsWith('index.')
		);
		if (index) {
			return sendFile(req, res, index);
		} else {
			// TODO File listing
			return sendError(req, res, 404, {
				code: 'not_found',
				message: 'Page not found',
			});
		}
	} else if (meta.file) {
		return sendFile(req, res, meta);
	}

	return sendError(req, res, 404, {
		code: 'not_found',
		message: 'Page not found',
	});
});

server.listen(process.env.PORT || 3000);

apiFetch(`${ROOT}:`)
	.then(() => console.log(`Authenticated`))
	.catch((err: Error) => {
		console.error(err);
		process.exit(1);
	});
