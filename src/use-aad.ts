import { parse } from 'url';
import { promisify } from 'util';
import { IncomingMessage, ServerResponse, MicriHandler, Router } from 'micri';
import Cookies from 'cookies';
import jwt from 'jsonwebtoken';
import { auth, getAToken } from './auth';
import { AuthOpts, ParsedRequestOpts } from './types';
import { sendError, sendAuthSystemError } from './error';
import { USE_SECURE_COOKIES, USE_AAD_AUTH_COOKIE_NAME as aadAuthCookieName } from './config';

const { router, on, otherwise } = Router;
const jwtVerify = promisify(jwt.verify);

const { USE_AAD_JWT_SECRET: jwtSecret } = process.env;

function logout(req: IncomingMessage, res: ServerResponse, opts: AuthOpts) {
	const expires = new Date(0);

	if (!aadAuthCookieName) {
		return sendAuthSystemError(req, res, opts.siteConfig);
	}

	// Clear cookies
	opts.cookies.set('authstate', '', { expires, secure: USE_SECURE_COOKIES, sameSite: 'strict' });
	opts.cookies.set(aadAuthCookieName, '', { expires, secure: USE_SECURE_COOKIES, sameSite: 'strict' });

	res.statusCode = 307;
	res.setHeader('Location', '/');
	res.end();
}

const authReq = (hndl: MicriHandler): MicriHandler => async (
	req: IncomingMessage,
	res: ServerResponse,
	opts: AuthOpts
) => {
	if (['/auth', '/token', '/logout'].includes(opts.pathname)) {
		return hndl(req, res, opts);
	}

	if (!jwtSecret) {
		return sendAuthSystemError(req, res, opts.siteConfig);
	}

	try {
		const token = opts.cookies.get(aadAuthCookieName);

		if (!token) {
			// Not authenticated so redirect to auth on server-side.
			return auth(req, res, opts);
		}

		const decoded = (await jwtVerify(token, jwtSecret)) as {
			name: string;
			my_tenant: string;
			my_accessToken: string;
		};

		if (
			typeof decoded.name !== 'string' ||
			typeof decoded.my_tenant !== 'string' ||
			typeof decoded.my_accessToken !== 'string'
		) {
			throw new Error('Bail out');
		}

		return hndl(req, res, opts);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err);

		return sendError(req, res, 403, {
			code: 'forbidden',
			message: 'Forbidden',
		});
	}
};

const parsePath = (hndl: MicriHandler): MicriHandler => (req: IncomingMessage, res: ServerResponse, opts: AuthOpts) => {
	const url = parse(req.url || '/', true);

	return hndl(req, res, {
		...(opts || {}),
		query: url.query,
		cookies: new Cookies(req, res),
	});
};

export default (hndl: MicriHandler): MicriHandler =>
	parsePath(
		authReq(
			router<ParsedRequestOpts & AuthOpts>(
				on.get(
					(_req: IncomingMessage, _res: ServerResponse, opts: AuthOpts) => opts.pathname === '/auth',
					auth
				),
				on.get(
					(_req: IncomingMessage, _res: ServerResponse, opts: AuthOpts) => opts.pathname === '/token',
					getAToken
				),
				on.get(
					(_req: IncomingMessage, _res: ServerResponse, opts: AuthOpts) => opts.pathname === '/logout',
					logout
				),
				otherwise(hndl)
			)
		)
	);
