import { Http2Stream, constants as http2Constants } from 'http2';
import { createHash } from 'crypto';
import { Headers } from 'node-fetch';
import { IncomingMessage, ServerResponse, send } from 'micri';
import { ServerPushHint } from './server-push-hints';
import allowedMethod from './headers/allowed-method';
import fetch from './fetch';
import setVary from './headers/set-vary';
import { CACHE_CONTROL_PUBLIC, CACHE_CONTROL_PRIVATE } from './config';
import { File } from './graph-api-types';
import { SiteConfig } from './get-site-config';
import { sendNotFoundError, sendError } from './error';
import { weakEtagMatch } from './etag-match';

const PASSED_HEADERS = [
	'accept-ranges',
	'transfer-encoding',
	'content-type',
	'content-range',
	'content-encoding',
	'content-length',
	'date',
];
const PASSED_HEADERS_HTTP2 = [
	'accept-ranges',
	'content-type',
	'content-range',
	'content-encoding',
	'content-length',
	'date',
];

function makeReqHeaders(req: IncomingMessage) {
	const headers: { [key: string]: string | string[] } = {};

	const acceptEncoding = req.headers['accept-encoding'];
	const range = req.headers['range'];

	if (acceptEncoding) {
		headers['accept-encoding'] = acceptEncoding;
	}
	if (range) {
		headers['range'] = range;
	}

	return headers;
}

function passResponseHeaders(headers: Headers, res: ServerResponse, list: string[]) {
	for (const name of list) {
		const value = headers.get(name);
		if (value) {
			res.setHeader(name, value);
		}
	}
}

function passPushHeaders(headers: Headers): { [index: string]: string | string[] } {
	const passed_headers = [
		'accept-ranges',
		'cache-control',
		'content-disposition',
		'content-encoding',
		'content-length',
		'content-range',
		'content-type',
		'date',
		'etag',
	];
	const out: { [index: string]: string | string[] } = {};

	for (const name of passed_headers) {
		const value = headers.get(name);
		if (value) {
			out[name] = value;
		}
	}

	return out;
}

function joinHeaderValues(header: string | string[] | undefined): string | null {
	if (header == null) {
		return null;
	}
	if (typeof header === 'string') {
		return header;
	}

	return header.join(', ');
}

async function push(host: string, stream: Http2Stream, serverPush: ServerPushHint[]) {
	for (const { path } of serverPush) {
		const pushHeaders = { [http2Constants.HTTP2_HEADER_PATH]: path };

		// @ts-ignore
		stream.pushStream(pushHeaders, (err, pushStream, headers) => {
			if (err) {
				console.error('Server Push failed:', err); // TODO Better error
				return;
			}

			fetch(`https://${host}${path}`, {
				method: 'GET',
				compress: false
			}).then((res) => {
				if (res.status === 200) {
					console.log('pushing', path);
					pushStream.respond({
						[http2Constants.HTTP2_HEADER_STATUS] : 200,
						...passPushHeaders(res.headers),
					});
					res.body.pipe(pushStream);
					//pushStream.end();
				}
			}).catch((err) => console.error('Failed to push', err));
		});
	}
}

export default async function sendFile(
	host: string,
	req: IncomingMessage,
	res: ServerResponse,
	file: File,
	siteConfig: SiteConfig,
	serverPush?: ServerPushHint[]
): Promise<void> {
	// Some methods are not allowed here and some will need special
	// handling.
	if (!allowedMethod(req, res)) {
		return;
	}

	const reqHeaders = makeReqHeaders(req);
	const etag = `W/"${createHash('sha3-224').update(file.cTag).digest('hex')}"`;
	const ifNoneMatch = joinHeaderValues(req.headers['if-none-match']);
	const ifRange = joinHeaderValues(req.headers['if-range']);

	// RFC 7232, section 3.2: If-None-Match
	// The downloadUrl endpoint doesn't support If-None-Match so we hack around
	// it by using a HEAD request.
	const etagMatch = ifNoneMatch && weakEtagMatch(ifNoneMatch, etag);
	const method = etagMatch ? 'HEAD' : req.method;

	// RFC 7232, section 6: Precedence
	// Note: We only support ETag but not Last-Modified validator
	if ((!ifNoneMatch || !etagMatch) && ifRange && req.headers['range'] && !weakEtagMatch(ifRange, etag)) {
		delete reqHeaders.range;
	}

	const data = await fetch(file['@microsoft.graph.downloadUrl'], {
		method,
		compress: false,
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		headers: reqHeaders,
	});

	switch (data.status) {
		case 400:
			return sendError(
				req,
				res,
				500,
				{
					code: 'bad_request',
					message: 'Bad request',
				},
				siteConfig
			);
		case 404:
			return sendNotFoundError(req, res, siteConfig);
		case 401: // TODO Invalidate cache?
		case 403: // TODO Invalidate cache?
		case 500:
			return sendError(
				req,
				res,
				500,
				{
					code: 'internal_server_error',
					message: 'Internal server error',
				},
				siteConfig
			);
	}

	setVary(res);
	res.setHeader('Cache-Control', siteConfig.useAAD ? CACHE_CONTROL_PRIVATE : CACHE_CONTROL_PUBLIC);
	res.setHeader('ETag', etag);

	if (etagMatch) {
		const dateHeader = data.headers.get('date');
		if (dateHeader) {
			res.setHeader('Date', dateHeader);
		}

		res.writeHead(304);
		res.end();
		return;
	}

	// @ts-ignore
	const isHttp2: boolean = !!res.stream;

	// Try pushing the dependencies
	if (isHttp2 && serverPush && serverPush.length > 0) {
		// @ts-ignore
		const http2stream = res.stream;
		if (http2stream && http2stream.pushAllowed) {
			push(host, http2stream, serverPush);
		}
	}

	res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
	if (siteConfig.useLinkHeader && serverPush && serverPush.length > 0) {
		// This works with CloudFlare but other CDNs and proxies might use some other tricks.
		res.setHeader('Link', serverPush.map((h: ServerPushHint) => `<${h.path}>; rel=preload; as=${h.as}`).join(', '));
	}

	passResponseHeaders(data.headers, res, isHttp2 ? PASSED_HEADERS_HTTP2 : PASSED_HEADERS);
	send(res, data.status, data.body);
}
