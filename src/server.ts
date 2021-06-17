import { parse } from 'url';
import { Server as Http1Server, createServer as createHttp1Server } from 'http';
import { createServer as createHttps1Server } from 'https';
import {
	Http2Server,
	createServer as createHttp2Server,
	createSecureServer as createHttps2Server,
	constants as http2Constants,
} from 'http2';
import { IncomingMessage, ServerResponse, MicriHandler, run } from 'micri';
import _accessLog from 'access-log';
import getSiteConfig from './get-site-config';
import useAAD from './aad/use-aad';
import { sendError } from './error';
import { SNICallback } from './tls';
import { HttpVersion, ParsedRequestOpts } from './types';
import { USE_AAD_CLIENT_ID } from './config';

type ShipOpts = ReturnType<typeof parseRequest>;

const HOSTNAME_RE =
	/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

// Select HTTP/1.1 or HTTP/2 specific functions.
function getHTTPFunctions(httpVersion: HttpVersion, enableAlpn: boolean) {
	if (httpVersion === '1.1') {
		return {
			getHost: (req: IncomingMessage) => req.headers.host?.split(':')[0] || '',
		};
	} else if (httpVersion === '2') {
		return {
			getHost: (req: IncomingMessage) => {
				let host;

				if (enableAlpn && req.httpVersion !== '2.0') {
					host = req.headers.host?.split(':')[0] || '';
				} else {
					const hdr = req.headers[http2Constants.HTTP2_HEADER_AUTHORITY] || '';
					host = Array.isArray(hdr) ? hdr[0] : hdr;
				}

				return host.split(':')[0];
			},
		};
	} else {
		throw new Error(`Unsupported HTTP version: "${httpVersion}"`);
	}
}

export function parseRequest(httpVersion: HttpVersion, enableAlpn: boolean, hndl: MicriHandler) {
	const serveUsingAAD = USE_AAD_CLIENT_ID ? useAAD(hndl) : null;
	const { getHost } = getHTTPFunctions(httpVersion, enableAlpn);

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

		if (serveUsingAAD && !!opts.siteConfig.useAAD) {
			return serveUsingAAD(req, res, opts);
		}
		return hndl(req, res, opts);
	};
}

export function getServe(
	httpVersion: HttpVersion,
	enableTls: boolean,
	enableAlpn: boolean
): (fn: MicriHandler<ShipOpts>) => Http1Server | Http2Server {
	if (enableTls) {
		if (httpVersion === '1.1') {
			return (fn: MicriHandler<ShipOpts>): Http1Server =>
				createHttps1Server(
					{
						SNICallback,
					},
					(req: IncomingMessage, res: ServerResponse) => run<ShipOpts>(req, res, fn)
				);
		} else if (httpVersion === '2') {
			return (fn: MicriHandler<ShipOpts>): Http2Server =>
				createHttps2Server(
					{
						allowHTTP1: enableAlpn,
						SNICallback,
					},
					// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
					// @ts-ignore Currently Micri isn't exactly aware of HTTP/2
					(req: IncomingMessage, res: ServerResponse) => run<ShipOpts>(req, res, fn)
				);
		}
	} else if (httpVersion === '1.1') {
		return (fn: MicriHandler<ShipOpts>): Http1Server =>
			createHttp1Server((req: IncomingMessage, res: ServerResponse) => run<ShipOpts>(req, res, fn));
	} else if (httpVersion === '2') {
		return (fn: MicriHandler<ShipOpts>): Http2Server =>
			// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
			// @ts-ignore Currently Micri isn't exactly aware of HTTP/2
			createHttp2Server((req, res) => run<OptsType>(req, res, fn));
	}

	throw new Error(
		`Unsupported HTTP version or server configuration: HTTP/${httpVersion} TLS: ${enableTls} ALPN: ${enableAlpn}`
	);
}
