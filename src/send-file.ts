import { createHash } from 'crypto';
import { IncomingMessage, ServerResponse, send } from 'micri';
import allowMethods from './allow-methods';
import fetch from './fetch';
import setVary from './set-vary';
import { CACHE_CONTROL } from './config';
import { File } from './graph-api-types';

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

export default async function sendFile(req: IncomingMessage, res: ServerResponse, file: File) {
	// Some methods are not allowed here and some will need special
	// handling.
	if (!allowMethods(req, res)) {
		return;
	}

	const data = await fetch(file['@microsoft.graph.downloadUrl'], {
		method: req.method,
		compress: false,
		// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
		// @ts-ignore
		headers: makeReqHeaders(req),
	});

	const acceptRanges = data.headers.get('accept-ranges');
	const transferEncoding = data.headers.get('transfer-encoding');
	const contentType = data.headers.get('content-type');
	const contentRange = data.headers.get('content-range');
	const contentEncoding = data.headers.get('content-encoding');
	const len = data.headers.get('content-length');
	const date = data.headers.get('date');

	setVary(res);
	if (transferEncoding) {
		res.setHeader('transfer-encoding', transferEncoding);
	}
	res.setHeader('Content-Type', contentType || 'application/octet-stream');
	if (contentEncoding) {
		res.setHeader('Content-Encoding', contentEncoding);
	}
	if (contentRange) {
		res.setHeader('Content-Range', contentRange);
	}
	if (acceptRanges) {
		res.setHeader('Accept-Ranges', acceptRanges);
	}
	if (len) {
		res.setHeader('Content-Length', len);
	}
	res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
	res.setHeader('Cache-Control', CACHE_CONTROL);
	res.setHeader('ETag', `W/"${createHash('sha3-224').update(file.cTag).digest('hex')}"`);
	if (date) {
		res.setHeader('Date', date);
	}

	send(res, data.status, data.body);
}
