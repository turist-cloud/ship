import { IncomingMessage, ServerResponse } from 'micri';
import { sendError } from './error';

const ALLOW_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const ALLOW_METHODS_STR = ALLOW_METHODS.join(', ');

export default function allowMethods(req: IncomingMessage, res: ServerResponse): boolean {
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
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': ALLOW_METHODS_STR,
			'Access-Control-Allow-Headers': 'Accept, Accept-Encoding, Range',
			'Access-Control-Expose-Headers':
				'Accept-Ranges, Content-Range, Content-Length, Content-Type, Content-Encoding, Content-Disposition, Date, ETag, Transfer-Encoding, Server',
			'Access-Control-Max-Age': '86400',
		});
		res.end();

		return false;
	}

	return true;
}
