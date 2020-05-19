import { parse } from 'url';
import { Server as Http1Server, createServer as createHttp1Server } from 'http';
import { Http2Server, createServer as createHttp2Server, constants as http2Constants } from 'http2';
import _accessLog from 'access-log';
import { IncomingMessage, ServerResponse, run, MicriHandler } from 'micri';
import apiFetch from './fetch-graph-api';
import getEnv from './get-env';
import getSiteConfig from './get-site-config';
import serveUri from './serve-uri';
import useAAD from './aad/use-aad';
import { ParsedRequestOpts } from './types';
import { sendError } from './error';

type ShipOpts = ReturnType<typeof parseRequest>;

const [ROOT] = getEnv('ROOT');
const HOSTNAME_RE = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
const HTTP_VERSION = process.env.HTTP_VERSION || '1.1';

// Select HTTP/1.1 or HTTP/2 specific functions.
const {
	getHost, // Get site host
	serve, // Create a HTTP server and use micri to serve the requests
}: {
	getHost: (req: IncomingMessage) => string;
	serve: (fn: MicriHandler<ShipOpts>) => Http1Server | Http2Server;
} = (() => {
	if (HTTP_VERSION === '1.1') {
		return {
			getHost: (req: IncomingMessage) => req.headers.host?.split(':')[0] || '',
			serve: (fn: MicriHandler<ShipOpts>): Http1Server =>
				createHttp1Server((req: IncomingMessage, res: ServerResponse) => run<ShipOpts>(req, res, fn)),
		};
	} else if (HTTP_VERSION === '2') {
		return {
			getHost: (req: IncomingMessage) => {
				const hdr = req.headers[http2Constants.HTTP2_HEADER_AUTHORITY] || '';
				const host = Array.isArray(hdr) ? hdr[0] : hdr;

				return host.split(':')[0];
			},
			serve: (fn: MicriHandler<ShipOpts>): Http2Server =>
				// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
				// @ts-ignore Currently Micri isn't exactly aware of HTTP/2
				createHttp2Server((req, res) => run<OptsType>(req, res, fn)),
		};
	} else {
		// eslint-disable-next-line no-console
		console.error(`Unsupported HTTP version: "${HTTP_VERSION}"`);
		process.exit(1);
	}
})();

const parseRequest = (hndl: MicriHandler) => {
	const serveUsingAAD = useAAD(hndl);

	return async (req: IncomingMessage, res: ServerResponse) => {
		_accessLog(req, res);
		res.setHeader('Server', 'Ship');

		const pathname = parse(req.url || '/', true).pathname || '';
		const host = getHost(req);

		if (host === '' || !HOSTNAME_RE.test(host)) {
			return sendError(req, res, 400, {
				code: 'invalid_host',
				message: 'Invalid Host',
			});
		}

		const siteConfig = await getSiteConfig(host);
		const opts: ParsedRequestOpts = {
			host,
			pathname,
			siteConfig,
		};

		if (!!opts.siteConfig.useAAD) {
			return serveUsingAAD(req, res, opts);
		}
		return hndl(req, res, opts);
	};
};

const server = serve(parseRequest(serveUri));

server.listen(process.env.PORT || 3000);

// Start authentication on startup to minimize the effect to serving traffic.
apiFetch(`${ROOT}:`)
	.then(() => console.log('Authenticated')) // eslint-disable-line no-console
	.catch((err: Error) => {
		console.error(err); // eslint-disable-line no-console
		process.exit(1);
	});
