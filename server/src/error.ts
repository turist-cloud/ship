import { STATUS_CODES } from 'http';
import { send, IncomingMessage, ServerResponse } from 'micri';
import { parseAll } from '@hapi/accept';

export interface TuristError {
	code: string;
	message: string;
	[x: string]: any;
};

/**
 * Send a standardized error to the HTTP client.
 * @param req is the incoming request.
 * @param res is the outgoing response.
 * @param error is an object describing the error condition.
 */
export function sendError(req: IncomingMessage, res: ServerResponse, statusCode: number, error: TuristError) {
	let types = ['*/*'];

	if (!error.code) {
		throw new Error('Error "code" is missing');
	}

	if (!error.message) {
		throw new Error('Error "message" is missing');
	}

	try {
		const parsed = parseAll(req.headers);
		types = parsed.mediaTypes;
	} catch (err) {
		console.error(err);
	}

	if (types.includes('text/html')) {
		return send(res, statusCode, `
<html>
<h2>${STATUS_CODES[statusCode] || 'Internal Server Error'}</h2>
<p>${error.message}</p>
`);
	} else if (types.includes('*/*')) {
		return send(res, statusCode, {
			error
		});
	} else if (types.includes('text/plain')) {
		return send(res, statusCode, error.message)
	} else {
		return send(res, statusCode, {
			error
		});
	}
}
