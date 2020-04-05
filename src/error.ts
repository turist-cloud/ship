import { STATUS_CODES } from 'http';
import { send, IncomingMessage, ServerResponse } from 'micri';
import { parseAll } from '@hapi/accept';
import serveUri from './serve-uri';
import { SiteConfig } from './get-site-config';

export interface TuristError {
	code: string;
	message: string;
	[x: string]: any;
}

/**
 * Send a standardized error to the HTTP client.
 * @param req is the incoming request.
 * @param res is the outgoing response.
 * @param error is an object describing the error condition.
 */
export async function sendError(
	req: IncomingMessage,
	res: ServerResponse,
	statusCode: number,
	error: TuristError,
	siteConfig?: SiteConfig | null
): Promise<void> {
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
		// eslint-disable-next-line
		console.error(err);
	}

	if (types.includes('text/html')) {
		const customErrors = siteConfig?.customErrors;
		const customPage = customErrors && customErrors[statusCode];
		if (customPage) {
			const host = req.headers.host?.split(':')[0] || '';
			return serveUri(req, res, host, customPage, { dirListing: false });
		}

		return send(
			res,
			statusCode,
			`
<html>
<h2>${STATUS_CODES[statusCode] || 'Internal Server Error'}</h2>
<p>${error.message}</p>
`
		);
	} else if (types.includes('*/*')) {
		return send(res, statusCode, {
			error,
		});
	} else if (types.includes('text/plain')) {
		return send(res, statusCode, error.message);
	} else {
		return send(res, statusCode, {
			error,
		});
	}
}
