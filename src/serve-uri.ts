import LRU from 'lru-cache';
import { IncomingMessage, ServerResponse } from 'micri';
import _apiFetch from './fetch-graph-api';
import execFile from './exec-file';
import promiseCache from './cache/promise-cache';
import sendFile from './send-file';
import sendFileList from './send-file-list';
import { ROOT, CACHE_SEC, HIDDEN_FILES, INDEX_PATTERN, PROTECTED_FILES } from './config';
import { File, Folder } from './graph-api-types';
import { ParsedRequestOpts } from './types';
import { SiteConfig } from './get-site-config';
import { normalizePath, findRoute } from './routes';
import { sendNotFoundError, sendInvalidPathError } from './error';

const metaCache = new LRU<string, any>({
	max: 100,
	maxAge: CACHE_SEC * 1000,
});

const apiFetch = promiseCache(metaCache, _apiFetch);

function buildUrl(host: string, path: string): string | null {
	if (path.includes(':')) {
		return null;
	}

	return `${ROOT}/${host}${path}:`;
}

function isIndexFile(name: string) {
	return INDEX_PATTERN.test(name) && PROTECTED_FILES.every((re) => !re.test(name.toLowerCase()));
}

function shouldExec(siteConfig: SiteConfig, path: string): boolean {
	return !!siteConfig.functions && siteConfig.functionsPattern.test(path);
}

async function getMeta(host: string, pathname: string) {
	const graphUrl = buildUrl(host, pathname);

	if (graphUrl === null) {
		return [null, null];
	}

	const meta = await apiFetch(graphUrl);

	return [graphUrl, meta];
}

async function getMetaAuto(siteConfig: SiteConfig, host: string, pathname: string) {
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

export default async function serveUri(
	req: IncomingMessage,
	res: ServerResponse,
	{ host, pathname, siteConfig }: ParsedRequestOpts
): Promise<void> {
	// Handle routes
	if (siteConfig.routes) {
		const newPathname = findRoute(req.url || '/', siteConfig.routes);
		pathname = newPathname;
	} else {
		pathname = normalizePath(pathname);
	}

	const [graphUrl, meta] = await getMetaAuto(siteConfig, host, pathname);
	if (graphUrl === null) {
		return sendInvalidPathError(req, res, siteConfig);
	}

	if (!meta) {
		// notFound hook handling
		if (siteConfig.hooks && siteConfig.hooks.notFound) {
			const newPathname = findRoute(req.url || '/', siteConfig.hooks.notFound);
			if (newPathname !== pathname) {
				pathname = newPathname;

				const [graphUrl, meta] = await getMeta(host, pathname);
				if (graphUrl === null) {
					return sendInvalidPathError(req, res, siteConfig);
				}

				if (meta && meta.file) {
					if (shouldExec(siteConfig, pathname)) {
						return execFile(req, res, siteConfig, meta);
					} else {
						return sendFile(req, res, meta, siteConfig);
					}
				}
			}
		}

		return sendNotFoundError(req, res, siteConfig);
	} else if (meta.folder) {
		const { value: dir } = await apiFetch(`${graphUrl}/children`);
		const index = dir.find(
			(o: File) =>
				o.name &&
				o.file && // It's a file
				isIndexFile(o.name)
		);
		if (index) {
			if (shouldExec(siteConfig, `${pathname}/${index.name}`)) {
				return execFile(req, res, siteConfig, index);
			}

			return sendFile(req, res, index, siteConfig);
		} else {
			if (siteConfig.dirListing) {
				return sendFileList(
					req,
					res,
					pathname,
					dir.filter((e: File | Folder) => HIDDEN_FILES.every((re) => !re.test(e.name.toLowerCase())))
				);
			} else {
				return sendNotFoundError(req, res, siteConfig);
			}
		}
	} else if (meta.file) {
		if (shouldExec(siteConfig, `${pathname}/${meta.name}`)) {
			return execFile(req, res, siteConfig, meta);
		}

		return sendFile(req, res, meta, siteConfig);
	}

	return sendNotFoundError(req, res, siteConfig);
}
