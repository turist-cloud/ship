import crypto from 'crypto';
import { promisify } from 'util';
import { IncomingMessage, ServerResponse } from 'http';
import { send } from 'micri';
import { AuthenticationContext, TokenResponse } from 'adal-node';
import jwt from 'jsonwebtoken';
import { sendAuthSystemError, sendError } from '../error';
import { AuthOpts } from '../types';
import {
	USE_SECURE_COOKIES,
	USE_AAD_AUTH_COOKIE_NAME as authCookieName,
	USE_AAD_CLIENT_ID as clientId,
	USE_AAD_CLIENT_SECRET as clientSecret,
	USE_AAD_AUTHORITY_URL as authorityUrl,
	USE_AAD_JWT_SECRET as jwtSecret,
} from '../config';

const resource = 'https://graph.microsoft.com';

const randomBytes = promisify(crypto.randomBytes);
const createAuthorizationUrl = (redirectUri: string, state: string) =>
	`${authorityUrl}/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&resource=${resource}`;

// Clients get redirected here in order to create an OAuth authorize url and redirect them to AAD.
// There they will authenticate and give their consent to allow this app access to
// some resource they own.
export async function auth(req: IncomingMessage, res: ServerResponse, opts: AuthOpts) {
	const redirectUri = opts.siteConfig.useAADRedirectUri;
	if (!redirectUri) {
		return sendAuthSystemError(req, res, opts.siteConfig);
	}

	const buf = await randomBytes(48);
	const token = buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
	const maxAge = 60 * 60 * 1000;

	opts.cookies.set('authstate', token, { maxAge, httpOnly: true, secure: USE_SECURE_COOKIES, sameSite: 'strict' });
	const authorizationUrl = createAuthorizationUrl(redirectUri, token);

	res.statusCode = 307;
	res.setHeader('Location', authorizationUrl);
	res.end();
}

// After consent is granted AAD redirects here.  The ADAL library is invoked via the
// AuthenticationContext and retrieves an access token that can be used to access the
// user owned resource.
export async function getAToken(req: IncomingMessage, res: ServerResponse, opts: AuthOpts) {
	const { query } = opts;
	const authstate = opts.cookies.get('authstate');

	if (authstate !== query.state) {
		return sendError(req, res, 400, {
			code: 'auth_state_error',
			message: 'Authentication state does not match',
		});
	}

	const redirectUri = opts.siteConfig.useAADRedirectUri;
	if (!authorityUrl || !redirectUri || !clientId || !clientSecret || !jwtSecret) {
		return sendAuthSystemError(req, res, opts.siteConfig);
	}

	const authenticationContext = new AuthenticationContext(authorityUrl);

	const code = Array.isArray(query.code) ? query.code[0] : query.code;
	authenticationContext.acquireTokenWithAuthorizationCode(
		code,
		redirectUri,
		resource,
		clientId,
		clientSecret,
		(err, response) => {
			if (err) {
				// eslint-disable-next-line no-console
				console.error(err);
				return send(res, 500);
			}
			if (response.error) {
				return send(res, 400);
			}

			const { accessToken, tenantId, userId, givenName, expiresIn } = response as TokenResponse;
			const token = jwt.sign(
				{
					sub: userId,
					name: givenName,
					my_accessToken: accessToken,
					my_tenant: tenantId,
				},
				jwtSecret,
				{
					expiresIn,
				}
			);
			const expires = new Date(Date.now() + expiresIn * 1000);
			opts.cookies.set(authCookieName, token, {
				expires,
				httpOnly: true,
				secure: USE_SECURE_COOKIES,
				sameSite: 'strict',
			});

			// To avoid a pointless redirect you could also start serving directly from here
			res.statusCode = 307;
			res.setHeader('Location', '/');
			res.end();
		}
	);
}
