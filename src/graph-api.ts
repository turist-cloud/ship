import LRU from 'lru-cache';
import _apiFetch from './fetch-graph-api';
import promiseCache from './cache/promise-cache';
import { ROOT, CACHE_SEC } from './config';
import { SiteConfig } from './get-site-config';
import { normalizePath } from './routes';
import { shouldExec } from './mode';

function buildUrl(host: string, path: string): string | null {
	if (path.includes(':')) {
		return null;
	}

	return `${ROOT}/${host}${path}:`;
}

const metaCache = new LRU<string, any>({
	max: 100,
	maxAge: CACHE_SEC * 1000,
});

export const apiFetch = promiseCache(metaCache, _apiFetch);

export async function getMeta(host: string, pathname: string) {
	const graphUrl = buildUrl(host, pathname);

	if (graphUrl === null) {
		return [null, null];
	}

	const meta = await apiFetch(graphUrl);

	return [graphUrl, meta];
}

export async function getMetaAuto(siteConfig: SiteConfig, host: string, pathname: string) {
	const orig = await getMeta(host, pathname);
	if (orig[0] === null) {
		return orig;
	}

	// AutoExtension handling in case nothing was found.
	if (!!siteConfig.autoExtension) {
		const newPath = normalizePath(`${pathname}${siteConfig.autoExtension}`);
		const autoExt = await getMeta(host, newPath);
		if (autoExt[1]) {
			return autoExt;
		}
	}

	if (siteConfig.functions && !!siteConfig.functionsAutoExtension) {
		const newPath = normalizePath(`${pathname}${siteConfig.functionsAutoExtension}`);
		const autoExt = await getMeta(host, newPath);
		const meta = autoExt[1];

		if (meta && meta.file && shouldExec(siteConfig, newPath)) {
			return autoExt;
		}
	}

	return orig;
}
