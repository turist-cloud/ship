import { normalize as pathNormalize } from 'path';
import { parse } from 'url';
import LRU from 'lru-cache';
import accesslog from 'access-log';
import micri from 'micri';
import ms from 'ms';
import { IncomingMessage, ServerResponse, send } from 'micri';
import _apiFetch from './fetch-graph-api';
import fetch from './fetch';
import getEnv from './get-env';
import promiseCache from './promise-cache';
import { File } from './graph-api-types';
import { sendError } from './error';

const [ROOT] = getEnv('ROOT');

const cache = new LRU({
	max: 100,
	maxAge: ms('30s'),
});

const apiFetch = promiseCache(cache, _apiFetch);

function removeTrailing(str: string, ch: string): string {
	return !str.endsWith(ch) ? str : removeTrailing(str.slice(0, -1), ch);
}

function buildUrl(host: string, path: string): string {
	host = host.split(':')[0];

	if (!/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(host)) {
		throw TypeError('Invalid host');
	}

	if (path.includes(':')) {
		throw TypeError('Invalid path');
	}

	path = pathNormalize(path);
	path = removeTrailing(path, '/');
	path = `/${host}${path}`

	return `${ROOT}${path}:`;
}

async function sendFile(res: ServerResponse, file: File) {
	const data = await fetch(file['@microsoft.graph.downloadUrl']);

	res.setHeader('Content-Type', file.file.mimeType || 'application/octet-stream');
	res.setHeader('Content-Disposition', `content-disposition: inline; filename="${file.name}"`);
	res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
	res.setHeader('ETag', file.eTag);

	return data.text();
}

const server = micri(async (req: IncomingMessage, res: ServerResponse) => {
	accesslog(req, res);

	const url = parse(req.url || '/', true);
	const host = req.headers.host;

	if (!host) {
		return sendError(req, res, 400, {
			code: 'invalid_host',
			message: 'Invalid Host'
		});
	}

	const graphUrl = buildUrl(host, url.pathname || '');
	const meta = await apiFetch(graphUrl);

	console.log(graphUrl);

	if (!meta) {
		return sendError(req, res, 404, {
			code: 'not_found',
			message: 'Page not found'
		});
	} else if (meta.folder) {
		const { value: dir } = await apiFetch(`${graphUrl}/children`);

		const index = dir.find(
			(o: File) =>
				o.name &&
				o.file && // It's a file
				o.name.startsWith('index.')
		);
		if (index) {
			return sendFile(res, index);
		} else {
			// TODO File listing
			return sendError(req, res, 404, {
				code: 'not_found',
				message: 'Page not found'
			});
		}
	}

	return send(res, 200);
});

server.listen(process.env.PORT || 3000);

apiFetch(`${ROOT}:`)
	.then(() => console.log(`Authenticated`))
	.catch((err: Error) => {
		console.error(err);
		process.exit(1);
	});
