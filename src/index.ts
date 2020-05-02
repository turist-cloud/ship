import { parse } from 'url';
import _accessLog from 'access-log';
import micri, { MicriHandler } from 'micri';
import { IncomingMessage, ServerResponse } from 'micri';
import apiFetch from './fetch-graph-api';
import getEnv from './get-env';
import getSiteConfig from './get-site-config';
import serveUri from './serve-uri';
import { sendError } from './error';
import useAAD from './use-aad';

const [ROOT] = getEnv('ROOT');
const HOSTNAME_RE = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

const accessLog = (hndl: MicriHandler) => (req: IncomingMessage, res: ServerResponse) => {
	_accessLog(req, res);
	return hndl(req, res);
};

const parseRequest = (hndl: MicriHandler) => async (req: IncomingMessage, res: ServerResponse) => {
	const pathname = parse(req.url || '/', true).pathname || '';
	const host = req.headers.host?.split(':')[0] || '';

	if (host === '' || !HOSTNAME_RE.test(host)) {
		return sendError(req, res, 400, {
			code: 'invalid_host',
			message: 'Invalid Host',
		});
	}

	const siteConfig = await getSiteConfig(host);

	return hndl(req, res, {
		host,
		pathname,
		siteConfig,
	});
};

const server = micri(accessLog(parseRequest(useAAD(serveUri))));

server.listen(process.env.PORT || 3000);

// Start authentication on startup to minimize the effect to serving traffic.
apiFetch(`${ROOT}:`)
	.then(() => console.log('Authenticated')) // eslint-disable-line no-console
	.catch((err: Error) => {
		console.error(err); // eslint-disable-line no-console
		process.exit(1);
	});
