import { parse } from 'url';
import accesslog from 'access-log';
import micri from 'micri';
import { IncomingMessage, ServerResponse } from 'micri';
import apiFetch from './fetch-graph-api';
import getEnv from './get-env';
import getSiteConfig from './get-site-config';
import serveUri from './serve-uri';
import { sendError } from './error';

const [ROOT] = getEnv('ROOT');
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
	const host = req.headers.host?.split(':')[0] || '';

	if (
		host === '' ||
		!/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(
			host
		)
	) {
		return sendError(req, res, 400, {
			code: 'invalid_host',
			message: 'Invalid Host',
		});
	}

	const siteConfig = await getSiteConfig(host);
	return serveUri(req, res, host, url.pathname || '', siteConfig);
});

server.listen(process.env.PORT || 3000);

apiFetch(`${ROOT}:`)
	.then(() => console.log(`Authenticated`)) // eslint-disable-line no-console
	.catch((err: Error) => {
		console.error(err); // eslint-disable-line no-console
		process.exit(1);
	});
