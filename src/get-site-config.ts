import LRU from 'lru-cache';
import * as defaultConfig from './config';
import apiFetch from './fetch-graph-api';
import fetch from './fetch';
import promiseCache from './cache/promise-cache';
import { DirectoryListing, File, Folder } from './graph-api-types';
import { initRoutes, initHooks } from './routes';

const ROOT = defaultConfig.ROOT;

/**
 * SiteConfig can be set per each domain.
 * Anything set here will override the default configuration;
 * If nothing is set here then the defaults will apply.
 */
export type SiteConfig = {
	/**
	 * Custom error page file paths.
	 * E.g.
	 * ```
	 * {
	 *   404: "/404.html",
	 *   500: "/500/index.html"
	 * }
	 * ```
	 */
	customErrors: {
		[index: number]: string;
	};
	/**
	 * Enable directory listings.
	 */
	dirListing: boolean;
	/**
	 * AAD Authentication.
	 */
	useAAD?: boolean;
	/**
	 * USE_AAD redirect URI.
	 * E.g. `https://domain.com
	 * Must be set if `useAAD` is set.
	 */
	useAADRedirectUri?: string;
	/**
	 * Routes.
	 * RegExp -> replace string
	 * E.g. `["^/users/(?<id>[^/]*)", "/users-api.js"]`
	 * E.g. `["^/users/(?<id>[^/]*)", "/users-$<id>.html"]`
	 */
	routes?: [RegExp, string][];
	/**
	 * Hooks.
	 * The hook destination should be an exact match to a file as no further
	 * processing will take place. This is to avoid an accidental infinite loop.
	 * `notFound: [["^/users/([^/]*)$", "/users-api.js"]]`
	 */
	hooks?: {
		[index: string]: [RegExp, string][];
	};
	/**
	 * Apply an automatic extension to paths that could match with a static
	 * file or a function.
	 */
	autoExtension?: string;
	/**
	 * Execute functions.
	 */
	functions: boolean;
	/**
	 * Env applied to the functions on this site.
	 */
	functionsEnv: {
		[index: string]: string;
	};
	functionsPattern: RegExp;
	/**
	 * Apply an automatic extension to paths that could match with a function.
	 *
	 * If defined an extension is added on paths not otherwise matching to the
	 * functions pattern.
	 *
	 * E.g. If the extension is `.js` and a request path would be `/api/func`
	 * then `/api/func.js` would be a match.
	 *
	 * **WARNING**: Using this option might lead to very confusing results if
	 * both names exist.
	 */
	functionsAutoExtension?: string;
};

const defaultSiteConfig: SiteConfig = {
	customErrors: {},
	dirListing: defaultConfig.ENABLE_DIR_LISTING,
	functions: defaultConfig.ENABLE_FUNCTIONS,
	functionsEnv: {},
	functionsPattern: defaultConfig.FUNCTIONS_PATTERN,
};

const dirCache = new LRU<string, Promise<Array<File | Folder>>>({
	max: 1,
	maxAge: 60 * 1000,
});
const configCache = new LRU<string, Promise<SiteConfig>>({
	max: 100,
	maxAge: 60 * 1000,
});

const makeUrl = () => `${ROOT}${ROOT.includes(':') ? ':' : ''}/children`;

const getDirList = promiseCache<Array<File | Folder>>(dirCache, async () => {
	const res: DirectoryListing = await apiFetch(makeUrl());
	if (!(res && res.value)) {
		throw Error(`Root folder not found: "${ROOT}"`);
	}

	return res.value;
});

const getSiteConfig = promiseCache(configCache, async (host: string): Promise<SiteConfig> => {
	const dir = await getDirList();
	const configFile = dir.find((o: any) => o.file && o.name === `${host}.json`) as File | undefined;

	if (!configFile) {
		return defaultSiteConfig;
	}

	const res = await fetch(configFile['@microsoft.graph.downloadUrl']);
	const body = await res.json();

	return {
		...defaultSiteConfig,
		...body,
		functionsPattern: body.functionsPattern
			? new RegExp(body.functionsPattern)
			: defaultSiteConfig.functionsPattern,
		routes: body.routes ? initRoutes(body.routes) : defaultSiteConfig.routes,
		hooks: body.hooks ? initHooks(body.hooks) : defaultSiteConfig.hooks,
	};
});
export default getSiteConfig;
