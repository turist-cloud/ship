import { basename, dirname } from 'path';
import LRU from 'lru-cache';
import fetch from './fetch';
import promiseCache from './cache/promise-cache';
import { getMeta } from './graph-api';

export type ServerPushHints = {
	[index: string]: string[];
};

const hintsCache = new LRU<string, Promise<ServerPushHints>>({
	max: 100,
	maxAge: 60 * 1000,
});

const getServerPushHints = promiseCache(hintsCache, async (host: string, path: string): Promise<ServerPushHints> => {
	const [_graphUrl, meta] = await getMeta(host, `${dirname(path)}/.serverpush`);
	if (!meta) {
		return {};
	}

	const res = await fetch(meta['@microsoft.graph.downloadUrl']);

	return res.ok ? res.json() : {};
});

export default async function getServerPushHint(host: string, path: string): Promise<string[]> {
	const hints = await getServerPushHints(host, path);

	return hints[basename(path)] || [];
}
