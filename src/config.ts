import { join as pathJoin } from 'path';
import ms from 'ms';
import { HttpVersion } from './types';

/**
 * Get environment variables or fail.
 */
function getEnv(...vars: Array<string>): { [index: string]: string } {
	return vars
		.map((name) => {
			const value = process.env[name];
			if (typeof value !== 'string') {
				// eslint-disable-next-line
				console.error(`Mandatory environment variable "${name}" is not set`);
				process.exit(1);
			}

			return [name, value];
		})
		.reduce((acc: { [index: string]: string }, [name, value]) => ((acc[name] = value), acc), {});
}

const assert = (b: boolean, message: string) => {
	if (!b) {
		// eslint-disable-next-line no-console
		console.error(message);
		process.exit(1);
	}

	return true;
};

export const {
	ROOT,
	TENANT_ID,
	CLIENT_ID,
	CLIENT_SECRET,
	USE_AAD_CLIENT_ID,
	USE_AAD_CLIENT_SECRET,
	USE_AAD_AUTHORITY_URL,
	USE_AAD_JWT_SECRET,
} = getEnv('ROOT', 'TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET');
assert(
	!!USE_AAD_CLIENT_ID == !!USE_AAD_CLIENT_SECRET &&
		!!USE_AAD_CLIENT_SECRET == !!USE_AAD_AUTHORITY_URL &&
		!!USE_AAD_AUTHORITY_URL == !!USE_AAD_JWT_SECRET,
	'If you wish to use AAD auth for sites then all of the config variables must be set'
);

/**
 * Server mode.
 * "proxied' or "standalone"
 */
export const SERVER_MODE = process.env.SERVER_MODE || 'proxied';
assert(['proxied', 'standalone'].includes(SERVER_MODE), `Invalid SERVER_MODE: ${SERVER_MODE}`);

/**
 * Enable TLS.
 */
export const ENABLE_TLS = process.env.ENABLE_TLS === '1' || false;

/**
 * Static certificate files.
 * [[domains], certificate.pem, private_key.pem]
 */
export const TLS_STATIC_CERTS: [[string[], string, string]] = [
	[['localhost'], pathJoin(__dirname, '../cert.pem'), pathJoin(__dirname, '../key.pem')],
];

export const TLS_DH_PARAMS_PATH: string = pathJoin(__dirname, '../dhparam.pem');

/**
 * Minimum TLS version.
 */
export const TLS_MIN_VERSION = 'TLSv1.3';

/**
 * Maximum TLS version.
 */
export const TLS_MAX_VERSION = 'TLSv1.3';

/**
 * TLS Ciphers.
 */
export const TLS_CIPHERS = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';

const httpVersion = process.env.HTTP_VERSION;
if (httpVersion !== '1.1' && httpVersion !== '2') {
	// eslint-disable-next-line no-console
	console.error('Unsupported HTTP version');
	process.exit(1);
}

/**
 * HTTP version.
 */
export const HTTP_VERSION: HttpVersion = httpVersion || '1.1';

export const ENABLE_ALPN = process.env.ENABLE_ALPN === '1' || (HTTP_VERSION === '2' && ENABLE_TLS);
assert(!ENABLE_ALPN || (ENABLE_ALPN && ENABLE_TLS && HTTP_VERSION === '2'), 'Cannot enable ALPN');
export const PORT = Number(process.env.PORT) || (SERVER_MODE === 'proxied' ? 3000 : ENABLE_TLS ? 443 : 80);
export const PORT_HTTP = SERVER_MODE === 'standalone' && (ENABLE_TLS ? Number(process.env.PORT_HTTP) || 80 : undefined);

/**
 * Cache TTL.
 * Used for some internal caches.
 */
export const CACHE_SEC = 30;

const CACHE_CONTROL_TTL = 15;

/**
 * Cache-Control header sent for public responses.
 */
export const CACHE_CONTROL_PUBLIC = `public, max-age=${CACHE_CONTROL_TTL}, stale-while-revalidate=${CACHE_CONTROL_TTL}, s-maxage=${CACHE_CONTROL_TTL}, no-transform`;
export const CACHE_CONTROL_PRIVATE = `private, max-age=${CACHE_CONTROL_TTL}, stale-while-revalidate=${CACHE_CONTROL_TTL}, no-transform`;

export const ENABLE_DIR_LISTING = false;
export const PROTECTED_FILES = [/\.swp$/];
export const HIDDEN_FILES = [/^\./, ...PROTECTED_FILES];

/**
 * Index file pattern.
 */
export const INDEX_PATTERN = /^index\..*/i;

export const USE_SERVER_PUSH_HINTS = false;

export const USE_LINK_HEADER = false;

/**
 * Enable serving functions by default.
 */
export const ENABLE_FUNCTIONS = false;

/**
 * Default functions pattern.
 */
export const FUNCTIONS_PATTERN = /^\/api\/.*\.js$/;

/**
 * Maximum concurrent functions running.
 */
export const FUNCTIONS_MAX_CONCURRENT = 10;

/**
 * Maximum number of requests in a queue to get a function execution slot.
 */
export const FUNCTIONS_MAX_QUEUE = 10;

/**
 * Maximum waiting time to get a function execution slot.
 */
export const FUNCTIONS_MAX_WAIT = ms('60s');

/**
 * Use Secure cookies when setting cookies.
 */
export const USE_SECURE_COOKIES = process.env.NODE_ENV === 'production';

/**
 * USE_AAD Authentication cookie name.
 */
export const USE_AAD_AUTH_COOKIE_NAME = 'aad_access_token';
