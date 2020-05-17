import ms from 'ms';

export const CACHE_SEC = 30;
export const CACHE_CONTROL = `public, max-age=${CACHE_SEC / 2}, stale-while-revalidate=${CACHE_SEC / 2}, s-maxage=${
	CACHE_SEC / 2
}, no-transform`;

export const ENABLE_DIR_LISTING = false;
export const PROTECTED_FILES = [/\.swp$/];
export const HIDDEN_FILES = [/^\./, ...PROTECTED_FILES];

/**
 * Index file pattern.
 */
export const INDEX_PATTERN = /^index\..*/i;

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
