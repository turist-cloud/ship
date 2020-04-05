import { normalize as pathNormalize } from 'path';
import LRU from 'lru-cache';
import { IncomingMessage, ServerResponse } from 'micri';
import _apiFetch from './fetch-graph-api';
import getEnv from './get-env';
import promiseCache from './promise-cache';
import sendFile from './send-file';
import sendFileList from './send-file-list';
import { CACHE_SEC, DISABLE_FILE_LISTING, HIDDEN_FILES, PROTECTED_FILES } from './config';
import { File, Folder } from './graph-api-types';
import { SiteConfig } from './get-site-config';
import { sendError } from './error';

const [ROOT] = getEnv('ROOT');
const metaCache = new LRU<string, any>({
	max: 100,
	maxAge: CACHE_SEC * 1000,
});

const apiFetch = promiseCache(metaCache, _apiFetch);

function removeTrailing(str: string, ch: string): string {
	return !str.endsWith(ch) ? str : removeTrailing(str.slice(0, -1), ch);
}

function buildUrl(host: string, path: string): string | null {
	if (path.includes(':')) {
		return null;
	}

	path = pathNormalize(path);
	path = removeTrailing(path, '/');
	path = `/${host}${path}`;

	return `${ROOT}${path}:`;
}

export default async function serveUri(
	req: IncomingMessage,
	res: ServerResponse,
	host: string,
	pathname: string,
	siteConfig: SiteConfig | null
): Promise<void> {
	const graphUrl = buildUrl(host, pathname);
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

	const meta = await apiFetch(graphUrl);

	if (!meta) {
		return sendError(
			req,
			res,
			404,
			{
				code: 'not_found',
				message: 'Page not found',
			},
			siteConfig
		);
	} else if (meta.folder) {
		const { value: dir } = await apiFetch(`${graphUrl}/children`);

		const isIndexFile = (name: string) => {
			const s = name.toLowerCase();

			return s.startsWith('index.') && PROTECTED_FILES.every((re) => !re.test(s));
		};
		const index = dir.find(
			(o: File) =>
				o.name &&
				o.file && // It's a file
				isIndexFile(o.name)
		);
		if (index) {
			return sendFile(req, res, index);
		} else {
			if (DISABLE_FILE_LISTING || siteConfig?.dirListing) {
				return sendError(
					req,
					res,
					404,
					{
						code: 'not_found',
						message: 'Page not found',
					},
					siteConfig
				);
			} else {
				return sendFileList(
					req,
					res,
					pathname,
					dir.filter((e: File | Folder) => HIDDEN_FILES.every((re) => !re.test(e.name.toLowerCase())))
				);
			}
		}
	} else if (meta.file) {
		return sendFile(req, res, meta);
	}

	return sendError(
		req,
		res,
		404,
		{
			code: 'not_found',
			message: 'Page not found',
		},
		siteConfig
	);
}
