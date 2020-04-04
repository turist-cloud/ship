import { normalize as pathNormalize } from 'path';
import { parse } from 'url';
import LRU from 'lru-cache';
import accesslog from 'access-log';
import micri from 'micri';
import { IncomingMessage, ServerResponse } from 'micri';
import _apiFetch from './fetch-graph-api';
import getEnv from './get-env';
import promiseCache from './promise-cache';
import sendFile from './send-file';
import sendFileList from './send-file-list';
import { File, Folder } from './graph-api-types';
import { sendError } from './error';
import { CACHE_SEC, DISABLE_FILE_LISTING, HIDDEN_FILES, PROTECTED_FILES } from './config';

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
			'Access-Control-Allow-Headers': 'Accept, Accept-Encoding, Range',
			'Access-Control-Expose-Headers':
				'Accept-Ranges, Content-Range, Content-Length, Content-Type, Content-Encoding, Content-Disposition, Date, ETag, Transfer-Encoding, Server',
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

		const isIndexFile = (name: string) => {
			const s = name.toLowerCase();

			return s.startsWith('index.') && PROTECTED_FILES.every((re) => !re.test(s));
		};
		const index = dir.find(
			(o: File) =>
				o.name &&
				o.file && // It's a file
				isIndexFile(o.name)
		);
		if (index) {
			return sendFile(req, res, index);
		} else {
			if (DISABLE_FILE_LISTING) {
				return sendError(req, res, 404, {
					code: 'not_found',
					message: 'Page not found',
				});
			} else {
				return sendFileList(
					req,
					res,
					url.pathname || '',
					dir.filter((e: File | Folder) => HIDDEN_FILES.every((re) => !re.test(e.name.toLowerCase())))
				);
			}
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
	.then(() => console.log(`Authenticated`)) // eslint-disable-line no-console
	.catch((err: Error) => {
		console.error(err); // eslint-disable-line no-console
		process.exit(1);
	});
