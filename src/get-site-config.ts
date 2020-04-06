import LRU from 'lru-cache';
import apiFetch from './fetch-graph-api';
import fetch from './fetch';
import getEnv from './get-env';
import promiseCache from './promise-cache';
import { DirectoryListing, File, Folder } from './graph-api-types';

const [ROOT] = getEnv('ROOT');

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
	customErrors?: {
		[index: number]: string;
	};
	/**
	 * Enable directory listings.
	 */
	dirListing?: boolean;
	/**
	 * Execute functions.
	 */
	functions?: boolean;
};

const dirCache = new LRU<string, Promise<Array<File | Folder>>>({
	max: 1,
	maxAge: 60 * 1000,
});
const configCache = new LRU<string, Promise<SiteConfig | null>>({
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

const getSiteConfig = promiseCache(configCache, async (host: string) => {
	const dir = await getDirList();
	const configFile = dir.find((o: any) => o.file && o.name === `${host}.json`) as File | undefined;

	if (!configFile) {
		return null;
	}

	const res = await fetch(configFile['@microsoft.graph.downloadUrl']);
	const body: SiteConfig = await res.json();

	return body;
});
export default getSiteConfig;
