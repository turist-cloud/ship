import { IncomingMessage, ServerResponse } from 'micri';
import { sendError } from './error';

// These methods are allowd for static resources: files and folder listings.
const ALLOW_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const ALLOW_METHODS_STR = ALLOW_METHODS.join(', ');

const ALLOW_ORIGIN = '*';
const ALLOW_REQ_HEADERS = 'Accept, Accept-Encoding, Range, If-None-Match';
const EXPOSE_RES_HEADERS =
	'Accept-Ranges, Content-Range, Content-Length, Content-Type, Content-Encoding, Content-Disposition, Date, ETag, Transfer-Encoding, Server';

/**
 * Check that the request method is one of the allowed types for static resources.
 */
export default function allowedMethod(req: IncomingMessage, res: ServerResponse): boolean {
	if (!ALLOW_METHODS.includes(req.method || '')) {
		res.setHeader('Allow', ALLOW_METHODS_STR);
		sendError(req, res, 405, {
			code: 'method_not_allowed',
			message: 'Method not allowed',
		});

		return false;
	}

	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			'Access-Control-Allow-Origin': ALLOW_ORIGIN,
			'Access-Control-Allow-Methods': ALLOW_METHODS_STR,
			'Access-Control-Allow-Headers': ALLOW_REQ_HEADERS,
			'Access-Control-Expose-Headers': EXPOSE_RES_HEADERS,
			'Access-Control-Max-Age': '86400',
		});
		res.end();

		return false;
	}

	return true;
}
