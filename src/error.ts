import { STATUS_CODES } from 'http';
import { send, IncomingMessage, ServerResponse } from 'micri';
import { parseAll } from '@hapi/accept';
import serveUri from './serve-uri';
import setVary from './set-vary';
import { SiteConfig } from './get-site-config';

export interface TuristError {
	code: string;
	message: string;
	[x: string]: any;
}

const safeSiteConfig: SiteConfig = {
	customErrors: [],
	dirListing: false,
	functions: false,
	functionsEnv: {},
	functionsPattern: /^$/,
};

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
	siteConfig?: SiteConfig
): Promise<void> {
	let types = ['*/*'];

	if (!siteConfig) {
		siteConfig = safeSiteConfig;
	}

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

	setVary(res);
	if (types.includes('text/html')) {
		const customErrors = siteConfig.customErrors;
		const customPage = customErrors && customErrors[statusCode];
		if (customPage) {
			const host = req.headers.host?.split(':')[0] || '';
			return serveUri(req, res, { host, pathname: customPage, siteConfig: safeSiteConfig });
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

export function sendNotFoundError(req: IncomingMessage, res: ServerResponse, siteConfig?: SiteConfig) {
	return sendError(
		req,
		res,
		404,
		{
			code: 'not_found',
			message: 'Page not found',
		},
		siteConfig
	);
}

export function sendInvalidPathError(req: IncomingMessage, res: ServerResponse, siteConfig?: SiteConfig) {
	return sendError(
		req,
		res,
		400,
		{
			code: 'invalid_path',
			message: 'Invalid path',
		},
		siteConfig
	);
}

export function sendAuthSystemError(req: IncomingMessage, res: ServerResponse, siteConfig?: SiteConfig) {
	// eslint-disable-next-line no-console
	console.error(new Error('Auth system error'));

	return sendError(
		req,
		res,
		500,
		{
			code: 'auth_system_error',
			message: 'Internal Server Error',
		},
		siteConfig
	);
}
