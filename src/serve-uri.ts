import { normalize as _pathNormalize } from 'path';
import LRU from 'lru-cache';
import { IncomingMessage, ServerResponse } from 'micri';
import _apiFetch from './fetch-graph-api';
import execFile from './exec-file';
import getEnv from './get-env';
import promiseCache from './promise-cache';
import sendFile from './send-file';
import sendFileList from './send-file-list';
import { CACHE_SEC, HIDDEN_FILES, INDEX_PATTERN, PROTECTED_FILES } from './config';
import { File, Folder } from './graph-api-types';
import { SiteConfig } from './get-site-config';
import { sendError, sendNotFoundError } from './error';

const [ROOT] = getEnv('ROOT');
const metaCache = new LRU<string, any>({
	max: 100,
	maxAge: CACHE_SEC * 1000,
});

const apiFetch = promiseCache(metaCache, _apiFetch);

function removeTrailing(str: string, ch: string): string {
	return !str.endsWith(ch) ? str : removeTrailing(str.slice(0, -1), ch);
}

function normalizePath(path: string): string {
	path = _pathNormalize(path);
	path = removeTrailing(path, '/');

	return path;
}

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
	const normalizedPath = normalizePath(pathname);
	const graphUrl = buildUrl(host, normalizedPath);

	if (graphUrl === null) {
		return [normalizedPath, null, null];
	}

	const meta = await apiFetch(graphUrl);

	return [normalizedPath, graphUrl, meta];
}

export default async function serveUri(
	req: IncomingMessage,
	res: ServerResponse,
	host: string,
	pathname: string,
	siteConfig: SiteConfig
): Promise<void> {
	if (siteConfig.routes) {
		const norm = normalizePath(pathname);
		for (const route of siteConfig.routes) {
			const out = norm.replace(route[0], route[1]);
			if (out !== norm) {
				pathname = out;
				break;
			}
		}
	}

	const [normalizedPath, graphUrl, meta] = await getMeta(host, pathname);
	if (graphUrl === null) {
		sendError(
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

	if (!meta) {
		// AutoExtension handling in case nothing was found.
		if (siteConfig.functions && !!siteConfig.functionsAutoExtension) {
			const r = await getMeta(host, `${pathname}${siteConfig.functionsAutoExtension}`);
			if (r[1] === null) {
				sendError(
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

			if (r[2] && r[2].file && shouldExec(siteConfig, r[0])) {
				return execFile(req, res, siteConfig, r[2]);
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
			if (shouldExec(siteConfig, `${normalizedPath}/${index.name}`)) {
				return execFile(req, res, siteConfig, index);
			}

			return sendFile(req, res, index, siteConfig);
		} else {
			if (siteConfig.dirListing) {
				return sendNotFoundError(req, res, siteConfig);
			} else {
				return sendFileList(
					req,
					res,
					normalizedPath,
					dir.filter((e: File | Folder) => HIDDEN_FILES.every((re) => !re.test(e.name.toLowerCase())))
				);
			}
		}
	} else if (meta.file) {
		if (shouldExec(siteConfig, `${normalizedPath}/${meta.name}`)) {
			return execFile(req, res, siteConfig, meta);
		}

		return sendFile(req, res, meta, siteConfig);
	}

	return sendNotFoundError(req, res, siteConfig);
}
